import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  type CartActionResult,
  createGeneralErrorResult,
  createSuccessResult,
} from "@/lib/cart-helpers";
import type { CartData, CartItem } from "@/types/cart";
import { getActiveUserId, withStableSession } from "@/utils/authUtils";

// Types représentant la structure des données brutes de Supabase
export type ServerProduct = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  slug: string;
};

export type ServerCartItem = {
  id: string;
  product_id: string;
  quantity: number;
  products: ServerProduct | null;
};

export async function getCart(): Promise<CartActionResult<CartData | null>> {
  return await withStableSession(async () => {
    console.log("🛒 [getCart] Starting with stable session...");
    const supabase = await createSupabaseServerClient();
    const activeUserId = await getActiveUserId(supabase);
    console.log("🛒 [getCart] activeUserId:", activeUserId);

    const selectQuery = `id, user_id, created_at, updated_at, cart_items (id, product_id, quantity, products (id, name, price, image_url, slug))`;

    try {
      let query = supabase.from("carts").select(selectQuery);

      if (activeUserId) {
        query = query.eq("user_id", activeUserId);
      } else {
        const cookieStore = await cookies();
        const guestCartId = cookieStore.get("herbis-cart-id")?.value;
        console.log("🛒 [getCart] guestCartId from cookie:", guestCartId);
        if (!guestCartId) {
          console.log("🛒 [getCart] No guest cart cookie found");
          return createSuccessResult(null, "Aucun panier invité trouvé.");
        }

        // SÉCURITÉ: Vérifier que le panier existe ET n'appartient à personne
        const { data: validCart } = await supabase
          .from("carts")
          .select("id")
          .eq("id", guestCartId)
          .is("user_id", null)
          .single();

        if (!validCart) {
          // Le panier n'existe pas ou appartient déjà à quelqu'un
          console.log(
            "🛒 [getCart] Invalid or expired guest cart, cleaning cookie",
          );
          // Nettoyer le cookie invalide
          cookieStore.delete("herbis-cart-id");
          return createSuccessResult(null, "Panier invité invalide ou expiré.");
        }

        // Le panier est valide, continuer avec la requête
        query = query.eq("id", guestCartId);
      }

      const { data: cartData, error: queryError } = await query.maybeSingle<{
        id: string;
        user_id: string | null;
        created_at: string;
        updated_at: string;
        cart_items: ServerCartItem[];
      }>();

      if (queryError) {
        console.error("Supabase query error in getCart:", queryError);
        return createGeneralErrorResult(
          queryError.message,
          `Erreur Supabase: ${queryError.message}`,
        );
      }

      if (!cartData) {
        console.log("🛒 [getCart] No cart data found");
        return createSuccessResult(null, "Aucun panier actif trouvé.");
      }

      console.log(
        "🛒 [getCart] Found cart with",
        cartData.cart_items?.length || 0,
        "items",
      );

      const transformedCartItems: CartItem[] = (cartData.cart_items || [])
        .map((item: ServerCartItem): CartItem | null => {
          const productData = item.products;
          if (!productData) {
            console.error(
              `Données produit manquantes pour l'article ID: ${item.id}`,
            );
            return null;
          }

          let imageUrl = productData.image_url ?? undefined;
          if (imageUrl && imageUrl.startsWith("/")) {
            const filename = imageUrl.split("/").pop();
            if (filename) {
              const supabaseStorageBaseUrl =
                process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
              // Note: Assumes images are in a 'products' bucket.
              imageUrl = `${supabaseStorageBaseUrl}/storage/v1/object/public/products/${filename}`;
            }
          }

          return {
            id: item.id,
            productId: item.product_id,
            quantity: item.quantity,
            name: productData.name,
            price: productData.price,
            image: imageUrl,
            slug: productData.slug,
          };
        })
        .filter((item): item is CartItem => item !== null)
        .sort((a, b) => (a.id ?? "").localeCompare(b.id ?? "")); // Tri pour la cohérence

      const { cart_items: _, ...restOfCartData } = cartData;
      const finalCartData: CartData = {
        ...restOfCartData,
        items: transformedCartItems,
      };

      return createSuccessResult(finalCartData, "Panier récupéré.");
    } catch (e: unknown) {
      const errorMessage =
        e instanceof Error ? e.message : "Unknown server error";
      console.error("Unexpected error in getCart:", errorMessage);
      return createGeneralErrorResult(
        errorMessage,
        "Une erreur serveur inattendue est survenue.",
      );
    }
  });
}
