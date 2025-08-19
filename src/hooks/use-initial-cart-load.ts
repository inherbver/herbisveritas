"use client";

import { useEffect, useRef } from "react";
import { useCartStore } from "@/stores/cartStore";
import { createClient } from "@/lib/supabase/client";

/**
 * Hook pour charger automatiquement le panier lors de l'arrivée sur certaines pages
 * si l'utilisateur est connecté et que le panier est vide
 */
export function useInitialCartLoad() {
  const forceReloadFromServer = useCartStore(
    (state) => state.forceReloadFromServer,
  );
  const currentItems = useCartStore((state) => state.items);
  const isLoading = useCartStore((state) => state.isLoading);
  const hasTriedLoad = useRef(false);

  useEffect(() => {
    const loadCartIfNeeded = async () => {
      // Éviter les chargements multiples
      if (hasTriedLoad.current || isLoading) {
        return;
      }

      try {
        const supabase = createClient();
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          console.log(
            "useInitialCartLoad - No authenticated user, skipping cart load",
          );
          return;
        }

        // Si l'utilisateur est connecté mais le panier est vide, le charger
        if (currentItems.length === 0) {
          console.log(
            "useInitialCartLoad - User is authenticated but cart is empty, loading...",
          );
          hasTriedLoad.current = true;
          await forceReloadFromServer();
        } else {
          console.log(
            "useInitialCartLoad - Cart already has items, skipping load",
          );
        }
      } catch (error) {
        console.error(
          "useInitialCartLoad - Error checking auth or loading cart:",
          error,
        );
      }
    };

    // Attendre un peu pour laisser les autres hooks se stabiliser
    const timeout = setTimeout(loadCartIfNeeded, 1000);

    return () => {
      clearTimeout(timeout);
    };
  }, [forceReloadFromServer, currentItems.length, isLoading]);

  // Reset du flag si le panier est vidé
  useEffect(() => {
    if (currentItems.length === 0) {
      hasTriedLoad.current = false;
    }
  }, [currentItems.length]);
}
