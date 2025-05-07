// src/types/cart.ts

/**
 * Représente un article individuel dans le panier.
 */
export interface CartItem {
  productId: string; // Identifiant unique du produit
  name: string; // Nom du produit
  price: number; // Prix unitaire du produit
  quantity: number; // Quantité de ce produit dans le panier
  image?: string; // URL de l'image du produit (optionnel)
  slug?: string; // Slug du produit pour la navigation (optionnel)
  // Vous pouvez ajouter d'autres champs spécifiques au produit si nécessaire
  // par exemple, variantId, couleur, taille, etc.
}

/**
 * Représente l'état global du store du panier.
 */
export interface CartState {
  items: CartItem[]; // Liste des articles dans le panier
  isLoading: boolean; // Indicateur de chargement pour les opérations asynchrones
  error: string | null; // Message d'erreur en cas de problème
  // Peut-être un cartId pour la synchronisation avec le backend
  // serverCartId: string | null;
}

/**
 * Définit les actions disponibles sur le store du panier.
 */
export interface CartActions {
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void; // Ajoute un article ou incrémente sa quantité
  removeItem: (productId: string) => void; // Supprime complètement un article du panier
  updateItemQuantity: (productId: string, quantity: number) => void; // Met à jour la quantité d'un article
  clearCart: () => void; // Vide complètement le panier

  // Actions internes ou pour la synchronisation (préfixées par _ pour indiquer leur nature)
  _setIsLoading: (loading: boolean) => void; // Met à jour l'état de chargement
  _setError: (error: string | null) => void; // Met à jour l'état d'erreur
  _setItems: (items: CartItem[]) => void; // Remplace tous les articles du panier (utile pour l'hydratation)
  // _setServerCartId: (cartId: string | null) => void;          // Met à jour l'ID du panier serveur

  // Actions pour la synchronisation avec le backend (à implémenter plus tard)
  // syncWithServer: () => Promise<void>;
  // hydrateCartFromServer: (userId: string) => Promise<void>;
  // mergeGuestCartWithUserCart: (userId: string) => Promise<void>;
}

/**
 * Type combiné pour le store Zustand, incluant l'état et les actions.
 */
export type CartStore = CartState & CartActions;
