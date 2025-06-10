"use server";

import crypto from "crypto";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  AddToCartInputSchema,
  RemoveFromCartInputSchema,
  type RemoveFromCartInput,
  UpdateCartItemQuantityInputSchema,
  type UpdateCartItemQuantityInput,
} from "@/lib/schemas/cartSchemas";

import {
  type CartActionResult,
  isSuccessResult,
  createSuccessResult,
  createValidationErrorResult,
  createGeneralErrorResult,
} from "@/lib/cart-helpers";

import type { CartData, CartItem, ProductDetails } from "@/types/cart";

// ✅ Refactorisé pour accepter une instance existante
async function getActiveUserId(supabase: SupabaseClient): Promise<string | null> {
  const {
    data: { user },
    error: getUserError,
  } = await supabase.auth.getUser();

  if (getUserError) {
    console.error("Erreur lors de la récupération de l'utilisateur:", getUserError.message);
  }

  let userId = user?.id;

  if (!userId) {
    const { data: anonAuthResponse, error: anonError } = await supabase.auth.signInAnonymously();
    if (anonError) {
      console.error("Erreur lors de la connexion anonyme:", anonError.message);
      return null;
    }
    if (!anonAuthResponse?.user) {
      console.error("La connexion anonyme n'a pas retourné d'utilisateur.");
      return null;
    }
    userId = anonAuthResponse.user.id;
  }
  return userId;
}

export async function getCart(): Promise<CartActionResult<CartData | null>> {
  const supabase = await createSupabaseServerClient();
  const activeUserId = await getActiveUserId(supabase);

  if (!activeUserId) {
    return createGeneralErrorResult(
      "User identification failed",
      "Impossible d'identifier l'utilisateur."
    );
  }

  const selectQuery = `id, user_id, created_at, updated_at, cart_items (id, product_id, quantity, products (id, name, price, image_url, slug))`;

  try {
    const { data: cart, error: queryError } = await supabase
      .from("carts")
      .select(selectQuery)
      .eq("user_id", activeUserId)
      .order("id", { foreignTable: "cart_items", ascending: true })
      .maybeSingle();

    if (queryError) {
      return createGeneralErrorResult(queryError.message, `Erreur Supabase: ${queryError.message}`);
    }
    if (!cart) {
      return createSuccessResult(null, "Aucun panier actif trouvé.");
    }

    interface RawSupabaseCartItem {
      id: string;
      product_id: string;
      quantity: number;
      products: ProductDetails | ProductDetails[] | null;
    }

    const itemsToTransform: RawSupabaseCartItem[] = cart.cart_items || [];
    const transformedCartItems: CartItem[] = itemsToTransform
      .map((item): CartItem | null => {
        const productData =
          Array.isArray(item.products) && item.products.length > 0
            ? item.products[0]
            : !Array.isArray(item.products) && item.products
              ? item.products
              : null;

        if (!productData) {
          console.error(`Données produit manquantes pour l'article ID: ${item.id}`);
          return null;
        }

        return {
          id: item.id,
          productId: item.product_id,
          quantity: item.quantity,
          name: productData.name,
          price: productData.price,
          image: productData.image_url,
          slug: productData.slug,
        };
      })
      .filter((item): item is CartItem => item !== null);

    const finalCartData: CartData = { ...cart, items: transformedCartItems };
    return createSuccessResult(finalCartData, "Panier récupéré.");
  } catch (e: unknown) {
    const errorMessage = (e as Error).message || "Unknown server error";
    return createGeneralErrorResult(errorMessage, "Une erreur serveur inattendue est survenue.");
  }
}

