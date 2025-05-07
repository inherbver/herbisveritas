// src/stores/cartStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { CartState, CartActions, CartStore, CartItem } from "@/types/cart"; // Assurez-vous que le chemin d'importation est correct

// Implémentation initiale du store Zustand pour le panier
const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      // État initial
      items: [],
      isLoading: false,
      error: null,

      // Implémentation des actions
      addItem: (itemToAdd, quantityToAdd = 1) => {
        const currentItems = get().items;
        const existingItemIndex = currentItems.findIndex(
          (item) => item.productId === itemToAdd.productId
        );

        if (existingItemIndex !== -1) {
          // L'article existe déjà, met à jour la quantité
          const updatedItems = currentItems.map((item, index) =>
            index === existingItemIndex
              ? { ...item, quantity: item.quantity + quantityToAdd }
              : item
          );
          set({ items: updatedItems });
        } else {
          // L'article n'existe pas, l'ajoute au panier
          set({ items: [...currentItems, { ...itemToAdd, quantity: quantityToAdd }] });
        }
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.productId !== productId),
        }));
      },

      updateItemQuantity: (productId, newQuantity) => {
        if (newQuantity <= 0) {
          // Si la quantité est 0 ou moins, supprimer l'article
          get().removeItem(productId);
        } else {
          set((state) => ({
            items: state.items.map((item) =>
              item.productId === productId ? { ...item, quantity: newQuantity } : item
            ),
          }));
        }
      },

      clearCart: () => {
        set({ items: [], isLoading: false, error: null }); // Réinitialise aussi isLoading et error pour un état propre
      },

      // Actions internes
      _setIsLoading: (loading) => {
        set({ isLoading: loading });
      },

      _setError: (error) => {
        set({ error });
      },

      _setItems: (items) => {
        set({ items });
      },
    }),
    {
      name: "inherbis-cart-storage", // Nom du stockage dans localStorage
      storage: createJSONStorage(() => localStorage), // Spécifie localStorage
      partialize: (state) => ({ items: state.items }), // Ne persiste que la partie 'items' de l'état
    }
  )
);

export default useCartStore;

// Sélecteurs pour le panier

/**
 * Sélectionne tous les articles du panier.
 * @param state L'état actuel du CartStore.
 * @returns Un tableau de CartItem.
 */
export const selectCartItems = (state: CartState): CartItem[] => state.items;

/**
 * Calcule le nombre total d'unités de produits dans le panier.
 * @param state L'état actuel du CartStore.
 * @returns Le nombre total d'unités.
 */
export const selectCartTotalItems = (state: CartState): number =>
  state.items.reduce((total, item) => total + item.quantity, 0);

/**
 * Calcule le sous-total du panier (montant total).
 * @param state L'état actuel du CartStore.
 * @returns Le sous-total du panier.
 */
export const selectCartSubtotal = (state: CartState): number =>
  state.items.reduce((total, item) => total + item.price * item.quantity, 0);
