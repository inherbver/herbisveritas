/**
 * Service Registry Implementation
 * 
 * Provides service discovery and registration for microservices architecture.
 * Handles service health monitoring, load balancing, and failover.
 */

import { Result } from '@/lib/core/result';
import { logger } from '@/lib/core/logger';

/**
 * Service instance information
 */
export interface ServiceInstance {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly host: string;
  readonly port: number;
  readonly protocol: 'http' | 'https';
  readonly healthCheckPath: string;
  readonly metadata: Record<string, any>;
  readonly registeredAt: Date;
  readonly lastHealthCheck: Date;
  readonly status: 'healthy' | 'unhealthy' | 'unknown';
  readonly weight: number; // For load balancing
}

/**
 * Service registration request
 */
export interface ServiceRegistration {
  readonly name: string;
  readonly version: string;
  readonly host: string;
  readonly port: number;
  readonly protocol?: 'http' | 'https';
  readonly healthCheckPath?: string;
  readonly metadata?: Record<string, any>;
  readonly weight?: number;
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  readonly interval: number; // milliseconds
  readonly timeout: number; // milliseconds
  readonly retries: number;
  readonly failureThreshold: number;
  readonly successThreshold: number;
}

/**
 * Service registry configuration
 */
export interface ServiceRegistryConfig {
  readonly healthCheck: HealthCheckConfig;
  readonly cleanupInterval: number; // milliseconds
  readonly instanceTtl: number; // milliseconds
  readonly enableAutoCleanup: boolean;
}

/**
 * Load balancing strategies
 */
export type LoadBalancingStrategy = 'round-robin' | 'weighted' | 'least-connections' | 'random';

/**
 * Service Registry Implementation
 */
export class ServiceRegistry {
  private readonly services = new Map<string, Map<string, ServiceInstance>>();
  private readonly healthCheckTimers = new Map<string, NodeJS.Timeout>();
  private cleanupTimer?: NodeJS.Timeout;
  private readonly roundRobinCounters = new Map<string, number>();
  private readonly connectionCounts = new Map<string, number>();

  constructor(private readonly config: ServiceRegistryConfig) {
    if (config.enableAutoCleanup) {
      this.startCleanupTimer();
    }
    
    logger.info('ServiceRegistry initialized', {
      healthCheckInterval: config.healthCheck.interval,
      cleanupInterval: config.cleanupInterval,
      instanceTtl: config.instanceTtl,
    });
  }

  /**
   * Register a service instance
   */
  async register(registration: ServiceRegistration): Promise<Result<ServiceInstance, Error>> {
    try {
      const instance: ServiceInstance = {
        id: this.generateInstanceId(registration),
        name: registration.name,
        version: registration.version,
        host: registration.host,
        port: registration.port,
        protocol: registration.protocol || 'http',
        healthCheckPath: registration.healthCheckPath || '/health',
        metadata: registration.metadata || {},
        registeredAt: new Date(),
        lastHealthCheck: new Date(),
        status: 'unknown',
        weight: registration.weight || 100,
      };

      // Add to services map
      if (!this.services.has(registration.name)) {
        this.services.set(registration.name, new Map());
      }
      
      const serviceInstances = this.services.get(registration.name)!;
      serviceInstances.set(instance.id, instance);

      // Start health checking
      await this.startHealthCheck(instance);

      logger.info('Service registered', {
        serviceId: instance.id,
        serviceName: instance.name,
        endpoint: `${instance.protocol}://${instance.host}:${instance.port}`,
        version: instance.version,
      });

      return Result.ok(instance);

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Service registration failed');
      logger.error('ServiceRegistry.register', err, {
        serviceName: registration.name,
        host: registration.host,
        port: registration.port,
      });
      return Result.error(err);
    }
  }

  /**
   * Deregister a service instance
   */
  async deregister(serviceName: string, instanceId: string): Promise<Result<void, Error>> {
    try {
      const serviceInstances = this.services.get(serviceName);
      if (!serviceInstances) {
        return Result.error(new Error(`Service '${serviceName}' not found`));
      }

      const instance = serviceInstances.get(instanceId);
      if (!instance) {
        return Result.error(new Error(`Instance '${instanceId}' not found`));
      }

      // Stop health checking
      this.stopHealthCheck(instanceId);

      // Remove instance
      serviceInstances.delete(instanceId);
      
      // Remove service if no instances left
      if (serviceInstances.size === 0) {
        this.services.delete(serviceName);
        this.roundRobinCounters.delete(serviceName);
      }

      // Clean up connection tracking
      this.connectionCounts.delete(instanceId);

      logger.info('Service deregistered', {
        serviceId: instanceId,
        serviceName,
      });

      return Result.ok(undefined);

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Service deregistration failed');
      logger.error('ServiceRegistry.deregister', err, {
        serviceName,
        instanceId,
      });
      return Result.error(err);
    }
  }

