/**
 * Application-specific error types and utilities
 */

export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Validation errors
 */
export class ValidationError extends AppError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;

  constructor(
    message: string,
    public readonly field?: string,
    context?: Record<string, unknown>
  ) {
    super(message, context);
  }
}

/**
 * Authorization errors
 */
export class AuthorizationError extends AppError {
  readonly code = 'AUTHORIZATION_ERROR';
  readonly statusCode = 403;

  constructor(
    message: string = 'Accès non autorisé',
    context?: Record<string, unknown>
  ) {
    super(message, context);
  }
}

/**
 * Authentication errors
 */
export class AuthenticationError extends AppError {
  readonly code = 'AUTHENTICATION_ERROR';
  readonly statusCode = 401;

  constructor(
    message: string = 'Authentification requise',
    context?: Record<string, unknown>
  ) {
    super(message, context);
  }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends AppError {
  readonly code = 'NOT_FOUND_ERROR';
  readonly statusCode = 404;

  constructor(
    resource: string,
    identifier?: string,
    context?: Record<string, unknown>
  ) {
    const message = identifier 
      ? `${resource} avec l'identifiant "${identifier}" introuvable`
      : `${resource} introuvable`;
    super(message, context);
  }
}

/**
 * Business logic errors
 */
export class BusinessError extends AppError {
  readonly code = 'BUSINESS_ERROR';
  readonly statusCode = 422;

  constructor(
    message: string,
    context?: Record<string, unknown>
  ) {
    super(message, context);
  }
}

/**
 * Database operation errors
 */
export class DatabaseError extends AppError {
  readonly code = 'DATABASE_ERROR';
  readonly statusCode = 500;

  constructor(
    message: string,
    public readonly originalError?: unknown,
    context?: Record<string, unknown>
  ) {
    super(message, context);
  }
}

/**
 * External service errors
 */
export class ExternalServiceError extends AppError {
  readonly code = 'EXTERNAL_SERVICE_ERROR';
  readonly statusCode = 502;

  constructor(
    service: string,
    message: string,
    public readonly originalError?: unknown,
    context?: Record<string, unknown>
  ) {
    super(`Erreur du service ${service}: ${message}`, context);
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends AppError {
  readonly code = 'RATE_LIMIT_ERROR';
  readonly statusCode = 429;

  constructor(
    message: string = 'Trop de requêtes, veuillez réessayer plus tard',
    context?: Record<string, unknown>
  ) {
    super(message, context);
  }
}

/**
 * Error type guards
 */
export const ErrorGuards = {
  isAppError: (error: unknown): error is AppError => {
    return error instanceof AppError;
  },
  
  isValidationError: (error: unknown): error is ValidationError => {
    return error instanceof ValidationError;
  },
  
  isAuthorizationError: (error: unknown): error is AuthorizationError => {
    return error instanceof AuthorizationError;
  },
  
  isAuthenticationError: (error: unknown): error is AuthenticationError => {
    return error instanceof AuthenticationError;
  },
  
  isNotFoundError: (error: unknown): error is NotFoundError => {
    return error instanceof NotFoundError;
  },
  
  isBusinessError: (error: unknown): error is BusinessError => {
    return error instanceof BusinessError;
  },
  
  isDatabaseError: (error: unknown): error is DatabaseError => {
    return error instanceof DatabaseError;
  },
  
  isExternalServiceError: (error: unknown): error is ExternalServiceError => {
    return error instanceof ExternalServiceError;
  }
};

/**
 * Error utilities
 */
export const ErrorUtils = {
  /**
   * Checks if error is an application error
   */
  isAppError: (error: unknown): error is AppError => {
    return error instanceof AppError;
  },

  /**
   * Converts unknown error to AppError
   */
  toAppError: (error: unknown): AppError => {
    if (ErrorGuards.isAppError(error)) {
      return error;
    }
    
    if (error instanceof Error) {
      return new DatabaseError(error.message, error);
    }
    
    return new DatabaseError('Erreur inconnue', error);
  },

  /**
   * Formats error for user display
   */
  formatForUser: (error: AppError): string => {
    switch (error.code) {
      case 'VALIDATION_ERROR':
        return error.message;
      case 'AUTHORIZATION_ERROR':
        return 'Vous n\'avez pas les permissions nécessaires pour cette action';
      case 'AUTHENTICATION_ERROR':
        return 'Veuillez vous connecter pour continuer';
      case 'NOT_FOUND_ERROR':
        return error.message;
      case 'BUSINESS_ERROR':
        return error.message;
      case 'RATE_LIMIT_ERROR':
        return error.message;
      default:
        return 'Une erreur technique s\'est produite. Veuillez réessayer.';
    }
  },

  /**
   * Formats error for logging
   */
  formatForLogging: (error: AppError): Record<string, any> => {
    return {
      name: error.name,
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      context: error.context,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Creates error from Supabase error
   */
  fromSupabaseError: (error: any): AppError => {
    if (!error) {
      return new DatabaseError('Erreur de base de données inconnue');
    }

    const code = error.code;
    const message = error.message || 'Erreur de base de données';

    switch (code) {
      case '23505': // unique_violation
        return new BusinessError('Cette ressource existe déjà');
      case '23503': // foreign_key_violation
        return new BusinessError('Référence invalide détectée');
      case '42501': // insufficient_privilege
        return new AuthorizationError('Permissions insuffisantes');
      case 'PGRST116': // Row not found
        return new NotFoundError('Ressource');
      default:
        return new DatabaseError(message, error);
    }
  }
};