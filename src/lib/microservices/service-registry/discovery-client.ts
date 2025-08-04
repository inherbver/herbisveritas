/**
 * Service Discovery Client
 * 
 * Client-side service discovery with caching, health monitoring,
 * and automatic failover capabilities.
 */

import { Result } from '@/lib/core/result';
import { logger } from '@/lib/core/logger';
import { ServiceInstance, LoadBalancingStrategy } from './registry';

/**
 * Discovery client configuration
 */
export interface DiscoveryClientConfig {
  readonly registryUrl: string;
  readonly cacheEnabled: boolean;
  readonly cacheTtl: number; // milliseconds
  readonly retryAttempts: number;
  readonly retryDelay: number; // milliseconds
  readonly healthCheckEnabled: boolean;
  readonly failoverEnabled: boolean;
}

/**
 * Cached service information
 */
interface CachedService {
  instances: ServiceInstance[];
  lastUpdated: number;
  lastUsedIndex: number;
}

/**
 * Request options for service discovery
 */
export interface DiscoveryOptions {
  strategy?: LoadBalancingStrategy;
  forceRefresh?: boolean;
  timeout?: number;
  version?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Service Discovery Client
 */
export class ServiceDiscoveryClient {
  private readonly cache = new Map<string, CachedService>();
  private readonly healthCheckTimers = new Map<string, NodeJS.Timeout>();
  private readonly connectionCounts = new Map<string, number>();

  constructor(private readonly config: DiscoveryClientConfig) {
    logger.info('ServiceDiscoveryClient initialized', {
      registryUrl: config.registryUrl,
      cacheEnabled: config.cacheEnabled,
      cacheTtl: config.cacheTtl,
    });
  }

  /**
   * Discover a service instance
   */
  async discover(
    serviceName: string,
    options: DiscoveryOptions = {}
  ): Promise<Result<ServiceInstance, Error>> {
    try {
      const instances = await this.getServiceInstances(serviceName, options);
      if (instances.isError()) {
        return Result.error(instances.getError());
      }

      const availableInstances = this.filterInstances(instances.getValue(), options);
      if (availableInstances.length === 0) {
        return Result.error(new Error(`No suitable instances found for service '${serviceName}'`));
      }

      const selectedInstance = this.selectInstance(
        serviceName,
        availableInstances,
        options.strategy || 'round-robin'
      );

      // Track connection for load balancing
      this.incrementConnections(selectedInstance.id);

      logger.debug('Service discovered', {
        serviceName,
        instanceId: selectedInstance.id,
        endpoint: `${selectedInstance.protocol}://${selectedInstance.host}:${selectedInstance.port}`,
        strategy: options.strategy || 'round-robin',
      });

      return Result.ok(selectedInstance);

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Service discovery failed');
      logger.error('ServiceDiscoveryClient.discover', err, {
        serviceName,
        options,
      });
      return Result.error(err);
    }
  }

  /**
   * Get all instances for a service
   */
  async discoverAll(
    serviceName: string,
    options: DiscoveryOptions = {}
  ): Promise<Result<ServiceInstance[], Error>> {
    try {
      const instances = await this.getServiceInstances(serviceName, options);
      if (instances.isError()) {
        return Result.error(instances.getError());
      }

      const availableInstances = this.filterInstances(instances.getValue(), options);
      
      logger.debug('All service instances discovered', {
        serviceName,
        instanceCount: availableInstances.length,
      });

      return Result.ok(availableInstances);

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Service discovery failed');
      logger.error('ServiceDiscoveryClient.discoverAll', err, {
        serviceName,
        options,
      });
      return Result.error(err);
    }
  }

