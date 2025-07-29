/**
 * API Gateway Module
 * 
 * Central exports for the API Gateway system.
 * Provides unified access to gateway functionality.
 */

export { ApiGateway } from './gateway';
export type { ServiceRoute, ApiGatewayConfig } from './gateway';

export { 
  API_GATEWAY_CONFIG,
  getApiGatewayConfig,
  getEnvironmentConfig,
  SERVICE_ENDPOINTS,
  HEALTH_CHECK_ENDPOINTS,
} from './routing-config';

export {
  apiGatewayMiddleware,
  gatewayHealthCheck,
  getGatewayMetrics,
  getGatewayInstance,
  resetGatewayInstance,
} from './middleware';

/**
 * Gateway configuration presets
 */
export const GATEWAY_PRESETS = {
  /**
   * Development preset - lenient timeouts, detailed logging
   */
  DEVELOPMENT: {
    defaultTimeout: 30000,
    defaultRetries: 1,
    enableLogging: true,
    enableMetrics: false,
  },

  /**
   * Production preset - optimized for performance and reliability
   */
  PRODUCTION: {
    defaultTimeout: 10000,
    defaultRetries: 2,
    enableLogging: true,
    enableMetrics: true,
  },

  /**
   * Testing preset - fast timeouts, minimal retries
   */
  TESTING: {
    defaultTimeout: 1000,
    defaultRetries: 0,
    enableLogging: false,
    enableMetrics: false,
  },
} as const;

/**
 * Common rate limit configurations
 */
export const RATE_LIMIT_PRESETS = {
  /**
   * High frequency APIs (search, analytics)
   */
  HIGH_FREQUENCY: {
    requests: 1000,
    window: 60000, // 1 minute
  },

  /**
   * Standard APIs (product catalog, cart)
   */
  STANDARD: {
    requests: 100,
    window: 60000,
  },

  /**
   * Low frequency APIs (payments, orders)
   */
  LOW_FREQUENCY: {
    requests: 20,
    window: 60000,
  },

  /**
   * Auth endpoints
   */
  AUTH: {
    requests: 5,
    window: 300000, // 5 minutes
  },
} as const;

/**
 * Common circuit breaker configurations
 */
export const CIRCUIT_BREAKER_PRESETS = {
  /**
   * Critical services (payments, orders)
   */
  CRITICAL: {
    failureThreshold: 2,
    recoveryTimeMs: 120000, // 2 minutes
  },

  /**
   * Standard services
   */
  STANDARD: {
    failureThreshold: 5,
    recoveryTimeMs: 30000, // 30 seconds
  },

  /**
   * Non-critical services
   */
  NON_CRITICAL: {
    failureThreshold: 10,
    recoveryTimeMs: 15000, // 15 seconds
  },
} as const;