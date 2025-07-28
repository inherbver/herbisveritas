/**
 * API-level validation for cart operations
 * 
 * These validators handle input sanitization, format conversion,
 * and basic input validation from HTTP requests and form data.
 */

import { z } from "zod";
import { ValidationError } from "@/lib/core/errors";
import { Result } from "@/lib/core/result";

/**
 * API input transformation utilities
 */
export const ApiTransformers = {
  /**
   * Transforms string to number with validation
   */
  stringToNumber: z.preprocess((val) => {
    if (typeof val === "string") {
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? val : parsed;
    }
    return val;
  }, z.number()),

  /**
   * Transforms string to positive number
   */
  stringToPositiveNumber: z.preprocess((val) => {
    if (typeof val === "string") {
      const parsed = parseInt(val, 10);
      return isNaN(parsed) || parsed <= 0 ? val : parsed;
    }
    return val;
  }, z.number().positive()),

  /**
   * Sanitizes and validates UUID
   */
  sanitizeUuid: z.preprocess((val) => {
    if (typeof val === "string") {
      return val.trim().toLowerCase();
    }
    return val;
  }, z.string().uuid()),

  /**
   * Sanitizes string input
   */
  sanitizeString: z.preprocess((val) => {
    if (typeof val === "string") {
      return val.trim();
    }
    return val;
  }, z.string()),
};

/**
 * API input validation schemas
 */
export const CartApiSchemas = {
  // Form data validation for add to cart
  addToCartFormData: z.object({
    productId: ApiTransformers.sanitizeUuid.refine(
      (val) => val.length > 0,
      "L'ID du produit est requis"
    ),
    quantity: ApiTransformers.stringToPositiveNumber
      .refine((val) => val <= 999, "Quantité trop élevée")
      .refine((val) => val >= 1, "Quantité minimum: 1"),
  }),

  // JSON input validation for add to cart
  addToCartJson: z.object({
    productId: z.string().uuid("Format UUID requis pour productId"),
    quantity: z.number().int().positive().max(999, "Quantité trop élevée"),
    // Optional immediate product details for validation
    productDetails: z.object({
      name: z.string().optional(),
      price: z.number().positive().optional(),
      stock: z.number().int().min(0).optional(),
    }).optional(),
  }),

  // Remove from cart validation
  removeFromCartFormData: z.object({
    cartItemId: ApiTransformers.sanitizeUuid.refine(
      (val) => val.length > 0,
      "L'ID de l'article est requis"
    ),
  }),

  removeFromCartJson: z.object({
    cartItemId: z.string().uuid("Format UUID requis pour cartItemId"),
  }),

  // Update quantity validation
  updateQuantityFormData: z.object({
    cartItemId: ApiTransformers.sanitizeUuid.refine(
      (val) => val.length > 0,
      "L'ID de l'article est requis"
    ),
    quantity: ApiTransformers.stringToNumber
      .refine((val) => val >= 0, "La quantité ne peut pas être négative")
      .refine((val) => val <= 999, "Quantité trop élevée"),
  }),

  updateQuantityJson: z.object({
    cartItemId: z.string().uuid("Format UUID requis pour cartItemId"),
    quantity: z.number().int().min(0).max(999, "Quantité trop élevée"),
  }),

  // Cart migration validation
  migrateCartJson: z.object({
    guestUserId: z.string().uuid("Format UUID requis pour guestUserId"),
  }),

  // Generic pagination for cart-related queries
  paginationQuery: z.object({
    page: ApiTransformers.stringToPositiveNumber.default(1),
    limit: ApiTransformers.stringToPositiveNumber
      .refine((val) => val <= 100, "Limite maximum: 100")
      .default(20),
  }),

  // Cart filters for admin/reports
  cartFiltersQuery: z.object({
    userId: z.string().uuid().optional(),
    dateFrom: z.preprocess((val) => {
      if (typeof val === "string" && val.length > 0) {
        const date = new Date(val);
        return isNaN(date.getTime()) ? val : date;
      }
      return val;
    }, z.date().optional()),
    dateTo: z.preprocess((val) => {
      if (typeof val === "string" && val.length > 0) {
        const date = new Date(val);
        return isNaN(date.getTime()) ? val : date;
      }
      return val;
    }, z.date().optional()),
    minTotal: ApiTransformers.stringToNumber.optional(),
    maxTotal: ApiTransformers.stringToNumber.optional(),
  }),
};

