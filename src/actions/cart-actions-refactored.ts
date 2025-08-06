"use server";

import crypto from "crypto";
import { revalidateTag } from "next/cache";
import { z } from "zod";

import { getActiveUserId } from "@/utils/authUtils";
import { getCart } from "@/lib/cartReader";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CartData } from "@/types/cart";
import {
  AddToCartInputSchema,
  RemoveFromCartInputSchema,
  UpdateCartItemQuantityInputSchema,
  type RemoveFromCartInput,
  type UpdateCartItemQuantityInput,
} from "@/lib/validators/cart.validator";

// New imports for refactored architecture
import { Result, ActionResult } from "@/lib/core/result";
import {
  AuthenticationError,
  ValidationError,
  DatabaseError,
  BusinessError,
  ErrorUtils,
} from "@/lib/core/errors";
import { logger, LogUtils } from "@/lib/core/logger";

// Re-export getCart for external usage
export { getCart };

/**
 * Common context creation for cart operations
 */
function createCartActionContext(operation: string, additionalContext?: Record<string, unknown>) {
  return LogUtils.createUserActionContext(
    "unknown", // Will be set when userId is available
    operation,
    "cart",
    additionalContext
  );
}

/**
 * Gets or creates a cart for the authenticated user
 */
async function getOrCreateUserCart(userId: string): Promise<Result<string, DatabaseError>> {
  try {
    const supabase = await createSupabaseServerClient();

    // Try to find existing cart
    const { data: existingCart, error: findCartError } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (findCartError) {
      return Result.error(ErrorUtils.fromSupabaseError(findCartError) as DatabaseError);
    }

    if (existingCart) {
      return Result.ok(existingCart.id);
    }

    // Create new cart if none exists
    const { data: newCart, error: newCartError } = await supabase
      .from("carts")
      .insert({ user_id: userId })
      .select("id")
      .single();

    if (newCartError || !newCart) {
      return Result.error(ErrorUtils.fromSupabaseError(newCartError) as DatabaseError);
    }

    return Result.ok(newCart.id);
  } catch (error) {
    return Result.error(new DatabaseError("Failed to get or create cart", error));
  }
}

/**
 * Validates user authentication
 */
async function validateUserAuthentication(): Promise<Result<string, AuthenticationError>> {
  try {
    const supabase = await createSupabaseServerClient();
    const activeUserId = await getActiveUserId(supabase);

    if (!activeUserId) {
      return Result.error(new AuthenticationError("Utilisateur non authentifié"));
    }

    return Result.ok(activeUserId);
  } catch (_error) {
    return Result.error(
      new AuthenticationError("Erreur lors de la vérification de l'authentification")
    );
  }
}

/**
 * Refactored add item to cart action
 */
export async function addItemToCart(
  prevState: unknown,
  formData: FormData
): Promise<ActionResult<CartData | null>> {
  const context = createCartActionContext("add_item_to_cart");
  LogUtils.logOperationStart("add_item_to_cart", context);

  try {
    // Validation
    const validationResult = AddToCartInputSchema.safeParse({
      productId: formData.get("productId"),
      quantity: formData.get("quantity"),
    });

    if (!validationResult.success) {
      const error = new ValidationError("Données de formulaire invalides", undefined, {
        validationErrors: validationResult.error.flatten().fieldErrors,
      });
      throw error;
    }

    const { productId, quantity } = validationResult.data;

    // Authentication
    const userResult = await validateUserAuthentication();
    if (userResult.isError()) {
      throw userResult.getError();
    }
    const userId = userResult.getValue();
    context.userId = userId;

    // Get or create cart
    const cartResult = await getOrCreateUserCart(userId);
    if (cartResult.isError()) {
      throw cartResult.getError();
    }
    const cartId = cartResult.getValue();

    // Add item to cart
    const supabase = await createSupabaseServerClient();
    const { error: rpcError } = await supabase.rpc("add_or_update_cart_item", {
      p_cart_id: cartId,
      p_product_id: productId,
      p_quantity_to_add: quantity,
    });

    if (rpcError) {
      throw ErrorUtils.fromSupabaseError(rpcError);
    }

    // Revalidate and return updated cart
    revalidateTag("cart");

    const updatedCartResult = await getCart();
    if (!updatedCartResult.success) {
      throw new BusinessError("Impossible de récupérer le panier mis à jour");
    }

    LogUtils.logOperationSuccess("add_item_to_cart", { ...context, productId, quantity });
    return ActionResult.ok(updatedCartResult.data || null, "Article ajouté au panier avec succès");
  } catch (error) {
    LogUtils.logOperationError("add_item_to_cart", error, context);
    return ActionResult.error(
      ErrorUtils.isAppError(error)
        ? ErrorUtils.formatForUser(error)
        : "Une erreur inattendue est survenue"
    );
  }
}

/**
 * Refactored remove item from cart action
 */