  /**
   * Discover service instances
   */
  async discover(
    serviceName: string,
    strategy: LoadBalancingStrategy = 'round-robin'
  ): Promise<Result<ServiceInstance, Error>> {
    try {
      const serviceInstances = this.services.get(serviceName);
      if (!serviceInstances || serviceInstances.size === 0) {
        return Result.error(new Error(`No instances found for service '${serviceName}'`));
      }

      // Filter healthy instances
      const healthyInstances = Array.from(serviceInstances.values())
        .filter(instance => instance.status === 'healthy');

      if (healthyInstances.length === 0) {
        return Result.error(new Error(`No healthy instances found for service '${serviceName}'`));
      }

      // Apply load balancing strategy
      const selectedInstance = this.selectInstance(serviceName, healthyInstances, strategy);
      
      logger.debug('Service discovered', {
        serviceName,
        selectedInstance: selectedInstance.id,
        strategy,
        availableInstances: healthyInstances.length,
      });

      return Result.ok(selectedInstance);

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Service discovery failed');
      logger.error('ServiceRegistry.discover', err, {
        serviceName,
        strategy,
      });
      return Result.error(err);
    }
  }

  /**
   * Get all service instances for a service
   */
  getServiceInstances(serviceName: string): ServiceInstance[] {
    const serviceInstances = this.services.get(serviceName);
    return serviceInstances ? Array.from(serviceInstances.values()) : [];
  }

  /**
   * Get all registered services
   */
  getAllServices(): Record<string, ServiceInstance[]> {
    const result: Record<string, ServiceInstance[]> = {};
    
    for (const [serviceName, instances] of this.services.entries()) {
      result[serviceName] = Array.from(instances.values());
    }
    
    return result;
  }

  /**
   * Get healthy service instances count
   */
  getHealthyInstancesCount(serviceName: string): number {
    const instances = this.getServiceInstances(serviceName);
    return instances.filter(instance => instance.status === 'healthy').length;
  }

  /**
   * Update connection count for load balancing
   */
  incrementConnections(instanceId: string): void {
    const current = this.connectionCounts.get(instanceId) || 0;
    this.connectionCounts.set(instanceId, current + 1);
  }

  /**
   * Decrement connection count
   */
  decrementConnections(instanceId: string): void {
    const current = this.connectionCounts.get(instanceId) || 0;
    this.connectionCounts.set(instanceId, Math.max(0, current - 1));
  }

  /**
   * Get registry statistics
   */
  getStatistics(): {
    totalServices: number;
    totalInstances: number;
    healthyInstances: number;
    unhealthyInstances: number;
    instancesByService: Record<string, number>;
    healthCheckStats: {
      activeChecks: number;
      totalChecks: number;
    };
  } {
    let totalInstances = 0;
    let healthyInstances = 0;
    let unhealthyInstances = 0;
    const instancesByService: Record<string, number> = {};

    for (const [serviceName, instances] of this.services.entries()) {
      const instanceArray = Array.from(instances.values());
      const serviceInstanceCount = instanceArray.length;
      const serviceHealthyCount = instanceArray.filter(i => i.status === 'healthy').length;
      const serviceUnhealthyCount = instanceArray.filter(i => i.status === 'unhealthy').length;

      totalInstances += serviceInstanceCount;
      healthyInstances += serviceHealthyCount;
      unhealthyInstances += serviceUnhealthyCount;
      instancesByService[serviceName] = serviceInstanceCount;
    }

    return {
      totalServices: this.services.size,
      totalInstances,
      healthyInstances,
      unhealthyInstances,
      instancesByService,
      healthCheckStats: {
        activeChecks: this.healthCheckTimers.size,
        totalChecks: totalInstances,
      },
    };
  }

