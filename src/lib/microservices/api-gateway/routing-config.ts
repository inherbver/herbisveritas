/**
 * API Gateway Routing Configuration
 * 
 * Defines service routes and gateway configuration for microservices.
 * Maps bounded contexts to service endpoints with routing rules.
 */

import { ApiGatewayConfig, ServiceRoute } from './gateway';

/**
 * Service endpoint configuration
 */
const SERVICE_ENDPOINTS = {
  // Core Business Services
  PRODUCT_CATALOG: process.env.PRODUCT_CATALOG_URL || 'http://localhost:3001',
  INVENTORY_MANAGEMENT: process.env.INVENTORY_MANAGEMENT_URL || 'http://localhost:3002',
  SHOPPING_CART: process.env.SHOPPING_CART_URL || 'http://localhost:3003',
  ORDER_MANAGEMENT: process.env.ORDER_MANAGEMENT_URL || 'http://localhost:3004',
  PAYMENT_PROCESSING: process.env.PAYMENT_PROCESSING_URL || 'http://localhost:3005',

  // Customer Services
  USER_MANAGEMENT: process.env.USER_MANAGEMENT_URL || 'http://localhost:3006',
  ADDRESS_MANAGEMENT: process.env.ADDRESS_MANAGEMENT_URL || 'http://localhost:3007',

  // Support Services
  CONTENT_MANAGEMENT: process.env.CONTENT_MANAGEMENT_URL || 'http://localhost:3008',
  NOTIFICATION_SERVICE: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3009',
  ANALYTICS_REPORTING: process.env.ANALYTICS_REPORTING_URL || 'http://localhost:3010',
} as const;

/**
 * Product Catalog Service Routes
 */
const PRODUCT_CATALOG_ROUTES: ServiceRoute[] = [
  {
    path: '/api/products',
    service: 'PRODUCT_CATALOG',
    target: SERVICE_ENDPOINTS.PRODUCT_CATALOG,
    methods: ['GET', 'POST'],
    requiresAuth: false,
    rateLimit: {
      requests: 100,
      window: 60000, // 1 minute
    },
    timeout: 5000,
  },
  {
    path: '/api/products/:id',
    service: 'PRODUCT_CATALOG',
    target: SERVICE_ENDPOINTS.PRODUCT_CATALOG,
    methods: ['GET', 'PUT', 'DELETE'],
    requiresAuth: true,
    timeout: 5000,
  },
  {
    path: '/api/products/search',
    service: 'PRODUCT_CATALOG',
    target: SERVICE_ENDPOINTS.PRODUCT_CATALOG,
    methods: ['POST'],
    requiresAuth: false,
    rateLimit: {
      requests: 50,
      window: 60000,
    },
    timeout: 10000, // Search can take longer
  },
  {
    path: '/api/categories',
    service: 'PRODUCT_CATALOG',
    target: SERVICE_ENDPOINTS.PRODUCT_CATALOG,
    methods: ['GET', 'POST'],
    requiresAuth: false,
    rateLimit: {
      requests: 200,
      window: 60000,
    },
  },
  {
    path: '/api/categories/:id',
    service: 'PRODUCT_CATALOG',
    target: SERVICE_ENDPOINTS.PRODUCT_CATALOG,
    methods: ['GET', 'PUT', 'DELETE'],
    requiresAuth: true,
  },
];

/**
 * Inventory Management Service Routes
 */