export async function removeItemFromCart(
  input: RemoveFromCartInput
): Promise<ActionResult<CartData | null>> {
  const context = createCartActionContext("remove_item_from_cart");
  LogUtils.logOperationStart("remove_item_from_cart", context);

  try {
    // Validation
    const validationResult = RemoveFromCartInputSchema.safeParse(input);
    if (!validationResult.success) {
      throw new ValidationError("ID d'article invalide", undefined, {
        validationErrors: validationResult.error.flatten().fieldErrors,
      });
    }
    const { cartItemId } = validationResult.data;

    // Authentication
    const userResult = await validateUserAuthentication();
    if (userResult.isError()) {
      throw userResult.getError();
    }
    const userId = userResult.getValue();
    context.userId = userId;

    // Remove item
    const supabase = await createSupabaseServerClient();
    const { error: deleteError } = await supabase.from("cart_items").delete().eq("id", cartItemId);

    if (deleteError) {
      throw ErrorUtils.fromSupabaseError(deleteError);
    }

    // Revalidate and return updated cart
    revalidateTag("cart");

    const updatedCartResult = await getCart();
    if (!updatedCartResult.success) {
      throw new BusinessError("Impossible de récupérer le panier mis à jour");
    }

    LogUtils.logOperationSuccess("remove_item_from_cart", { ...context, cartItemId });
    return ActionResult.ok(updatedCartResult.data || null, "Article supprimé du panier");
  } catch (error) {
    LogUtils.logOperationError("remove_item_from_cart", error, context);
    return ActionResult.error(
      ErrorUtils.isAppError(error)
        ? ErrorUtils.formatForUser(error)
        : "Une erreur inattendue est survenue"
    );
  }
}

/**
 * Refactored update cart item quantity action
 */
export async function updateCartItemQuantity(
  input: UpdateCartItemQuantityInput
): Promise<ActionResult<CartData | null>> {
  const context = createCartActionContext("update_cart_item_quantity");
  LogUtils.logOperationStart("update_cart_item_quantity", context);

  try {
    // Validation
    const validationResult = UpdateCartItemQuantityInputSchema.safeParse(input);
    if (!validationResult.success) {
      throw new ValidationError("Données de quantité invalides", undefined, {
        validationErrors: validationResult.error.flatten().fieldErrors,
      });
    }
    const { cartItemId, quantity } = validationResult.data;

    // Handle removal if quantity is 0 or negative
    if (quantity <= 0) {
      return await removeItemFromCart({ cartItemId });
    }

    // Authentication
    const userResult = await validateUserAuthentication();
    if (userResult.isError()) {
      throw userResult.getError();
    }
    const userId = userResult.getValue();
    context.userId = userId;

    // Update quantity
    const supabase = await createSupabaseServerClient();
    const { error: updateError } = await supabase
      .from("cart_items")
      .update({ quantity })
      .eq("id", cartItemId);

    if (updateError) {
      throw ErrorUtils.fromSupabaseError(updateError);
    }

    // Revalidate and return updated cart
    revalidateTag("cart");

    const updatedCartResult = await getCart();
    if (!updatedCartResult.success) {
      throw new BusinessError("Impossible de récupérer le panier mis à jour");
    }

    LogUtils.logOperationSuccess("update_cart_item_quantity", { ...context, cartItemId, quantity });
    return ActionResult.ok(updatedCartResult.data || null, "Quantité mise à jour");
  } catch (error) {
    LogUtils.logOperationError("update_cart_item_quantity", error, context);
    return ActionResult.error(
      ErrorUtils.isAppError(error)
        ? ErrorUtils.formatForUser(error)
        : "Une erreur inattendue est survenue"
    );
  }
}

/**
 * Form action wrappers (simplified)
 */
export async function removeItemFromCartFormAction(
  prevState: unknown,
  formData: FormData
): Promise<ActionResult<CartData | null>> {
  const cartItemId = formData.get("cartItemId") as string;

  if (!cartItemId) {
    return ActionResult.error("L'ID de l'article est requis");
  }

  return removeItemFromCart({ cartItemId });
}

export async function updateCartItemQuantityFormAction(
  prevState: unknown,
  formData: FormData
): Promise<ActionResult<CartData | null>> {
  const cartItemId = formData.get("cartItemId") as string;
  const quantityStr = formData.get("quantity") as string;

  if (!cartItemId) {
    return ActionResult.error("L'ID de l'article est requis");
  }

  const quantity = parseInt(quantityStr, 10);
  if (isNaN(quantity) || quantity < 0) {
    return ActionResult.error("La quantité doit être un nombre positif");
  }

  return updateCartItemQuantity({ cartItemId, quantity });
}

/**
 * Refactored cart migration (simplified for now)
 */
const MigrateCartInputSchema = z.object({
  guestUserId: z.string().uuid("L'ID de l'invité doit être un UUID valide."),
});

