/**
 * Gestionnaire centralisé des erreurs d'authentification
 * Gère tous les types d'erreurs auth avec retry, monitoring et recovery
 */

import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export type AuthErrorType =
  | "REFRESH_TOKEN_ERROR"
  | "NETWORK_ERROR"
  | "SESSION_EXPIRED"
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_LOCKED"
  | "EMAIL_NOT_CONFIRMED"
  | "RATE_LIMITED"
  | "UNKNOWN";

export interface AuthError {
  type: AuthErrorType;
  message: string;
  code?: string;
  timestamp: Date;
  retryCount?: number;
  metadata?: Record<string, any>;
}

export interface AuthErrorHandler {
  canHandle: (error: any) => boolean;
  handle: (error: any, context: AuthErrorContext) => Promise<void>;
  priority: number;
}

export interface AuthErrorContext {
  router: any;
  retryCount: number;
  lastAttempt: Date;
  userId?: string;
}

class AuthErrorManager {
  private static instance: AuthErrorManager;
  private handlers: Map<AuthErrorType, AuthErrorHandler[]> = new Map();
  private errorLog: AuthError[] = [];
  private maxErrorLogSize = 100;
  private retryAttempts: Map<string, number> = new Map();
  private maxRetries = 3;
  private retryDelay = 1000; // ms
  private isOnline = true;

  private constructor() {
    this.initializeHandlers();
    this.setupNetworkMonitoring();
  }

  static getInstance(): AuthErrorManager {
    if (!AuthErrorManager.instance) {
      AuthErrorManager.instance = new AuthErrorManager();
    }
    return AuthErrorManager.instance;
  }

  /**
   * Initialise les gestionnaires d'erreurs par défaut
   */
  private initializeHandlers() {
    // Gestionnaire pour les erreurs de refresh token
    this.registerHandler("REFRESH_TOKEN_ERROR", {
      canHandle: (error) => {
        const errorStr = error?.message || error?.toString() || "";
        return (
          errorStr.includes("Refresh Token") ||
          errorStr.includes("refresh_token") ||
          error?.code === "INVALID_REFRESH_TOKEN"
        );
      },
      handle: async (error, context) => {
        console.warn("[AuthErrorManager] Handling refresh token error");

        // Nettoyer la session
        const supabase = createClient();
        await supabase.auth.signOut();

        // Nettoyer le localStorage
        this.clearAuthStorage();

        // Notifier l'utilisateur
        toast.error("Votre session a expiré", {
          description: "Veuillez vous reconnecter pour continuer",
          duration: 5000,
        });

        // Rediriger après un délai
        setTimeout(() => {
          context.router?.push("/login");
        }, 1000);
      },
      priority: 1,
    });

    // Gestionnaire pour les erreurs réseau
    this.registerHandler("NETWORK_ERROR", {
      canHandle: (error) => {
        return (
          error?.message?.includes("NetworkError") ||
          error?.message?.includes("Failed to fetch") ||
          error?.code === "NETWORK_ERROR" ||
          !this.isOnline
        );
      },
      handle: async (error, context) => {
        console.warn("[AuthErrorManager] Network error detected");

        if (!this.isOnline) {
          toast.warning("Vous êtes hors ligne", {
            description: "Vérifiez votre connexion internet",
            duration: 5000,
          });
          return;
        }

        // Retry avec backoff exponentiel
        if (context.retryCount < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, context.retryCount);
          toast.loading(`Reconnexion dans ${delay / 1000}s...`);

          await new Promise((resolve) => setTimeout(resolve, delay));

          // Tenter de rafraîchir la session
          const supabase = createClient();
          const { error: refreshError } = await supabase.auth.refreshSession();

          if (!refreshError) {
            toast.success("Connexion rétablie");
          }
        } else {
          toast.error("Impossible de se connecter au serveur");
        }
      },
      priority: 2,
    });