const INVENTORY_MANAGEMENT_ROUTES: ServiceRoute[] = [
  {
    path: '/api/inventory/:productId',
    service: 'INVENTORY_MANAGEMENT',
    target: SERVICE_ENDPOINTS.INVENTORY_MANAGEMENT,
    methods: ['GET'],
    requiresAuth: false,
    rateLimit: {
      requests: 200,
      window: 60000,
    },
    circuitBreaker: {
      failureThreshold: 5,
      recoveryTimeMs: 30000,
    },
  },
  {
    path: '/api/inventory/reserve',
    service: 'INVENTORY_MANAGEMENT',
    target: SERVICE_ENDPOINTS.INVENTORY_MANAGEMENT,
    methods: ['POST'],
    requiresAuth: true,
    rateLimit: {
      requests: 50,
      window: 60000,
    },
    circuitBreaker: {
      failureThreshold: 3,
      recoveryTimeMs: 15000,
    },
  },
  {
    path: '/api/inventory/release',
    service: 'INVENTORY_MANAGEMENT',
    target: SERVICE_ENDPOINTS.INVENTORY_MANAGEMENT,
    methods: ['POST'],
    requiresAuth: true,
    circuitBreaker: {
      failureThreshold: 3,
      recoveryTimeMs: 15000,
    },
  },
  {
    path: '/api/inventory/alerts',
    service: 'INVENTORY_MANAGEMENT',
    target: SERVICE_ENDPOINTS.INVENTORY_MANAGEMENT,
    methods: ['GET'],
    requiresAuth: true,
    rateLimit: {
      requests: 20,
      window: 60000,
    },
  },
];

/**
 * Shopping Cart Service Routes
 */
const SHOPPING_CART_ROUTES: ServiceRoute[] = [
  {
    path: '/api/cart',
    service: 'SHOPPING_CART',
    target: SERVICE_ENDPOINTS.SHOPPING_CART,
    methods: ['GET'],
    requiresAuth: true,
    rateLimit: {
      requests: 100,
      window: 60000,
    },
    timeout: 3000,
  },
  {
    path: '/api/cart/items',
    service: 'SHOPPING_CART',
    target: SERVICE_ENDPOINTS.SHOPPING_CART,
    methods: ['POST', 'PUT', 'DELETE'],
    requiresAuth: true,
    rateLimit: {
      requests: 50,
      window: 60000,
    },
    timeout: 5000,
  },
  {
    path: '/api/cart/items/:id',
    service: 'SHOPPING_CART',
    target: SERVICE_ENDPOINTS.SHOPPING_CART,
    methods: ['PUT', 'DELETE'],
    requiresAuth: true,
    timeout: 3000,
  },
  {
    path: '/api/cart/clear',
    service: 'SHOPPING_CART',
    target: SERVICE_ENDPOINTS.SHOPPING_CART,
    methods: ['POST'],
    requiresAuth: true,
    timeout: 3000,
  },
];

/**
 * Order Management Service Routes
 */
const ORDER_MANAGEMENT_ROUTES: ServiceRoute[] = [
  {
    path: '/api/orders',
    service: 'ORDER_MANAGEMENT',
    target: SERVICE_ENDPOINTS.ORDER_MANAGEMENT,
    methods: ['GET', 'POST'],
    requiresAuth: true,
    rateLimit: {
      requests: 30,
      window: 60000,
    },
    timeout: 10000, // Order creation can take time
    circuitBreaker: {
      failureThreshold: 3,
      recoveryTimeMs: 60000,
    },
  },
  {
    path: '/api/orders/:id',
    service: 'ORDER_MANAGEMENT',
    target: SERVICE_ENDPOINTS.ORDER_MANAGEMENT,
    methods: ['GET', 'PUT'],
    requiresAuth: true,
    timeout: 5000,
  },
  {
    path: '/api/orders/:id/status',
    service: 'ORDER_MANAGEMENT',
    target: SERVICE_ENDPOINTS.ORDER_MANAGEMENT,
    methods: ['PUT'],
    requiresAuth: true,
    timeout: 5000,
  },
  {
    path: '/api/orders/:id/cancel',
    service: 'ORDER_MANAGEMENT',
    target: SERVICE_ENDPOINTS.ORDER_MANAGEMENT,
    methods: ['POST'],
    requiresAuth: true,
    timeout: 10000,
  },
  {
    path: '/api/orders/:id/return',
    service: 'ORDER_MANAGEMENT',
    target: SERVICE_ENDPOINTS.ORDER_MANAGEMENT,
    methods: ['POST'],
    requiresAuth: true,
    timeout: 10000,
  },
];

