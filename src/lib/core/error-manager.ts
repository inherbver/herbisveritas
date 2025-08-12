/**
 * Gestionnaire Global d'Erreurs
 * Architecture extensible pour toutes les erreurs de l'application
 */

import { toast } from "sonner";

// ============================================
// Types et Interfaces
// ============================================

export enum ErrorDomain {
  AUTH = "AUTH",
  API = "API",
  PAYMENT = "PAYMENT",
  CART = "CART",
  PRODUCT = "PRODUCT",
  NETWORK = "NETWORK",
  VALIDATION = "VALIDATION",
  PERMISSION = "PERMISSION",
  DATABASE = "DATABASE",
  STORAGE = "STORAGE",
  UNKNOWN = "UNKNOWN",
}

export enum ErrorSeverity {
  LOW = "LOW", // Informatif seulement
  MEDIUM = "MEDIUM", // Perturbation mineure
  HIGH = "HIGH", // Fonctionnalité bloquée
  CRITICAL = "CRITICAL", // Application inutilisable
}

export interface ErrorMetadata {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  url?: string;
  method?: string;
  statusCode?: number;
  stack?: string;
  userAgent?: string;
  timestamp: Date;
  [key: string]: unknown;
}

export interface ApplicationError {
  id: string;
  domain: ErrorDomain;
  code: string;
  message: string;
  severity: ErrorSeverity;
  retryable: boolean;
  metadata: ErrorMetadata;
  originalError?: Error | unknown;
}

export interface ErrorHandlerConfig {
  domain: ErrorDomain;
  canHandle: (error: unknown) => boolean;
  handle: (error: ApplicationError, context: ErrorContext) => Promise<ErrorResolution>;
  priority: number;
  retryConfig?: RetryConfig;
}

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  shouldRetry?: (error: ApplicationError, attempt: number) => boolean;
}

export interface ErrorContext {
  router?: { push: (url: string) => void; replace: (url: string) => void } | unknown;
  retryCount: number;
  lastAttempt?: Date;
  userAction?: string;
  component?: string;
}

export interface ErrorResolution {
  resolved: boolean;
  action?: "RETRY" | "REDIRECT" | "NOTIFY" | "LOG" | "IGNORE";
  message?: string;
  nextSteps?: () => Promise<void>;
}

export interface ErrorRecoveryStrategy {
  domain: ErrorDomain;
  strategy: (error: ApplicationError) => Promise<boolean>;
}

// ============================================
// Gestionnaire Principal
// ============================================

class GlobalErrorManager {
  private static instance: GlobalErrorManager;
  private handlers: Map<ErrorDomain, ErrorHandlerConfig[]> = new Map();
  private errorLog: ApplicationError[] = [];
  private recoveryStrategies: Map<ErrorDomain, ErrorRecoveryStrategy> = new Map();
  private retryQueues: Map<string, RetryConfig> = new Map();
  private subscribers: Set<(error: ApplicationError) => void> = new Set();
  private isOnline = true;
  private config = {
    maxErrorLogSize: 500,
    enableMonitoring: process.env.NODE_ENV === "production",
    enableAutoRecovery: true,
    defaultRetryConfig: {
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
    } as RetryConfig,
  };

  private constructor() {
    this.initialize();
  }

  static getInstance(): GlobalErrorManager {
    if (!GlobalErrorManager.instance) {
      GlobalErrorManager.instance = new GlobalErrorManager();
    }
    return GlobalErrorManager.instance;
  }

  // ============================================
  // Initialisation
  // ============================================

  private initialize() {
    this.setupDefaultHandlers();
    this.setupNetworkMonitoring();
    this.setupGlobalErrorCatching();
    this.setupRecoveryStrategies();
  }

