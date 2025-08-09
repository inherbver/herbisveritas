"use client";

import { useEffect } from "react";
import { useCartStore } from "@/stores/cartStore";
import { createClient } from "@/lib/supabase/client";

/**
 * Hook qui surveille l'état d'authentification et vide le panier
 * automatiquement quand l'utilisateur se déconnecte
 */
export function useAuthCartSync() {
  const clearCart = useCartStore((state) => state.clearCart);

  useEffect(() => {
    const supabase = createClient();

    // Écouter les changements d'état d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session?.user?.id);

      // Si l'utilisateur se déconnecte (événement SIGNED_OUT ou session null)
      if (event === "SIGNED_OUT" || !session) {
        console.log("User signed out or session ended. Clearing cart.");
        clearCart();
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [clearCart]);
}