/**
 * Payment Processing Service Routes
 */
const PAYMENT_PROCESSING_ROUTES: ServiceRoute[] = [
  {
    path: '/api/payments/intent',
    service: 'PAYMENT_PROCESSING',
    target: SERVICE_ENDPOINTS.PAYMENT_PROCESSING,
    methods: ['POST'],
    requiresAuth: true,
    rateLimit: {
      requests: 20,
      window: 60000,
    },
    timeout: 15000, // Payment processing can take time
    retries: 2,
    circuitBreaker: {
      failureThreshold: 2,
      recoveryTimeMs: 120000, // Longer recovery for payments
    },
  },
  {
    path: '/api/payments/confirm',
    service: 'PAYMENT_PROCESSING',
    target: SERVICE_ENDPOINTS.PAYMENT_PROCESSING,
    methods: ['POST'],
    requiresAuth: true,
    timeout: 15000,
    retries: 2,
    circuitBreaker: {
      failureThreshold: 2,
      recoveryTimeMs: 120000,
    },
  },
  {
    path: '/api/payments/refund',
    service: 'PAYMENT_PROCESSING',
    target: SERVICE_ENDPOINTS.PAYMENT_PROCESSING,
    methods: ['POST'],
    requiresAuth: true,
    timeout: 15000,
    retries: 1,
  },
  {
    path: '/api/webhooks/stripe',
    service: 'PAYMENT_PROCESSING',
    target: SERVICE_ENDPOINTS.PAYMENT_PROCESSING,
    methods: ['POST'],
    requiresAuth: false, // Webhooks use signature verification
    timeout: 10000,
  },
];

/**
 * User Management Service Routes
 */
const USER_MANAGEMENT_ROUTES: ServiceRoute[] = [
  {
    path: '/api/auth/register',
    service: 'USER_MANAGEMENT',
    target: SERVICE_ENDPOINTS.USER_MANAGEMENT,
    methods: ['POST'],
    requiresAuth: false,
    rateLimit: {
      requests: 5,
      window: 300000, // 5 minutes
    },
    timeout: 10000,
  },
  {
    path: '/api/auth/login',
    service: 'USER_MANAGEMENT',
    target: SERVICE_ENDPOINTS.USER_MANAGEMENT,
    methods: ['POST'],
    requiresAuth: false,
    rateLimit: {
      requests: 10,
      window: 300000,
    },
    timeout: 5000,
  },
  {
    path: '/api/users/profile',
    service: 'USER_MANAGEMENT',
    target: SERVICE_ENDPOINTS.USER_MANAGEMENT,
    methods: ['GET', 'PUT'],
    requiresAuth: true,
    timeout: 5000,
  },
  {
    path: '/api/users/account',
    service: 'USER_MANAGEMENT',
    target: SERVICE_ENDPOINTS.USER_MANAGEMENT,
    methods: ['DELETE'],
    requiresAuth: true,
    timeout: 10000,
  },
];

/**
 * Address Management Service Routes
 */
const ADDRESS_MANAGEMENT_ROUTES: ServiceRoute[] = [
  {
    path: '/api/addresses',
    service: 'ADDRESS_MANAGEMENT',
    target: SERVICE_ENDPOINTS.ADDRESS_MANAGEMENT,
    methods: ['GET', 'POST'],
    requiresAuth: true,
    rateLimit: {
      requests: 50,
      window: 60000,
    },
    timeout: 5000,
  },
  {
    path: '/api/addresses/:id',
    service: 'ADDRESS_MANAGEMENT',
    target: SERVICE_ENDPOINTS.ADDRESS_MANAGEMENT,
    methods: ['GET', 'PUT', 'DELETE'],
    requiresAuth: true,
    timeout: 3000,
  },
  {
    path: '/api/addresses/validate',
    service: 'ADDRESS_MANAGEMENT',
    target: SERVICE_ENDPOINTS.ADDRESS_MANAGEMENT,
    methods: ['POST'],
    requiresAuth: false,
    rateLimit: {
      requests: 100,
      window: 60000,
    },
    timeout: 10000, // Address validation can take time
  },
];

