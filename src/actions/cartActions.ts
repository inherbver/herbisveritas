"use server";

import crypto from "crypto";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import { getActiveUserId } from "@/lib/authUtils";
import { getCart } from "@/lib/cartReader";
import {
  type CartActionResult,
  isSuccessResult,
  createSuccessResult,
  createValidationErrorResult,
  createGeneralErrorResult,
} from "@/lib/cart-helpers";
import type { CartData } from "@/types/cart";
import {
  AddToCartInputSchema,
  RemoveFromCartInputSchema,
  type RemoveFromCartInput,
  UpdateCartItemQuantityInputSchema,
  type UpdateCartItemQuantityInput,
} from "@/lib/schemas/cartSchemas";

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

// Dans cartActions.ts - Version simplifiée de updateCartItemQuantity

export async function updateCartItemQuantity(
  input: UpdateCartItemQuantityInput
): Promise<CartActionResult<CartData | null>> {
  const logPrefix = `[updateCartItemQuantity ${new Date().toISOString()}]`;
  console.log(`${logPrefix} CALLED with input:`, JSON.stringify(input, null, 2));

  const validatedFields = UpdateCartItemQuantityInputSchema.safeParse(input);
  if (!validatedFields.success) {
    const firstError =
      Object.values(validatedFields.error.flatten().fieldErrors).flat()[0] ||
      "Erreur de validation.";
    console.error(`${logPrefix} Validation FAILED:`, validatedFields.error.flatten().fieldErrors);
    return createValidationErrorResult(validatedFields.error.flatten().fieldErrors, firstError);
  }

  const { cartItemId, quantity } = validatedFields.data;
  console.log(`${logPrefix} Validated data - cartItemId: ${cartItemId}, quantity: ${quantity}`);

  if (quantity <= 0) {
    console.log(
      `${logPrefix} Quantity <= 0, redirecting to removeItemFromCart for cartItemId: ${cartItemId}`
    );
    return await removeItemFromCart({ cartItemId });
  }

  const supabase = await createSupabaseServerClient();
  const activeUserId = await getActiveUserId(supabase);

  if (!activeUserId) {
    console.error(`${logPrefix} FAILED to identify active user.`);
    return createGeneralErrorResult("Impossible d'identifier l'utilisateur.");
  }
  console.log(`${logPrefix} Active user identified: ${activeUserId}`);

  try {
    // ÉTAPE 1: Vérifier que l'item appartient bien à l'utilisateur
    console.log(`${logPrefix} Verifying item ownership`);
    const { data: itemData, error: fetchError } = await supabase
      .from("cart_items")
      .select("id, quantity, carts!inner(user_id)") // !inner pour faire un JOIN obligatoire
      .eq("id", cartItemId)
      .eq("carts.user_id", activeUserId) // Maintenant carts est inclus dans le select
      .maybeSingle();

    if (fetchError) {
      console.error(`${logPrefix} FAILED to fetch item for ownership verification:`, fetchError);
      return createGeneralErrorResult(`Erreur lors de la vérification: ${fetchError.message}`);
    }

    if (!itemData) {
      console.warn(`${logPrefix} Item not found or unauthorized access`);
      return createGeneralErrorResult("Article du panier non trouvé ou action non autorisée.");
    }

    console.log(`${logPrefix} Ownership verified. Current quantity: ${itemData.quantity}`);

    // ÉTAPE 2: Mettre à jour la quantité
    console.log(`${logPrefix} Updating cart item quantity`);
    const { data: updateResult, error: updateError } = await supabase
      .from("cart_items")
      .update({
        quantity: quantity,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cartItemId)
      .select("id, quantity") // Simple select sans relation
      .single();

    if (updateError) {
      console.error(`${logPrefix} FAILED to update cart_items:`, updateError);
      return createGeneralErrorResult(`Erreur lors de la mise à jour: ${updateError.message}`);
    }

    if (!updateResult) {
      console.warn(`${logPrefix} No rows updated`);
      return createGeneralErrorResult("Erreur lors de la mise à jour.");
    }

    console.log(
      `${logPrefix} Successfully updated cart_items. New quantity: ${updateResult.quantity}`
    );

    // Revalidation pour les futures requêtes
    revalidateTag("cart");

    // Retourner uniquement le succès
    return createSuccessResult(null, "Quantité de l'article mise à jour.");
  } catch (_e: unknown) {
    const e = _e as Error;
    console.error(`${logPrefix} UNEXPECTED ERROR:`, e);
    return createGeneralErrorResult(
      `Une erreur inattendue est survenue lors de la mise à jour: ${e.message}`
    );
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
    console.log(`[Migration ${migrationId}] ÉCHEC - Validation input`);
    return createValidationErrorResult(validatedFields.error.flatten().fieldErrors);
  }

  const { guestUserId } = validatedFields.data;
  let migrationSuccessful = false;

  try {
    const supabase = await createSupabaseServerClient();
    const supabaseAdmin = createSupabaseAdminClient();
    console.log(`[Migration ${migrationId}] Clients créés`);

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      console.log(`[Migration ${migrationId}] ÉCHEC - Pas d'utilisateur authentifié`);
      return createGeneralErrorResult("Migration impossible : utilisateur non authentifié.");
    }

    const authenticatedUserId = authUser.id;
    console.log(`[Migration ${migrationId}] Auth user ID: ${authenticatedUserId}`);

    if (guestUserId === authenticatedUserId) {
      console.log(`[Migration ${migrationId}] IDs identiques - retour getCart simple`);
      return getCart();
    }

    console.log(`[Migration ${migrationId}] Vérification utilisateur invité...`);
    const { data: guestUserData, error: adminError } =
      await supabaseAdmin.auth.admin.getUserById(guestUserId);

    if (adminError || !guestUserData?.user) {
      console.log(`[Migration ${migrationId}] ÉCHEC - Admin error:`, adminError);
      console.log(`[Migration ${migrationId}] ÉCHEC - Guest user data:`, guestUserData);
      return createGeneralErrorResult("Utilisateur invité invalide ou non trouvé.");
    }

    if (!guestUserData.user.is_anonymous) {
      console.log(`[Migration ${migrationId}] ÉCHEC - User not anonymous:`, guestUserData.user);
      return createGeneralErrorResult("L'ID invité ne correspond pas à un utilisateur anonyme.");
    }

    console.log(`[Migration ${migrationId}] Recherche panier invité...`);
    const { data: guestCart, error: guestCartError } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", guestUserId)
      .maybeSingle();

    if (guestCartError) {
      console.log(`[Migration ${migrationId}] ÉCHEC - Guest cart error:`, guestCartError);
      throw guestCartError;
    }

    if (!guestCart) {
      console.log(`[Migration ${migrationId}] Pas de panier invité - retour getCart`);
      migrationSuccessful = true;
      return getCart();
    }

    console.log(`[Migration ${migrationId}] Panier invité trouvé: ${guestCart.id}`);

    console.log(`[Migration ${migrationId}] Recherche panier auth user...`);
    const { data: authCart, error: authCartError } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", authenticatedUserId)
      .maybeSingle();

    if (authCartError) {
      console.log(`[Migration ${migrationId}] ÉCHEC - Auth cart error:`, authCartError);
      throw authCartError;
    }

    if (!authCart) {
      console.log(`[Migration ${migrationId}] Pas de panier auth - mise à jour ownership...`);
      const { error: updateError } = await supabase
        .from("carts")
        .update({ user_id: authenticatedUserId })
        .eq("id", guestCart.id);

      if (updateError) {
        console.log(`[Migration ${migrationId}] ÉCHEC - Update error:`, updateError);
        throw updateError;
      }
      console.log(`[Migration ${migrationId}] Update réussie`);
    } else {
      console.log(`[Migration ${migrationId}] Fusion des paniers via RPC...`);
      const { error: rpcError } = await supabase.rpc("merge_carts", {
        p_guest_cart_id: guestCart.id,
        p_auth_cart_id: authCart.id,
      });

      if (rpcError) {
        console.log(`[Migration ${migrationId}] ÉCHEC - RPC error:`, rpcError);
        throw rpcError;
      }
      console.log(`[Migration ${migrationId}] RPC réussie`);
    }

    migrationSuccessful = true;
    revalidateTag("cart");

    console.log(`[Migration ${migrationId}] Récupération panier final...`);
    const finalResult = await getCart();
    console.log(`[Migration ${migrationId}] Résultat final:`, finalResult.success);

    return finalResult;
  } catch (error: unknown) {
    console.error(`[Migration ${migrationId}] EXCEPTION:`, error);
    const errorMessage = (error as Error).message || "Erreur de migration.";
    return createGeneralErrorResult(errorMessage);
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
