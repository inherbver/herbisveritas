/**
 * Service Registry Configuration
 * 
 * Configuration presets and utilities for service registry and discovery.
 * Provides environment-specific configurations and defaults.
 */

import { ServiceRegistryConfig, HealthCheckConfig } from './registry';
import { DiscoveryClientConfig } from './discovery-client';

/**
 * Default health check configuration
 */
export const DEFAULT_HEALTH_CHECK_CONFIG: HealthCheckConfig = {
  interval: 30000,        // 30 seconds
  timeout: 5000,          // 5 seconds
  retries: 3,
  failureThreshold: 3,    // Mark unhealthy after 3 failures
  successThreshold: 2,    // Mark healthy after 2 successes
};

/**
 * Default service registry configuration
 */
export const DEFAULT_REGISTRY_CONFIG: ServiceRegistryConfig = {
  healthCheck: DEFAULT_HEALTH_CHECK_CONFIG,
  cleanupInterval: 300000,    // 5 minutes
  instanceTtl: 900000,        // 15 minutes
  enableAutoCleanup: true,
};

/**
 * Default discovery client configuration
 */
export const DEFAULT_DISCOVERY_CLIENT_CONFIG: DiscoveryClientConfig = {
  registryUrl: process.env.SERVICE_REGISTRY_URL || 'http://localhost:8500',
  cacheEnabled: true,
  cacheTtl: 60000,           // 1 minute
  retryAttempts: 3,
  retryDelay: 1000,          // 1 second
  healthCheckEnabled: true,
  failoverEnabled: true,
};

/**
 * Environment-specific configurations
 */
export const ENVIRONMENT_CONFIGS = {
  development: {
    registry: {
      ...DEFAULT_REGISTRY_CONFIG,
      healthCheck: {
        ...DEFAULT_HEALTH_CHECK_CONFIG,
        interval: 15000,       // More frequent checks in dev
        timeout: 10000,        // Longer timeout for debugging
      },
      cleanupInterval: 60000,  // More frequent cleanup
      instanceTtl: 180000,     // Shorter TTL for faster iteration
    } as ServiceRegistryConfig,
    
    client: {
      ...DEFAULT_DISCOVERY_CLIENT_CONFIG,
      cacheTtl: 30000,         // Shorter cache in dev
      retryAttempts: 1,        // Fail fast in dev
      retryDelay: 500,
    } as DiscoveryClientConfig,
  },

  staging: {
    registry: {
      ...DEFAULT_REGISTRY_CONFIG,
      healthCheck: {
        ...DEFAULT_HEALTH_CHECK_CONFIG,
        interval: 20000,
        failureThreshold: 2,   // More sensitive in staging
      },
    } as ServiceRegistryConfig,
    
    client: {
      ...DEFAULT_DISCOVERY_CLIENT_CONFIG,
      cacheTtl: 45000,
      retryAttempts: 2,
    } as DiscoveryClientConfig,
  },

  production: {
    registry: {
      ...DEFAULT_REGISTRY_CONFIG,
      healthCheck: {
        ...DEFAULT_HEALTH_CHECK_CONFIG,
        interval: 60000,       // Less frequent in production
        timeout: 3000,         // Shorter timeout
        failureThreshold: 5,   // More tolerant in production
      },
      cleanupInterval: 600000, // 10 minutes
      instanceTtl: 1800000,    // 30 minutes
    } as ServiceRegistryConfig,
    
    client: {
      ...DEFAULT_DISCOVERY_CLIENT_CONFIG,
      cacheTtl: 120000,        // 2 minutes cache
      retryAttempts: 5,        // More retries in production
      retryDelay: 2000,
    } as DiscoveryClientConfig,
  },

  test: {
    registry: {
      ...DEFAULT_REGISTRY_CONFIG,
      healthCheck: {
        ...DEFAULT_HEALTH_CHECK_CONFIG,
        interval: 1000,        // Very frequent for testing
        timeout: 500,
        retries: 1,
        failureThreshold: 1,
        successThreshold: 1,
      },
      cleanupInterval: 5000,   // 5 seconds
      instanceTtl: 10000,      // 10 seconds
      enableAutoCleanup: false, // Manual cleanup in tests
    } as ServiceRegistryConfig,
    
    client: {
      ...DEFAULT_DISCOVERY_CLIENT_CONFIG,
      cacheEnabled: false,     // No cache in tests
      retryAttempts: 0,        // No retries in tests
      healthCheckEnabled: false,
      failoverEnabled: false,
    } as DiscoveryClientConfig,
  },
} as const;

/**
 * Service-specific configurations
 */
export const SERVICE_CONFIGS = {
  // Critical services need more monitoring
  critical: {
    healthCheck: {
      ...DEFAULT_HEALTH_CHECK_CONFIG,
      interval: 15000,
      timeout: 3000,
      failureThreshold: 2,
      successThreshold: 3,
    },
  },

  // Non-critical services can be less strict
  'non-critical': {
    healthCheck: {
      ...DEFAULT_HEALTH_CHECK_CONFIG,
      interval: 60000,
      timeout: 10000,
      failureThreshold: 5,
      successThreshold: 1,
    },
  },

  // External services need different handling
  external: {
    healthCheck: {
      ...DEFAULT_HEALTH_CHECK_CONFIG,
      interval: 120000,       // 2 minutes
      timeout: 15000,         // Longer timeout for external
      failureThreshold: 3,
      successThreshold: 2,
    },
  },
} as const;

