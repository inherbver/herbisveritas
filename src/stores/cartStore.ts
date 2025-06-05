// src/stores/cartStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CartState, CartStore, CartItem } from "@/types/cart";

// Version améliorée du store avec gestion d'erreurs et logging
const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      // État initial
      items: [],
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
        try {
          set({ items, error: null });
          console.log(`CartStore: Set ${items.length} items in cart`);
        } catch (error) {
          console.error("CartStore: Error setting items:", error);
          set({ error: "Erreur lors de la synchronisation" });
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
      partialize: (state) => ({ items: state.items }),
      // Gestion des erreurs de persistance
      onRehydrateStorage: () => {
        console.log("CartStore: Starting rehydration from localStorage");
        return (state, error) => {
          if (error) {
            console.error("CartStore: Error during rehydration:", error);
          } else {
            console.log(
              `CartStore: Rehydrated successfully with ${state?.items?.length || 0} items`
            );
          }
        };
      },
    }
  )
);

export default useCartStore;

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