/**
 * Type definitions for API inputs
 */
export type AddToCartFormData = z.infer<typeof CartApiSchemas.addToCartFormData>;
export type AddToCartJson = z.infer<typeof CartApiSchemas.addToCartJson>;
export type RemoveFromCartFormData = z.infer<typeof CartApiSchemas.removeFromCartFormData>;
export type RemoveFromCartJson = z.infer<typeof CartApiSchemas.removeFromCartJson>;
export type UpdateQuantityFormData = z.infer<typeof CartApiSchemas.updateQuantityFormData>;
export type UpdateQuantityJson = z.infer<typeof CartApiSchemas.updateQuantityJson>;
export type MigrateCartJson = z.infer<typeof CartApiSchemas.migrateCartJson>;
export type PaginationQuery = z.infer<typeof CartApiSchemas.paginationQuery>;
export type CartFiltersQuery = z.infer<typeof CartApiSchemas.cartFiltersQuery>;

/**
 * API validation utilities
 */
export class CartApiValidator {
  /**
   * Validates FormData input for add to cart
   */
  static validateAddToCartFormData(formData: FormData): Result<AddToCartFormData, ValidationError> {
    try {
      const data = {
        productId: formData.get("productId"),
        quantity: formData.get("quantity"),
      };
      
      const validated = CartApiSchemas.addToCartFormData.parse(data);
      return Result.ok(validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Result.error(new ValidationError(
          'Données de formulaire invalides',
          undefined,
          {
            zodErrors: error.errors,
            formData: Object.fromEntries(formData.entries()),
          }
        ));
      }
      return Result.error(new ValidationError('Erreur de validation inconnue'));
    }
  }

  /**
   * Validates JSON input for add to cart
   */
  static validateAddToCartJson(data: unknown): Result<AddToCartJson, ValidationError> {
    try {
      const validated = CartApiSchemas.addToCartJson.parse(data);
      return Result.ok(validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Result.error(new ValidationError(
          'Données JSON invalides pour ajout au panier',
          undefined,
          { zodErrors: error.errors, inputData: data }
        ));
      }
      return Result.error(new ValidationError('Erreur de validation inconnue'));
    }
  }

  /**
   * Validates remove from cart input
   */
  static validateRemoveFromCartFormData(formData: FormData): Result<RemoveFromCartFormData, ValidationError> {
    try {
      const data = {
        cartItemId: formData.get("cartItemId"),
      };
      
      const validated = CartApiSchemas.removeFromCartFormData.parse(data);
      return Result.ok(validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Result.error(new ValidationError(
          'ID article invalide',
          undefined,
          { zodErrors: error.errors }
        ));
      }
      return Result.error(new ValidationError('Erreur de validation inconnue'));
    }
  }

  /**
   * Validates update quantity input
   */
  static validateUpdateQuantityFormData(formData: FormData): Result<UpdateQuantityFormData, ValidationError> {
    try {
      const data = {
        cartItemId: formData.get("cartItemId"),
        quantity: formData.get("quantity"),
      };
      
      const validated = CartApiSchemas.updateQuantityFormData.parse(data);
      return Result.ok(validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Result.error(new ValidationError(
          'Données de quantité invalides',
          undefined,
          { zodErrors: error.errors }
        ));
      }
      return Result.error(new ValidationError('Erreur de validation inconnue'));
    }
  }

  /**
   * Validates migration input
   */
  static validateMigrateCartJson(data: unknown): Result<MigrateCartJson, ValidationError> {
    try {
      const validated = CartApiSchemas.migrateCartJson.parse(data);
      return Result.ok(validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Result.error(new ValidationError(
          'Données de migration invalides',
          undefined,
          { zodErrors: error.errors }
        ));
      }
      return Result.error(new ValidationError('Erreur de validation inconnue'));
    }
  }