    // Gestionnaire pour les sessions expirées
    this.registerHandler("SESSION_EXPIRED", {
      canHandle: (error) => {
        return (
          error?.message?.includes("session expired") ||
          error?.message?.includes("JWT expired") ||
          error?.code === "SESSION_EXPIRED"
        );
      },
      handle: async (error, context) => {
        console.warn("[AuthErrorManager] Session expired");

        const supabase = createClient();

        // Tenter de rafraîchir automatiquement
        const { error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError) {
          // Si le refresh échoue, déconnecter
          await supabase.auth.signOut();
          this.clearAuthStorage();

          toast.info("Session expirée", {
            description: "Veuillez vous reconnecter",
            action: {
              label: "Se connecter",
              onClick: () => context.router?.push("/login"),
            },
          });
        } else {
          toast.success("Session renouvelée automatiquement");
        }
      },
      priority: 3,
    });

    // Gestionnaire pour les erreurs de rate limiting
    this.registerHandler("RATE_LIMITED", {
      canHandle: (error) => {
        return (
          error?.status === 429 ||
          error?.message?.includes("rate limit") ||
          error?.code === "RATE_LIMITED"
        );
      },
      handle: async (error, context) => {
        console.warn("[AuthErrorManager] Rate limited");

        const retryAfter = error?.headers?.["retry-after"] || 60;

        toast.error("Trop de tentatives", {
          description: `Veuillez réessayer dans ${retryAfter} secondes`,
          duration: 10000,
        });

        // Bloquer temporairement les nouvelles tentatives
        setTimeout(() => {
          this.retryAttempts.clear();
        }, retryAfter * 1000);
      },
      priority: 4,
    });

