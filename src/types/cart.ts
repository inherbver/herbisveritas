/**
 * @file src/types/cart.ts
 * @description Defines the client-side types for the Zustand cart store.
 * This includes the state, actions, and the combined store type.
 * Server-side types are now imported from `@/lib/supabase/types.ts`.
 * Action result types are imported from `@/lib/cart-helpers.ts`.
 */

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
  addItem: (itemDetails: Omit<CartItem, 'quantity'>, quantityToAdd?: number) => void;
  removeItem: (cartItemId: string) => void;
  updateItemQuantity: (cartItemId: string, newQuantity: number) => void;
  clearCart: () => void;

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

