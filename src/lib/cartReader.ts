import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  type CartActionResult,
  createGeneralErrorResult,
  createSuccessResult,
} from "@/lib/cart-helpers";
import type { CartData, CartItem } from "@/types/cart";
import { getActiveUserId } from "./authUtils";

export async function getCart(): Promise<CartActionResult<CartData | null>> {
  const supabase = await createSupabaseServerClient();
  const activeUserId = await getActiveUserId(supabase);

  const selectQuery = `id, user_id, created_at, updated_at, cart_items (id, product_id, quantity, products (id, name, price, image_url, slug))`;

  try {
    let query = supabase.from("carts").select(selectQuery);

    if (activeUserId) {
      query = query.eq("user_id", activeUserId);
    } else {
      const cookieStore = await cookies();
      const guestCartId = cookieStore.get("herbis-cart-id")?.value;
      if (!guestCartId) {
        return createSuccessResult(null, "Aucun panier invité trouvé.");
      }
      query = query.eq("id", guestCartId).is("user_id", null);
    }

    const { data: cartData, error: queryError } = await query.maybeSingle();

    if (queryError) {
      console.error("Supabase query error in getCart:", queryError);
      return createGeneralErrorResult(
        queryError.message,
        `Erreur Supabase: ${queryError.message}`,
      );
    }

    if (!cartData) {
      return createSuccessResult(null, "Aucun panier actif trouvé.");
    }

    const transformedCartItems: CartItem[] = (cartData.cart_items || [])
      .map((item: any): CartItem | null => {
        const productData = item.products;
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
          image: productData.image_url ?? undefined, // Fix: null -> undefined
          slug: productData.slug,
        };
      })
      .filter((item): item is CartItem => item !== null)
      .sort((a, b) => (a.id ?? "").localeCompare(b.id ?? "")); // Tri pour la cohérence

    const finalCartData: CartData = { ...cartData, items: transformedCartItems };

    return createSuccessResult(finalCartData, "Panier récupéré.");
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "Unknown server error";
    console.error("Unexpected error in getCart:", errorMessage);
    return createGeneralErrorResult(
      errorMessage,
      "Une erreur serveur inattendue est survenue.",
    );
  }
}
