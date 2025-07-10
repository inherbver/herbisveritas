import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  type CartActionResult,
  createGeneralErrorResult,
  createSuccessResult,
} from "@/lib/cart-helpers";
import type { CartData, CartItem, ProductDetails } from "@/types/cart";
import { getActiveUserId } from "./authUtils";

export async function getCart(): Promise<CartActionResult<CartData | null>> {
  const supabase = await createSupabaseServerClient();
  const activeUserId = await getActiveUserId(supabase);

  const selectQuery = `id, user_id, created_at, updated_at, cart_items (id, product_id, quantity, products (id, name, price, image_url, slug))`;

  try {
    let query = supabase
      .from("carts")
      .select(selectQuery)
      .order("id", { foreignTable: "cart_items", ascending: true });

    // Si l'utilisateur est authentifié, on cherche son panier.
    if (activeUserId) {
      query = query.eq("user_id", activeUserId);
    } else {
      // Sinon, on cherche le panier invité via le cartId stocké dans les cookies.
      const cartStore = cookies().get("cart-storage")?.value;
      if (!cartStore) {
        return createSuccessResult(null, "Aucun panier invité trouvé.");
      }
      const { state } = JSON.parse(cartStore);
      const guestCartId = state.cartId;

      if (!guestCartId) {
        return createSuccessResult(null, "Aucun ID de panier invité trouvé.");
      }
      query = query.eq("id", guestCartId).is("user_id", null);
    }

    const { data: cart, error: queryError } = await query.maybeSingle();

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