  /**
   * Validates pagination query parameters
   */
  static validatePaginationQuery(searchParams: URLSearchParams): Result<PaginationQuery, ValidationError> {
    try {
      const data = {
        page: searchParams.get("page"),
        limit: searchParams.get("limit"),
      };
      
      const validated = CartApiSchemas.paginationQuery.parse(data);
      return Result.ok(validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Result.error(new ValidationError(
          'Paramètres de pagination invalides',
          undefined,
          { zodErrors: error.errors }
        ));
      }
      return Result.error(new ValidationError('Erreur de validation inconnue'));
    }
  }

  /**
   * Validates cart filters for queries
   */
  static validateCartFiltersQuery(searchParams: URLSearchParams): Result<CartFiltersQuery, ValidationError> {
    try {
      const data = {
        userId: searchParams.get("userId"),
        dateFrom: searchParams.get("dateFrom"),
        dateTo: searchParams.get("dateTo"),
        minTotal: searchParams.get("minTotal"),
        maxTotal: searchParams.get("maxTotal"),
      };
      
      const validated = CartApiSchemas.cartFiltersQuery.parse(data);
      return Result.ok(validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Result.error(new ValidationError(
          'Filtres de recherche invalides',
          undefined,
          { zodErrors: error.errors }
        ));
      }
      return Result.error(new ValidationError('Erreur de validation inconnue'));
    }
  }

  /**
   * Generic request body validation
   */
  static validateRequestBody<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
    errorMessage = 'Données de requête invalides'
  ): Result<T, ValidationError> {
    try {
      const validated = schema.parse(data);
      return Result.ok(validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Result.error(new ValidationError(
          errorMessage,
          undefined,
          { zodErrors: error.errors, inputData: data }
        ));
      }
      return Result.error(new ValidationError('Erreur de validation inconnue'));
    }
  }

  /**
   * Validates and sanitizes file upload for cart-related images
   */
  static validateFileUpload(file: File): Result<File, ValidationError> {
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    
    if (!file) {
      return Result.error(new ValidationError('Fichier requis'));
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return Result.error(new ValidationError(
        `Fichier trop volumineux. Maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB`
      ));
    }
    
    if (!ALLOWED_TYPES.includes(file.type)) {
      return Result.error(new ValidationError(
        `Type de fichier non supporté. Types autorisés: ${ALLOWED_TYPES.join(', ')}`
      ));
    }
    
    return Result.ok(file);
  }
}

/**
 * Utility functions for common API validation patterns
 */
export const ApiValidationUtils = {
  /**
   * Extracts and validates UUID from URL parameters
   */
  validatePathUuid: (value: string | undefined, paramName: string): Result<string, ValidationError> => {
    if (!value) {
      return Result.error(new ValidationError(`Paramètre ${paramName} requis`));
    }
    
    try {
      const validated = z.string().uuid().parse(value.trim());
      return Result.ok(validated);
    } catch {
      return Result.error(new ValidationError(`Format UUID invalide pour ${paramName}`));
    }
  },

  /**
   * Validates required header value
   */
  validateRequiredHeader: (
    headers: Headers, 
    headerName: string, 
    validator?: z.ZodSchema
  ): Result<string, ValidationError> => {
    const value = headers.get(headerName);
    
    if (!value) {
      return Result.error(new ValidationError(`En-tête ${headerName} requis`));
    }
    
    if (validator) {
      try {
        const validated = validator.parse(value);
        return Result.ok(validated);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return Result.error(new ValidationError(
            `En-tête ${headerName} invalide`,
            undefined,
            { zodErrors: error.errors }
          ));
        }
      }
    }
    
    return Result.ok(value);
  },

  /**
   * Validates content type
   */
  validateContentType: (
    headers: Headers, 
    expectedTypes: string[]
  ): Result<string, ValidationError> => {
    const contentType = headers.get('content-type');
    
    if (!contentType) {
      return Result.error(new ValidationError('Content-Type requis'));
    }
    
    const matchesExpectedType = expectedTypes.some(type => 
      contentType.toLowerCase().includes(type.toLowerCase())
    );
    
    if (!matchesExpectedType) {
      return Result.error(new ValidationError(
        `Content-Type invalide. Attendu: ${expectedTypes.join(' ou ')}, reçu: ${contentType}`
      ));
    }
    
    return Result.ok(contentType);
  },
};