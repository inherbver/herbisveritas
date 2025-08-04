import { FormActionResult } from '@/lib/core/result';
import type { AuthError } from '@supabase/supabase-js';

interface ErrorContext {
  showResendButton?: boolean;
  email?: string;
  [key: string]: unknown;
}

export class AuthErrorHandler {
  /**
   * Gère les erreurs Supabase Auth et retourne un FormActionResult approprié
   */
  static handleSupabaseError(error: AuthError, context?: ErrorContext): FormActionResult<null> {
    // Map des messages d'erreur Supabase vers des erreurs utilisateur
    const errorMap: Record<string, () => FormActionResult<null>> = {
      'Invalid login credentials': () => 
        FormActionResult.fieldValidationError({
          password: ["Email ou mot de passe incorrect"]
        }),
      
      'Email not confirmed': () => 
        FormActionResult.error(
          "Email non confirmé. Veuillez vérifier votre boîte de réception.",
          { showResendButton: true, email: context?.email }
        ),
      
      'Too many requests': () =>
        FormActionResult.error(
          "Trop de tentatives. Veuillez réessayer dans quelques minutes."
        ),
      
      'User already registered': () =>
        FormActionResult.fieldValidationError({
          email: ["Un compte existe déjà avec cet email"]
        }),

      'Password should be at least 8 characters': () =>
        FormActionResult.fieldValidationError({
          password: ["Le mot de passe doit contenir au moins 8 caractères"]
        }),

      'Unable to validate email address: invalid format': () =>
        FormActionResult.fieldValidationError({
          email: ["Format d'email invalide"]
        }),

      'Auth session missing!': () =>
        FormActionResult.error(
          "Session expirée. Veuillez vous reconnecter."
        ),

      'User not found': () =>
        FormActionResult.fieldValidationError({
          email: ["Aucun compte associé à cet email"]
        }),

      'Signup disabled': () =>
        FormActionResult.error(
          "Les inscriptions sont temporairement désactivées."
        ),

      'Email rate limit exceeded': () =>
        FormActionResult.error(
          "Trop d'emails envoyés. Veuillez réessayer plus tard."
        ),

      'Invalid refresh token': () =>
        FormActionResult.error(
          "Session invalide. Veuillez vous reconnecter."
        )
    };

    // Chercher une correspondance exacte
    const handler = errorMap[error.message];
    if (handler) {
      return handler();
    }

    // Chercher une correspondance partielle
    for (const [pattern, handler] of Object.entries(errorMap)) {
      if (error.message.includes(pattern)) {
        return handler();
      }
    }

    // Gestion par code d'erreur HTTP si disponible
    if (error.status) {
      switch (error.status) {
        case 400:
          return FormActionResult.error(
            "Données invalides. Veuillez vérifier vos informations."
          );
        case 401:
          return FormActionResult.error(
            "Non autorisé. Veuillez vous reconnecter."
          );
        case 403:
          return FormActionResult.error(
            "Accès refusé."
          );
        case 422:
          return FormActionResult.error(
            "Les données fournies sont invalides."
          );
        case 429:
          return FormActionResult.error(
            "Trop de tentatives. Veuillez réessayer plus tard."
          );
        case 500:
        case 502:
        case 503:
          return FormActionResult.error(
            "Erreur serveur. Veuillez réessayer dans quelques instants."
          );
      }
    }

    // Erreur générique
    return FormActionResult.error(
      "Une erreur est survenue. Veuillez réessayer."
    );
  }

  /**
   * Extrait un message d'erreur lisible depuis différents types d'erreurs
   */
  static extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    
    if (typeof error === 'string') {
      return error;
    }
    
    if (error && typeof error === 'object' && 'message' in error) {
      return String(error.message);
    }
    
    return "Une erreur inattendue est survenue";
  }

  /**
   * Détermine si une erreur nécessite une re-authentification
   */
  static requiresReauth(error: AuthError): boolean {
    const reauthMessages = [
      'Auth session missing',
      'Invalid refresh token',
      'Token expired',
      'Session expired'
    ];

    return reauthMessages.some(msg => 
      error.message.toLowerCase().includes(msg.toLowerCase())
    );
  }

  /**
   * Détermine si une erreur est liée au réseau
   */
  static isNetworkError(error: unknown): boolean {
    if (error instanceof Error) {
      const networkErrorPatterns = [
        'network',
        'fetch',
        'ERR_INTERNET_DISCONNECTED',
        'ERR_NETWORK',
        'ECONNREFUSED',
        'ETIMEDOUT'
      ];

      return networkErrorPatterns.some(pattern => 
        error.message.toLowerCase().includes(pattern.toLowerCase())
      );
    }

    return false;
  }
}