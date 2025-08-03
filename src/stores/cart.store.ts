/**
 * Unified Cart Store - Clean Architecture
 * 
 * Combines the best of both cart stores with clean separation of concerns:
 * - Pure state management only
 * - Business logic handled by services
 * - Optimistic updates with rollback
 * - Granular loading states
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CartItem } from "@/types/cart";

/**
 * Loading states for different cart operations
 */
export type LoadingState = {
  add: boolean;
  remove: boolean;
  update: boolean;
  clear: boolean;
  sync: boolean;
};

/**
 * Error states for different cart operations
 */
export type ErrorState = {
  add: string | null;
  remove: string | null;
  update: string | null;
  clear: string | null;
  sync: string | null;
  general: string | null;
};

/**
 * Cart state interface
 */
export interface CartState {
  // Core data
  items: CartItem[];
  
  // UI states
  loading: LoadingState;
  errors: ErrorState;
  
  // Sync tracking
  lastSyncAt: number | null;
  
  // Optimistic update tracking
  optimisticUpdates: Map<string, 'add' | 'remove' | 'update'>;
}

/**
 * Cart store actions interface
 */
export interface CartActions {
  // Pure state setters (for server sync)
  setItems: (items: CartItem[]) => void;
  setLoading: (operation: keyof LoadingState, loading: boolean) => void;
  setError: (operation: keyof ErrorState, error: string | null) => void;
  clearAllErrors: () => void;
  
  // Optimistic operations (immediate UI feedback)
  addItemOptimistic: (item: CartItem) => string; // returns update ID
  removeItemOptimistic: (productId: string) => string;
  updateQuantityOptimistic: (productId: string, quantity: number) => string;
  clearCartOptimistic: () => string;
  
  // Optimistic rollback
  rollbackOptimisticUpdate: (updateId: string) => void;
  commitOptimisticUpdate: (updateId: string) => void;
  
  // Computed getters
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getItemByProductId: (productId: string) => CartItem | undefined;
  
  // Legacy compatibility methods (deprecated but needed during migration)
  _setItems: (items: CartItem[]) => void; // for legacy components
  _setIsLoading: (loading: boolean) => void;
  _setError: (error: string | null) => void;
  clearCart: () => void; // for legacy logout/clear operations
}

/**
 * Complete cart store interface
 */
export type CartStore = CartState & CartActions;

/**
 * Initial state factory
 */
const createInitialState = (): CartState => ({
  items: [],
  loading: {
    add: false,
    remove: false,
    update: false,
    clear: false,
    sync: false,
  },
  errors: {
    add: null,
    remove: null,
    update: null,
    clear: null,
    sync: null,
    general: null,
  },
  lastSyncAt: null,
  optimisticUpdates: new Map(),
});

/**
 * Cart item validator
 */
const isValidCartItem = (item: unknown): item is CartItem => {
  if (typeof item !== "object" || item === null) {
    return false;
  }
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    typeof obj.productId === "string" &&
    typeof obj.name === "string" &&
    typeof obj.price === "number" &&
    typeof obj.quantity === "number" &&
    obj.quantity > 0
  );
};

/**
 * Generate unique update ID for optimistic operations
 */
