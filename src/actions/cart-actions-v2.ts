/**
 * Cart Actions V2 - Using Domain Services Architecture
 * 
 * These actions use the new architecture with domain services,
 * dependency injection, and proper separation of concerns.
 */

'use server';

import { revalidateTag } from "next/cache";
import { ActionResult } from "@/lib/core/result";
import { 
  ErrorUtils 
} from "@/lib/core/errors";
import { logger, LogUtils } from "@/lib/core/logger";
import { 
  CartValidationCoordinator,
  CartValidationUtils,
  type ProductDetails,
  type UserContext 
} from "@/lib/validators/cart-validation-coordinator";
import { 
  SERVICE_TOKENS,
  createRequestScopedContainer 
} from "@/lib/infrastructure/container/container.config";
import { CartDomainService } from "@/lib/domain/services/cart.service";
import { getActiveUserId } from "@/utils/authUtils";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Get user context for actions
 */
async function getUserContext(): Promise<ActionResult<UserContext>> {
  try {
    const supabase = await createSupabaseServerClient();
    const userId = await getActiveUserId(supabase);
    
    if (!userId) {
      return {
        success: false,
        error: 'Authentification requise'
      };
    }

    // Get user role (simplified - in real app you'd get this from JWT or database)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    const userContext = CartValidationUtils.createUserContext(
      userId,
      profile?.role || 'user',
      true
    );

    return {
      success: true,
      data: userContext
    };
  } catch (error) {
    logger.error('Failed to get user context', error);
    return {
      success: false,
      error: 'Erreur lors de la vérification de l\'utilisateur'
    };
  }
}

/**
 * Get product details for validation
 */
