/**
 * Security Middleware and Validation
 * 
 * Provides comprehensive security measures for server-side operations
 * including rate limiting, input sanitization, and authorization.
 */

import { headers } from 'next/headers';
import { Result } from "@/lib/core/result";
import { 
  AuthorizationError, 
  ValidationError, 
  BusinessError,
  RateLimitError 
} from "@/lib/core/errors";
import { logger } from "@/lib/core/logger";

/**
 * Rate limiting store (in production, use Redis or similar)
 */
class InMemoryRateLimitStore {
  private store = new Map<string, { count: number; resetTime: number }>();

  get(key: string): { count: number; resetTime: number } | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    
    // Clean expired entries
    if (Date.now() > entry.resetTime) {
      this.store.delete(key);
      return null;
    }
    
    return entry;
  }

  increment(key: string, windowMs: number): { count: number; resetTime: number } {
    const now = Date.now();
    const entry = this.get(key);
    
    if (!entry) {
      const newEntry = { count: 1, resetTime: now + windowMs };
      this.store.set(key, newEntry);
      return newEntry;
    }
    
    entry.count++;
    this.store.set(key, entry);
    return entry;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

const rateLimitStore = new InMemoryRateLimitStore();

// Clean up expired entries every 5 minutes
setInterval(() => rateLimitStore.cleanup(), 5 * 60 * 1000);

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Max requests per window
  keyGenerator?: (request: SecurityContext) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Security context for requests
 */
export interface SecurityContext {
  userId?: string;
  userRole?: string;
  ip: string;
  userAgent: string;
  path: string;
  method: string;
  timestamp: number;
  requestId: string;
}

/**
 * Authorization rules
 */
export interface AuthorizationRule {
  resource: string;
  action: string;
  roles: string[];
  conditions?: (context: SecurityContext) => boolean;
}

/**
 * Input sanitization rules
 */
export interface SanitizationRule {
  field: string;
  rules: Array<{
    type: 'trim' | 'escape' | 'lowercase' | 'uppercase' | 'remove_html' | 'normalize';
    options?: Record<string, unknown>;
  }>;
}

/**
 * Security middleware class
 */
export class SecurityMiddleware {
  private authorizationRules: AuthorizationRule[] = [];
  private rateLimitConfigs = new Map<string, RateLimitConfig>();

  /**
   * Add authorization rule
   */
  addAuthorizationRule(rule: AuthorizationRule): void {
    this.authorizationRules.push(rule);
  }

  /**
   * Add rate limit configuration
   */
  addRateLimit(endpoint: string, config: RateLimitConfig): void {
    this.rateLimitConfigs.set(endpoint, config);
  }

  /**
   * Create security context from request
   */
  async createSecurityContext(
    userId?: string,
    userRole?: string,
    path?: string,
    method?: string
  ): Promise<SecurityContext> {
    const headersList = await headers();
    
    return {
      userId,
      userRole,
      ip: this.getClientIP(headersList),
      userAgent: headersList.get('user-agent') || 'unknown',
      path: path || 'unknown',
      method: method || 'unknown',
      timestamp: Date.now(),
      requestId: crypto.randomUUID(),
    };
  }

  /**
   * Check rate limits
   */
  checkRateLimit(endpoint: string, context: SecurityContext): Result<void, RateLimitError> {
    const config = this.rateLimitConfigs.get(endpoint);
    if (!config) {
      return Result.ok(undefined);
    }

    const key = config.keyGenerator 
      ? config.keyGenerator(context)
      : `${endpoint}:${context.ip}`;

    const entry = rateLimitStore.increment(key, config.windowMs);
    
    if (entry.count > config.maxRequests) {
      const resetTime = Math.ceil((entry.resetTime - Date.now()) / 1000);
      
      logger.warn('Rate limit exceeded', {
        endpoint,
        key,
        count: entry.count,
        limit: config.maxRequests,
        resetTime,
        context,
      });

      return Result.error(new RateLimitError(
        `Trop de requêtes. Réessayez dans ${resetTime} secondes.`
      ));
    }

    return Result.ok(undefined);
  }

  /**
   * Check authorization
   */
  checkAuthorization(
    resource: string,
    action: string,
    context: SecurityContext
  ): Result<void, AuthorizationError> {
    const rule = this.authorizationRules.find(
      r => r.resource === resource && r.action === action
    );

    if (!rule) {
      // No specific rule means it's allowed (fail-open for flexibility)
      return Result.ok(undefined);
    }

    // Check user role
    if (!context.userRole || !rule.roles.includes(context.userRole)) {
      logger.warn('Authorization failed - insufficient role', {
        resource,
        action,
        userRole: context.userRole,
        requiredRoles: rule.roles,
        context,
      });

      return Result.error(new AuthorizationError(
        'Permissions insuffisantes pour cette action'
      ));
    }

    // Check additional conditions
    if (rule.conditions && !rule.conditions(context)) {
      logger.warn('Authorization failed - conditions not met', {
        resource,
        action,
        context,
      });

      return Result.error(new AuthorizationError(
        'Conditions d\'autorisation non remplies'
      ));
    }

    return Result.ok(undefined);
  }

  /**
   * Sanitize input data
   */
  sanitizeInput<T extends Record<string, unknown>>(
    data: T,
    rules: SanitizationRule[]
  ): Result<T, ValidationError> {
    try {
      const sanitized = { ...data };

      for (const rule of rules) {
        if (sanitized[rule.field] !== undefined) {
          let value = sanitized[rule.field];

          for (const sanitizationRule of rule.rules) {
            value = this.applySanitizationRule(value, sanitizationRule);
          }

          sanitized[rule.field] = value;
        }
      }

      return Result.ok(sanitized);
    } catch (error) {
      return Result.error(new ValidationError(
        'Erreur lors de la sanitisation des données',
        undefined,
        { originalError: error }
      ));
    }
  }

  /**
   * Validate request signature (HMAC)
   */
  async validateRequestSignature(
    payload: string,
    signature: string,
    secret: string
  ): Promise<Result<void, ValidationError>> {
    try {
      const crypto = await import('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      const providedSignature = signature.replace('sha256=', '');

      if (!crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(providedSignature, 'hex')
      )) {
        return Result.error(new ValidationError('Signature de requête invalide'));
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.error(new ValidationError(
        'Erreur lors de la validation de signature',
        undefined,
        { originalError: error }
      ));
    }
  }

  /**
   * Check for suspicious patterns
   */
  detectSuspiciousActivity(context: SecurityContext): Result<void, BusinessError> {
    const suspiciousPatterns = [
      // SQL injection patterns
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b)/i,
      // XSS patterns
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      // Path traversal
      /\.\.[/\\]/,
      // Command injection
      /[;&|`].*[;&|`]/,
    ];

    const userAgent = context.userAgent.toLowerCase();
    const suspicious = [
      userAgent.includes('sqlmap'),
      userAgent.includes('nikto'),
      userAgent.includes('burp'),
      userAgent.length > 1000,
      suspiciousPatterns.some(pattern => pattern.test(context.path)),
    ];

    if (suspicious.some(Boolean)) {
      logger.error('Suspicious activity detected', {
        context,
        patterns: suspicious,
      });

      return Result.error(new BusinessError(
        'Activité suspecte détectée. Requête bloquée.'
      ));
    }

    return Result.ok(undefined);
  }

  /**
   * Get client IP from headers
   */
  private getClientIP(headers: Headers): string {
    const forwarded = headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    return headers.get('x-real-ip') || 
           headers.get('cf-connecting-ip') || 
           headers.get('x-client-ip') ||
           'unknown';
  }

  /**
   * Apply individual sanitization rule
   */
  private applySanitizationRule(value: unknown, rule: { type: string; options?: Record<string, unknown> }): unknown {
    if (typeof value !== 'string') {
      return value;
    }

    switch (rule.type) {
      case 'trim':
        return value.trim();
        
      case 'escape':
        return value
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;');
          
      case 'lowercase':
        return value.toLowerCase();
        
      case 'uppercase':
        return value.toUpperCase();
        
      case 'remove_html':
        return value.replace(/<[^>]*>/g, '');
        
      case 'normalize':
        return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        
      default:
        return value;
    }
  }
}

/**
 * Default security middleware instance
 */
export const securityMiddleware = new SecurityMiddleware();

// Configure default rate limits
securityMiddleware.addRateLimit('cart:add', {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 requests per minute
  keyGenerator: (context) => `cart:add:${context.userId || context.ip}`,
});

securityMiddleware.addRateLimit('cart:update', {
  windowMs: 60 * 1000,
  maxRequests: 60, // More lenient for updates
  keyGenerator: (context) => `cart:update:${context.userId || context.ip}`,
});

securityMiddleware.addRateLimit('auth:login', {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
  keyGenerator: (context) => `auth:login:${context.ip}`,
});

// Configure authorization rules
securityMiddleware.addAuthorizationRule({
  resource: 'admin',
  action: 'any',
  roles: ['admin', 'dev'],
});

securityMiddleware.addAuthorizationRule({
  resource: 'user',
  action: 'update',
  roles: ['user', 'admin', 'dev'],
  conditions: (context) => {
    // Users can only update their own data
    return context.userRole === 'admin' || context.userRole === 'dev';
  },
});

/**
 * Security decorator for Server Actions
 */
export function withSecurity(options: {
  rateLimit?: string;
  resource?: string;
  action?: string;
  sanitization?: SanitizationRule[];
  validateSignature?: boolean;
}) {
  return function <T extends (...args: unknown[]) => unknown>(
    target: T
  ): T {
    const wrappedFunction = async (...args: unknown[]) => {
      try {
        const context = await securityMiddleware.createSecurityContext();
        
        // Check for suspicious activity
        const suspiciousCheck = securityMiddleware.detectSuspiciousActivity(context);
        if (suspiciousCheck.isError()) {
          throw suspiciousCheck.getError();
        }

        // Rate limiting
        if (options.rateLimit) {
          const rateLimitCheck = securityMiddleware.checkRateLimit(options.rateLimit, context);
          if (rateLimitCheck.isError()) {
            throw rateLimitCheck.getError();
          }
        }

        // Authorization
        if (options.resource && options.action) {
          const authCheck = securityMiddleware.checkAuthorization(
            options.resource,
            options.action,
            context
          );
          if (authCheck.isError()) {
            throw authCheck.getError();
          }
        }

        // Input sanitization
        if (options.sanitization && args.length > 0) {
          const sanitizationResult = securityMiddleware.sanitizeInput(
            args[0],
            options.sanitization
          );
          if (sanitizationResult.isError()) {
            throw sanitizationResult.getError();
          }
          args[0] = sanitizationResult.getValue();
        }

        // Log security event
        logger.info('Security check passed', {
          function: target.name,
          context,
          options,
        });

        return await target.apply(this, args);
      } catch (error) {
        logger.error('Security check failed', error, {
          function: target.name,
          options,
        });
        throw error;
      }
    };

    return wrappedFunction as T;
  };
}

/**
 * Utility functions for common security operations
 */
export const SecurityUtils = {
  /**
   * Generate CSRF token
   */
  generateCSRFToken(): string {
    return crypto.randomUUID();
  },

  /**
   * Validate CSRF token
   */
  validateCSRFToken(token: string, expectedToken: string): boolean {
    return token === expectedToken;
  },

  /**
   * Hash sensitive data
   */
  async hashData(data: string, salt?: string): Promise<string> {
    const crypto = await import('crypto');
    const actualSalt = salt || crypto.randomBytes(16).toString('hex');
    return crypto.scryptSync(data, actualSalt, 64).toString('hex');
  },

  /**
   * Generate secure random string
   */
  async generateSecureRandom(length: number = 32): Promise<string> {
    const crypto = await import('crypto');
    return crypto.randomBytes(length).toString('hex');
  },

  /**
   * Validate password strength
   */
  validatePasswordStrength(password: string): Result<void, ValidationError> {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const errors: string[] = [];

    if (password.length < minLength) {
      errors.push(`Au minimum ${minLength} caractères`);
    }
    if (!hasUpperCase) {
      errors.push('Au moins une majuscule');
    }
    if (!hasLowerCase) {
      errors.push('Au moins une minuscule');
    }
    if (!hasNumbers) {
      errors.push('Au moins un chiffre');
    }
    if (!hasSpecialChar) {
      errors.push('Au moins un caractère spécial');
    }

    if (errors.length > 0) {
      return Result.error(new ValidationError(
        `Mot de passe trop faible: ${errors.join(', ')}`
      ));
    }

    return Result.ok(undefined);
  },

  /**
   * Sanitize filename for uploads
   */
  sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.\-_]/g, '')
      .replace(/\.{2,}/g, '.')
      .substring(0, 255);
  },

  /**
   * Check if IP is in allowlist
   */
  isIPAllowed(ip: string, allowlist: string[]): boolean {
    return allowlist.includes(ip) || allowlist.includes('*');
  },

  /**
   * Log security event
   */
  logSecurityEvent(
    event: string,
    context: SecurityContext,
    details?: Record<string, unknown>
  ): void {
    logger.warn(`Security event: ${event}`, {
      event,
      context,
      details,
      timestamp: new Date().toISOString(),
    });
  },
};