/**
 * Cart Validation Coordinator
 * 
 * This module coordinates between API-level and Domain-level validation,
 * providing a unified interface for cart operations validation.
 */

import { Result } from "@/lib/core/result";
import { ValidationError, BusinessError } from "@/lib/core/errors";

// API Layer
import {
  CartApiValidator,
  type AddToCartFormData,
  type RemoveFromCartFormData,
  type UpdateQuantityFormData,
} from "./api/cart-api.validator";

// Domain Layer
import {
  CartDomainValidator,
  type AddItemToCartDomain,
  type RemoveItemFromCartDomain,
  type UpdateCartItemQuantityDomain,
  type MigrateCartDomain,
} from "./domain/cart-domain.validator";

// Type pour les opérations validées en lot
type ValidatedCartOperation = 
  | { type: 'add'; data: AddToCartFormData }
  | { type: 'remove'; data: RemoveFromCartFormData }
  | { type: 'update'; data: UpdateQuantityFormData };

/**
 * Validation pipeline result
 */
export type ValidationPipelineResult<T> = Result<T, ValidationError | BusinessError>;

/**
 * Product details interface for enriching validation
 */
export interface ProductDetails {
  id: string;
  name: string;
  price: number;
  stock: number;
  image?: string;
  slug?: string;
  isActive: boolean;
}

/**
 * User context for validation
 */
export interface UserContext {
  id: string;
  role: string;
  isAuthenticated: boolean;
}

/**
 * Cart validation coordinator
 */
export class CartValidationCoordinator {
  /**
   * Validates add to cart operation through full pipeline
   */
  static async validateAddToCart(
    formData: FormData,
    userContext: UserContext,
    productDetails: ProductDetails
  ): Promise<ValidationPipelineResult<AddItemToCartDomain>> {
    // Step 1: API-level validation
    const apiValidationResult = CartApiValidator.validateAddToCartFormData(formData);
    if (apiValidationResult.isError()) {
      return Result.error(apiValidationResult.getError());
    }
    
    const apiData = apiValidationResult.getValue();

    // Step 2: Enrich with domain context
    const domainData: AddItemToCartDomain = {
      userId: userContext.id,
      productId: apiData.productId,
      quantity: apiData.quantity,
      productDetails: {
        name: productDetails.name,
        price: productDetails.price,
        stock: productDetails.stock,
        image: productDetails.image,
        slug: productDetails.slug,
      },
    };

    // Step 3: Business rules validation
    if (!productDetails.isActive) {
      return Result.error(new BusinessError('Produit non disponible à la vente'));
    }

    // Step 4: Domain-level validation
    const domainValidationResult = CartDomainValidator.validateAddItem(domainData);
    if (domainValidationResult.isError()) {
      return Result.error(domainValidationResult.getError());
    }

    return Result.ok(domainValidationResult.getValue());
  }

  /**
   * Validates add to cart from JSON input
   */
  static async validateAddToCartJson(
    jsonData: unknown,
    userContext: UserContext,
    productDetails: ProductDetails
  ): Promise<ValidationPipelineResult<AddItemToCartDomain>> {
    // Step 1: API-level validation
    const apiValidationResult = CartApiValidator.validateAddToCartJson(jsonData);
    if (apiValidationResult.isError()) {
      return Result.error(apiValidationResult.getError());
    }
    
    const apiData = apiValidationResult.getValue();

    // Step 2: Enrich with domain context
    const domainData: AddItemToCartDomain = {
      userId: userContext.id,
      productId: apiData.productId,
      quantity: apiData.quantity,
      productDetails: {
        name: productDetails.name,
        price: productDetails.price,
        stock: productDetails.stock,
        image: productDetails.image,
        slug: productDetails.slug,
      },
    };

    // Step 3: Business rules validation
    if (!productDetails.isActive) {
      return Result.error(new BusinessError('Produit non disponible à la vente'));
    }

    // Step 4: Domain-level validation
    return CartDomainValidator.validateAddItem(domainData);
  }

  /**
   * Validates remove from cart operation
   */
  static async validateRemoveFromCart(
    formData: FormData,
    userContext: UserContext
  ): Promise<ValidationPipelineResult<RemoveItemFromCartDomain>> {
    // Step 1: API-level validation
    const apiValidationResult = CartApiValidator.validateRemoveFromCartFormData(formData);
    if (apiValidationResult.isError()) {
      return Result.error(apiValidationResult.getError());
    }
    
    const apiData = apiValidationResult.getValue();

    // Step 2: Create domain data
    const domainData: RemoveItemFromCartDomain = {
      userId: userContext.id,
      cartItemId: apiData.cartItemId,
    };

    // Step 3: Domain-level validation
    return CartDomainValidator.validateRemoveItem(domainData);
  }