  private setupDefaultHandlers() {
    // Auth Errors
    this.registerHandler({
      domain: ErrorDomain.AUTH,
      canHandle: (error) => {
        const msg = error?.message?.toLowerCase() || "";
        return msg.includes("auth") || msg.includes("token") || msg.includes("session");
      },
      handle: async (error, context) => {
        if (error.code === "REFRESH_TOKEN_ERROR") {
          toast.error("Session expirée", {
            description: "Veuillez vous reconnecter",
          });

          setTimeout(() => {
            context.router?.push("/login");
          }, 2000);

          return { resolved: true, action: "REDIRECT" };
        }

        return { resolved: false, action: "NOTIFY" };
      },
      priority: 1,
    });

    // API Errors
    this.registerHandler({
      domain: ErrorDomain.API,
      canHandle: (error) => {
        return error?.response || error?.status || error?.statusCode;
      },
      handle: async (error, context) => {
        const status = error.metadata.statusCode;

        if (status === 429) {
          toast.error("Trop de requêtes", {
            description: "Veuillez patienter avant de réessayer",
          });
          return { resolved: true, action: "NOTIFY" };
        }

        if (status && status >= 500) {
          if (context.retryCount < 3) {
            return { resolved: false, action: "RETRY" };
          }

          toast.error("Erreur serveur", {
            description: "Nos services sont temporairement indisponibles",
          });
        }

        return { resolved: false, action: "LOG" };
      },
      priority: 2,
      retryConfig: {
        maxAttempts: 3,
        initialDelay: 2000,
        maxDelay: 10000,
        backoffMultiplier: 2,
      },
    });

    // Payment Errors
    this.registerHandler({
      domain: ErrorDomain.PAYMENT,
      canHandle: (error) => {
        const msg = error?.message?.toLowerCase() || "";
        return msg.includes("stripe") || msg.includes("payment") || msg.includes("card");
      },
      handle: async (error, context) => {
        if (error.code === "CARD_DECLINED") {
          toast.error("Paiement refusé", {
            description: "Veuillez vérifier vos informations de paiement",
            action: {
              label: "Réessayer",
              onClick: () => context.router?.push("/checkout"),
            },
          });
          return { resolved: true, action: "NOTIFY" };
        }

        // Log payment errors for audit
        this.logToAudit(error);

        return { resolved: false, action: "LOG" };
      },
      priority: 1,
    });

    // Network Errors
    this.registerHandler({
      domain: ErrorDomain.NETWORK,
      canHandle: (error) => {
        return (
          !this.isOnline ||
          error?.message?.includes("NetworkError") ||
          error?.message?.includes("Failed to fetch")
        );
      },
      handle: async (error, context) => {
        if (!this.isOnline) {
          toast.warning("Hors ligne", {
            description: "Vérifiez votre connexion",
            duration: 5000,
          });
          return { resolved: true, action: "NOTIFY" };
        }

        if (context.retryCount < 5) {
          return { resolved: false, action: "RETRY" };
        }

        return { resolved: false, action: "LOG" };
      },
      priority: 3,
      retryConfig: {
        maxAttempts: 5,
        initialDelay: 1000,
        maxDelay: 15000,
        backoffMultiplier: 1.5,
      },
    });

    // Validation Errors
    this.registerHandler({
      domain: ErrorDomain.VALIDATION,
      canHandle: (error) => {
        return error?.validation || error?.code?.includes("VALIDATION");
      },
      handle: async (error, context) => {
        // Les erreurs de validation sont généralement gérées localement
        return { resolved: true, action: "IGNORE" };
      },
      priority: 5,
    });
  }

  // ============================================
  // Stratégies de Récupération
  // ============================================

  private setupRecoveryStrategies() {
    // Stratégie pour AUTH
    this.registerRecoveryStrategy({
      domain: ErrorDomain.AUTH,
      strategy: async (error) => {
        if (error.code === "SESSION_EXPIRED") {
          // Tenter de rafraîchir automatiquement
          try {
            const { createClient } = await import("@/lib/supabase/client");
            const supabase = createClient();
            const { error: refreshError } = await supabase.auth.refreshSession();
            return !refreshError;
          } catch {
            return false;
          }
        }
        return false;
      },
    });

    // Stratégie pour CART
    this.registerRecoveryStrategy({
      domain: ErrorDomain.CART,
      strategy: async (error) => {
        if (error.code === "CART_SYNC_ERROR") {
          // Forcer une resynchronisation
          try {
            const { getCart } = await import("@/actions/cartActions");
            await getCart();
            return true;
          } catch {
            return false;
          }
        }
        return false;
      },
    });
  }

  // ============================================
  // Gestion des Erreurs
  // ============================================

  async handleError(error: unknown, context?: Partial<ErrorContext>): Promise<ErrorResolution> {
    const appError = this.normalizeError(error);
    const fullContext: ErrorContext = {
      retryCount: 0,
      ...context,
    };

    // Logger l'erreur
    this.logError(appError);

    // Notifier les subscribers
    this.notifySubscribers(appError);

    // Tenter la récupération automatique
    if (this.config.enableAutoRecovery) {
      const recovered = await this.attemptRecovery(appError);
      if (recovered) {
        return { resolved: true, action: "IGNORE" };
      }
    }

    // Trouver et exécuter le handler approprié
    const handlers = this.handlers.get(appError.domain) || [];

    for (const handler of handlers) {
      if (handler.canHandle(error)) {
        const resolution = await this.executeHandler(handler, appError, fullContext);

        if (resolution.resolved) {
          return resolution;
        }

        if (resolution.action === "RETRY" && handler.retryConfig) {
          return await this.handleWithRetry(handler, appError, fullContext);
        }

        return resolution;
      }
    }

    // Handler par défaut
    return this.defaultErrorHandler(appError, fullContext);
  }

