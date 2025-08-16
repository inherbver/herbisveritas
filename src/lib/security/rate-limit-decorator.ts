/**
 * Rate Limiting Decorator pour Server Actions
 * 
 * OBJECTIF: Protéger les Server Actions contre les attaques DDoS et brute force
 * CRITICITÉ: HAUTE - Vulnérabilité de sécurité critique
 * 
 * Fonctionnalités:
 * - Décorateur @withRateLimit simple à utiliser
 * - Configuration par endpoint
 * - Stockage en mémoire (production: Redis)
 * - Logs de sécurité automatiques
 * - Integration avec le système d'auth existant
 */

import { headers } from "next/headers";
import { logSecurityEvent } from "@/lib/auth/admin-service";
import { RateLimitError } from "@/lib/core/errors";
import { logger } from "@/lib/core/logger";

/**
 * Configuration du rate limiting
 */
interface RateLimitConfig {
  windowMs: number; // Fenêtre de temps en millisecondes
  maxRequests: number; // Nombre max de requêtes par fenêtre
  keyGenerator?: (context: RateLimitContext) => string; // Générateur de clé personnalisé
  message?: string; // Message d'erreur personnalisé
  skipSuccessfulRequests?: boolean; // Ne pas compter les requêtes réussies
  skipFailedRequests?: boolean; // Ne pas compter les requêtes échouées
}

/**
 * Contexte pour le rate limiting
 */
interface RateLimitContext {
  userId?: string;
  ip: string;
  userAgent: string;
  timestamp: number;
  actionName: string;
}

/**
 * Entrée dans le store de rate limiting
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

/**
 * Store en mémoire pour le rate limiting
 * En production, remplacer par Redis
 */
class InMemoryRateLimitStore {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Nettoyer les entrées expirées toutes les 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Obtient une entrée du store
   */
  get(key: string): RateLimitEntry | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    // Vérifier si l'entrée a expiré
    if (Date.now() > entry.resetTime) {
      this.store.delete(key);
      return null;
    }

    return entry;
  }

  /**
   * Incrémente le compteur pour une clé
   */
  increment(key: string, windowMs: number): RateLimitEntry {
    const now = Date.now();
    const entry = this.get(key);

    if (!entry) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + windowMs,
        firstRequest: now
      };
      this.store.set(key, newEntry);
      return newEntry;
    }

    entry.count++;
    this.store.set(key, entry);
    return entry;
  }

  /**
   * Nettoie les entrées expirées
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Obtient les statistiques du store
   */
  getStats(): { totalEntries: number; memoryUsage: string } {
    return {
      totalEntries: this.store.size,
      memoryUsage: `${Math.round(JSON.stringify([...this.store]).length / 1024)}KB`
    };
  }

  /**
   * Nettoie tout le store (pour les tests)
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Détruit le store et arrête les timers
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Instance globale du store
const rateLimitStore = new InMemoryRateLimitStore();

/**
 * Configurations prédéfinies pour différents types d'actions
 */
export const RATE_LIMIT_CONFIGS = {
  // Actions d'authentification - très restrictif
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 tentatives par 15 minutes
    message: "Trop de tentatives de connexion. Réessayez dans 15 minutes."
  },

  // Actions de paiement - restrictif
  PAYMENT: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 3, // 3 tentatives par minute
    message: "Trop de tentatives de paiement. Réessayez dans 1 minute."
  },

  // Actions admin - modérément restrictif
  ADMIN: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // 20 actions par minute
    message: "Trop d'actions administratives. Réessayez dans 1 minute."
  },

  // Actions de panier - permissif
  CART: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 actions par minute
    message: "Trop d'actions sur le panier. Réessayez dans 1 minute."
  },

  // Actions de contenu - standard
  CONTENT: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 15, // 15 actions par minute
    message: "Trop d'actions sur le contenu. Réessayez dans 1 minute."
  },

  // Actions par défaut
  DEFAULT: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 actions par minute
    message: "Trop de requêtes. Réessayez dans 1 minute."
  }
} as const;

/**
 * Crée le contexte de rate limiting
 */
async function createRateLimitContext(actionName: string, userId?: string): Promise<RateLimitContext> {
  const headersList = await headers();
  
  return {
    userId,
    ip: getClientIP(headersList),
    userAgent: headersList.get("user-agent") || "unknown",
    timestamp: Date.now(),
    actionName
  };
}

/**
 * Extrait l'IP client des headers
 */
function getClientIP(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return (
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    headers.get("x-client-ip") ||
    "unknown"
  );
}

/**
 * Génère une clé de rate limiting
 */
function generateRateLimitKey(config: RateLimitConfig, context: RateLimitContext): string {
  if (config.keyGenerator) {
    return config.keyGenerator(context);
  }

  // Clé par défaut: action:userId ou action:ip
  const identifier = context.userId || context.ip;
  return `${context.actionName}:${identifier}`;
}

/**
 * Vérifie le rate limiting pour une action
 */
