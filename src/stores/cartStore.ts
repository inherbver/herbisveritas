// src/stores/cartStore.ts
import { create } from "zustand";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { CartState, CartActions, CartStore, CartItem } from "@/types/cart"; // Assurez-vous que le chemin d'importation est correct

// Implémentation initiale du store Zustand pour le panier
const useCartStore = create<CartStore>((set, _get) => ({
  // État initial
  items: [],
  isLoading: false,
  error: null,

  // Implémentation des actions (à compléter dans la Phase 2)
  addItem: (itemToAdd, quantity = 1) => {
    // Logique à implémenter (Tâche 2.1)
    console.log("addItem called with:", itemToAdd, "quantity:", quantity);
    // Exemple de mise à jour (à affiner) :
    // set((state) => ({ items: [...state.items, { ...itemToAdd, quantity }] }));
  },

  removeItem: (productId) => {
    // Logique à implémenter (Tâche 2.1)
    console.log("removeItem called for productId:", productId);
    // set((state) => ({ items: state.items.filter(item => item.productId !== productId) }));
  },

  updateItemQuantity: (productId, quantity) => {
    // Logique à implémenter (Tâche 2.1)
    console.log("updateItemQuantity called for productId:", productId, "new quantity:", quantity);
    // set((state) => ({
    //   items: state.items.map(item =>
    //     item.productId === productId ? { ...item, quantity } : item
    //   ).filter(item => item.quantity > 0) // Optionnel: supprimer si quantité <= 0
    // }));
  },

  clearCart: () => {
    // Logique à implémenter (Tâche 2.1)
    console.log("clearCart called");
    // set({ items: [] });
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
}));

export default useCartStore;
