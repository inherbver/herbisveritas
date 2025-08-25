"use client";

import { useEffect, useState, useMemo } from "react";
import { useCartStore } from "@/stores/cartStore";

/**
 * Hook unifié pour accéder au state du panier avec gestion d'hydratation cohérente
 * et calculs mémorisés pour optimiser les performances
 */
export function useCartState() {
  const items = useCartStore((state) => state.items);
  const isLoading = useCartStore((state) => state.isLoading);
  const error = useCartStore((state) => state.error);
  const updateVersion = useCartStore((state) => state.updateVersion);
  const lastUpdateTimestamp = useCartStore(
    (state) => state.lastUpdateTimestamp,
  );

  // Gestion de l'hydratation
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Calculs mémorisés pour éviter les recalculs inutiles
  const totalQuantity = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const totalItems = useMemo(() => {
    return items.length;
  }, [items]);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [items]);

  const isEmpty = useMemo(() => {
    return items.length === 0;
  }, [items]);

  // Détection des mises à jour en attente (pour feedback visuel)
  // SUPPRIMÉ: Interval de 100ms causait une fuite mémoire
  // Utiliser plutôt un état dérivé basé sur isLoading

  // Actions du store - Utiliser les sélecteurs pour avoir des références réactives
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateItemQuantity = useCartStore((state) => state.updateItemQuantity);
  const clearCart = useCartStore((state) => state.clearCart);
  const forceReloadFromServer = useCartStore(
    (state) => state.forceReloadFromServer,
  );

  return {
    // État du panier
    items,
    isLoading,
    error,

    // État d'hydratation
    isHydrated,

    // Calculs
    totalQuantity,
    totalItems,
    subtotal,
    isEmpty,

    // Méta-données
    updateVersion,
    lastUpdateTimestamp,
    hasPendingUpdates: isLoading, // Simplifié: pending = loading

    // Actions (maintenant réactives)
    addItem,
    removeItem,
    updateItemQuantity,
    clearCart,
    forceReloadFromServer,
  };
}

/**
 * Hook pour obtenir uniquement la quantité totale (optimisé pour le compteur)
 */
export function useCartTotalQuantity() {
  const totalQuantity = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0),
  );

  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return { totalQuantity, isHydrated };
}

/**
 * Hook pour obtenir uniquement les items du panier
 */
export function useCartItems() {
  const items = useCartStore((state) => state.items);

  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return { items, isHydrated };
}

/**
 * Hook pour vérifier si un produit est dans le panier
 */
export function useIsInCart(productId: string): boolean {
  const items = useCartStore((state) => state.items);
  return useMemo(() => {
    return items.some((item) => item.productId === productId);
  }, [items, productId]);
}

/**
 * Hook pour obtenir la quantité d'un produit spécifique dans le panier
 */
export function useProductQuantityInCart(productId: string): number {
  const items = useCartStore((state) => state.items);
  return useMemo(() => {
    const item = items.find((item) => item.productId === productId);
    return item?.quantity || 0;
  }, [items, productId]);
}