/**
 * Content Management Service Routes
 */
const CONTENT_MANAGEMENT_ROUTES: ServiceRoute[] = [
  {
    path: '/api/articles',
    service: 'CONTENT_MANAGEMENT',
    target: SERVICE_ENDPOINTS.CONTENT_MANAGEMENT,
    methods: ['GET', 'POST'],
    requiresAuth: false, // GET is public, POST requires auth in service
    rateLimit: {
      requests: 200,
      window: 60000,
    },
    timeout: 5000,
  },
  {
    path: '/api/articles/:id',
    service: 'CONTENT_MANAGEMENT',
    target: SERVICE_ENDPOINTS.CONTENT_MANAGEMENT,
    methods: ['GET', 'PUT', 'DELETE'],
    requiresAuth: false, // GET is public
    timeout: 5000,
  },
  {
    path: '/api/articles/:id/publish',
    service: 'CONTENT_MANAGEMENT',
    target: SERVICE_ENDPOINTS.CONTENT_MANAGEMENT,
    methods: ['POST'],
    requiresAuth: true,
    timeout: 3000,
  },
];

/**
 * Notification Service Routes
 */
const NOTIFICATION_SERVICE_ROUTES: ServiceRoute[] = [
  {
    path: '/api/notifications/send',
    service: 'NOTIFICATION_SERVICE',
    target: SERVICE_ENDPOINTS.NOTIFICATION_SERVICE,
    methods: ['POST'],
    requiresAuth: true,
    rateLimit: {
      requests: 100,
      window: 60000,
    },
    timeout: 10000,
  },
  {
    path: '/api/notifications/templates',
    service: 'NOTIFICATION_SERVICE',
    target: SERVICE_ENDPOINTS.NOTIFICATION_SERVICE,
    methods: ['GET'],
    requiresAuth: true,
    timeout: 3000,
  },
  {
    path: '/api/notifications/preferences',
    service: 'NOTIFICATION_SERVICE',
    target: SERVICE_ENDPOINTS.NOTIFICATION_SERVICE,
    methods: ['GET', 'PUT'],
    requiresAuth: true,
    timeout: 3000,
  },
];

/**
 * Analytics & Reporting Service Routes
 */
const ANALYTICS_REPORTING_ROUTES: ServiceRoute[] = [
  {
    path: '/api/analytics/track',
    service: 'ANALYTICS_REPORTING',
    target: SERVICE_ENDPOINTS.ANALYTICS_REPORTING,
    methods: ['POST'],
    requiresAuth: false, // Anonymous tracking allowed
    rateLimit: {
      requests: 1000,
      window: 60000,
    },
    timeout: 2000, // Analytics should be fast
  },
  {
    path: '/api/analytics/reports',
    service: 'ANALYTICS_REPORTING',
    target: SERVICE_ENDPOINTS.ANALYTICS_REPORTING,
    methods: ['GET'],
    requiresAuth: true,
    rateLimit: {
      requests: 50,
      window: 60000,
    },
    timeout: 30000, // Reports can take time
  },
  {
    path: '/api/analytics/dashboards',
    service: 'ANALYTICS_REPORTING',
    target: SERVICE_ENDPOINTS.ANALYTICS_REPORTING,
    methods: ['GET'],
    requiresAuth: true,
    timeout: 15000,
  },
  {
    path: '/api/analytics/export',
    service: 'ANALYTICS_REPORTING',
    target: SERVICE_ENDPOINTS.ANALYTICS_REPORTING,
    methods: ['POST'],
    requiresAuth: true,
    rateLimit: {
      requests: 5,
      window: 300000, // 5 minutes
    },
    timeout: 60000, // Exports can take very long
  },
];