  private async executeHandler(
    handler: ErrorHandlerConfig,
    error: ApplicationError,
    context: ErrorContext
  ): Promise<ErrorResolution> {
    try {
      return await handler.handle(error, context);
    } catch (handlerError) {
      console.error("[ErrorManager] Handler failed:", handlerError);
      return { resolved: false, action: "LOG" };
    }
  }

  private async handleWithRetry(
    handler: ErrorHandlerConfig,
    error: ApplicationError,
    context: ErrorContext
  ): Promise<ErrorResolution> {
    const config = handler.retryConfig || this.config.defaultRetryConfig;
    const lastError = error;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      const delay = Math.min(
        config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelay
      );

      // Attendre avant de réessayer
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Vérifier si on doit réessayer
      if (config.shouldRetry && !config.shouldRetry(lastError, attempt)) {
        break;
      }

      // Réessayer
      const retryContext = { ...context, retryCount: attempt };
      const resolution = await handler.handle(lastError, retryContext);

      if (resolution.resolved) {
        return resolution;
      }
    }

    return { resolved: false, action: "LOG" };
  }

  private async attemptRecovery(error: ApplicationError): Promise<boolean> {
    const strategy = this.recoveryStrategies.get(error.domain);

    if (strategy) {
      try {
        return await strategy.strategy(error);
      } catch (recoveryError) {
        console.error("[ErrorManager] Recovery failed:", recoveryError);
        return false;
      }
    }

    return false;
  }

  private defaultErrorHandler(error: ApplicationError, context: ErrorContext): ErrorResolution {
    if (error.severity === ErrorSeverity.CRITICAL) {
      toast.error("Erreur critique", {
        description: "L'application a rencontré un problème grave",
        action: {
          label: "Recharger",
          onClick: () => window.location.reload(),
        },
      });
    } else if (error.severity === ErrorSeverity.HIGH) {
      toast.error("Une erreur est survenue", {
        description: error.message,
      });
    }

    return { resolved: false, action: "LOG" };
  }

  // ============================================
  // Normalisation et Logging
  // ============================================

  private normalizeError(error: unknown): ApplicationError {
    const id = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      id,
      domain: this.determineDomain(error),
      code: error?.code || "UNKNOWN",
      message: error?.message || "Une erreur est survenue",
      severity: this.determineSeverity(error),
      retryable: this.isRetryable(error),
      metadata: {
        timestamp: new Date(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        ...error?.metadata,
      },
      originalError: error,
    };
  }

  private determineDomain(error: unknown): ErrorDomain {
    const message = error?.message?.toLowerCase() || "";
    const code = error?.code?.toLowerCase() || "";

    if (message.includes("auth") || message.includes("token")) return ErrorDomain.AUTH;
    if (message.includes("payment") || message.includes("stripe")) return ErrorDomain.PAYMENT;
    if (message.includes("cart")) return ErrorDomain.CART;
    if (message.includes("product")) return ErrorDomain.PRODUCT;
    if (message.includes("network") || message.includes("fetch")) return ErrorDomain.NETWORK;
    if (message.includes("validation")) return ErrorDomain.VALIDATION;
    if (message.includes("permission") || message.includes("forbidden"))
      return ErrorDomain.PERMISSION;
    if (message.includes("database") || message.includes("sql")) return ErrorDomain.DATABASE;
    if (message.includes("storage") || message.includes("upload")) return ErrorDomain.STORAGE;

    if (error?.response || error?.status) return ErrorDomain.API;

    return ErrorDomain.UNKNOWN;
  }

  private determineSeverity(error: unknown): ErrorSeverity {
    const status = error?.status || error?.statusCode;

    if (status >= 500) return ErrorSeverity.CRITICAL;
    if (status === 403 || status === 401) return ErrorSeverity.HIGH;
    if (status >= 400) return ErrorSeverity.MEDIUM;

    if (error?.severity) return error.severity;

    return ErrorSeverity.MEDIUM;
  }

  private isRetryable(error: unknown): boolean {
    const status = error?.status || error?.statusCode;

    // Erreurs réseau toujours retryables
    if (error?.message?.includes("network")) return true;

    // Erreurs serveur (5xx) retryables
    if (status >= 500) return true;

    // Rate limiting retryable après délai
    if (status === 429) return true;

    // Timeout retryable
    if (error?.code === "TIMEOUT") return true;

    return false;
  }

  private logError(error: ApplicationError) {
    this.errorLog.push(error);

    // Limiter la taille du log
    if (this.errorLog.length > this.config.maxErrorLogSize) {
      this.errorLog = this.errorLog.slice(-this.config.maxErrorLogSize);
    }

    // Envoyer au monitoring en production
    if (this.config.enableMonitoring) {
      this.sendToMonitoring(error);
    }

    // Log console en développement
    if (process.env.NODE_ENV === "development") {
      console.group(`[ErrorManager] ${error.domain} - ${error.code}`);
      console.error("Error:", error);
      console.groupEnd();
    }
  }

  private async sendToMonitoring(error: ApplicationError) {
    // Intégration avec votre système de monitoring
    // Exemple: Sentry, LogRocket, DataDog, etc.

    // Pour l'instant, on peut utiliser l'API locale
    try {
      await fetch("/api/errors/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(error),
      });
    } catch {
      // Ignorer les erreurs de monitoring
    }
  }

  private logToAudit(error: ApplicationError) {
    // Enregistrer dans la table audit_logs pour les erreurs critiques
    if (error.severity === ErrorSeverity.CRITICAL || error.domain === ErrorDomain.PAYMENT) {
      // Implémenter l'audit logging
      console.log("[Audit]", error);
    }
  }

  // ============================================
  // Monitoring Réseau
  // ============================================

  private setupNetworkMonitoring() {
    if (typeof window === "undefined") return;

    window.addEventListener("online", () => {
      this.isOnline = true;
      toast.success("Connexion rétablie");
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
      toast.warning("Connexion perdue");
    });
  }

  private setupGlobalErrorCatching() {
    if (typeof window === "undefined") return;

    // Capturer les erreurs non gérées
    window.addEventListener("unhandledrejection", (event) => {
      this.handleError(event.reason, {
        component: "global",
        userAction: "unhandled_promise",
      });
    });

    window.addEventListener("error", (event) => {
      this.handleError(event.error, {
        component: "global",
        userAction: "unhandled_error",
      });
    });
  }

  // ============================================
  // API Publique
  // ============================================

  registerHandler(config: ErrorHandlerConfig) {
    if (!this.handlers.has(config.domain)) {
      this.handlers.set(config.domain, []);
    }

    const handlers = this.handlers.get(config.domain)!;
    handlers.push(config);
    handlers.sort((a, b) => a.priority - b.priority);
  }

  registerRecoveryStrategy(strategy: ErrorRecoveryStrategy) {
    this.recoveryStrategies.set(strategy.domain, strategy);
  }

  subscribe(callback: (error: ApplicationError) => void) {
    this.subscribers.add(callback);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers(error: ApplicationError) {
    this.subscribers.forEach((callback) => {
      try {
        callback(error);
      } catch (err) {
        console.error("[ErrorManager] Subscriber error:", err);
      }
    });
  }

  getRecentErrors(count: number = 50): ApplicationError[] {
    return this.errorLog.slice(-count);
  }

  getErrorsByDomain(domain: ErrorDomain): ApplicationError[] {
    return this.errorLog.filter((e) => e.domain === domain);
  }

  getErrorStats(): Record<ErrorDomain, { count: number; lastOccurred?: Date }> {
    const stats: Record<ErrorDomain, { count: number; lastOccurred?: Date }> = {} as any;

    Object.values(ErrorDomain).forEach((domain) => {
      const errors = this.getErrorsByDomain(domain);
      stats[domain] = {
        count: errors.length,
        lastOccurred: errors[errors.length - 1]?.metadata.timestamp,
      };
    });

    return stats;
  }

  clearErrors() {
    this.errorLog = [];
  }

  updateConfig(config: Partial<typeof GlobalErrorManager.prototype.config>) {
    this.config = { ...this.config, ...config };
  }
}

// ============================================
// Export et Helpers
// ============================================

export const errorManager = GlobalErrorManager.getInstance();

// Helper pour créer des erreurs typées
export function createAppError(
  domain: ErrorDomain,
  code: string,
  message: string,
  metadata?: Partial<ErrorMetadata>
): ApplicationError {
  return {
    id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    domain,
    code,
    message,
    severity: ErrorSeverity.MEDIUM,
    retryable: false,
    metadata: {
      timestamp: new Date(),
      ...metadata,
    },
  };
}

// Hook React pour utiliser l'error manager
export function useErrorManager() {
  return {
    handleError: (error: unknown, context?: Partial<ErrorContext>) =>
      errorManager.handleError(error, context),
    subscribe: (callback: (error: ApplicationError) => void) => errorManager.subscribe(callback),
    getRecentErrors: () => errorManager.getRecentErrors(),
    getStats: () => errorManager.getErrorStats(),
  };
}
