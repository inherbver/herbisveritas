// src/stores/cartStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CartState, CartStore, CartItem } from "@/types/cart";

// Version améliorée du store avec gestion d'erreurs et logging
const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      // État initial
      items: [] as CartItem[],
      isLoading: false,
      error: null,

      // Actions améliorées
      addItem: (
        itemDetails: {
          productId: string;
          name: string;
          price: number;
          image?: string;
          slug?: string;
        },
        quantityToAdd: number = 1
      ) => {
        try {
          if (quantityToAdd <= 0) {
            console.warn("CartStore: Cannot add item with quantity <= 0");
            return;
          }

          const currentItems = get().items;
          const existingItemIndex = currentItems.findIndex(
            (item: CartItem) => item.productId === itemDetails.productId
          );

          if (existingItemIndex !== -1) {
            // Mise à jour de la quantité d'un article existant
            const updatedItems = currentItems.map((item: CartItem, index: number) =>
              index === existingItemIndex
                ? { ...item, quantity: item.quantity + quantityToAdd }
                : item
            );
            set({ items: updatedItems, error: null });
            console.log(`CartStore: Updated quantity for product ${itemDetails.productId}`);
          } else {
            // Ajout d'un nouvel article
            const newItem: CartItem = {
              ...itemDetails,
              quantity: quantityToAdd,
            };
            set({ items: [...currentItems, newItem], error: null });
            console.log(`CartStore: Added new item ${itemDetails.productId} to cart`);
          }
        } catch (error) {
          console.error("CartStore: Error adding item to cart:", error);
          set({ error: "Erreur lors de l'ajout au panier" });
        }
      },

      removeItem: (cartItemId: string) => {
        try {
          const currentItems = get().items;
          const itemExists = currentItems.some((item) => item.id === cartItemId);

          if (!itemExists) {
            console.warn(`CartStore: Item ${cartItemId} not found in cart`);
            return;
          }

          set((state: CartStore) => ({
            items: state.items.filter((item: CartItem) => item.id !== cartItemId),
            error: null,
          }));
          console.log(`CartStore: Removed item ${cartItemId} from cart`);
        } catch (error) {
          console.error("CartStore: Error removing item from cart:", error);
          set({ error: "Erreur lors de la suppression" });
        }
      },

      updateItemQuantity: (cartItemId: string, newQuantity: number) => {
        try {
          if (newQuantity <= 0) {
            const itemToRemove = get().items.find((item: CartItem) => item.id === cartItemId);
            if (itemToRemove?.id) {
              get().removeItem(itemToRemove.id);
            }
            return;
          }

          const currentItems = get().items;
          const itemExists = currentItems.some((item) => item.id === cartItemId);

          if (!itemExists) {
            console.warn(`CartStore: Cannot update quantity - item ${cartItemId} not found`);
            return;
          }

          set((state: CartStore) => ({
            items: state.items.map((item: CartItem) =>
              item.id === cartItemId ? { ...item, quantity: newQuantity } : item
            ),
            error: null,
          }));
          console.log(`CartStore: Updated quantity for item ${cartItemId} to ${newQuantity}`);
        } catch (error) {
          console.error("CartStore: Error updating item quantity:", error);
          set({ error: "Erreur lors de la mise à jour" });
        }
      },

      clearCart: () => {
        try {
          const currentItemCount = get().items.length;
          set({ items: [], isLoading: false, error: null });
          console.log(`CartStore: Cart cleared (${currentItemCount} items removed)`);
        } catch (error) {
          console.error("CartStore: Error clearing cart:", error);
          set({ error: "Erreur lors de la vidange du panier" });
        }
      },

      // Actions internes améliorées
      _setIsLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      _setError: (error: string | null) => {
        set({ error });
      },

      _setItems: (items: CartItem[]) => {
        const logPrefix = `[CartStore _setItems ${new Date().toISOString()}]`;
        try {
          const currentItems = get().items;
          // Data is already transformed by getCart, so we can directly compare.
          if (JSON.stringify(currentItems) === JSON.stringify(items)) {
            console.log(`${logPrefix} New items are identical to current items. Skipping update.`);
            return;
          }

          set({ items, error: null });
          console.log(`${logPrefix} Successfully set ${items.length} items in cart.`);
        } catch (error) {
          console.error(`${logPrefix} Error setting items:`, error);
          set({ error: "Erreur lors de la synchronisation des articles du panier." });
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
    }),
    {
      name: "inherbis-cart-storage",
      storage: createJSONStorage(() => localStorage),
      version: 1, // Solution 2: Add versioning
      migrate: (persistedState: unknown, version: number) => {
        // Solution 2: Handle migration from older state versions
        if (version === 0) {
          console.log("CartStore: Migrating state from version 0 to 1. Old data will be cleared.");
          // For this migration, we clear the incompatible old state.
          return { items: [], isLoading: false, error: null } as Partial<CartState>;
        }
        return persistedState as Partial<CartState>;
      },
      onRehydrateStorage: () => {
        // Solution 1: Robust rehydration logic
        return (state, error) => {
          if (error) {
            console.error(
              "CartStore: Rehydration error, clearing localStorage to prevent further issues.",
              error
            );
            // Directly clear the corrupted storage
            localStorage.removeItem("inherbis-cart-storage");
            // Safely reset the state in the running application
            if (state) {
              state.items = [];
              state.error = "Votre panier a été réinitialisé suite à un problème technique.";
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
              console.warn("CartStore: Filtered out invalid items during rehydration.");
              state.items = validItems;
            }
          }
        };
      },
      partialize: (state) => ({
        items: state.items,
        // Do not persist transient state like isLoading or errors
      }),
    }
  )
);

export default useCartStore;
export { useCartStore };

// Hooks pour utilisation directe
export const useCartItems = () => useCartStore((state) => state.items);
export const useCartTotalItems = () =>
  useCartStore((state) => state.items.reduce((total, item) => total + item.quantity, 0));
export const useCartSubtotal = () =>
  useCartStore((state) =>
    state.items.reduce((total, item) => total + item.price * item.quantity, 0)
  );

// Sélecteurs améliorés avec memoization
export const selectCartItems = (state: CartState): CartItem[] => state.items;

export const selectCartTotalItems = (state: CartState): number =>
  state.items.reduce((total, item) => total + item.quantity, 0);

export const selectCartSubtotal = (state: CartState): number =>
  state.items.reduce((total, item) => total + item.price * item.quantity, 0);

// Nouveaux sélecteurs utiles
export const selectCartItemCount = (state: CartState): number => state.items.length;

export const selectCartIsEmpty = (state: CartState): boolean => state.items.length === 0;

export const selectCartHasErrors = (state: CartState): boolean => !!state.error;