async function checkRateLimit(
  actionName: string,
  config: RateLimitConfig,
  userId?: string
): Promise<void> {
  const context = await createRateLimitContext(actionName, userId);
  const key = generateRateLimitKey(config, context);
  
  const entry = rateLimitStore.increment(key, config.windowMs);
  
  if (entry.count > config.maxRequests) {
    const resetInSeconds = Math.ceil((entry.resetTime - Date.now()) / 1000);
    
    // Logger l'événement de sécurité
    await logSecurityEvent({
      type: "rate_limit_exceeded",
      userId: context.userId,
      details: {
        message: `Rate limit dépassé pour ${actionName}`,
        action: actionName,
        count: entry.count,
        limit: config.maxRequests,
        resetInSeconds,
        ip: context.ip,
        userAgent: context.userAgent,
        timestamp: new Date().toISOString()
      }
    });

    logger.warn("Rate limit exceeded", {
      actionName,
      key,
      count: entry.count,
      limit: config.maxRequests,
      resetInSeconds,
      context
    });

    const message = config.message || `Trop de requêtes. Réessayez dans ${resetInSeconds} secondes.`;
    throw new RateLimitError(message);
  }

  // Logger les requêtes normales (debug)
  logger.debug("Rate limit check passed", {
    actionName,
    key,
    count: entry.count,
    limit: config.maxRequests,
    context
  });
}

/**
 * Décorateur pour appliquer le rate limiting
 */
export function withRateLimit<T extends (...args: any[]) => any>(
  config: RateLimitConfig | keyof typeof RATE_LIMIT_CONFIGS,
  actionName?: string
) {
  return function (target: T, propertyKey?: string): T {
    const finalActionName = actionName || propertyKey || target.name || 'unknown-action';
    const finalConfig = typeof config === 'string' ? RATE_LIMIT_CONFIGS[config] : config;

    const wrappedFunction = async (...args: Parameters<T>) => {
      try {
        // Extraire l'userId du premier argument si c'est un objet FormData ou object
        let userId: string | undefined;
        
        if (args.length > 0) {
          const firstArg = args[0];
          if (firstArg instanceof FormData) {
            userId = firstArg.get('userId')?.toString();
          } else if (typeof firstArg === 'object' && firstArg !== null) {
            userId = (firstArg as any).userId || (firstArg as any).user_id;
          }
        }

        // Vérifier le rate limit AVANT l'exécution
        await checkRateLimit(finalActionName, finalConfig, userId);

        // Exécuter la fonction originale
        const result = await target.apply(this, args);

        // Optionnel: ne pas compter les requêtes réussies si configuré
        if (finalConfig.skipSuccessfulRequests) {
          // TODO: Implémenter la logique pour ne pas compter cette requête
        }

        return result;

      } catch (error) {
        // Optionnel: ne pas compter les requêtes échouées si configuré
        if (finalConfig.skipFailedRequests && !(error instanceof RateLimitError)) {
          // TODO: Implémenter la logique pour ne pas compter cette requête
        }

        throw error;
      }
    };

    return wrappedFunction as T;
  };
}

/**
 * Utilitaires pour le monitoring du rate limiting
 */
export const RateLimitUtils = {
  /**
   * Obtient les statistiques du rate limiting
   */
  getStats() {
    return rateLimitStore.getStats();
  },

  /**
   * Nettoie le store (pour les tests)
   */
  clearStore() {
    rateLimitStore.clear();
  },

  /**
   * Vérifie le statut du rate limiting pour une clé
   */
  async checkStatus(actionName: string, userId?: string): Promise<{
    remaining: number;
    resetTime: number;
    total: number;
  } | null> {
    const context = await createRateLimitContext(actionName, userId);
    const key = generateRateLimitKey(RATE_LIMIT_CONFIGS.DEFAULT, context);
    const entry = rateLimitStore.get(key);
    
    if (!entry) {
      return null;
    }

    return {
      remaining: Math.max(0, RATE_LIMIT_CONFIGS.DEFAULT.maxRequests - entry.count),
      resetTime: entry.resetTime,
      total: RATE_LIMIT_CONFIGS.DEFAULT.maxRequests
    };
  },

  /**
   * Crée une configuration personnalisée
   */
  createConfig(
    windowMs: number,
    maxRequests: number,
    options?: Partial<RateLimitConfig>
  ): RateLimitConfig {
    return {
      windowMs,
      maxRequests,
      ...options
    };
  }
};

/**
 * Middleware pour Express-like frameworks (si nécessaire)
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return async (req: any, res: any, next: any) => {
    try {
      const context: RateLimitContext = {
        ip: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        timestamp: Date.now(),
        actionName: req.path || 'unknown'
      };

      const key = generateRateLimitKey(config, context);
      const entry = rateLimitStore.increment(key, config.windowMs);

      if (entry.count > config.maxRequests) {
        const resetInSeconds = Math.ceil((entry.resetTime - Date.now()) / 1000);
        res.status(429).json({
          error: config.message || 'Trop de requêtes',
          resetInSeconds
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

// Nettoyer le store à l'arrêt de l'application
if (typeof process !== 'undefined') {
  process.on('SIGTERM', () => rateLimitStore.destroy());
  process.on('SIGINT', () => rateLimitStore.destroy());
}