  /**
   * Validates update quantity operation
   */
  static async validateUpdateQuantity(
    formData: FormData,
    userContext: UserContext,
    availableStock?: number
  ): Promise<ValidationPipelineResult<UpdateCartItemQuantityDomain>> {
    // Step 1: API-level validation
    const apiValidationResult = CartApiValidator.validateUpdateQuantityFormData(formData);
    if (apiValidationResult.isError()) {
      return Result.error(apiValidationResult.getError());
    }
    
    const apiData = apiValidationResult.getValue();

    // Step 2: Create domain data
    const domainData: UpdateCartItemQuantityDomain = {
      userId: userContext.id,
      cartItemId: apiData.cartItemId,
      quantity: apiData.quantity,
    };

    // Step 3: Stock validation if provided
    if (availableStock !== undefined) {
      const stockValidationResult = CartDomainValidator.validateQuantityUpdate(
        0, // We don't have current quantity in this context
        apiData.quantity,
        availableStock
      );
      if (stockValidationResult.isError()) {
        return Result.error(stockValidationResult.getError());
      }
    }

    // Step 4: Domain-level validation
    return CartDomainValidator.validateUpdateQuantity(domainData);
  }

  /**
   * Validates cart migration operation
   */
  static async validateMigrateCart(
    jsonData: unknown,
    authenticatedUserId: string
  ): Promise<ValidationPipelineResult<MigrateCartDomain>> {
    // Step 1: API-level validation
    const apiValidationResult = CartApiValidator.validateMigrateCartJson(jsonData);
    if (apiValidationResult.isError()) {
      return Result.error(apiValidationResult.getError());
    }
    
    const apiData = apiValidationResult.getValue();

    // Step 2: Create domain data
    const domainData: MigrateCartDomain = {
      fromUserId: apiData.guestUserId,
      toUserId: authenticatedUserId,
    };

    // Step 3: Domain-level validation
    return CartDomainValidator.validateMigration(domainData);
  }

  /**
   * Validates batch operations (for future use)
   */
  static async validateBatchCartOperations(
    operations: Array<{
      type: 'add' | 'remove' | 'update';
      data: unknown;
    }>,
    _userContext: UserContext
  ): Promise<ValidationPipelineResult<ValidatedCartOperation[]>> {
    const validatedOperations: ValidatedCartOperation[] = [];
    
    for (const operation of operations) {
      let validationResult: ValidationPipelineResult<ValidatedCartOperation>;
      
      switch (operation.type) {
        case 'add':
          // Would need product details - simplified for now
          validationResult = Result.error(new BusinessError('Batch add not implemented'));
          break;
        case 'remove':
          // Would need to convert data to FormData - simplified for now
          validationResult = Result.error(new BusinessError('Batch remove not implemented'));
          break;
        case 'update':
          // Would need to convert data to FormData - simplified for now
          validationResult = Result.error(new BusinessError('Batch update not implemented'));
          break;
        default:
          validationResult = Result.error(new ValidationError('Type d\'opération inconnue'));
      }
      
      if (validationResult.isError()) {
        return Result.error(validationResult.getError());
      }
      
      validatedOperations.push(validationResult.getValue());
    }
    
    return Result.ok(validatedOperations);
  }
}

/**
 * Utility functions for common validation scenarios
 */
export const CartValidationUtils = {
  /**
   * Validates user permission for cart operation
   */
  validateUserPermission: (
    userContext: UserContext,
    requiredRole?: string
  ): Result<boolean, ValidationError> => {
    if (!userContext.isAuthenticated) {
      return Result.error(new ValidationError('Authentification requise'));
    }
    
    if (requiredRole && userContext.role !== requiredRole) {
      return Result.error(new ValidationError(`Rôle ${requiredRole} requis`));
    }
    
    return Result.ok(true);
  },

  /**
   * Creates user context from session data
   */
  createUserContext: (
    userId: string | null,
    userRole: string | null,
    isAuthenticated: boolean
  ): UserContext => ({
    id: userId || '',
    role: userRole || 'user',
    isAuthenticated,
  }),

  /**
   * Validates operation rate limiting
   */
  validateRateLimit: (
    userContext: UserContext,
    operation: string,
    _maxOperationsPerMinute: number = 60
  ): Result<boolean, ValidationError> => {
    // This would integrate with a rate limiting service
    // For now, we'll return OK
    return Result.ok(true);
  },

  /**
   * Validates cart state constraints
   */
  validateCartConstraints: (
    currentItemCount: number,
    currentTotalQuantity: number,
    operation: 'add' | 'update',
    quantityChange: number = 0
  ): Result<boolean, BusinessError> => {
    const MAX_ITEMS = 50;
    const MAX_TOTAL_QUANTITY = 500;
    
    if (operation === 'add' && currentItemCount >= MAX_ITEMS) {
      return Result.error(new BusinessError(`Maximum ${MAX_ITEMS} articles différents autorisés`));
    }
    
    const newTotalQuantity = currentTotalQuantity + quantityChange;
    if (newTotalQuantity > MAX_TOTAL_QUANTITY) {
      return Result.error(new BusinessError(`Quantité totale maximum: ${MAX_TOTAL_QUANTITY}`));
    }
    
    return Result.ok(true);
  },
};