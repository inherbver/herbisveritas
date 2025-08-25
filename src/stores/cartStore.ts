// src/stores/cartStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CartState, CartStore, CartItem } from "@/types/cart";

// Utilitaires pour la gestion des race conditions
let updateQueue: Array<() => void> = [];
let isProcessingQueue = false;
let debounceTimer: NodeJS.Timeout | null = null;

// Debounce helper pour éviter les mises à jour trop fréquentes
const debounceUpdate = (callback: () => void, delay: number = 50) => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(callback, delay);
};

// Queue processor pour éviter les race conditions
const processUpdateQueue = async () => {
  if (isProcessingQueue || updateQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;

  while (updateQueue.length > 0) {
    const update = updateQueue.shift();
    if (update) {
      try {
        update();
        // Petit délai pour éviter les conflits
        await new Promise((resolve) => setTimeout(resolve, 10));
      } catch (error) {
        console.error("[CartStore] Error processing queued update:", error);
      }
    }
  }

  isProcessingQueue = false;
};

// Version améliorée du store avec gestion d'erreurs et logging
const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      // État initial
      items: [] as CartItem[],
      isLoading: false,
      error: null,
      updateVersion: 0,
      lastUpdateTimestamp: Date.now(),

      // Actions améliorées
      addItem: (
        itemDetails: {
          productId: string;
          name: string;
          price: number;
          image?: string;
          slug?: string;
        },
        quantityToAdd: number = 1,
      ) => {
        try {
          if (quantityToAdd <= 0) {
            console.warn("CartStore: Cannot add item with quantity <= 0");
            return;
          }

          const currentItems = get().items;
          const existingItemIndex = currentItems.findIndex(
            (item: CartItem) => item.productId === itemDetails.productId,
          );

          let updatedItems: CartItem[];

          if (existingItemIndex !== -1) {
            // Mise à jour de la quantité d'un article existant
            updatedItems = currentItems.map((item: CartItem, index: number) =>
              index === existingItemIndex
                ? { ...item, quantity: item.quantity + quantityToAdd }
                : item,
            );
            console.log(
              `CartStore: Updated quantity for product ${itemDetails.productId}`,
            );
          } else {
            // Ajout d'un nouvel article
            const newItem: CartItem = {
              ...itemDetails,
              quantity: quantityToAdd,
            };
            updatedItems = [...currentItems, newItem];
            console.log(
              `CartStore: Added new item ${itemDetails.productId} to cart`,
            );
          }

          // Utiliser _setItems pour une synchronisation cohérente
          get()._setItems(updatedItems, true, "user-action");
        } catch (error) {
          console.error("CartStore: Error adding item to cart:", error);
          set({ error: "Erreur lors de l'ajout au panier" });
        }
      },

      removeItem: (cartItemId: string) => {
        try {
          const currentItems = get().items;
          // Fix: Check both id and productId for backward compatibility
          const itemExists = currentItems.some(
            (item) => item.id === cartItemId || item.productId === cartItemId,
          );

          if (!itemExists) {
            console.warn(`CartStore: Item ${cartItemId} not found in cart`);
            return;
          }

          const updatedItems = currentItems.filter(
            (item: CartItem) =>
              item.id !== cartItemId && item.productId !== cartItemId,
          );

          console.log(`CartStore: Removed item ${cartItemId} from cart`);

          // Utiliser _setItems pour une synchronisation cohérente
          get()._setItems(updatedItems, true, "user-action");
        } catch (error) {
          console.error("CartStore: Error removing item from cart:", error);
          set({ error: "Erreur lors de la suppression" });
        }
      },

      updateItemQuantity: (cartItemId: string, newQuantity: number) => {
        try {
          if (newQuantity <= 0) {
            const itemToRemove = get().items.find(
              (item: CartItem) => item.id === cartItemId,
            );
            if (itemToRemove?.id) {
              get().removeItem(itemToRemove.id);
            }
            return;
          }

          const currentItems = get().items;
          const itemExists = currentItems.some(
            (item) => item.id === cartItemId,
          );

          if (!itemExists) {
            console.warn(
              `CartStore: Cannot update quantity - item ${cartItemId} not found`,
            );
            return;
          }

          const updatedItems = currentItems.map((item: CartItem) =>
            item.id === cartItemId ? { ...item, quantity: newQuantity } : item,
          );

          console.log(
            `CartStore: Updated quantity for item ${cartItemId} to ${newQuantity}`,
          );

          // Utiliser _setItems pour une synchronisation cohérente
          get()._setItems(updatedItems, true, "user-action");
        } catch (error) {
          console.error("CartStore: Error updating item quantity:", error);
          set({ error: "Erreur lors de la mise à jour" });
        }
      },

      updateQuantity: (productId: string, quantity: number) => {
        try {
          if (quantity < 0) {
            console.warn("CartStore: Cannot set negative quantity");
            return;
          }

          const currentItems = get().items;
          const itemIndex = currentItems.findIndex(
            (item) => item.productId === productId || item.id === productId,
          );

          if (itemIndex === -1) {
            console.warn(`CartStore: Item ${productId} not found in cart`);
            return;
          }

          let updatedItems: CartItem[];

          if (quantity === 0) {
            // Remove item if quantity is 0
            updatedItems = currentItems.filter(
              (item) => item.productId !== productId && item.id !== productId,
            );
            console.log(
              `CartStore: Removed item ${productId} (quantity set to 0)`,
            );
          } else {
            // Update quantity
            updatedItems = currentItems.map((item, index) =>
              index === itemIndex
                ? {
                    ...item,
                    quantity: Math.min(quantity, item.stock || quantity),
                  }
                : item,
            );
            console.log(
              `CartStore: Updated quantity for ${productId} to ${quantity}`,
            );
          }

          // Utiliser _setItems pour une synchronisation cohérente
          get()._setItems(updatedItems, true, "user-action");
        } catch (error) {
          console.error("CartStore: Error updating quantity:", error);
          set({ error: "Erreur lors de la mise à jour de la quantité" });
        }
      },

      clearCart: () => {
        try {
          const currentItemCount = get().items.length;
          console.log(
            `CartStore: Cart cleared (${currentItemCount} items removed)`,
          );

          // Vider la queue et annuler les timers
          updateQueue = [];
          if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
          }

          // Utiliser _setItems pour une synchronisation cohérente
          get()._setItems([], true, "user-action");
        } catch (error) {
          console.error("CartStore: Error clearing cart:", error);
          set({ error: "Erreur lors de la vidange du panier" });
        }
      },

      // Actions internes améliorées
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      _setIsLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      _setError: (error: string | null) => {
        set({ error });
      },

      _setItems: (
        items: CartItem[],
        force: boolean = false,
        updateSource?: string,
      ) => {
        const logPrefix = `[CartStore _setItems ${new Date().toISOString()}]`;

        // Utiliser la queue pour éviter les race conditions
        const queuedUpdate = () => {
          try {
            const currentItems = get().items;
            const currentVersion = get().updateVersion;
            const currentTimestamp = get().lastUpdateTimestamp;

            // Comparaison améliorée par ID au lieu d'index
            // Créer des maps pour comparaison O(1)
            const currentMap = new Map(
              currentItems.map((item) => [item.id || item.productId, item]),
            );
            const newMap = new Map(
              items.map((item) => [item.id || item.productId, item]),
            );

            // Détection de changements plus précise
            const itemsChanged =
              force ||
              currentMap.size !== newMap.size ||
              Array.from(currentMap.entries()).some(([id, currentItem]) => {
                const newItem = newMap.get(id);
                return (
                  !newItem ||
                  newItem.quantity !== currentItem.quantity ||
                  newItem.price !== currentItem.price ||
                  newItem.name !== currentItem.name ||
                  newItem.image !== currentItem.image
                );
              }) ||
              // Vérifier les nouveaux items
              Array.from(newMap.entries()).some(([id, newItem]) => {
                const currentItem = currentMap.get(id);
                return !currentItem;
              });

            // Éviter les mises à jour trop anciennes (sauf si forcé)
            const isUpdateTooOld =
              !force && Date.now() - currentTimestamp < 100;
            if (isUpdateTooOld && updateSource !== "user-action") {
              console.log(
                `${logPrefix} Update too soon after last update, skipping (source: ${updateSource})`,
              );
              return;
            }

            if (!itemsChanged) {
              console.log(
                `${logPrefix} Cart items unchanged, skipping update.`,
              );
              console.log(
                `${logPrefix} Current: ${currentMap.size} items, New: ${newMap.size} items`,
              );
              return;
            }

            // Log des changements détectés
            console.log(
              `${logPrefix} Changes detected from source: ${updateSource}`,
            );
            console.log(
              `${logPrefix} Current items: ${currentMap.size}, New items: ${newMap.size}`,
            );

            // Incrémenter la version et mettre à jour le timestamp
            const newVersion = currentVersion + 1;
            const newTimestamp = Date.now();

            set({
              items,
              error: null,
              updateVersion: newVersion,
              lastUpdateTimestamp: newTimestamp,
            });

            const totalQuantity = items.reduce(
              (sum, item) => sum + item.quantity,
              0,
            );
            console.log(
              `${logPrefix} Successfully updated cart (v${newVersion}, source: ${updateSource || "unknown"}) with ${items.length} items (total quantity: ${totalQuantity}).`,
            );
          } catch (error) {
            console.error(`${logPrefix} Error setting items:`, error);
            set({
              error:
                "Erreur lors de la synchronisation des articles du panier.",
            });
          }
        };

        // Pour les actions utilisateur (force ou user-action), exécuter immédiatement
        if (force || updateSource === "user-action") {
          queuedUpdate();
        } else {
          // Pour les autres mises à jour, utiliser le debounce et la queue
          debounceUpdate(() => {
            updateQueue.push(queuedUpdate);
            processUpdateQueue();
          }, 30);
        }
      },

      forceReloadFromServer: async () => {
        const logPrefix = `[CartStore forceReload ${new Date().toISOString()}]`;
        console.log(`${logPrefix} Reloading cart from server...`);

        // Éviter les rechargements concurrents
        if (get().isLoading) {
          console.log(`${logPrefix} Reload already in progress, skipping`);
          return;
        }

        try {
          set({ isLoading: true, error: null });

          // Import dynamique pour éviter les dépendances circulaires
          const { getCart } = await import("@/actions/cartActions");
          const cartResult = await getCart();

          if (cartResult.success && cartResult.data) {
            console.log(
              `${logPrefix} Cart reloaded successfully:`,
              cartResult.data.items.length,
              "items",
            );
            // Vider la queue pour éviter les conflits avec la nouvelle data
            updateQueue = [];
            if (debounceTimer) {
              clearTimeout(debounceTimer);
              debounceTimer = null;
            }
            get()._setItems(cartResult.data.items, true, "server-reload");
          } else {
            console.log(`${logPrefix} No cart data found during reload`);
            updateQueue = [];
            if (debounceTimer) {
              clearTimeout(debounceTimer);
              debounceTimer = null;
            }
            get()._setItems([], true, "server-reload-empty");
          }
        } catch (error) {
          console.error(`${logPrefix} Error during reload:`, error);
          set({ error: "Erreur lors du rechargement du panier." });
        } finally {
          set({ isLoading: false });
        }
      },

      // Nouvelles actions utilitaires
      getItemById: (cartItemId: string): CartItem | undefined => {
        return get().items.find((item) => item.id === cartItemId);
      },

      getItemByProductId: (productId: string): CartItem | undefined => {
        return get().items.find((item) => item.productId === productId);
      },

      isEmpty: (): boolean => {
        return get().items.length === 0;
      },

      getUpdateVersion: (): number => {
        return get().updateVersion;
      },

      getLastUpdateTimestamp: (): number => {
        return get().lastUpdateTimestamp;
      },
    }),
    {
      name: "inherbis-cart-storage",
      storage: createJSONStorage(() => localStorage),
      version: 1, // Solution 2: Add versioning
      migrate: (persistedState: unknown, version: number) => {
        // Solution 2: Handle migration from older state versions
        if (version === 0) {
          console.log(
            "CartStore: Migrating state from version 0 to 1. Old data will be cleared.",
          );
          // For this migration, we clear the incompatible old state.
          return {
            items: [],
            isLoading: false,
            error: null,
          } as Partial<CartState>;
        }
        return persistedState as Partial<CartState>;
      },
      onRehydrateStorage: () => {
        // Solution 1: Robust rehydration logic
        return (state, error) => {
          if (error) {
            console.error(
              "CartStore: Rehydration error, clearing localStorage to prevent further issues.",
              error,
            );
            // Directly clear the corrupted storage
            localStorage.removeItem("inherbis-cart-storage");
            // Safely reset the state in the running application
            if (state) {
              state.items = [];
              state.error =
                "Votre panier a été réinitialisé suite à un problème technique.";
              state.isLoading = false;
            }
            return;
          }

          // Also validate the data that was rehydrated successfully
          if (state?.items) {
            const isValidCartItem = (item: unknown): item is CartItem => {
              if (typeof item !== "object" || item === null) {
                return false;
              }
              const obj = item as Record<string, unknown>;
              return (
                typeof obj.productId === "string" &&
                typeof obj.name === "string" &&
                typeof obj.price === "number" &&
                typeof obj.quantity === "number"
              );
            };
            const validItems = state.items.filter(isValidCartItem);

            if (validItems.length !== state.items.length) {
              console.warn(
                "CartStore: Filtered out invalid items during rehydration.",
              );
              state.items = validItems;
            }
          }
        };
      },
      partialize: (state) => ({
        items: state.items,
        // Do not persist transient state like isLoading or errors
      }),
    },
  ),
);

export default useCartStore;
export { useCartStore };

// Hooks pour utilisation directe
export const useCartItems = () => useCartStore((state) => state.items);
export const useCartTotalItems = () =>
  useCartStore((state) =>
    state.items.reduce((total, item) => total + item.quantity, 0),
  );
export const useCartSubtotal = () =>
  useCartStore((state) =>
    state.items.reduce((total, item) => total + item.price * item.quantity, 0),
  );

// Sélecteurs améliorés avec memoization
export const selectCartItems = (state: CartState): CartItem[] => state.items;

export const selectCartTotalItems = (state: CartState): number =>
  state.items.reduce((total, item) => total + item.quantity, 0);

export const selectCartSubtotal = (state: CartState): number =>
  state.items.reduce((total, item) => total + item.price * item.quantity, 0);

// Nouveaux sélecteurs utiles
export const selectCartItemCount = (state: CartState): number =>
  state.items.length;

export const selectCartIsEmpty = (state: CartState): boolean =>
  state.items.length === 0;

export const selectCartHasErrors = (state: CartState): boolean => !!state.error;
