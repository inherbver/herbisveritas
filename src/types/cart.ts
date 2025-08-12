/**
 * @file src/types/cart.ts
 * @description Defines the client-side types for the Zustand cart store.
 * This includes the state, actions, and the combined store type.
 * Server-side types are now imported from `@/lib/supabase/types.ts`.
 * Action result types are imported from `@/lib/cart-helpers.ts`.
 */

// --- Product Details Structure ---
/**
 * Represents product details used in cart operations.
 */
export interface ProductDetails {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  slug?: string;
}

// --- Client-Side Cart Item Structure ---
/**
 * Represents a single item in the client-side cart store.
 */
export interface CartItem {
  id?: string; // cart_item_id from DB (UUID), optional on client before sync
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  slug?: string;
  stock?: number; // Available stock for the product
}

// --- Server Response Cart Data ---
/**
 * Represents the complete cart data structure returned from server operations.
 * Used in cartReader.ts and other server-side cart operations.
 */
export interface CartData {
  id: string;
  user_id?: string | null; // ✅ Permettre undefined pour la compatibilité
  created_at: string;
  updated_at: string;
  items: CartItem[]; // ✅ Utilise CartItem[] car les données sont transformées
}

// --- Server-Side Types (for compatibility) ---
/**
 * Represents a cart item as stored in the database.
 */
export interface ServerCartItem {
  id: string;
  product_id: string;
  quantity: number;
  name: string;
  price: number;
  image_url?: string;
}

/**
 * Represents cart data as returned from server with server cart items.
 * ✅ Harmonisé avec CartData pour éviter les conflits de types
 */
export interface CartDataFromServer {
  id: string;
  user_id?: string | null; // ✅ Permettre undefined comme CartData
  created_at: string;
  updated_at: string;
  cart_items: ServerCartItem[];
}

// --- Zustand Store Shape ---
/**
 * Defines the state structure of the cart store.
 */
export interface CartState {
  items: CartItem[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Defines the actions available in the cart store.
 */
export interface CartActions {
  addItem: (itemDetails: Omit<CartItem, "quantity">, quantityToAdd?: number) => void;
  removeItem: (cartItemId: string) => void;
  updateItemQuantity: (cartItemId: string, newQuantity: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;

  // Public actions for state management
  setLoading: (loading: boolean) => void;

  // Internal actions for state management
  _setIsLoading: (loading: boolean) => void;
  _setError: (error: string | null) => void;
  _setItems: (items: CartItem[]) => void;
}

/**
 * Combined type for the Zustand store, including both state and actions.
 */
export type CartStore = CartState & CartActions;

// --- Zustand Selectors ---
/**
 * Selects the cart items from the state.
 */
export const selectCartItems = (state: CartState) => state.items;

/**
 * Selects the total number of items in the cart.
 */
export const selectCartTotalItems = (state: CartState) =>
  state.items.reduce((total, item) => total + item.quantity, 0);

/**
 * Selects the subtotal price of all items in the cart.
 */
export const selectCartSubtotal = (state: CartState) =>
  state.items.reduce((total, item) => total + item.price * item.quantity, 0);