export async function migrateAndGetCart(
  input: z.infer<typeof MigrateCartInputSchema>
): Promise<ActionResult<CartData | null>> {
  const migrationId = crypto.randomBytes(4).toString("hex");
  const context = createCartActionContext("migrate_cart", { migrationId });

  LogUtils.logOperationStart("migrate_cart", context);

  try {
    // Validation
    const validationResult = MigrateCartInputSchema.safeParse(input);
    if (!validationResult.success) {
      throw new ValidationError("ID invité invalide", undefined, {
        validationErrors: validationResult.error.flatten().fieldErrors,
      });
    }
    const { guestUserId } = validationResult.data;

    // Authentication
    const userResult = await validateUserAuthentication();
    if (userResult.isError()) {
      throw userResult.getError();
    }
    const authenticatedUserId = userResult.getValue();
    context.userId = authenticatedUserId;

    // Skip migration if same user
    if (authenticatedUserId === guestUserId) {
      logger.info("No migration needed (same user)", context);
      const cartResult = await getCart();
      return ActionResult.ok(
        cartResult.success ? cartResult.data : null,
        "Aucune migration nécessaire"
      );
    }

    // Migration logic (simplified - full implementation would be extracted to a service)
    const supabase = await createSupabaseServerClient();

    // Find guest cart
    const { data: guestCart, error: guestCartError } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", guestUserId)
      .maybeSingle();

    if (guestCartError) {
      throw ErrorUtils.fromSupabaseError(guestCartError);
    }

    if (!guestCart) {
      logger.info("No guest cart found, returning current user cart", context);
      const cartResult = await getCart();
      return ActionResult.ok(
        cartResult.success ? cartResult.data : null,
        "Aucun panier invité trouvé"
      );
    }

    // Find authenticated user cart
    const { data: authCart, error: authCartError } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", authenticatedUserId)
      .maybeSingle();

    if (authCartError) {
      throw ErrorUtils.fromSupabaseError(authCartError);
    }

    if (!authCart) {
      // Update ownership
      const { error: updateError } = await supabase
        .from("carts")
        .update({ user_id: authenticatedUserId })
        .eq("id", guestCart.id);

      if (updateError) {
        throw ErrorUtils.fromSupabaseError(updateError);
      }
    } else {
      // Merge carts
      const { error: rpcError } = await supabase.rpc("merge_carts", {
        p_guest_cart_id: guestCart.id,
        p_auth_cart_id: authCart.id,
      });

      if (rpcError) {
        throw ErrorUtils.fromSupabaseError(rpcError);
      }
    }

    // Clean up guest user (fire and forget)
    try {
      const supabaseAdmin = createSupabaseAdminClient();
      await supabaseAdmin.auth.admin.deleteUser(guestUserId);
      logger.info("Guest user cleanup successful", { ...context, guestUserId });
    } catch (cleanupError) {
      logger.warn("Guest user cleanup failed", { ...context, cleanupError });
    }

    revalidateTag("cart");

    const finalCartResult = await getCart();
    LogUtils.logOperationSuccess("migrate_cart", context);
    return ActionResult.ok(
      finalCartResult.success ? finalCartResult.data : null,
      "Migration du panier réussie"
    );
  } catch (error) {
    LogUtils.logOperationError("migrate_cart", error, context);
    return ActionResult.error(
      ErrorUtils.isAppError(error) ? ErrorUtils.formatForUser(error) : "Erreur de migration"
    );
  }
}

/**
 * Refactored clear cart action
 */
export async function clearCartAction(_prevState: unknown): Promise<ActionResult<CartData | null>> {
  const context = createCartActionContext("clear_cart");
  LogUtils.logOperationStart("clear_cart", context);

  try {
    // Check authentication, but don't fail if user is not authenticated
    const userResult = await validateUserAuthentication();

    if (userResult.isError()) {
      // For unauthenticated users, just return success - the local cart will be cleared by the client
      logger.info("No authenticated user, skipping server cart clearing", context);
      LogUtils.logOperationSuccess("clear_cart", context);
      return ActionResult.ok(null, "Panier local vidé avec succès");
    }

    const userId = userResult.getValue();
    context.userId = userId;

    const supabase = await createSupabaseServerClient();

    // Find user's cart
    const { data: cartData, error: cartError } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (cartError) {
      throw ErrorUtils.fromSupabaseError(cartError);
    }

    if (!cartData) {
      logger.info("No active cart to clear", context);
      return ActionResult.ok(null, "Aucun panier à vider");
    }

    // Clear cart items
    const { error: deleteItemsError } = await supabase
      .from("cart_items")
      .delete()
      .eq("cart_id", cartData.id);

    if (deleteItemsError) {
      throw ErrorUtils.fromSupabaseError(deleteItemsError);
    }

    revalidateTag("cart");
    LogUtils.logOperationSuccess("clear_cart", context);
    return ActionResult.ok(null, "Panier vidé avec succès");
  } catch (error) {
    LogUtils.logOperationError("clear_cart", error, context);
    return ActionResult.error(
      ErrorUtils.isAppError(error)
        ? ErrorUtils.formatForUser(error)
        : "Une erreur inattendue est survenue"
    );
  }
}