export async function addItemToCart(
  prevState: CartActionResult<CartData | null> | unknown,
  formData: FormData
): Promise<CartActionResult<CartData | null>> {
  try {
    // 1. Validation
    const validatedFields = AddToCartInputSchema.safeParse({
      productId: formData.get("productId"),
      quantity: formData.get("quantity"),
    });

    if (!validatedFields.success) {
      const firstError =
        Object.values(validatedFields.error.flatten().fieldErrors).flat()[0] ||
        "Erreur de validation.";
      return createValidationErrorResult(validatedFields.error.flatten().fieldErrors, firstError);
    }
    const { productId: validProductId, quantity: quantityToAdd } = validatedFields.data;

    // 2. Auth & Setup
    const supabase = await createSupabaseServerClient();
    const activeUserId = await getActiveUserId(supabase);
    if (!activeUserId) {
      return createGeneralErrorResult(
        "User identification failed",
        "Impossible d'identifier l'utilisateur."
      );
    }

    // 3. Database Logic: Find or create cart
    const { data: existingCart, error: findCartError } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", activeUserId)
      .maybeSingle();

    if (findCartError) throw findCartError;

    let cartId: string;
    if (existingCart) {
      cartId = existingCart.id;
    } else {
      const { data: newCart, error: newCartError } = await supabase
        .from("carts")
        .insert({ user_id: activeUserId })
        .select("id")
        .single();

      if (newCartError || !newCart) {
        throw newCartError || new Error("Cart creation failed.");
      }
      cartId = newCart.id;
    }

    // 4. Call RPC
    const { error: rpcError } = await supabase.rpc("add_or_update_cart_item", {
      p_cart_id: cartId,
      p_product_id: validProductId,
      p_quantity_to_add: quantityToAdd,
    });

    if (rpcError) throw rpcError;

    // 5. Revalidate and Refetch
    revalidateTag("cart");

    const cartStateAfterRpc = await getCart();
    if (!isSuccessResult(cartStateAfterRpc)) {
      return cartStateAfterRpc;
    }

    return createSuccessResult(cartStateAfterRpc.data, "Article ajouté/mis à jour dans le panier.");
  } catch (error: unknown) {
    const e = error as Error;
    console.error(`addItemToCart - Erreur inattendue: ${e.message}`);
    return createGeneralErrorResult(
      e.message,
      "Une erreur inattendue est survenue lors de l'ajout au panier."
    );
  }
}

export async function removeItemFromCart(
  input: RemoveFromCartInput
): Promise<CartActionResult<CartData | null>> {
  const validatedFields = RemoveFromCartInputSchema.safeParse(input);
  if (!validatedFields.success) {
    const firstError =
      Object.values(validatedFields.error.flatten().fieldErrors).flat()[0] ||
      "Erreur de validation.";
    return createValidationErrorResult(validatedFields.error.flatten().fieldErrors, firstError);
  }

  const { cartItemId } = validatedFields.data;
  const supabase = await createSupabaseServerClient();
  const activeUserId = await getActiveUserId(supabase);

  if (!activeUserId) {
    return createGeneralErrorResult("Impossible d'identifier l'utilisateur.");
  }

  try {
    const { data: itemData, error: fetchItemError } = await supabase
      .from("cart_items")
      .select("id, carts (user_id)")
      .eq("id", cartItemId)
      .maybeSingle();

    if (fetchItemError) {
      return createGeneralErrorResult(`Erreur interne: ${fetchItemError.message}`);
    }

    if (!itemData) {
      return createGeneralErrorResult("Article du panier non trouvé.");
    }

    // @ts-expect-error itemData.carts is expected to be an object if found
    if (!itemData.carts || itemData.carts.user_id !== activeUserId) {
      return createGeneralErrorResult(
        "Action non autorisée: cet article n'appartient pas à votre panier."
      );
    }

    const { error: deleteItemError } = await supabase
      .from("cart_items")
      .delete()
      .eq("id", cartItemId);

    if (deleteItemError) {
      return createGeneralErrorResult(`Erreur lors de la suppression: ${deleteItemError.message}`);
    }

    revalidateTag("cart");

    const cartStateAfterRemove = await getCart();
    if (!isSuccessResult(cartStateAfterRemove)) {
      return createGeneralErrorResult(
        "Erreur lors de la récupération du panier après suppression."
      );
    }

    return createSuccessResult(cartStateAfterRemove.data, "Article supprimé du panier.");
  } catch (_e: unknown) {
    return createGeneralErrorResult("Une erreur inattendue est survenue lors de la suppression.");
  }
}

export async function updateCartItemQuantity(
  input: UpdateCartItemQuantityInput
): Promise<CartActionResult<CartData | null>> {
  const validatedFields = UpdateCartItemQuantityInputSchema.safeParse(input);
  if (!validatedFields.success) {
    const firstError =
      Object.values(validatedFields.error.flatten().fieldErrors).flat()[0] ||
      "Erreur de validation.";
    return createValidationErrorResult(validatedFields.error.flatten().fieldErrors, firstError);
  }

  const { cartItemId, quantity } = validatedFields.data;

  if (quantity <= 0) {
    return await removeItemFromCart({ cartItemId });
  }

  const supabase = await createSupabaseServerClient();
  const activeUserId = await getActiveUserId(supabase);

  if (!activeUserId) {
    return createGeneralErrorResult("Impossible d'identifier l'utilisateur.");
  }

  try {
    const { data: itemData, error: fetchItemError } = await supabase
      .from("cart_items")
      .select("id, quantity, carts (user_id)")
      .eq("id", cartItemId)
      .maybeSingle();

    if (fetchItemError) {
      return createGeneralErrorResult(`Erreur interne: ${fetchItemError.message}`);
    }

    if (!itemData) {
      return createGeneralErrorResult("Article du panier non trouvé.");
    }

    // @ts-expect-error itemData.carts is expected to be an object if found
    if (!itemData.carts || itemData.carts.user_id !== activeUserId) {
      return createGeneralErrorResult(
        "Action non autorisée: cet article n'appartient pas à votre panier."
      );
    }

    const { error: updateItemError } = await supabase
      .from("cart_items")
      .update({ quantity: quantity, updated_at: new Date().toISOString() })
      .eq("id", cartItemId);

    if (updateItemError) {
      return createGeneralErrorResult(`Erreur lors de la mise à jour: ${updateItemError.message}`);
    }

    revalidateTag("cart");

    const cartStateAfterUpdate = await getCart();
    if (!isSuccessResult(cartStateAfterUpdate)) {
      return createGeneralErrorResult(
        "Erreur lors de la récupération du panier après mise à jour."
      );
    }

    return createSuccessResult(cartStateAfterUpdate.data, "Quantité de l'article mise à jour.");
  } catch (_e: unknown) {
    return createGeneralErrorResult("Une erreur inattendue est survenue lors de la mise à jour.");
  }
}