  /**
   * Make HTTP request with automatic service discovery
   */
  async request(
    serviceName: string,
    path: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: string | FormData | URLSearchParams | ReadableStream<Uint8Array> | null;
      timeout?: number;
      retries?: number;
      discoveryOptions?: DiscoveryOptions;
    } = {}
  ): Promise<Result<Response, Error>> {
    const maxRetries = options.retries ?? this.config.retryAttempts;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Discover service instance
        const instanceResult = await this.discover(serviceName, options.discoveryOptions);
        if (instanceResult.isError()) {
          lastError = instanceResult.getError();
          continue;
        }

        const instance = instanceResult.getValue();
        const url = `${instance.protocol}://${instance.host}:${instance.port}${path}`;

        // Make request
        const controller = new AbortController();
        const timeout = options.timeout || 5000;
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
          const response = await fetch(url, {
            method: options.method || 'GET',
            headers: {
              'Content-Type': 'application/json',
              ...options.headers,
            },
            body: options.body ? JSON.stringify(options.body) : undefined,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          // Decrement connection count
          this.decrementConnections(instance.id);

          // Update instance health based on response
          if (this.config.healthCheckEnabled) {
            this.updateInstanceHealth(serviceName, instance.id, response.ok);
          }

          logger.debug('Service request completed', {
            serviceName,
            instanceId: instance.id,
            method: options.method || 'GET',
            path,
            status: response.status,
            attempt: attempt + 1,
          });

          return Result.ok(response);

        } catch (fetchError) {
          clearTimeout(timeoutId);
          this.decrementConnections(instance.id);
          
          if (this.config.healthCheckEnabled) {
            this.updateInstanceHealth(serviceName, instance.id, false);
          }
          
          throw fetchError;
        }

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Request failed');
        
        if (attempt < maxRetries) {
          logger.warn('Service request failed, retrying', {
            serviceName,
            path,
            attempt: attempt + 1,
            maxRetries,
            error: lastError.message,
          });

          // Exponential backoff
          await this.delay(this.config.retryDelay * Math.pow(2, attempt));
        }
      }
    }

    const finalError = lastError || new Error('All retry attempts failed');
    logger.error('ServiceDiscoveryClient.request', finalError, {
      serviceName,
      path,
      maxRetries,
    });

