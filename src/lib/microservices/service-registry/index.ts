/**
 * Service Registry Module
 * 
 * Centralized exports for service registry and discovery functionality.
 * Provides unified access to registration, discovery, and configuration.
 */

// Types pour les handlers HTTP
interface HttpRequest {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[]>;
  body?: unknown;
}

interface HttpResponse {
  statusCode?: number;
  setHeader(name: string, value: string | number | readonly string[]): this;
  end(chunk?: unknown): this;
  json?(object: unknown): this;
}

// Core registry functionality
export { ServiceRegistry } from './registry';
export type { 
  ServiceInstance, 
  ServiceRegistration, 
  HealthCheckConfig,
  ServiceRegistryConfig,
  LoadBalancingStrategy,
} from './registry';

// Discovery client
export { ServiceDiscoveryClient } from './discovery-client';
export type { 
  DiscoveryClientConfig, 
  DiscoveryOptions,
} from './discovery-client';

// Configuration and utilities
export {
  DEFAULT_HEALTH_CHECK_CONFIG,
  DEFAULT_REGISTRY_CONFIG,
  DEFAULT_DISCOVERY_CLIENT_CONFIG,
  ENVIRONMENT_CONFIGS,
  SERVICE_CONFIGS,
  LOAD_BALANCING_CONFIGS,
  getRegistryConfig,
  getDiscoveryClientConfig,
  getServiceHealthConfig,
  createRegistryConfig,
  createDiscoveryClientConfig,
  validateRegistryConfig,
  validateDiscoveryClientConfig,
  ENV_UTILS,
} from './config';

/**
 * Quick setup utilities
 */
export class ServiceRegistrySetup {
  /**
   * Create a development registry instance
   */
  static createDevelopmentRegistry(): ServiceRegistry {
    const config = getRegistryConfig('development');
    return new ServiceRegistry(config);
  }

  /**
   * Create a production registry instance
   */
  static createProductionRegistry(): ServiceRegistry {
    const config = getRegistryConfig('production');
    return new ServiceRegistry(config);
  }

  /**
   * Create a development discovery client
   */
  static createDevelopmentDiscoveryClient(): ServiceDiscoveryClient {
    const config = getDiscoveryClientConfig('development');
    return new ServiceDiscoveryClient(config);
  }

  /**
   * Create a production discovery client
   */
  static createProductionDiscoveryClient(): ServiceDiscoveryClient {
    const config = getDiscoveryClientConfig('production');
    return new ServiceDiscoveryClient(config);
  }

  /**
   * Create registry with custom configuration
   */
  static createCustomRegistry(overrides: Partial<ServiceRegistryConfig>): ServiceRegistry {
    const config = createRegistryConfig(overrides);
    const errors = validateRegistryConfig(config);
    
    if (errors.length > 0) {
      throw new Error(`Invalid registry configuration: ${errors.join(', ')}`);
    }
    
    return new ServiceRegistry(config);
  }

  /**
   * Create discovery client with custom configuration
   */
  static createCustomDiscoveryClient(overrides: Partial<DiscoveryClientConfig>): ServiceDiscoveryClient {
    const config = createDiscoveryClientConfig(overrides);
    const errors = validateDiscoveryClientConfig(config);
    
    if (errors.length > 0) {
      throw new Error(`Invalid discovery client configuration: ${errors.join(', ')}`);
    }
    
    return new ServiceDiscoveryClient(config);
  }
}

/**
 * Service registration helpers
 */
export class ServiceRegistrationHelpers {
  /**
   * Create service registration from current process
   */
  static createFromProcess(
    serviceName: string,
    version: string,
    port: number,
    overrides: Partial<ServiceRegistration> = {}
  ): ServiceRegistration {
    return {
      name: serviceName,
      version,
      host: process.env.SERVICE_HOST || 'localhost',
      port,
      protocol: (process.env.SERVICE_PROTOCOL as 'http' | 'https') || 'http',
      healthCheckPath: '/health',
      metadata: {
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid,
        startTime: new Date().toISOString(),
        ...overrides.metadata,
      },
      ...overrides,
    };
  }