/**
 * Complete API Gateway Configuration
 */
export const API_GATEWAY_CONFIG: ApiGatewayConfig = {
  services: {
    PRODUCT_CATALOG: PRODUCT_CATALOG_ROUTES,
    INVENTORY_MANAGEMENT: INVENTORY_MANAGEMENT_ROUTES,
    SHOPPING_CART: SHOPPING_CART_ROUTES,
    ORDER_MANAGEMENT: ORDER_MANAGEMENT_ROUTES,
    PAYMENT_PROCESSING: PAYMENT_PROCESSING_ROUTES,
    USER_MANAGEMENT: USER_MANAGEMENT_ROUTES,
    ADDRESS_MANAGEMENT: ADDRESS_MANAGEMENT_ROUTES,
    CONTENT_MANAGEMENT: CONTENT_MANAGEMENT_ROUTES,
    NOTIFICATION_SERVICE: NOTIFICATION_SERVICE_ROUTES,
    ANALYTICS_REPORTING: ANALYTICS_REPORTING_ROUTES,
  },
  defaultTimeout: 5000,
  defaultRetries: 1,
  enableLogging: true,
  enableMetrics: true,
};

/**
 * Environment-specific configuration
 */
export const getEnvironmentConfig = (): Partial<ApiGatewayConfig> => {
  const env = process.env.NODE_ENV || 'development';

  switch (env) {
    case 'production':
      return {
        defaultTimeout: 10000,
        defaultRetries: 2,
        enableLogging: true,
        enableMetrics: true,
      };

    case 'staging':
      return {
        defaultTimeout: 8000,
        defaultRetries: 2,
        enableLogging: true,
        enableMetrics: true,
      };

    case 'development':
    default:
      return {
        defaultTimeout: 5000,
        defaultRetries: 1,
        enableLogging: true,
        enableMetrics: false,
      };
  }
};

/**
 * Get merged configuration for current environment
 */
export const getApiGatewayConfig = (): ApiGatewayConfig => {
  const envConfig = getEnvironmentConfig();
  return {
    ...API_GATEWAY_CONFIG,
    ...envConfig,
  };
};

/**
 * Service health check endpoints
 */
export const HEALTH_CHECK_ENDPOINTS = {
  PRODUCT_CATALOG: `${SERVICE_ENDPOINTS.PRODUCT_CATALOG}/health`,
  INVENTORY_MANAGEMENT: `${SERVICE_ENDPOINTS.INVENTORY_MANAGEMENT}/health`,
  SHOPPING_CART: `${SERVICE_ENDPOINTS.SHOPPING_CART}/health`,
  ORDER_MANAGEMENT: `${SERVICE_ENDPOINTS.ORDER_MANAGEMENT}/health`,
  PAYMENT_PROCESSING: `${SERVICE_ENDPOINTS.PAYMENT_PROCESSING}/health`,
  USER_MANAGEMENT: `${SERVICE_ENDPOINTS.USER_MANAGEMENT}/health`,
  ADDRESS_MANAGEMENT: `${SERVICE_ENDPOINTS.ADDRESS_MANAGEMENT}/health`,
  CONTENT_MANAGEMENT: `${SERVICE_ENDPOINTS.CONTENT_MANAGEMENT}/health`,
  NOTIFICATION_SERVICE: `${SERVICE_ENDPOINTS.NOTIFICATION_SERVICE}/health`,
  ANALYTICS_REPORTING: `${SERVICE_ENDPOINTS.ANALYTICS_REPORTING}/health`,
} as const;

export { SERVICE_ENDPOINTS };