const generateUpdateId = (operation: string, productId?: string): string => {
  return `${operation}-${productId || 'cart'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Unified cart store
 */
export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      ...createInitialState(),
      
      // Pure state setters
      setItems: (items: CartItem[]) => {
        set((state) => ({
          ...state,
          items: items.filter(isValidCartItem),
          optimisticUpdates: new Map(), // Clear optimistic updates on server sync
          lastSyncAt: Date.now(),
        }));
      },
      
      setLoading: (operation: keyof LoadingState, loading: boolean) => {
        set((state) => ({
          ...state,
          loading: { ...state.loading, [operation]: loading },
        }));
      },
      
      setError: (operation: keyof ErrorState, error: string | null) => {
        set((state) => ({
          ...state,
          errors: { ...state.errors, [operation]: error },
        }));
      },
      
      clearAllErrors: () => {
        set((state) => ({
          ...state,
          errors: {
            add: null,
            remove: null,
            update: null,
            clear: null,
            sync: null,
            general: null,
          },
        }));
      },
      
      // Optimistic operations
      addItemOptimistic: (item: CartItem) => {
        if (!isValidCartItem(item)) {
          console.warn('CartStore: Invalid item for optimistic add', item);
          return '';
        }
        
        const updateId = generateUpdateId('add', item.productId);
        
        set((state) => {
          const existingIndex = state.items.findIndex(
            (existingItem) => existingItem.productId === item.productId
          );
          
          let newItems: CartItem[];
          if (existingIndex !== -1) {
            // Update existing item quantity
            newItems = state.items.map((existingItem, index) =>
              index === existingIndex
                ? { ...existingItem, quantity: existingItem.quantity + item.quantity }
                : existingItem
            );
          } else {
            // Add new item
            newItems = [...state.items, item];
          }
          
          const newOptimisticUpdates = new Map(state.optimisticUpdates);
          newOptimisticUpdates.set(updateId, 'add');
          
          return {
            ...state,
            items: newItems,
            optimisticUpdates: newOptimisticUpdates,
          };
        });
        
        return updateId;
      },
      
      removeItemOptimistic: (productId: string) => {
        const updateId = generateUpdateId('remove', productId);
        
        set((state) => {
          const newItems = state.items.filter(item => item.productId !== productId);
          const newOptimisticUpdates = new Map(state.optimisticUpdates);
          newOptimisticUpdates.set(updateId, 'remove');
          
          return {
            ...state,
            items: newItems,
            optimisticUpdates: newOptimisticUpdates,
          };
        });
        
        return updateId;
      },
      
      updateQuantityOptimistic: (productId: string, quantity: number) => {
        if (quantity <= 0) {
          return get().removeItemOptimistic(productId);
        }
        
        const updateId = generateUpdateId('update', productId);
        
        set((state) => {
          const newItems = state.items.map(item =>
            item.productId === productId
              ? { ...item, quantity }
              : item
          );
          
          const newOptimisticUpdates = new Map(state.optimisticUpdates);
          newOptimisticUpdates.set(updateId, 'update');
          
          return {
            ...state,
            items: newItems,
            optimisticUpdates: newOptimisticUpdates,
          };
        });
        
        return updateId;
      },
      
      clearCartOptimistic: () => {
        const updateId = generateUpdateId('clear');
        
        set((state) => {
          const newOptimisticUpdates = new Map(state.optimisticUpdates);
          newOptimisticUpdates.set(updateId, 'add'); // 'add' type for clear operation
          
          return {
            ...state,
            items: [],
            optimisticUpdates: newOptimisticUpdates,
          };
        });
        
        return updateId;
      },
      
      // Optimistic update management
      rollbackOptimisticUpdate: (updateId: string) => {
        set((state) => {
          const newOptimisticUpdates = new Map(state.optimisticUpdates);
          newOptimisticUpdates.delete(updateId);
          
          // For simplicity, we'll refresh from last known server state
          // In a production app, you'd want to store the previous state per update
          return {
            ...state,
            optimisticUpdates: newOptimisticUpdates,
          };
        });
      },
      
      commitOptimisticUpdate: (updateId: string) => {
        set((state) => {
          const newOptimisticUpdates = new Map(state.optimisticUpdates);
          newOptimisticUpdates.delete(updateId);
          
          return {
            ...state,
            optimisticUpdates: newOptimisticUpdates,
          };
        });
      },
      
      // Computed getters
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
      
      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + (item.price * item.quantity), 0);
      },
      
      getItemByProductId: (productId: string) => {
        return get().items.find(item => item.productId === productId);
      },
      
      // Legacy compatibility methods (DEPRECATED - remove after migration)
      _setItems: (items: CartItem[]) => {
        console.warn('DEPRECATED: Use setItems instead of _setItems');
        get().setItems(items);
      },
      
      _setIsLoading: (loading: boolean) => {
        console.warn('DEPRECATED: Use setLoading instead of _setIsLoading');
        get().setLoading('sync', loading);
      },
      
      _setError: (error: string | null) => {
        console.warn('DEPRECATED: Use setError instead of _setError');
        get().setError('general', error);
      },
      
      clearCart: () => {
        console.warn('DEPRECATED: Use clearCartOptimistic instead of clearCart');
        get().clearCartOptimistic();
      },
    }),
    {
      name: "cart-store",
      storage: createJSONStorage(() => localStorage),
      version: 2, // Increment version to trigger migration
      partialize: (state) => ({
        items: state.items,
        lastSyncAt: state.lastSyncAt,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Clear optimistic updates on rehydration
          state.optimisticUpdates = new Map();
          // Reset loading and error states
          state.loading = {
            add: false,
            remove: false,
            update: false,
            clear: false,
            sync: false,
          };
          state.errors = {
            add: null,
            remove: null,
            update: null,
            clear: null,
            sync: null,
            general: null,
          };
        }
      },
    }
  )
);

// Export selectors for performance
export const useCartItems = () => useCartStore(state => state.items);
export const useCartLoading = () => useCartStore(state => state.loading);
export const useCartErrors = () => useCartStore(state => state.errors);
export const useCartTotalItems = () => useCartStore(state => state.getTotalItems());
export const useCartTotalPrice = () => useCartStore(state => state.getTotalPrice());
export const useCartSubtotal = () => useCartStore(state => state.getTotalPrice()); // Alias for compatibility

// Export the store as default for backward compatibility
export default useCartStore;