    return Result.error(finalError);
  }

  /**
   * Get service health status
   */
  async getServiceHealth(serviceName: string): Promise<Result<{
    total: number;
    healthy: number;
    unhealthy: number;
    instances: Array<{
      id: string;
      endpoint: string;
      status: string;
      lastCheck: Date;
    }>;
  }, Error>> {
    try {
      const instancesResult = await this.getServiceInstances(serviceName);
      if (instancesResult.isError()) {
        return Result.error(instancesResult.getError());
      }

      const instances = instancesResult.getValue();
      const healthy = instances.filter(i => i.status === 'healthy').length;
      const unhealthy = instances.filter(i => i.status === 'unhealthy').length;

      const health = {
        total: instances.length,
        healthy,
        unhealthy,
        instances: instances.map(instance => ({
          id: instance.id,
          endpoint: `${instance.protocol}://${instance.host}:${instance.port}`,
          status: instance.status,
          lastCheck: instance.lastHealthCheck,
        })),
      };

      return Result.ok(health);

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Health check failed');
      return Result.error(err);
    }
  }

  /**
   * Clear cache for a service
   */
  clearCache(serviceName?: string): void {
    if (serviceName) {
      this.cache.delete(serviceName);
      logger.debug('Service cache cleared', { serviceName });
    } else {
      this.cache.clear();
      logger.debug('All service cache cleared');
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStatistics(): {
    totalEntries: number;
    services: Record<string, {
      instanceCount: number;
      lastUpdated: Date;
      age: number; // milliseconds
    }>;
  } {
    const services: Record<string, any> = {};
    const now = Date.now();

    for (const [serviceName, cached] of this.cache.entries()) {
      services[serviceName] = {
        instanceCount: cached.instances.length,
        lastUpdated: new Date(cached.lastUpdated),
        age: now - cached.lastUpdated,
      };
    }

    return {
      totalEntries: this.cache.size,
      services,
    };
  }

  /**
   * Shutdown the client
   */
  async shutdown(): Promise<void> {
    logger.info('ServiceDiscoveryClient shutting down');

    // Stop all health check timers
    for (const timer of this.healthCheckTimers.values()) {
      clearInterval(timer);
    }
    this.healthCheckTimers.clear();

    // Clear cache and connection counts
    this.cache.clear();
    this.connectionCounts.clear();

    logger.info('ServiceDiscoveryClient shutdown complete');
  }

  /**
   * Get service instances from registry or cache
   */
  private async getServiceInstances(
    serviceName: string,
    options: DiscoveryOptions = {}
  ): Promise<Result<ServiceInstance[], Error>> {
    // Check cache first
    if (this.config.cacheEnabled && !options.forceRefresh) {
      const cached = this.cache.get(serviceName);
      if (cached && (Date.now() - cached.lastUpdated) < this.config.cacheTtl) {
        logger.debug('Using cached service instances', {
          serviceName,
          instanceCount: cached.instances.length,
          cacheAge: Date.now() - cached.lastUpdated,
        });
        return Result.ok(cached.instances);
      }
    }

    // Fetch from registry
    try {
      const url = `${this.config.registryUrl}/services/${serviceName}/instances`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(options.timeout || 5000),
      });

      if (!response.ok) {
        throw new Error(`Registry request failed: ${response.status} ${response.statusText}`);
      }

      const instances: ServiceInstance[] = await response.json();

      // Update cache
      if (this.config.cacheEnabled) {
        this.cache.set(serviceName, {
          instances,
          lastUpdated: Date.now(),
          lastUsedIndex: 0,
        });
      }

      logger.debug('Service instances fetched from registry', {
        serviceName,
        instanceCount: instances.length,
      });

      return Result.ok(instances);

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Registry fetch failed');
      
      // Fallback to cache if available
      if (this.config.cacheEnabled) {
        const cached = this.cache.get(serviceName);
        if (cached) {
          logger.warn('Using stale cache due to registry error', {
            serviceName,
            error: err.message,
            cacheAge: Date.now() - cached.lastUpdated,
          });
          return Result.ok(cached.instances);
        }
      }

      return Result.error(err);
    }
  }

  /**
   * Filter instances based on options
   */
  private filterInstances(
    instances: ServiceInstance[],
    options: DiscoveryOptions
  ): ServiceInstance[] {
    let filtered = instances;

    // Filter by health status
    filtered = filtered.filter(instance => instance.status === 'healthy');

    // Filter by version if specified
    if (options.version) {
      filtered = filtered.filter(instance => instance.version === options.version);
    }

    // Filter by metadata if specified
    if (options.metadata) {
      filtered = filtered.filter(instance => {
        return Object.entries(options.metadata!).every(([key, value]) => 
          instance.metadata[key] === value
        );
      });
    }

    return filtered;
  }

  /**
   * Select instance using load balancing strategy
   */
  private selectInstance(
    serviceName: string,
    instances: ServiceInstance[],
    strategy: LoadBalancingStrategy
  ): ServiceInstance {
    switch (strategy) {
      case 'round-robin':
        return this.selectRoundRobin(serviceName, instances);
      
      case 'weighted':
        return this.selectWeighted(instances);
      
      case 'least-connections':
        return this.selectLeastConnections(instances);
      
      case 'random':
        return this.selectRandom(instances);
      
      default:
        return this.selectRoundRobin(serviceName, instances);
    }
  }

  /**
   * Round-robin selection with cache state
   */
  private selectRoundRobin(serviceName: string, instances: ServiceInstance[]): ServiceInstance {
    const cached = this.cache.get(serviceName);
    if (cached) {
      const index = cached.lastUsedIndex % instances.length;
      cached.lastUsedIndex = index + 1;
      return instances[index];
    }
    
    // Fallback to random if no cache
    return this.selectRandom(instances);
  }

  /**
   * Weighted selection
   */
  private selectWeighted(instances: ServiceInstance[]): ServiceInstance {
    const totalWeight = instances.reduce((sum, instance) => sum + instance.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const instance of instances) {
      random -= instance.weight;
      if (random <= 0) {
        return instance;
      }
    }
    
    return instances[instances.length - 1];
  }

  /**
   * Least connections selection
   */
  private selectLeastConnections(instances: ServiceInstance[]): ServiceInstance {
    let selectedInstance = instances[0];
    let minConnections = this.connectionCounts.get(selectedInstance.id) || 0;
    
    for (const instance of instances) {
      const connections = this.connectionCounts.get(instance.id) || 0;
      if (connections < minConnections) {
        minConnections = connections;
        selectedInstance = instance;
      }
    }
    
    return selectedInstance;
  }

  /**
   * Random selection
   */
  private selectRandom(instances: ServiceInstance[]): ServiceInstance {
    const randomIndex = Math.floor(Math.random() * instances.length);
    return instances[randomIndex];
  }

  /**
   * Increment connection count
   */
  private incrementConnections(instanceId: string): void {
    const current = this.connectionCounts.get(instanceId) || 0;
    this.connectionCounts.set(instanceId, current + 1);
  }

  /**
   * Decrement connection count
   */
  private decrementConnections(instanceId: string): void {
    const current = this.connectionCounts.get(instanceId) || 0;
    this.connectionCounts.set(instanceId, Math.max(0, current - 1));
  }

  /**
   * Update instance health in cache
   */
  private updateInstanceHealth(serviceName: string, instanceId: string, isHealthy: boolean): void {
    const cached = this.cache.get(serviceName);
    if (!cached) return;

    const instance = cached.instances.find(i => i.id === instanceId);
    if (!instance) return;

    const newStatus = isHealthy ? 'healthy' : 'unhealthy';
    if (instance.status !== newStatus) {
      instance.status = newStatus;
      instance.lastHealthCheck = new Date();
      
      logger.debug('Instance health status updated in cache', {
        serviceName,
        instanceId,
        status: newStatus,
      });
    }
  }

  /**
   * Delay helper for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}