    // Gestionnaire pour email non confirmé
    this.registerHandler("EMAIL_NOT_CONFIRMED", {
      canHandle: (error) => {
        return (
          error?.message?.includes("Email not confirmed") || error?.code === "EMAIL_NOT_CONFIRMED"
        );
      },
      handle: async (error, context) => {
        toast.warning("Email non confirmé", {
          description: "Veuillez vérifier votre boîte mail",
          action: {
            label: "Renvoyer l'email",
            onClick: async () => {
              const supabase = createClient();
              const {
                data: { user },
              } = await supabase.auth.getUser();
              if (user?.email) {
                await supabase.auth.resend({
                  type: "signup",
                  email: user.email,
                });
                toast.success("Email de confirmation envoyé");
              }
            },
          },
          duration: 10000,
        });
      },
      priority: 5,
    });
  }

  /**
   * Enregistre un nouveau gestionnaire d'erreur
   */
  registerHandler(type: AuthErrorType, handler: AuthErrorHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }

    const handlers = this.handlers.get(type)!;
    handlers.push(handler);
    handlers.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Traite une erreur d'authentification
   */
  async handleError(error: any, context: AuthErrorContext): Promise<void> {
    // Logger l'erreur
    this.logError(error);

    // Incrémenter le compteur de retry
    const errorKey = this.getErrorKey(error);
    const retryCount = (this.retryAttempts.get(errorKey) || 0) + 1;
    this.retryAttempts.set(errorKey, retryCount);

    const enhancedContext = {
      ...context,
      retryCount,
      lastAttempt: new Date(),
    };

    // Trouver et exécuter le bon gestionnaire
    for (const [type, handlers] of this.handlers) {
      for (const handler of handlers) {
        if (handler.canHandle(error)) {
          console.log(`[AuthErrorManager] Handling error as ${type}`);
          await handler.handle(error, enhancedContext);
          return;
        }
      }
    }

    // Gestionnaire par défaut si aucun handler spécifique
    console.error("[AuthErrorManager] Unhandled auth error:", error);
    toast.error("Une erreur est survenue", {
      description: "Veuillez réessayer plus tard",
    });
  }

  /**
   * Nettoie le stockage d'authentification
   */
  private clearAuthStorage() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const storageKey = `sb-${url.replace("https://", "").split(".")[0]}-auth-token`;

    // Nettoyer tous les éléments liés à l'auth
    localStorage.removeItem(storageKey);
    sessionStorage.removeItem(storageKey);

    // Nettoyer les cookies si nécessaire
    document.cookie.split(";").forEach((c) => {
      if (c.includes("sb-")) {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      }
    });
  }

  /**
   * Surveille l'état de la connexion réseau
   */
  private setupNetworkMonitoring() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        this.isOnline = true;
        toast.success("Connexion rétablie");

        // Tenter de rafraîchir la session
        const supabase = createClient();
        supabase.auth.refreshSession();
      });

      window.addEventListener("offline", () => {
        this.isOnline = false;
        toast.warning("Connexion perdue", {
          description: "Certaines fonctionnalités peuvent être limitées",
        });
      });
    }
  }

  /**
   * Enregistre une erreur dans le log
   */
  private logError(error: any) {
    const authError: AuthError = {
      type: this.determineErrorType(error),
      message: error?.message || "Unknown error",
      code: error?.code,
      timestamp: new Date(),
      metadata: {
        stack: error?.stack,
        status: error?.status,
        url: error?.url,
      },
    };

    this.errorLog.push(authError);

    // Limiter la taille du log
    if (this.errorLog.length > this.maxErrorLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxErrorLogSize);
    }

    // Envoyer au monitoring si configuré
    this.sendToMonitoring(authError);
  }

  /**
   * Détermine le type d'erreur
   */
  private determineErrorType(error: any): AuthErrorType {
    const message = error?.message?.toLowerCase() || "";
    const code = error?.code?.toLowerCase() || "";

    if (message.includes("refresh") || code.includes("refresh")) {
      return "REFRESH_TOKEN_ERROR";
    }
    if (message.includes("network") || message.includes("fetch")) {
      return "NETWORK_ERROR";
    }
    if (message.includes("expired") || code.includes("expired")) {
      return "SESSION_EXPIRED";
    }
    if (message.includes("credentials") || message.includes("password")) {
      return "INVALID_CREDENTIALS";
    }
    if (message.includes("locked") || code.includes("locked")) {
      return "ACCOUNT_LOCKED";
    }
    if (message.includes("confirmed")) {
      return "EMAIL_NOT_CONFIRMED";
    }
    if (error?.status === 429 || message.includes("rate")) {
      return "RATE_LIMITED";
    }

    return "UNKNOWN";
  }

  /**
   * Génère une clé unique pour une erreur
   */
  private getErrorKey(error: any): string {
    return `${error?.code || "unknown"}_${error?.message?.substring(0, 50) || ""}`;
  }

  /**
   * Envoie les erreurs au système de monitoring
   */
  private async sendToMonitoring(error: AuthError) {
    // Intégration avec votre système de monitoring (Sentry, LogRocket, etc.)
    if (process.env.NODE_ENV === "production") {
      console.log("[AuthErrorManager] Would send to monitoring:", error);
      // Exemple avec Sentry:
      // Sentry.captureException(error);
    }
  }

  /**
   * Récupère les erreurs récentes
   */
  getRecentErrors(count: number = 10): AuthError[] {
    return this.errorLog.slice(-count);
  }

  /**
   * Récupère les statistiques d'erreurs
   */
  getErrorStats(): Record<AuthErrorType, number> {
    const stats: Record<AuthErrorType, number> = {
      REFRESH_TOKEN_ERROR: 0,
      NETWORK_ERROR: 0,
      SESSION_EXPIRED: 0,
      INVALID_CREDENTIALS: 0,
      ACCOUNT_LOCKED: 0,
      EMAIL_NOT_CONFIRMED: 0,
      RATE_LIMITED: 0,
      UNKNOWN: 0,
    };

    this.errorLog.forEach((error) => {
      stats[error.type]++;
    });

    return stats;
  }

  /**
   * Nettoie les logs d'erreurs
   */
  clearErrorLog() {
    this.errorLog = [];
    this.retryAttempts.clear();
  }
}

export const authErrorManager = AuthErrorManager.getInstance();
