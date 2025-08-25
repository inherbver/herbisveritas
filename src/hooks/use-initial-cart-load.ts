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
  const updateVersion = useCartStore((state) => state.updateVersion);
  const hasTriedLoad = useRef(false);
  const lastUpdateVersion = useRef(updateVersion);

  useEffect(() => {
    const loadCartIfNeeded = async () => {
      // Éviter les chargements multiples ou si une mise à jour est en cours
      if (hasTriedLoad.current || isLoading) {
        return;
      }

      // Si le panier a été mis à jour pendant qu'on attendait, ne pas le charger
      if (updateVersion !== lastUpdateVersion.current) {
        console.log(
          "[useInitialCartLoad] Cart was updated during wait, skipping load",
        );
        hasTriedLoad.current = true;
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
            "[useInitialCartLoad] No authenticated user, skipping cart load",
          );
          return;
        }

        // Si l'utilisateur est connecté mais le panier est vide, le charger
        // IMPORTANT: Ne charger qu'une seule fois au montage initial
        if (currentItems.length === 0 && !hasTriedLoad.current) {
          console.log(
            "[useInitialCartLoad] User is authenticated but cart is empty, loading...",
          );
          hasTriedLoad.current = true;
          await forceReloadFromServer();
        } else {
          console.log(
            `[useInitialCartLoad] Cart already has ${currentItems.length} items, skipping load`,
          );
          hasTriedLoad.current = true; // Marquer comme tenté même si on ne charge pas
        }
      } catch (error) {
        console.error(
          "[useInitialCartLoad] Error checking auth or loading cart:",
          error,
        );
      }
    };

    // Réduire le délai pour éviter les conflits
    const timeout = setTimeout(loadCartIfNeeded, 200);

    return () => {
      clearTimeout(timeout);
    };
  }, [forceReloadFromServer, currentItems.length, isLoading, updateVersion]);

  // Reset du flag si le panier est vidé
  useEffect(() => {
    if (currentItems.length === 0) {
      hasTriedLoad.current = false;
    }
  }, [currentItems.length]);
}
