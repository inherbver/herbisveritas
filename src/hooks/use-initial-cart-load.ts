"use client";

import { useEffect, useRef, useCallback } from "react";
import { useCartStore } from "@/stores/cartStore";
import { createClient } from "@/lib/supabase/client";

/**
 * Hook pour charger automatiquement le panier lors de l'arrivée sur certaines pages
 * si l'utilisateur est connecté et que le panier est vide
 * Version optimisée pour éviter les race conditions
 */
export function useInitialCartLoad() {
  const forceReloadFromServer = useCartStore(
    (state) => state.forceReloadFromServer,
  );
  const currentItems = useCartStore((state) => state.items);
  const isLoading = useCartStore((state) => state.isLoading);
  const updateVersion = useCartStore((state) => state.updateVersion);
  const lastUpdateTimestamp = useCartStore(
    (state) => state.lastUpdateTimestamp,
  );

  const hasTriedLoad = useRef(false);
  const lastUpdateVersion = useRef(updateVersion);
  const lastLoadTimestamp = useRef(0);
  const loadTimeout = useRef<NodeJS.Timeout | null>(null);

  const loadCartIfNeeded = useCallback(async () => {
    const now = Date.now();
    const logPrefix = `[useInitialCartLoad ${new Date().toISOString()}]`;

    // Éviter les chargements multiples ou si une mise à jour est en cours
    if (hasTriedLoad.current || isLoading) {
      console.log(
        `${logPrefix} Load already attempted or in progress, skipping`,
      );
      return;
    }

    // Éviter les chargements trop fréquents (minimum 1 seconde entre les tentatives)
    if (now - lastLoadTimestamp.current < 1000) {
      console.log(`${logPrefix} Load attempt too soon, skipping`);
      return;
    }

    // Si le panier a été mis à jour récemment (moins de 500ms), ne pas le charger
    if (now - lastUpdateTimestamp < 500) {
      console.log(`${logPrefix} Cart was updated recently, skipping load`);
      hasTriedLoad.current = true;
      return;
    }

    // Si le panier a été mis à jour pendant qu'on attendait, ne pas le charger
    if (updateVersion !== lastUpdateVersion.current) {
      console.log(
        `${logPrefix} Cart version changed during wait (${lastUpdateVersion.current} -> ${updateVersion}), skipping load`,
      );
      hasTriedLoad.current = true;
      return;
    }

    try {
      lastLoadTimestamp.current = now;
      const supabase = createClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        console.log(`${logPrefix} No authenticated user, skipping cart load`);
        hasTriedLoad.current = true;
        return;
      }

      // Si l'utilisateur est connecté mais le panier est vide, le charger
      if (currentItems.length === 0 && !hasTriedLoad.current) {
        console.log(
          `${logPrefix} User authenticated with empty cart, loading from server...`,
        );
        hasTriedLoad.current = true;
        await forceReloadFromServer();
      } else {
        console.log(
          `${logPrefix} Cart already has ${currentItems.length} items, skipping load`,
        );
        hasTriedLoad.current = true;
      }
    } catch (error) {
      console.error(`${logPrefix} Error checking auth or loading cart:`, error);
      // Ne pas marquer comme tenté en cas d'erreur pour permettre une nouvelle tentative
      lastLoadTimestamp.current = 0;
    }
  }, [
    forceReloadFromServer,
    currentItems.length,
    isLoading,
    updateVersion,
    lastUpdateTimestamp,
  ]);

  useEffect(() => {
    // Nettoyer le timeout existant
    if (loadTimeout.current) {
      clearTimeout(loadTimeout.current);
    }

    // Délai réduit pour minimiser les conflits (50ms au lieu de 200ms)
    loadTimeout.current = setTimeout(loadCartIfNeeded, 50);

    return () => {
      if (loadTimeout.current) {
        clearTimeout(loadTimeout.current);
      }
    };
  }, [loadCartIfNeeded]);

  // Reset du flag si le panier est vidé (mais pas immédiatement pour éviter les loops)
  useEffect(() => {
    if (currentItems.length === 0) {
      // Délai pour éviter les recharges immédiates après un clear
      const resetTimeout = setTimeout(() => {
        hasTriedLoad.current = false;
        lastLoadTimestamp.current = 0;
      }, 100);

      return () => clearTimeout(resetTimeout);
    }
  }, [currentItems.length]);

  // Mise à jour de la référence de version
  useEffect(() => {
    lastUpdateVersion.current = updateVersion;
  }, [updateVersion]);
}
