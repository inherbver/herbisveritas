"use server";

import crypto from "crypto";
import { revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { getActiveUserId, withStableSession } from "@/utils/authUtils";
import {
  createGeneralErrorResult,
  createSuccessResult,
  createValidationErrorResult,
  isGeneralErrorResult,
  type CartActionResult,
} from "@/lib/cart-helpers";
import { getCart } from "@/lib/cartReader";
import { type Product } from "@/lib/supabase/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/admin/event-logger";
// ✅ Utiliser CartData depuis types/cart.ts
import type { CartData } from "@/types/cart";
import {
  AddToCartInputSchema,
  RemoveFromCartInputSchema,
  UpdateCartItemQuantityInputSchema,
  type RemoveFromCartInput,
  type UpdateCartItemQuantityInput,
} from "@/lib/validators/cart.validator";

// SÉCURITÉ: Rate limiting pour actions de panier (actuellement non utilisé)
// import { withRateLimit } from "@/lib/security/rate-limit-decorator";

// Re-export getCart for external usage
export { getCart };

// --- Cart Actions ---

export async function addItemToCart(
  prevState: unknown,
  formData: FormData,
): Promise<CartActionResult<(CartData & { guestCartId?: string }) | null>> {
  return await withStableSession(async () => {
    console.log("🛒 [addItemToCart] Starting with stable session...");
    try {
      const validatedFields = AddToCartInputSchema.safeParse({
        productId: formData.get("productId"),
        quantity: formData.get("quantity"),
      });

      if (!validatedFields.success) {
        return createValidationErrorResult(
          validatedFields.error.flatten().fieldErrors,
          "Erreur de validation.",
        );
      }

      const { productId, quantity } = validatedFields.data;
      console.log("🛒 [addItemToCart] Validated data:", {
        productId,
        quantity,
      });

      const supabase = await createSupabaseServerClient();

      // Récupérer les infos du produit pour le logging
      const { data: product } = await supabase
        .from("products")
        .select("name, price")
        .eq("id", productId)
        .single();
      const activeUserId = await getActiveUserId(supabase);

      // Gestion des utilisateurs invités (guests) - similaire à cartReader.ts
      let cartId: string | null = null;

      if (activeUserId) {
        // Utilisateur authentifié - chercher son panier
        const { data: existingCart, error: findCartError } = await supabase
          .from("carts")
          .select("id")
          .eq("user_id", activeUserId)
          .maybeSingle();

        if (findCartError) throw findCartError;
        cartId = existingCart?.id || null;
      } else {
        // Utilisateur invité - chercher le panier via cookie
        const cookieStore = await cookies();
        const guestCartId = cookieStore.get("herbis-cart-id")?.value;

        if (guestCartId) {
          // Vérifier que le panier invité existe
          const { data: guestCart, error: guestCartError } = await supabase
            .from("carts")
            .select("id")
            .eq("id", guestCartId)
            .maybeSingle();

          if (guestCartError) throw guestCartError;
          cartId = guestCart?.id || null;
        }
      }

      // Créer un nouveau panier si nécessaire
      if (!cartId) {
        if (activeUserId) {
          // Créer un panier pour utilisateur authentifié
          const { data: newCart, error: newCartError } = await supabase
            .from("carts")
            .insert({ user_id: activeUserId })
            .select("id")
            .single();
          if (newCartError || !newCart) {
            throw newCartError || new Error("Cart creation failed.");
          }
          cartId = newCart.id;
        } else {
          // Créer un panier invité avec un guest_id généré
          const guestId = crypto.randomUUID();
          const { data: newGuestCart, error: newGuestCartError } =
            await supabase
              .from("carts")
              .insert({ guest_id: guestId })
              .select("id")
              .single();
          if (newGuestCartError || !newGuestCart) {
            throw newGuestCartError || new Error("Guest cart creation failed.");
          }
          cartId = newGuestCart.id;
          console.log("🛒 [addItemToCart] Created guest cart:", cartId);

          // IMPORTANT: Définir le cookie pour le panier invité (SÉCURISÉ)
          const cookieStore = await cookies();
          cookieStore.set("herbis-cart-id", cartId, {
            httpOnly: true, // Protection contre XSS - ne peut pas être lu par JavaScript
            secure: process.env.NODE_ENV === "production", // HTTPS en production
            sameSite: "lax", // Protection CSRF tout en permettant la navigation normale
            maxAge: 14 * 24 * 60 * 60, // 14 jours (aligné avec cleanup_expired_guest_carts)
            path: "/",
          });
          console.log("🛒 [addItemToCart] Set guest cart cookie:", cartId);
        }
      }

      console.log("🛒 [addItemToCart] Final cartId:", cartId);

      // Vérification de sécurité - cartId ne devrait jamais être null à ce point
      if (!cartId) {
        throw new Error("Failed to create or find cart");
      }

      const { error: rpcError } = await supabase.rpc(
        "add_or_update_cart_item",
        {
          p_cart_id: cartId,
          p_product_id: productId,
          p_quantity_to_add: quantity,
        },
      );

      if (rpcError) {
        console.error("🛒 [addItemToCart] Supabase RPC Error:", rpcError);
        throw new Error(
          `Erreur lors de l'ajout au panier: ${rpcError.message}`,
        );
      }

      console.log("🛒 [addItemToCart] RPC call successful");

      revalidateTag("cart");

      console.log("🛒 [addItemToCart] Fetching updated cart...");
      const updatedCart = await getCart();
      console.log("🛒 [addItemToCart] Updated cart result:", {
        success: updatedCart.success,
        itemsCount: updatedCart.success
          ? updatedCart.data?.items?.length
          : "N/A",
        totalQuantity:
          updatedCart.success && updatedCart.data?.items
            ? updatedCart.data.items.reduce(
                (sum, item) => sum + item.quantity,
                0,
              )
            : "N/A",
      });
      if (!updatedCart.success) {
        if (isGeneralErrorResult(updatedCart)) {
          return createGeneralErrorResult(
            updatedCart.error,
            updatedCart.message,
          );
        } else {
          return createGeneralErrorResult(
            "UnexpectedError",
            "Une erreur inattendue est survenue lors de la récupération du panier mis à jour.",
          );
        }
      }

      // Log l'ajout au panier
      await logEvent(
        "CART_ITEM_ADDED",
        activeUserId || undefined,
        {
          product_id: productId,
          product_name: product?.name || "Produit inconnu",
          product_price: product?.price || 0,
          quantity: quantity,
          message: `Ajout panier: ${product?.name || "produit"} (${quantity}x)`,
        },
        "INFO",
      );

      const resultData = {
        ...updatedCart.data,
        ...(!activeUserId && cartId && { guestCartId: cartId }),
      };

      console.log(
        "🛒 [addItemToCart] Returning success result with cart items:",
        {
          itemsCount: resultData.items?.length,
          totalQuantity: resultData.items?.reduce(
            (sum, item) => sum + item.quantity,
            0,
          ),
          guestCartId: resultData.guestCartId,
          firstThreeItems: resultData.items?.slice(0, 3).map((item) => ({
            name: item.name,
            quantity: item.quantity,
          })),
        },
      );

      return createSuccessResult(
        resultData as CartData & { guestCartId?: string },
        "Article ajouté au panier avec succès.",
      );
    } catch (error: unknown) {
      const errorMessage = (error as Error).message;
      console.error("🛒 [addItemToCart] EXCEPTION:", error);
      return createGeneralErrorResult(
        errorMessage,
        "Une erreur inattendue est survenue.",
      );
    }
  });
}

export async function removeItemFromCart(
  input: RemoveFromCartInput,
): Promise<CartActionResult<CartData | null>> {
  try {
    const validatedFields = RemoveFromCartInputSchema.safeParse(input);
    if (!validatedFields.success) {
      return createValidationErrorResult(
        validatedFields.error.flatten().fieldErrors,
        "Erreur de validation.",
      );
    }
    const { cartItemId } = validatedFields.data;

    const supabase = await createSupabaseServerClient();
    const activeUserId = await getActiveUserId(supabase);
    if (!activeUserId) {
      return createGeneralErrorResult(
        "User not authenticated.",
        "Impossible d'identifier l'utilisateur.",
      );
    }

    // Récupérer les infos de l'article avant suppression pour le logging
    const { data: cartItem } = await supabase
      .from("cart_items")
      .select("product_id, quantity, product:products(name, price)")
      .eq("id", cartItemId)
      .single();

    const { error: deleteError } = await supabase
      .from("cart_items")
      .delete()
      .eq("id", cartItemId);

    if (deleteError) {
      console.error("Supabase Delete Error:", deleteError);
      throw new Error(
        `Erreur lors de la suppression de l'article: ${deleteError.message}`,
      );
    }

    revalidateTag("cart");

    const updatedCart = await getCart();
    if (!updatedCart.success) {
      if (isGeneralErrorResult(updatedCart)) {
        return createGeneralErrorResult(updatedCart.error, updatedCart.message);
      } else {
        return createGeneralErrorResult(
          "UnexpectedError",
          "Une erreur inattendue est survenue lors de la récupération du panier mis à jour.",
        );
      }
    }

    // Log la suppression du panier
    if (cartItem) {
      await logEvent(
        "CART_ITEM_REMOVED",
        activeUserId,
        {
          product_id: cartItem.product_id,
          product_name:
            (cartItem.product as Product)?.name || "Produit inconnu",
          product_price: (cartItem.product as Product)?.price || 0,
          quantity: cartItem.quantity,
          message: `Suppression panier: ${(cartItem.product as Product)?.name || "produit"}`,
        },
        "INFO",
      );
    }

    return createSuccessResult(updatedCart.data, "Article supprimé du panier.");
  } catch (error: unknown) {
    const errorMessage = (error as Error).message;
    console.error("removeItemFromCart Error:", error);
    return createGeneralErrorResult(
      errorMessage,
      "Une erreur inattendue est survenue.",
    );
  }
}

export async function updateCartItemQuantity(
  input: UpdateCartItemQuantityInput,
): Promise<CartActionResult<CartData | null>> {
  try {
    const validatedFields = UpdateCartItemQuantityInputSchema.safeParse(input);
    if (!validatedFields.success) {
      return createValidationErrorResult(
        validatedFields.error.flatten().fieldErrors,
        "Erreur de validation.",
      );
    }
    const { cartItemId, quantity } = validatedFields.data;

    if (quantity <= 0) {
      return await removeItemFromCart({ cartItemId });
    }

    const supabase = await createSupabaseServerClient();
    const activeUserId = await getActiveUserId(supabase);
    if (!activeUserId) {
      return createGeneralErrorResult(
        "User not authenticated.",
        "Impossible d'identifier l'utilisateur.",
      );
    }

    const { error: updateError } = await supabase
      .from("cart_items")
      .update({ quantity })
      .eq("id", cartItemId);

    if (updateError) {
      console.error("Supabase Update Error:", updateError);
      throw new Error(
        `Erreur lors de la mise à jour de la quantité: ${updateError.message}`,
      );
    }

    revalidateTag("cart");

    const updatedCart = await getCart();
    if (!updatedCart.success) {
      if (isGeneralErrorResult(updatedCart)) {
        return createGeneralErrorResult(updatedCart.error, updatedCart.message);
      } else {
        return createGeneralErrorResult(
          "UnexpectedError",
          "Une erreur inattendue est survenue lors de la récupération du panier mis à jour.",
        );
      }
    }

    return createSuccessResult(updatedCart.data, "Quantité mise à jour.");
  } catch (error: unknown) {
    const errorMessage = (error as Error).message;
    console.error("updateCartItemQuantity Error:", error);
    return createGeneralErrorResult(
      errorMessage,
      "Une erreur inattendue est survenue.",
    );
  }
}

export async function removeItemFromCartFormAction(
  prevState: unknown,
  formData: FormData,
): Promise<CartActionResult<CartData | null>> {
  const cartItemId = formData.get("cartItemId") as string;

  if (!cartItemId) {
    return createValidationErrorResult(
      { cartItemId: ["L'ID de l'article est requis"] },
      "L'ID de l'article est requis",
    );
  }

  return removeItemFromCart({ cartItemId });
}

export async function updateCartItemQuantityFormAction(
  prevState: unknown,
  formData: FormData,
): Promise<CartActionResult<CartData | null>> {
  const cartItemId = formData.get("cartItemId") as string;
  const quantityStr = formData.get("quantity") as string;

  if (!cartItemId) {
    return createValidationErrorResult(
      { cartItemId: ["L'ID de l'article est requis"] },
      "L'ID de l'article est requis",
    );
  }

  const quantity = parseInt(quantityStr, 10);
  if (isNaN(quantity) || quantity < 0) {
    return createValidationErrorResult(
      { quantity: ["La quantité doit être un nombre positif"] },
      "La quantité doit être un nombre positif",
    );
  }

  return updateCartItemQuantity({ cartItemId, quantity });
}

const MigrateCartInputSchema = z.object({
  guestUserId: z.string().uuid("L'ID de l'invité doit être un UUID valide."),
});

export async function migrateAndGetCart(
  input: z.infer<typeof MigrateCartInputSchema>,
): Promise<CartActionResult<CartData | null>> {
  const migrationId = crypto.randomBytes(4).toString("hex");
  let migrationSuccessful = false;
  try {
    console.log(`[Migration ${migrationId}] Starting...`);
    const validatedFields = MigrateCartInputSchema.safeParse(input);
    if (!validatedFields.success) {
      return createValidationErrorResult(
        validatedFields.error.flatten().fieldErrors,
        "ID invité invalide.",
      );
    }
    const { guestUserId } = validatedFields.data;

    const supabase = await createSupabaseServerClient();
    const authenticatedUserId = await getActiveUserId(supabase);

    if (!authenticatedUserId) {
      return createGeneralErrorResult(
        "Authenticated user not found.",
        "Utilisateur authentifié non trouvé.",
      );
    }

    if (authenticatedUserId === guestUserId) {
      console.log(
        `[Migration ${migrationId}] No migration needed (same user).`,
      );
      return getCart();
    }

    console.log(`[Migration ${migrationId}] Finding guest cart...`);
    const { data: guestCart, error: guestCartError } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", guestUserId)
      .maybeSingle();

    if (guestCartError) throw guestCartError;

    if (!guestCart) {
      console.log(
        `[Migration ${migrationId}] No guest cart found. Returning current user cart.`,
      );
      migrationSuccessful = true;
      return getCart();
    }

    console.log(
      `[Migration ${migrationId}] Guest cart found: ${guestCart.id}. Finding auth user cart...`,
    );
    const { data: authCart, error: authCartError } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", authenticatedUserId)
      .maybeSingle();

    if (authCartError) throw authCartError;

    if (!authCart) {
      console.log(
        `[Migration ${migrationId}] No auth cart, updating ownership...`,
      );
      const { error: updateError } = await supabase
        .from("carts")
        .update({ user_id: authenticatedUserId })
        .eq("id", guestCart.id);

      if (updateError) throw updateError;
      console.log(`[Migration ${migrationId}] Ownership update successful.`);
    } else {
      console.log(`[Migration ${migrationId}] Merging carts via RPC...`);
      const { error: rpcError } = await supabase.rpc("merge_carts", {
        p_guest_cart_id: guestCart.id,
        p_auth_cart_id: authCart.id,
      });

      if (rpcError) throw rpcError;
      console.log(`[Migration ${migrationId}] RPC merge successful.`);
    }

    migrationSuccessful = true;
    revalidateTag("cart");

    console.log(`[Migration ${migrationId}] Fetching final cart state...`);
    return getCart();
  } catch (error: unknown) {
    const errorMessage = (error as Error).message;
    console.error(`[Migration ${migrationId}] EXCEPTION:`, error);
    return createGeneralErrorResult(errorMessage, "Erreur de migration.");
  } finally {
    if (migrationSuccessful) {
      try {
        const validatedFields = MigrateCartInputSchema.safeParse(input);
        if (validatedFields.success) {
          const { guestUserId } = validatedFields.data;
          const supabaseAdmin = createSupabaseAdminClient();
          await supabaseAdmin.auth.admin.deleteUser(guestUserId);
          console.log(
            `[Migration ${migrationId}] Guest user cleanup successful for ${guestUserId}.`,
          );
        }
      } catch (cleanupError) {
        console.warn(
          `[Migration ${migrationId}] Guest user cleanup failed.`,
          cleanupError,
        );
      }
    }
  }
}

export async function clearCartAction(
  _prevState: unknown,
): Promise<CartActionResult<CartData | null>> {
  const supabase = await createSupabaseServerClient();
  const activeUserId = await getActiveUserId(supabase);

  if (!activeUserId) {
    return createGeneralErrorResult(
      "User not authenticated.",
      "Impossible d'identifier l'utilisateur.",
    );
  }

  try {
    const { data: cartData, error: cartError } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", activeUserId)
      .maybeSingle();

    if (cartError) {
      throw new Error(
        `Erreur lors de la recherche du panier: ${cartError.message}`,
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
      throw new Error(
        `Erreur lors de la suppression: ${deleteItemsError.message}`,
      );
    }

    revalidateTag("cart");
    return createSuccessResult(null, "Panier vidé avec succès.");
  } catch (error: unknown) {
    const errorMessage = (error as Error).message;
    return createGeneralErrorResult(
      errorMessage,
      "Une erreur inattendue est survenue.",
    );
  }
}
