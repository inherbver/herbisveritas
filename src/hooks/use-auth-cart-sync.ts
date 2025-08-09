"use client";

import { useEffect } from "react";
import { useCartStore } from "@/stores/cartStore";
import { createClient } from "@/lib/supabase/client";
import { getCart } from "@/actions/cartActions";

/**
 * Hook qui surveille l'état d'authentification et synchronise le panier
 * - Vide le panier lors de la déconnexion
 * - Recharge le panier depuis le serveur lors de la connexion
 */
export function useAuthCartSync() {
  const clearCart = useCartStore((state) => state.clearCart);
  const setItems = useCartStore((state) => state._setItems);
  const setIsLoading = useCartStore((state) => state._setIsLoading);

  useEffect(() => {
    const supabase = createClient();

    // Écouter les changements d'état d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.id);

      // Si l'utilisateur se déconnecte (événement SIGNED_OUT ou session null)
      if (event === "SIGNED_OUT" || !session) {
        console.log("User signed out or session ended. Clearing cart.");
        clearCart();
      }
      // Si l'utilisateur se connecte, recharger le panier depuis le serveur
      else if (event === "SIGNED_IN" && session) {
        console.log("User signed in. Loading cart from server...");
        setIsLoading(true);

        try {
          const cartResult = await getCart();
          if (cartResult.success && cartResult.data) {
            console.log("Cart loaded successfully:", cartResult.data.items.length, "items");
            setItems(cartResult.data.items);
          } else {
            console.log("No cart data or empty cart for user");
            setItems([]);
          }
        } catch (error) {
          console.error("Error loading cart after sign in:", error);
        } finally {
          setIsLoading(false);
        }
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [clearCart, setItems, setIsLoading]);
}