/**
 * Load balancing strategy configurations
 */
export const LOAD_BALANCING_CONFIGS = {
  'high-throughput': {
    strategy: 'least-connections' as const,
    healthCheckEnabled: true,
    cacheTtl: 30000,
  },

  'fault-tolerant': {
    strategy: 'weighted' as const,
    healthCheckEnabled: true,
    failoverEnabled: true,
    retryAttempts: 5,
  },

  'simple': {
    strategy: 'round-robin' as const,
    healthCheckEnabled: false,
    cacheTtl: 60000,
  },

  'random-distribution': {
    strategy: 'random' as const,
    healthCheckEnabled: true,
    cacheTtl: 45000,
  },
} as const;

/**
 * Get registry configuration for environment
 */
export function getRegistryConfig(env?: string): ServiceRegistryConfig {
  const environment = env || process.env.NODE_ENV || 'development';
  
  if (environment in ENVIRONMENT_CONFIGS) {
    return ENVIRONMENT_CONFIGS[environment as keyof typeof ENVIRONMENT_CONFIGS].registry;
  }
  
  return DEFAULT_REGISTRY_CONFIG;
}

/**
 * Get discovery client configuration for environment
 */
export function getDiscoveryClientConfig(env?: string): DiscoveryClientConfig {
  const environment = env || process.env.NODE_ENV || 'development';
  
  if (environment in ENVIRONMENT_CONFIGS) {
    return ENVIRONMENT_CONFIGS[environment as keyof typeof ENVIRONMENT_CONFIGS].client;
  }
  
  return DEFAULT_DISCOVERY_CLIENT_CONFIG;
}

/**
 * Get service-specific health check configuration
 */
export function getServiceHealthConfig(serviceType: keyof typeof SERVICE_CONFIGS): HealthCheckConfig {
  return SERVICE_CONFIGS[serviceType].healthCheck;
}

/**
 * Create custom registry configuration
 */
export function createRegistryConfig(overrides: Partial<ServiceRegistryConfig>): ServiceRegistryConfig {
  return {
    ...DEFAULT_REGISTRY_CONFIG,
    ...overrides,
    healthCheck: {
      ...DEFAULT_REGISTRY_CONFIG.healthCheck,
      ...overrides.healthCheck,
    },
  };
}

/**
 * Create custom discovery client configuration
 */
export function createDiscoveryClientConfig(overrides: Partial<DiscoveryClientConfig>): DiscoveryClientConfig {
  return {
    ...DEFAULT_DISCOVERY_CLIENT_CONFIG,
    ...overrides,
  };
}

/**
 * Validate configuration
 */
export function validateRegistryConfig(config: ServiceRegistryConfig): string[] {
  const errors: string[] = [];

  if (config.healthCheck.interval <= 0) {
    errors.push('Health check interval must be positive');
  }

  if (config.healthCheck.timeout <= 0) {
    errors.push('Health check timeout must be positive');
  }

  if (config.healthCheck.timeout >= config.healthCheck.interval) {
    errors.push('Health check timeout must be less than interval');
  }

  if (config.healthCheck.retries < 0) {
    errors.push('Health check retries must be non-negative');
  }

  if (config.healthCheck.failureThreshold <= 0) {
    errors.push('Failure threshold must be positive');
  }

  if (config.healthCheck.successThreshold <= 0) {
    errors.push('Success threshold must be positive');
  }

  if (config.cleanupInterval <= 0) {
    errors.push('Cleanup interval must be positive');
  }

  if (config.instanceTtl <= config.cleanupInterval) {
    errors.push('Instance TTL should be greater than cleanup interval');
  }

  return errors;
}

/**
 * Validate discovery client configuration
 */
export function validateDiscoveryClientConfig(config: DiscoveryClientConfig): string[] {
  const errors: string[] = [];

  if (!config.registryUrl) {
    errors.push('Registry URL is required');
  }

  try {
    new URL(config.registryUrl);
  } catch {
    errors.push('Registry URL must be a valid URL');
  }

  if (config.cacheTtl < 0) {
    errors.push('Cache TTL must be non-negative');
  }

  if (config.retryAttempts < 0) {
    errors.push('Retry attempts must be non-negative');
  }

  if (config.retryDelay < 0) {
    errors.push('Retry delay must be non-negative');
  }

  return errors;
}

/**
 * Environment detection utilities
 */
export const ENV_UTILS = {
  isDevelopment: () => process.env.NODE_ENV === 'development',
  isProduction: () => process.env.NODE_ENV === 'production',
  isTest: () => process.env.NODE_ENV === 'test',
  isStaging: () => process.env.NODE_ENV === 'staging',
  
  getEnvironment: () => process.env.NODE_ENV || 'development',
  
  isCloudEnvironment: () => !!(
    process.env.KUBERNETES_SERVICE_HOST ||
    process.env.AWS_REGION ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.AZURE_FUNCTIONS_ENVIRONMENT
  ),
} as const;