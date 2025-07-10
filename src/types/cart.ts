// src/types/cart.ts - VERSION CIBLE HARMONISÉE

// Forward declaration pour CartData pour éviter les dépendances circulaires si nécessaire
// Bien que dans ce cas, CartData est plus utilisé côté actions.
// import type { CartData } from '@/actions/cartActions'; // Peut être décommenté si CartData est utilisé ici

export interface CartItem {
  id?: string; // cart_item_id de la BDD (UUID), optionnel côté client avant synchro
  productId: string; // Identifiant du produit (ex: prod_cos_003)
  name: string;
  price: number;
  quantity: number;
  image?: string;
  slug?: string;
}

export interface CartState {
  items: CartItem[];
  isLoading: boolean;
  error: string | null;
}

export interface CartActions {
  addItem: (
    // itemDetails contient les informations du produit à ajouter.
    // 'id' (cart_item_id) et 'quantity' seront gérés par le store ou la logique de synchronisation.
    itemDetails: {
      productId: string; // Obligatoire pour identifier le produit
      name: string;
      price: number;
      image?: string;
      slug?: string;
      // Autres champs de CartItem qui sont des propriétés du produit
    },
    quantityToAdd?: number // La quantité à ajouter, par défaut 1 dans le store
  ) => void;
  removeItem: (cartItemId: string) => void; // Doit utiliser l'ID de l'item du panier
  updateItemQuantity: (cartItemId: string, newQuantity: number) => void; // Doit utiliser l'ID de l'item du panier
  clearCart: () => void;

  // Actions internes pour la gestion de l'état
  _setIsLoading: (loading: boolean) => void;
  _setError: (error: string | null) => void;
  _setItems: (items: CartItem[]) => void; // Pour hydrater/remplacer les items du panier
}

/**
 * Type combiné pour le store Zustand, incluant l'état et les actions.
 */
export type CartStore = CartState & CartActions;

// Sélecteurs
export const selectCartItems = (state: CartState) => state.items;
export const selectCartTotalItems = (state: CartState) =>
  state.items.reduce((total, item) => total + item.quantity, 0);
export const selectCartSubtotal = (state: CartState) =>
  state.items.reduce((total, item) => total + item.price * item.quantity, 0);

// Types pour useActionState
export type ActionState<T> = {
  success: boolean;
  message?: string;
  error?: string; // Pour les erreurs générales non liées à la validation de champs
  data?: T;
  errors?: Record<string, string[] | undefined>; // Pour les erreurs de validation Zod spécifiques aux champs
};

// État initial sûr pour useActionState
export const createInitialActionState = <T = undefined>(): ActionState<T | undefined> => ({
  success: false,
  message: undefined,
  error: undefined,
  data: undefined,
  errors: undefined,
});

// Types spécifiques pour les actions panier
// Note: CartData est défini dans cartActions.ts. Pour éviter une dépendance circulaire stricte,
// nous pourrions utiliser 'any' ici ou une interface générique si CartData n'est pas importable directement.
// Idéalement, CartData serait aussi dans types/cart.ts ou un fichier de types partagés.
// Pour l'instant, on suppose que l'importation est gérable ou que CartData est défini ailleurs.
// Si CartData vient de @/actions/cartActions, cela crée une dépendance de types -> actions.
// Une meilleure approche serait de définir CartData dans un fichier de types commun ou ici.

export interface Cart {
  id: string; // cartId
  items: CartItem[];
  totalPrice: number;
  totalItems: number;
}

// Définition de CartData (structure serveur) pour être utilisée ici et éviter les cycles d'import.
// Ceci est une copie de la structure attendue de cartActions.ts pour CartData.
// Il serait préférable de l'avoir dans un fichier `types/shared.ts` ou similaire à l'avenir.
export interface ProductDetails {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  slug?: string;
  // ... autres champs de produit si nécessaire
}

export interface ServerCartItem {
  id: string; // cart_item_id (UUID)
  product_id: string;
  quantity: number;
  products: ProductDetails | null; // Product details, or null if not found/applicable.
  // Transformed in getCart to be ProductDetails | null from potential array.
}

export interface CartData {
  id: string; // cart_id (UUID)
  user_id: string | null;
  created_at: string;
  updated_at: string;
  items: CartItem[]; // Changed from cart_items: ServerCartItem[] to represent client-side structure
}

export type CartActionState = ActionState<CartData | null>;
export const initialCartActionState: CartActionState = createInitialActionState<CartData | null>();
