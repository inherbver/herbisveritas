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
  const currentItems = useCartStore((state) => state.items);
  const forceReloadFromServer = useCartStore(
    (state) => state.forceReloadFromServer,
  );

  useEffect(() => {
    const supabase = createClient();

    // Fonction pour charger le panier
    const loadCartFromServer = async (eventType: string) => {
      console.log(`Loading cart from server (${eventType})...`);
      setIsLoading(true);

      try {
        const cartResult = await getCart();
        if (cartResult.success && cartResult.data) {
          console.log(
            `Cart loaded successfully (${eventType}):`,
            cartResult.data.items.length,
            "items",
          );
          setItems(cartResult.data.items, true, "auth-sync-load");
        } else {
          console.log(`No cart data for user (${eventType})`);
          setItems([], true, "auth-sync-empty");
        }
      } catch (error) {
        console.error(`Error loading cart after ${eventType}:`, error);
      } finally {
        setIsLoading(false);
      }
    };

    // Écouter les changements d'état d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(
        "useAuthCartSync - Auth state changed:",
        event,
        session?.user?.id,
      );

      // Si l'utilisateur se déconnecte (événement SIGNED_OUT ou session null)
      if (event === "SIGNED_OUT" || (!session && event !== "INITIAL_SESSION")) {
        console.log(
          "useAuthCartSync - User signed out or session ended. Clearing cart.",
        );
        clearCart();
      }
      // Si l'utilisateur se connecte, recharger le panier depuis le serveur
      else if (event === "SIGNED_IN" && session) {
        console.log(
          "useAuthCartSync - User signed in. Loading cart from server...",
        );
        // Synchronisation immédiate et directe
        await loadCartFromServer("SIGNED_IN");
      }
      // Token refreshed - recharger seulement si le panier est vide
      else if (event === "TOKEN_REFRESHED" && session) {
        console.log("useAuthCartSync - Token refreshed.");
        if (currentItems.length === 0) {
          console.log(
            "useAuthCartSync - Cart is empty, reloading from server...",
          );
          await loadCartFromServer("TOKEN_REFRESHED");
        }
      }
      // Session initiale - charger le panier si utilisateur connecté et panier vide
      else if (event === "INITIAL_SESSION" && session) {
        console.log(
          "useAuthCartSync - Initial session detected with authenticated user.",
        );
        // Vérification immédiate du panier sans délai arbitraire
        if (currentItems.length === 0) {
          console.log("useAuthCartSync - Loading initial cart from server...");
          await loadCartFromServer("INITIAL_SESSION");
        } else {
          console.log(
            "useAuthCartSync - Cart already has items, skipping initial load.",
          );
        }
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [
    clearCart,
    setItems,
    setIsLoading,
    currentItems.length,
    forceReloadFromServer,
  ]);
}