  /**
   * Create service registration from environment variables
   */
  static createFromEnvironment(serviceName: string): ServiceRegistration {
    const version = process.env.SERVICE_VERSION || '1.0.0';
    const host = process.env.SERVICE_HOST || 'localhost';
    const port = parseInt(process.env.SERVICE_PORT || '3000', 10);
    const protocol = (process.env.SERVICE_PROTOCOL as 'http' | 'https') || 'http';
    const healthCheckPath = process.env.HEALTH_CHECK_PATH || '/health';

    return {
      name: serviceName,
      version,
      host,
      port,
      protocol,
      healthCheckPath,
      metadata: {
        environment: process.env.NODE_ENV || 'development',
        region: process.env.AWS_REGION || process.env.GOOGLE_CLOUD_REGION || 'local',
        zone: process.env.AVAILABILITY_ZONE || 'local',
        instance: process.env.INSTANCE_ID || 'local',
        ...this.parseMetadataFromEnv(),
      },
    };
  }

  /**
   * Parse metadata from environment variables
   */
  private static parseMetadataFromEnv(): Record<string, any> {
    const metadata: Record<string, any> = {};
    
    // Parse SERVICE_METADATA environment variable
    const metadataEnv = process.env.SERVICE_METADATA;
    if (metadataEnv) {
      try {
        Object.assign(metadata, JSON.parse(metadataEnv));
      } catch (error) {
        console.warn('Failed to parse SERVICE_METADATA environment variable');
      }
    }

    // Add common cloud metadata
    if (process.env.KUBERNETES_SERVICE_HOST) {
      metadata.platform = 'kubernetes';
      metadata.namespace = process.env.KUBERNETES_NAMESPACE || 'default';
      metadata.podName = process.env.HOSTNAME;
    }

    if (process.env.AWS_REGION) {
      metadata.cloud = 'aws';
      metadata.instanceId = process.env.AWS_INSTANCE_ID;
      metadata.availabilityZone = process.env.AWS_AVAILABILITY_ZONE;
    }

    if (process.env.GOOGLE_CLOUD_PROJECT) {
      metadata.cloud = 'gcp';
      metadata.projectId = process.env.GOOGLE_CLOUD_PROJECT;
      metadata.zone = process.env.GOOGLE_CLOUD_ZONE;
    }

    return metadata;
  }
}

/**
 * Health check utilities
 */
export class HealthCheckUtils {
  /**
   * Create a simple health check endpoint handler
   */
  static createHealthCheckHandler(
    customChecks: Array<() => Promise<boolean>> = []
  ): (req: HttpRequest, res: HttpResponse) => Promise<void> {
    return async (req: HttpRequest, res: HttpResponse) => {
      try {
        const health = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: process.env.SERVICE_VERSION || '1.0.0',
          checks: {} as Record<string, boolean>,
        };

        // Run custom health checks
        for (let i = 0; i < customChecks.length; i++) {
          try {
            health.checks[`custom_${i}`] = await customChecks[i]();
          } catch (error) {
            health.checks[`custom_${i}`] = false;
            health.status = 'unhealthy';
          }
        }

        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(health);

      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };
  }

  /**
   * Create database health check
   */
  static createDatabaseHealthCheck(
    checkConnection: () => Promise<boolean>
  ): () => Promise<boolean> {
    return async () => {
      try {
        return await checkConnection();
      } catch (error) {
        return false;
      }
    };
  }

  /**
   * Create external service health check
   */
  static createExternalServiceHealthCheck(
    serviceUrl: string,
    timeout = 5000
  ): () => Promise<boolean> {
    return async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(serviceUrl, {
          method: 'GET',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response.ok;

      } catch (error) {
        return false;
      }
    };
  }
}

// Re-export configuration helpers
import { 
  getRegistryConfig, 
  getDiscoveryClientConfig, 
  createRegistryConfig, 
  createDiscoveryClientConfig,
  validateRegistryConfig,
  validateDiscoveryClientConfig,
} from './config';