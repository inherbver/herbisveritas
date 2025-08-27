/**
 * Mock pour rate-limit-decorator dans les tests
 */

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export const RATE_LIMIT_CONFIGS = {
  strict: {
    maxRequests: 10,
    windowMs: 60 * 1000,
  },
  moderate: {
    maxRequests: 30, 
    windowMs: 60 * 1000,
  },
  lenient: {
    maxRequests: 100,
    windowMs: 60 * 1000,
  },
  auth: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
  },
  payment: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000,
  },
};

// Mock qui ne fait rien - laisse passer toutes les requêtes
export function withRateLimit(config: any, actionName?: string) {
  return function (target: any) {
    // Retourne la fonction originale sans modification
    return target;
  };
}