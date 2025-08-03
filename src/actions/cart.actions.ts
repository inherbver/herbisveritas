"use server";

/**
 * Unified Cart Actions - Clean Architecture
 * 
 * Consolidates all cart server actions with:
 * - Clean error handling
 * - Proper validation
 * - Optimistic update support
 * - Legacy compatibility
 */

import crypto from "crypto";
import { revalidateTag } from "next/cache";
import { z } from "zod";

import { getActiveUserId } from "@/utils/authUtils";
import {
  createGeneralErrorResult,
  createSuccessResult,
  createValidationErrorResult,
  isGeneralErrorResult,
  type CartActionResult,
} from "@/lib/cart-helpers";
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

// Re-export getCart for external usage
export { getCart };

// --- Core Cart Actions ---

/**
 * Add item to cart with proper validation and error handling
 */
export async function addItemToCart(
  prevState: unknown,
  formData: FormData
): Promise<CartActionResult<CartData | null>> {
  try {
    // Validate input
    const validatedFields = AddToCartInputSchema.safeParse({
      productId: formData.get("productId"),
      quantity: formData.get("quantity"),
    });

    if (!validatedFields.success) {
      return createValidationErrorResult(
        validatedFields.error.flatten().fieldErrors,
        "Erreur de validation."
      );
    }

    const { productId, quantity } = validatedFields.data;

    // Get user context
    const supabase = await createSupabaseServerClient();
    const adminSupabase = await createSupabaseAdminClient();
    const userId = await getActiveUserId(supabase);

    // Fetch product details for validation
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, price, image_url, stock, slug")
      .eq("id", productId)
      .eq("is_active", true)
      .single();

    if (productError || !product) {
      return createGeneralErrorResult("Produit non trouvé ou non disponible.");
    }

    // Check stock availability
    if (product.stock !== null && product.stock < quantity) {
      return createGeneralErrorResult("Stock insuffisant pour ce produit.");
    }

    // Get current cart
    const cartResult = await getCart();
    if (!cartResult.success) {
      return createGeneralErrorResult("Erreur lors de la récupération du panier.");
    }

    const currentCart = cartResult.data;
    const existingItem = currentCart?.items.find(item => item.productId === productId);

    if (existingItem) {
      // Update existing item quantity
      const newQuantity = existingItem.quantity + quantity;
      
      // Check total quantity against stock
      if (product.stock !== null && product.stock < newQuantity) {
        return createGeneralErrorResult("Stock insuffisant pour cette quantité.");
      }

      const { error: updateError } = await adminSupabase
        .from("cart_items")
        .update({ 
          quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq("id", existingItem.id);

      if (updateError) {
        return createGeneralErrorResult("Erreur lors de la mise à jour du panier.");
      }
    } else {
      // Add new item to cart
      const cartId = currentCart?.id || crypto.randomUUID();
      
      // Create cart if it doesn't exist
      if (!currentCart?.id) {
        const { error: cartError } = await adminSupabase
          .from("carts")
          .insert({
            id: cartId,
            user_id: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (cartError) {
          return createGeneralErrorResult("Erreur lors de la création du panier.");
        }
      }

      // Add cart item
      const { error: itemError } = await adminSupabase
        .from("cart_items")
        .insert({
          id: crypto.randomUUID(),
          cart_id: cartId,
          product_id: productId,
          quantity,
          price_at_add: product.price,
          product_name_at_add: product.name,
          product_image_url_at_add: product.image_url,
          product_slug_at_add: product.slug,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (itemError) {
        return createGeneralErrorResult("Erreur lors de l'ajout au panier.");
      }
    }

    // Revalidate cart cache
    revalidateTag("cart");

    // Get updated cart for response
    const updatedCartResult = await getCart();
    
    return createSuccessResult(
      updatedCartResult.success ? updatedCartResult.data : null,
      "Produit ajouté au panier avec succès !"
    );

  } catch (error) {
    console.error("Error in addItemToCart:", error);
    return createGeneralErrorResult("Une erreur inattendue s'est produite.");
  }
}

/**
 * Remove item from cart
 */
export async function removeItemFromCart(
  prevState: unknown,
  formData: FormData
): Promise<CartActionResult<CartData | null>> {
  try {
    const validatedFields = RemoveFromCartInputSchema.safeParse({
      cartItemId: formData.get("cartItemId"),
    });

    if (!validatedFields.success) {
      return createValidationErrorResult(
        validatedFields.error.flatten().fieldErrors,
        "Erreur de validation."
      );
    }

    const { cartItemId: itemId } = validatedFields.data;
    const adminSupabase = await createSupabaseAdminClient();

    // Remove the item
    const { error } = await adminSupabase
      .from("cart_items")
      .delete()
      .eq("id", itemId);

    if (error) {
      return createGeneralErrorResult("Erreur lors de la suppression de l'article.");
    }

    // Revalidate cache
    revalidateTag("cart");

    // Get updated cart
    const updatedCartResult = await getCart();
    
    return createSuccessResult(
      updatedCartResult.success ? updatedCartResult.data : null,
      "Article supprimé du panier."
    );

  } catch (error) {
    console.error("Error in removeItemFromCart:", error);
    return createGeneralErrorResult("Une erreur inattendue s'est produite.");
  }
}

/**
 * Update cart item quantity
 */
export async function updateCartItemQuantity(
  prevState: unknown,
  formData: FormData
): Promise<CartActionResult<CartData | null>> {
  try {
    const validatedFields = UpdateCartItemQuantityInputSchema.safeParse({
      cartItemId: formData.get("cartItemId"),
      quantity: formData.get("quantity"),
    });

    if (!validatedFields.success) {
      return createValidationErrorResult(
        validatedFields.error.flatten().fieldErrors,
        "Erreur de validation."
      );
    }

    const { cartItemId: itemId, quantity } = validatedFields.data;

    if (quantity <= 0) {
      // If quantity is 0 or negative, remove the item
      const removeFormData = new FormData();
      removeFormData.append("cartItemId", itemId);
      return removeItemFromCart(null, removeFormData);
    }

    const adminSupabase = await createSupabaseAdminClient();
    const supabase = await createSupabaseServerClient();

    // Get cart item with product info for stock validation
    const { data: cartItem, error: itemError } = await supabase
      .from("cart_items")
      .select(`
        id,
        product_id,
        quantity,
        products!inner (
          stock,
          name
        )
      `)
      .eq("id", itemId)
      .single();

    if (itemError || !cartItem) {
      return createGeneralErrorResult("Article non trouvé dans le panier.");
    }

    // Check stock availability
    const product = cartItem.products as any;
    if (product.stock !== null && product.stock < quantity) {
      return createGeneralErrorResult("Stock insuffisant pour cette quantité.");
    }

    // Update quantity
    const { error: updateError } = await adminSupabase
      .from("cart_items")
      .update({ 
        quantity,
        updated_at: new Date().toISOString()
      })
      .eq("id", itemId);

    if (updateError) {
      return createGeneralErrorResult("Erreur lors de la mise à jour de la quantité.");
    }

    // Revalidate cache
    revalidateTag("cart");

    // Get updated cart
    const updatedCartResult = await getCart();
    
    return createSuccessResult(
      updatedCartResult.success ? updatedCartResult.data : null,
      "Quantité mise à jour."
    );

  } catch (error) {
    console.error("Error in updateCartItemQuantity:", error);
    return createGeneralErrorResult("Une erreur inattendue s'est produite.");
  }
}

/**
 * Clear entire cart
 */
export async function clearCartAction(): Promise<CartActionResult<CartData | null>> {
  try {
    const supabase = await createSupabaseServerClient();
    const adminSupabase = await createSupabaseAdminClient();
    const userId = await getActiveUserId(supabase);

    // Get current cart
    const cartResult = await getCart();
    if (!cartResult.success || !cartResult.data) {
      return createSuccessResult(null, "Panier déjà vide.");
    }

    // Delete all cart items
    const { error: itemsError } = await adminSupabase
      .from("cart_items")
      .delete()
      .eq("cart_id", cartResult.data.id);

    if (itemsError) {
      return createGeneralErrorResult("Erreur lors de la suppression des articles.");
    }

    // Delete the cart
    const { error: cartError } = await adminSupabase
      .from("carts")
      .delete()
      .eq("id", cartResult.data.id);

    if (cartError) {
      console.warn("Could not delete cart:", cartError);
      // Non-critical error, items are already deleted
    }

    // Revalidate cache
    revalidateTag("cart");

    return createSuccessResult(null, "Panier vidé avec succès.");

  } catch (error) {
    console.error("Error in clearCartAction:", error);
    return createGeneralErrorResult("Une erreur inattendue s'est produite.");
  }
}

/**
 * Migrate guest cart to authenticated user cart
 */
export async function migrateAndGetCart(
  guestCartItems: any[] = []
): Promise<CartActionResult<CartData | null>> {
  try {
    const supabase = await createSupabaseServerClient();
    const userId = await getActiveUserId(supabase);
    
    if (!userId) {
      return createGeneralErrorResult("Utilisateur non authentifié.");
    }

    // If no guest items to migrate, just return current cart
    if (!guestCartItems || guestCartItems.length === 0) {
      const cartResult = await getCart();
      return cartResult.success 
        ? createSuccessResult(cartResult.data, "Panier récupéré.")
        : createGeneralErrorResult("Erreur lors de la récupération du panier.");
    }

    const adminSupabase = await createSupabaseAdminClient();

    // Get or create user cart
    let { data: userCart } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!userCart) {
      const cartId = crypto.randomUUID();
      const { error: cartError } = await adminSupabase
        .from("carts")
        .insert({
          id: cartId,
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (cartError) {
        return createGeneralErrorResult("Erreur lors de la création du panier utilisateur.");
      }

      userCart = { id: cartId };
    }

    // Migrate guest items to user cart
    for (const guestItem of guestCartItems) {
      // Check if product exists and is active
      const { data: product } = await supabase
        .from("products")
        .select("id, name, price, image_url, slug, stock")
        .eq("id", guestItem.productId)
        .eq("is_active", true)
        .single();

      if (!product) continue; // Skip invalid products

      // Check if item already exists in user cart
      const { data: existingItem } = await supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("cart_id", userCart.id)
        .eq("product_id", guestItem.productId)
        .single();

      if (existingItem) {
        // Update existing item quantity
        const newQuantity = existingItem.quantity + guestItem.quantity;
        
        // Check stock
        if (product.stock !== null && product.stock < newQuantity) {
          continue; // Skip if would exceed stock
        }

        await adminSupabase
          .from("cart_items")
          .update({ 
            quantity: newQuantity,
            updated_at: new Date().toISOString()
          })
          .eq("id", existingItem.id);
      } else {
        // Add new item
        if (product.stock !== null && product.stock < guestItem.quantity) {
          continue; // Skip if exceeds stock
        }

        await adminSupabase
          .from("cart_items")
          .insert({
            id: crypto.randomUUID(),
            cart_id: userCart.id,
            product_id: guestItem.productId,
            quantity: guestItem.quantity,
            price_at_add: product.price,
            product_name_at_add: product.name,
            product_image_url_at_add: product.image_url,
            product_slug_at_add: product.slug,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }
    }

    // Revalidate cache
    revalidateTag("cart");

    // Return migrated cart
    const cartResult = await getCart();
    return cartResult.success 
      ? createSuccessResult(cartResult.data, "Panier migré avec succès.")
      : createGeneralErrorResult("Erreur lors de la récupération du panier migré.");

  } catch (error) {
    console.error("Error in migrateAndGetCart:", error);
    return createGeneralErrorResult("Une erreur inattendue s'est produite.");
  }
}

// --- Legacy Action Wrappers (for compatibility) ---

/**
 * Form action wrapper for removeItemFromCart
 */
export async function removeItemFromCartFormAction(formData: FormData) {
  return removeItemFromCart(null, formData);
}

/**
 * Form action wrapper for updateCartItemQuantity
 */
export async function updateCartItemQuantityFormAction(formData: FormData) {
  return updateCartItemQuantity(null, formData);
}

// --- Export aliases for backward compatibility ---
export { addItemToCart as addItemToCartAction };
export { removeItemFromCart as removeItemFromCartAction };
export { updateCartItemQuantity as updateCartItemQuantityAction };