const MigrateCartInputSchema = z.object({
  guestUserId: z.string().uuid("L'ID de l'invité doit être un UUID valide."),
});

export async function migrateAndGetCart(
  input: z.infer<typeof MigrateCartInputSchema>
): Promise<CartActionResult<CartData | null>> {
  const migrationId = crypto.randomUUID();
  console.log(`[Migration ${migrationId}] Début: ${input.guestUserId}`);

  const validatedFields = MigrateCartInputSchema.safeParse(input);
  if (!validatedFields.success) {
    return createValidationErrorResult(validatedFields.error.flatten().fieldErrors);
  }

  const { guestUserId } = validatedFields.data;
  let migrationSuccessful = false;

  try {
    const supabase = await createSupabaseServerClient();
    const supabaseAdmin = createSupabaseAdminClient();

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) {
      return createGeneralErrorResult("Migration impossible : utilisateur non authentifié.");
    }

    const authenticatedUserId = authUser.id;
    if (guestUserId === authenticatedUserId) {
      return getCart();
    }

    const { data: guestUserData, error: adminError } =
      await supabaseAdmin.auth.admin.getUserById(guestUserId);
    if (adminError || !guestUserData?.user?.is_anonymous) {
      return createGeneralErrorResult("ID invité invalide.");
    }

    const { data: guestCart } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", guestUserId)
      .single();
    if (!guestCart) {
      migrationSuccessful = true;
      return getCart();
    }

    const { data: authCart } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", authenticatedUserId)
      .single();

    if (!authCart) {
      const { error } = await supabase
        .from("carts")
        .update({ user_id: authenticatedUserId })
        .eq("id", guestCart.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.rpc("merge_carts", {
        p_guest_cart_id: guestCart.id,
        p_auth_cart_id: authCart.id,
      });
      if (error) throw error;
    }

    migrationSuccessful = true;
    revalidateTag("cart");
    return getCart();
  } catch (error: unknown) {
    return createGeneralErrorResult((error as Error).message || "Erreur de migration.");
  } finally {
    if (migrationSuccessful) {
      try {
        const supabaseAdmin = createSupabaseAdminClient();
        await supabaseAdmin.auth.admin.deleteUser(guestUserId);
        console.log(`[Migration ${migrationId}] Nettoyage réussi.`);
      } catch (cleanupError) {
        console.warn(`[Migration ${migrationId}] Échec du nettoyage.`, cleanupError);
      }
    }
  }
}

export async function clearCartAction(
  _prevState: CartActionResult<CartData | null>
): Promise<CartActionResult<CartData | null>> {
  const supabase = await createSupabaseServerClient();
  const activeUserId = await getActiveUserId(supabase);

  if (!activeUserId) {
    return createGeneralErrorResult("Impossible d'identifier l'utilisateur.");
  }

  try {
    const { data: cartData, error: cartError } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", activeUserId)
      .maybeSingle();

    if (cartError) {
      return createGeneralErrorResult(
        `Erreur lors de la recherche du panier: ${cartError.message}`
      );
    }

    if (!cartData) {
      return createSuccessResult(null, "Aucun panier actif à vider.");
    }

    const { error: deleteItemsError } = await supabase
      .from("cart_items")
      .delete()
      .eq("cart_id", cartData.id);

    if (deleteItemsError) {
      return createGeneralErrorResult(`Erreur lors de la suppression: ${deleteItemsError.message}`);
    }

    revalidateTag("cart");
    return createSuccessResult(null, "Panier vidé avec succès.");
  } catch (_e: unknown) {
    return createGeneralErrorResult("Une erreur inattendue est survenue.");
  }
}