async function getProductDetails(productId: string): Promise<ActionResult<ProductDetails>> {
  try {
    const supabase = await createSupabaseServerClient();
    
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        price,
        stock,
        slug,
        image_url,
        is_active
      `)
      .eq('id', productId)
      .single();

    if (error) {
      return {
        success: false,
        error: 'Produit non trouvé'
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'Produit non trouvé'
      };
    }

    const productDetails: ProductDetails = {
      id: data.id,
      name: data.name,
      price: data.price,
      stock: data.stock,
      image: data.image_url,
      slug: data.slug,
      isActive: data.is_active,
    };

    return {
      success: true,
      data: productDetails
    };
  } catch (error) {
    logger.error('Failed to get product details', error, { productId });
    return {
      success: false,
      error: 'Erreur lors de la récupération du produit'
    };
  }
}

/**
 * Add item to cart using domain service
 */
export async function addItemToCartV2(
  prevState: unknown,
  formData: FormData
): Promise<ActionResult<unknown>> {
  const context = LogUtils.createUserActionContext('unknown', 'add_item_to_cart_v2', 'cart');
  LogUtils.logOperationStart('addItemToCartV2', context);

  try {
    // Get user context
    const userContextResult = await getUserContext();
    if (!userContextResult.success) {
      return userContextResult;
    }
    const userContext = userContextResult.data!;
    context.userId = userContext.id;

    // Get product ID from form data for early validation
    const productId = formData.get('productId') as string;
    if (!productId) {
      return {
        success: false,
        error: 'ID produit requis'
      };
    }

    // Get product details
    const productDetailsResult = await getProductDetails(productId);
    if (!productDetailsResult.success) {
      return productDetailsResult;
    }
    const productDetails = productDetailsResult.data!;

    // Validate input through coordination layer
    const validationResult = await CartValidationCoordinator.validateAddToCart(
      formData,
      userContext,
      productDetails
    );

    if (validationResult.isError()) {
      const error = validationResult.getError();
      return {
        success: false,
        error: ErrorUtils.isAppError(error) ? ErrorUtils.formatForUser(error) : 'Données invalides'
      };
    }

    const validatedData = validationResult.getValue();

    // Use domain service through DI container
    const { scope } = await createRequestScopedContainer();
    const cartDomainService = scope.resolve<CartDomainService>(SERVICE_TOKENS.CART_DOMAIN_SERVICE);

    // Execute business operation
    const addResult = await cartDomainService.addItemToCart(
      validatedData.userId,
      validatedData.productId,
      validatedData.quantity
    );

    if (addResult.isError()) {
      const error = addResult.getError();
      LogUtils.logOperationError('addItemToCartV2', error, context);
      return {
        success: false,
        error: ErrorUtils.isAppError(error) ? ErrorUtils.formatForUser(error) : 'Erreur lors de l\'ajout'
      };
    }

    const cart = addResult.getValue();

    // Revalidate cache
    revalidateTag('cart');

    // Transform domain entity to API response
    const responseData = {
      id: cart.id,
      userId: cart.userId,
      items: cart.getItems().map(item => ({
        id: item.id,
        productId: item.productReference.id,
        productName: item.productReference.name,
        productPrice: item.productReference.price.amount,
        productImage: item.productReference.imageUrl,
        productSlug: item.productReference.slug,
        quantity: item.quantity.value,
        subtotal: item.getSubtotal().amount,
        addedAt: item.addedAt,
      })),
      totalItems: cart.getTotalQuantity().value,
      subtotal: cart.getSubtotal().amount,
      updatedAt: cart.updatedAt,
    };

    LogUtils.logOperationSuccess('addItemToCartV2', context);
    
    // Clean up scoped services
    scope.dispose();

    return {
      success: true,
      data: responseData,
      message: 'Article ajouté au panier avec succès'
    };

  } catch (error) {
    LogUtils.logOperationError('addItemToCartV2', error, context);
    return {
      success: false,
      error: 'Une erreur inattendue s\'est produite'
    };
  }
}

/**
 * Remove item from cart using domain service
 */
export async function removeItemFromCartV2(
  input: { cartItemId: string }
): Promise<ActionResult<unknown>> {
  const context = LogUtils.createUserActionContext('unknown', 'remove_item_from_cart_v2', 'cart', { 
    cartItemId: input.cartItemId 
  });
  LogUtils.logOperationStart('removeItemFromCartV2', context);

  try {
    // Get user context
    const userContextResult = await getUserContext();
    if (!userContextResult.success) {
      return userContextResult;
    }
    const userContext = userContextResult.data!;
    context.userId = userContext.id;

    // Create form data for validation
    const formData = new FormData();
    formData.append('cartItemId', input.cartItemId);

    // Validate input
    const validationResult = await CartValidationCoordinator.validateRemoveFromCart(
      formData,
      userContext
    );

    if (validationResult.isError()) {
      const error = validationResult.getError();
      return {
        success: false,
        error: ErrorUtils.isAppError(error) ? ErrorUtils.formatForUser(error) : 'Données invalides'
      };
    }

    const validatedData = validationResult.getValue();

    // Use domain service
    const { scope } = await createRequestScopedContainer();
    const cartDomainService = scope.resolve<CartDomainService>(SERVICE_TOKENS.CART_DOMAIN_SERVICE);

    const removeResult = await cartDomainService.removeItemFromCart(
      validatedData.userId,
      validatedData.cartItemId
    );

    if (removeResult.isError()) {
      const error = removeResult.getError();
      LogUtils.logOperationError('removeItemFromCartV2', error, context);
      scope.dispose();
      return {
        success: false,
        error: ErrorUtils.isAppError(error) ? ErrorUtils.formatForUser(error) : 'Erreur lors de la suppression'
      };
    }

    const cart = removeResult.getValue();

    // Revalidate cache
    revalidateTag('cart');

    // Transform response
    const responseData = {
      id: cart.id,
      userId: cart.userId,
      items: cart.getItems().map(item => ({
        id: item.id,
        productId: item.productReference.id,
        productName: item.productReference.name,
        productPrice: item.productReference.price.amount,
        productImage: item.productReference.imageUrl,
        productSlug: item.productReference.slug,
        quantity: item.quantity.value,
        subtotal: item.getSubtotal().amount,
        addedAt: item.addedAt,
      })),
      totalItems: cart.getTotalQuantity().value,
      subtotal: cart.getSubtotal().amount,
      updatedAt: cart.updatedAt,
    };

    LogUtils.logOperationSuccess('removeItemFromCartV2', context);
    scope.dispose();

    return {
      success: true,
      data: responseData,
      message: 'Article supprimé du panier'
    };

  } catch (error) {
    LogUtils.logOperationError('removeItemFromCartV2', error, context);
    return {
      success: false,
      error: 'Une erreur inattendue s\'est produite'
    };
  }
}

/**
 * Update item quantity using domain service
 */
export async function updateCartItemQuantityV2(
  input: { cartItemId: string; quantity: number }
): Promise<ActionResult<unknown>> {
  const context = LogUtils.createUserActionContext('unknown', 'update_cart_item_quantity_v2', 'cart', {
    cartItemId: input.cartItemId,
    quantity: input.quantity
  });
  LogUtils.logOperationStart('updateCartItemQuantityV2', context);

  try {
    // Get user context
    const userContextResult = await getUserContext();
    if (!userContextResult.success) {
      return userContextResult;
    }
    const userContext = userContextResult.data!;
    context.userId = userContext.id;

    // Create form data for validation
    const formData = new FormData();
    formData.append('cartItemId', input.cartItemId);
    formData.append('quantity', input.quantity.toString());

    // Validate input
    const validationResult = await CartValidationCoordinator.validateUpdateQuantity(
      formData,
      userContext
    );

    if (validationResult.isError()) {
      const error = validationResult.getError();
      return {
        success: false,
        error: ErrorUtils.isAppError(error) ? ErrorUtils.formatForUser(error) : 'Données invalides'
      };
    }

    const validatedData = validationResult.getValue();

    // Use domain service
    const { scope } = await createRequestScopedContainer();
    const cartDomainService = scope.resolve<CartDomainService>(SERVICE_TOKENS.CART_DOMAIN_SERVICE);

    const updateResult = await cartDomainService.updateItemQuantity(
      validatedData.userId,
      validatedData.cartItemId,
      validatedData.quantity
    );

    if (updateResult.isError()) {
      const error = updateResult.getError();
      LogUtils.logOperationError('updateCartItemQuantityV2', error, context);
      scope.dispose();
      return {
        success: false,
        error: ErrorUtils.isAppError(error) ? ErrorUtils.formatForUser(error) : 'Erreur lors de la mise à jour'
      };
    }

    const cart = updateResult.getValue();

    // Revalidate cache
    revalidateTag('cart');

    // Transform response
    const responseData = {
      id: cart.id,
      userId: cart.userId,
      items: cart.getItems().map(item => ({
        id: item.id,
        productId: item.productReference.id,
        productName: item.productReference.name,
        productPrice: item.productReference.price.amount,
        productImage: item.productReference.imageUrl,
        productSlug: item.productReference.slug,
        quantity: item.quantity.value,
        subtotal: item.getSubtotal().amount,
        addedAt: item.addedAt,
      })),
      totalItems: cart.getTotalQuantity().value,
      subtotal: cart.getSubtotal().amount,
      updatedAt: cart.updatedAt,
    };

    LogUtils.logOperationSuccess('updateCartItemQuantityV2', context);
    scope.dispose();

    return {
      success: true,
      data: responseData,
      message: 'Quantité mise à jour'
    };

  } catch (error) {
    LogUtils.logOperationError('updateCartItemQuantityV2', error, context);
    return {
      success: false,
      error: 'Une erreur inattendue s\'est produite'
    };
  }
}

/**
 * Clear cart using domain service
 */
export async function clearCartV2(): Promise<ActionResult<unknown>> {
  const context = LogUtils.createUserActionContext('unknown', 'clear_cart_v2', 'cart');
  LogUtils.logOperationStart('clearCartV2', context);

  try {
    // Get user context
    const userContextResult = await getUserContext();
    if (!userContextResult.success) {
      return userContextResult;
    }
    const userContext = userContextResult.data!;
    context.userId = userContext.id;

    // Use domain service
    const { scope } = await createRequestScopedContainer();
    const cartDomainService = scope.resolve<CartDomainService>(SERVICE_TOKENS.CART_DOMAIN_SERVICE);

    const clearResult = await cartDomainService.clearCart(userContext.id);

    if (clearResult.isError()) {
      const error = clearResult.getError();
      LogUtils.logOperationError('clearCartV2', error, context);
      scope.dispose();
      return {
        success: false,
        error: ErrorUtils.isAppError(error) ? ErrorUtils.formatForUser(error) : 'Erreur lors de la vidange'
      };
    }

    const cart = clearResult.getValue();

    // Revalidate cache
    revalidateTag('cart');

    LogUtils.logOperationSuccess('clearCartV2', context);
    scope.dispose();

    return {
      success: true,
      data: {
        id: cart.id,
        userId: cart.userId,
        items: [],
        totalItems: 0,
        subtotal: 0,
        updatedAt: cart.updatedAt,
      },
      message: 'Panier vidé avec succès'
    };

  } catch (error) {
    LogUtils.logOperationError('clearCartV2', error, context);
    return {
      success: false,
      error: 'Une erreur inattendue s\'est produite'
    };
  }
}

/**
 * Get cart using domain service
 */
export async function getCartV2(): Promise<ActionResult<unknown>> {
  const context = LogUtils.createUserActionContext('unknown', 'get_cart_v2', 'cart');

  try {
    // Get user context
    const userContextResult = await getUserContext();
    if (!userContextResult.success) {
      return userContextResult;
    }
    const userContext = userContextResult.data!;
    context.userId = userContext.id;

    // Use domain service
    const { scope } = await createRequestScopedContainer();
    const cartDomainService = scope.resolve<CartDomainService>(SERVICE_TOKENS.CART_DOMAIN_SERVICE);

    const cartResult = await cartDomainService.getCartByUserId(userContext.id);

    if (cartResult.isError()) {
      const error = cartResult.getError();
      LogUtils.logOperationError('getCartV2', error, context);
      scope.dispose();
      return {
        success: false,
        error: ErrorUtils.isAppError(error) ? ErrorUtils.formatForUser(error) : 'Erreur lors de la récupération'
      };
    }

    const cart = cartResult.getValue();

    scope.dispose();

    // Handle empty cart
    if (!cart) {
      return {
        success: true,
        data: {
          id: null,
          userId: userContext.id,
          items: [],
          totalItems: 0,
          subtotal: 0,
          updatedAt: null,
        }
      };
    }

    // Transform response
    const responseData = {
      id: cart.id,
      userId: cart.userId,
      items: cart.getItems().map(item => ({
        id: item.id,
        productId: item.productReference.id,
        productName: item.productReference.name,
        productPrice: item.productReference.price.amount,
        productImage: item.productReference.imageUrl,
        productSlug: item.productReference.slug,
        quantity: item.quantity.value,
        subtotal: item.getSubtotal().amount,
        addedAt: item.addedAt,
        isAvailable: item.isAvailable(),
        isQuantityAvailable: item.isQuantityAvailable(),
      })),
      totalItems: cart.getTotalQuantity().value,
      subtotal: cart.getSubtotal().amount,
      updatedAt: cart.updatedAt,
      unavailableItems: cart.getUnavailableItems().length,
    };

    return {
      success: true,
      data: responseData
    };

  } catch (error) {
    LogUtils.logOperationError('getCartV2', error, context);
    return {
      success: false,
      error: 'Une erreur inattendue s\'est produite'
    };
  }
}

/**
 * Merge carts (for guest to authenticated user transition)
 */
export async function mergeCartsV2(
  input: { guestUserId: string }
): Promise<ActionResult<unknown>> {
  const context = LogUtils.createUserActionContext('unknown', 'merge_carts_v2', 'cart', {
    guestUserId: input.guestUserId
  });
  LogUtils.logOperationStart('mergeCartsV2', context);

  try {
    // Get authenticated user context
    const userContextResult = await getUserContext();
    if (!userContextResult.success) {
      return userContextResult;
    }
    const userContext = userContextResult.data!;
    context.userId = userContext.id;

    // Validate input
    const validationResult = await CartValidationCoordinator.validateMigrateCart(
      input,
      userContext.id
    );

    if (validationResult.isError()) {
      const error = validationResult.getError();
      return {
        success: false,
        error: ErrorUtils.isAppError(error) ? ErrorUtils.formatForUser(error) : 'Données invalides'
      };
    }

    const validatedData = validationResult.getValue();

    // Use domain service
    const { scope } = await createRequestScopedContainer();
    const cartDomainService = scope.resolve<CartDomainService>(SERVICE_TOKENS.CART_DOMAIN_SERVICE);

    const mergeResult = await cartDomainService.mergeCarts(
      validatedData.fromUserId,
      validatedData.toUserId
    );

    if (mergeResult.isError()) {
      const error = mergeResult.getError();
      LogUtils.logOperationError('mergeCartsV2', error, context);
      scope.dispose();
      return {
        success: false,
        error: ErrorUtils.isAppError(error) ? ErrorUtils.formatForUser(error) : 'Erreur lors de la fusion'
      };
    }

    const cart = mergeResult.getValue();

    // Revalidate cache
    revalidateTag('cart');

    // Transform response
    const responseData = {
      id: cart.id,
      userId: cart.userId,
      items: cart.getItems().map(item => ({
        id: item.id,
        productId: item.productReference.id,
        productName: item.productReference.name,
        productPrice: item.productReference.price.amount,
        productImage: item.productReference.imageUrl,
        productSlug: item.productReference.slug,
        quantity: item.quantity.value,
        subtotal: item.getSubtotal().amount,
        addedAt: item.addedAt,
      })),
      totalItems: cart.getTotalQuantity().value,
      subtotal: cart.getSubtotal().amount,
      updatedAt: cart.updatedAt,
    };

    LogUtils.logOperationSuccess('mergeCartsV2', context);
    scope.dispose();

    return {
      success: true,
      data: responseData,
      message: 'Paniers fusionnés avec succès'
    };

  } catch (error) {
    LogUtils.logOperationError('mergeCartsV2', error, context);
    return {
      success: false,
      error: 'Une erreur inattendue s\'est produite'
    };
  }
}

/**
 * Form action wrappers for compatibility
 */
export async function removeItemFromCartFormActionV2(
  prevState: unknown,
  formData: FormData
): Promise<ActionResult<unknown>> {
  const cartItemId = formData.get("cartItemId") as string;

  if (!cartItemId) {
    return {
      success: false,
      error: 'L\'ID de l\'article est requis'
    };
  }

  return removeItemFromCartV2({ cartItemId });
}

export async function updateCartItemQuantityFormActionV2(
  prevState: unknown,
  formData: FormData
): Promise<ActionResult<unknown>> {
  const cartItemId = formData.get("cartItemId") as string;
  const quantityStr = formData.get("quantity") as string;

  if (!cartItemId) {
    return {
      success: false,
      error: 'L\'ID de l\'article est requis'
    };
  }

  const quantity = parseInt(quantityStr, 10);
  if (isNaN(quantity) || quantity < 0) {
    return {
      success: false,
      error: 'La quantité doit être un nombre positif'
    };
  }

  return updateCartItemQuantityV2({ cartItemId, quantity });
}