  /**
   * Shutdown the registry
   */
  async shutdown(): Promise<void> {
    logger.info('ServiceRegistry shutting down');

    // Stop all health checks
    for (const timer of this.healthCheckTimers.values()) {
      clearInterval(timer);
    }
    this.healthCheckTimers.clear();

    // Stop cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    // Clear all data
    this.services.clear();
    this.roundRobinCounters.clear();
    this.connectionCounts.clear();

    logger.info('ServiceRegistry shutdown complete');
  }

  /**
   * Generate unique instance ID
   */
  private generateInstanceId(registration: ServiceRegistration): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 8);
    return `${registration.name}-${registration.host}-${registration.port}-${timestamp}-${random}`;
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
   * Round-robin selection
   */
  private selectRoundRobin(serviceName: string, instances: ServiceInstance[]): ServiceInstance {
    const counter = (this.roundRobinCounters.get(serviceName) || 0) % instances.length;
    this.roundRobinCounters.set(serviceName, counter + 1);
    return instances[counter];
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
   * Start health check for an instance
   */
  private async startHealthCheck(instance: ServiceInstance): Promise<void> {
    // Perform initial health check
    await this.performHealthCheck(instance);

    // Schedule periodic health checks
    const timer = setInterval(async () => {
      await this.performHealthCheck(instance);
    }, this.config.healthCheck.interval);

    this.healthCheckTimers.set(instance.id, timer);
  }

  /**
   * Stop health check for an instance
   */
  private stopHealthCheck(instanceId: string): void {
    const timer = this.healthCheckTimers.get(instanceId);
    if (timer) {
      clearInterval(timer);
      this.healthCheckTimers.delete(instanceId);
    }
  }

  /**
   * Perform health check on an instance
   */
  private async performHealthCheck(instance: ServiceInstance): Promise<void> {
    const healthUrl = `${instance.protocol}://${instance.host}:${instance.port}${instance.healthCheckPath}`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.healthCheck.timeout);

      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const isHealthy = response.ok;
      this.updateInstanceHealth(instance, isHealthy);

    } catch (error) {
      logger.debug('Health check failed', {
        instanceId: instance.id,
        healthUrl,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      this.updateInstanceHealth(instance, false);
    }
  }

  /**
   * Update instance health status
   */
  private updateInstanceHealth(instance: ServiceInstance, isHealthy: boolean): void {
    const serviceInstances = this.services.get(instance.name);
    if (!serviceInstances) return;

    const currentInstance = serviceInstances.get(instance.id);
    if (!currentInstance) return;

    const newStatus = isHealthy ? 'healthy' : 'unhealthy';
    const statusChanged = currentInstance.status !== newStatus;

    // Update instance
    const updatedInstance: ServiceInstance = {
      ...currentInstance,
      status: newStatus,
      lastHealthCheck: new Date(),
    };

    serviceInstances.set(instance.id, updatedInstance);

    if (statusChanged) {
      logger.info('Instance health status changed', {
        instanceId: instance.id,
        serviceName: instance.name,
        status: newStatus,
        endpoint: `${instance.protocol}://${instance.host}:${instance.port}`,
      });
    }
  }

  /**
   * Start cleanup timer for stale instances
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupStaleInstances();
    }, this.config.cleanupInterval);
  }

  /**
   * Clean up stale instances that haven't been health checked recently
   */
  private cleanupStaleInstances(): void {
    const now = Date.now();
    const staleThreshold = now - this.config.instanceTtl;
    let cleanedCount = 0;

    for (const [serviceName, instances] of this.services.entries()) {
      const instancesToRemove: string[] = [];

      for (const [instanceId, instance] of instances.entries()) {
        if (instance.lastHealthCheck.getTime() < staleThreshold) {
          instancesToRemove.push(instanceId);
        }
      }

      // Remove stale instances
      for (const instanceId of instancesToRemove) {
        this.stopHealthCheck(instanceId);
        instances.delete(instanceId);
        this.connectionCounts.delete(instanceId);
        cleanedCount++;
      }

      // Remove service if no instances left
      if (instances.size === 0) {
        this.services.delete(serviceName);
        this.roundRobinCounters.delete(serviceName);
      }
    }

    if (cleanedCount > 0) {
      logger.info('Cleaned up stale instances', {
        cleanedCount,
        remainingServices: this.services.size,
      });
    }
  }
}