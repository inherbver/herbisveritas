/**
 * Refactored Cart Store - Pure State Management
 * 
 * This store only manages state and UI concerns.
 * Business logic is handled by services and actions.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CartItem } from "@/types/cart";

/**
 * Loading states for different operations
 */
export type LoadingState = {
  add: boolean;
  remove: boolean;
  update: boolean;
  clear: boolean;
  sync: boolean;
};

/**
 * Error states for different operations
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
 * Pure cart state interface
 */
export interface CartState {
  // Data
  items: CartItem[];
  
  // UI States
  loading: LoadingState;
  errors: ErrorState;
  
  // Last sync timestamp for optimistic updates
  lastSyncAt: number | null;
  
  // Optimistic update tracking
  optimisticUpdates: Map<string, 'add' | 'remove' | 'update'>;
}

/**
 * Pure cart store actions (no business logic)
 */
export interface CartStoreActions {
  // State setters
  setItems: (items: CartItem[]) => void;
  setLoading: (operation: keyof LoadingState, loading: boolean) => void;
  setError: (operation: keyof ErrorState, error: string | null) => void;
  clearAllErrors: () => void;
  
  // Optimistic updates
  addItemOptimistic: (item: CartItem) => void;
  removeItemOptimistic: (itemId: string) => void;
  updateItemQuantityOptimistic: (itemId: string, quantity: number) => void;
  
  // Rollback optimistic updates
  rollbackOptimisticUpdate: (updateId: string) => void;
  rollbackAllOptimisticUpdates: () => void;
  
  // Sync state
  markSyncComplete: () => void;
  
  // Utilities (pure getters)
  getItemById: (itemId: string) => CartItem | undefined;
  getItemByProductId: (productId: string) => CartItem | undefined;
  getTotalItems: () => number;
  getSubtotal: () => number;
  isEmpty: () => boolean;
  hasErrors: () => boolean;
  isLoading: () => boolean;
}

export type CartStore = CartState & CartStoreActions;

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
 * Refactored cart store with pure state management
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
      
      // Optimistic updates (for immediate UI feedback)
      addItemOptimistic: (item: CartItem) => {
        if (!isValidCartItem(item)) {
          console.warn('CartStore: Invalid item for optimistic add', item);
          return;
        }
        
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
          
          const updateId = `add-${item.productId}-${Date.now()}`;
          const newOptimisticUpdates = new Map(state.optimisticUpdates);
          newOptimisticUpdates.set(updateId, 'add');
          
          return {
            ...state,
            items: newItems,
            optimisticUpdates: newOptimisticUpdates,
          };
        });
      },
      
      removeItemOptimistic: (itemId: string) => {
        set((state) => {
          const newItems = state.items.filter((item) => item.id !== itemId);
          const updateId = `remove-${itemId}-${Date.now()}`;
          const newOptimisticUpdates = new Map(state.optimisticUpdates);
          newOptimisticUpdates.set(updateId, 'remove');
          
          return {
            ...state,
            items: newItems,
            optimisticUpdates: newOptimisticUpdates,
          };
        });
      },
      
      updateItemQuantityOptimistic: (itemId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItemOptimistic(itemId);
          return;
        }
        
        set((state) => {
          const newItems = state.items.map((item) =>
            item.id === itemId ? { ...item, quantity } : item
          );
          
          const updateId = `update-${itemId}-${Date.now()}`;
          const newOptimisticUpdates = new Map(state.optimisticUpdates);
          newOptimisticUpdates.set(updateId, 'update');
          
          return {
            ...state,
            items: newItems,
            optimisticUpdates: newOptimisticUpdates,
          };
        });
      },
      
      // Rollback functions (for failed operations)
      rollbackOptimisticUpdate: (updateId: string) => {
        set((state) => {
          const newOptimisticUpdates = new Map(state.optimisticUpdates);
          newOptimisticUpdates.delete(updateId);
          
          return {
            ...state,
            optimisticUpdates: newOptimisticUpdates,
            // Note: In a real implementation, we'd need to store the previous state
            // to properly rollback. For now, we rely on server sync to fix state.
          };
        });
        
        // Trigger a sync to get the correct state from server
        // This would be handled by the sync system
      },
      
      rollbackAllOptimisticUpdates: () => {
        set((state) => ({
          ...state,
          optimisticUpdates: new Map(),
        }));
      },
      
      markSyncComplete: () => {
        set((state) => ({
          ...state,
          lastSyncAt: Date.now(),
          optimisticUpdates: new Map(), // Clear all optimistic updates
        }));
      },
      
      // Pure utility functions
      getItemById: (itemId: string) => {
        return get().items.find((item) => item.id === itemId);
      },
      
      getItemByProductId: (productId: string) => {
        return get().items.find((item) => item.productId === productId);
      },
      
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
      
      getSubtotal: () => {
        return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
      },
      
      isEmpty: () => {
        return get().items.length === 0;
      },
      
      hasErrors: () => {
        const errors = get().errors;
        return Object.values(errors).some((error) => error !== null);
      },
      
      isLoading: () => {
        const loading = get().loading;
        return Object.values(loading).some((isLoading) => isLoading);
      },
    }),
    {
      name: "herbisveritas-cart-v2",
      storage: createJSONStorage(() => localStorage),
      version: 2,
      
      // Only persist essential state
      partialize: (state) => ({
        items: state.items,
        lastSyncAt: state.lastSyncAt,
        // Don't persist loading states, errors, or optimistic updates
      }),
      
      // Robust migration and rehydration
      migrate: (persistedState: unknown, version: number) => {
        if (version < 2) {
          console.log("CartStore: Migrating to v2, clearing old data");
          return createInitialState();
        }
        return persistedState as Partial<CartState>;
      },
      
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error("CartStore: Rehydration error, resetting state", error);
            localStorage.removeItem("herbisveritas-cart-v2");
            if (state) {
              Object.assign(state, createInitialState());
              state.errors.general = "Votre panier a été réinitialisé suite à un problème technique.";
            }
            return;
          }
          
          // Validate rehydrated items
          if (state?.items) {
            const validItems = state.items.filter(isValidCartItem);
            if (validItems.length !== state.items.length) {
              console.warn("CartStore: Filtered invalid items during rehydration");
              state.items = validItems;
            }
          }
          
          // Ensure all required state is present
          if (state) {
            const initialState = createInitialState();
            
            // Merge with initial state to ensure all properties exist
            Object.keys(initialState).forEach((key) => {
              if (!(key in state)) {
                (state as any)[key] = (initialState as any)[key];
              }
            });
          }
        };
      },
    }
  )
);

/**
 * Selector hooks for better performance and reusability
 */
export const useCartItems = () => useCartStore((state) => state.items);
export const useCartLoading = () => useCartStore((state) => state.loading);
export const useCartErrors = () => useCartStore((state) => state.errors);
export const useCartTotalItems = () => useCartStore((state) => state.getTotalItems());
export const useCartSubtotal = () => useCartStore((state) => state.getSubtotal());
export const useCartIsEmpty = () => useCartStore((state) => state.isEmpty());
export const useCartHasErrors = () => useCartStore((state) => state.hasErrors());
export const useCartIsLoading = () => useCartStore((state) => state.isLoading());

/**
 * Advanced selectors with memoization
 */
export const useCartItemById = (itemId: string) => 
  useCartStore((state) => state.getItemById(itemId));

export const useCartItemByProductId = (productId: string) => 
  useCartStore((state) => state.getItemByProductId(productId));

/**
 * Computed selectors for complex derived state
 */
export const useCartSummary = () => useCartStore((state) => ({
  totalItems: state.getTotalItems(),
  subtotal: state.getSubtotal(),
  itemCount: state.items.length,
  isEmpty: state.isEmpty(),
  hasErrors: state.hasErrors(),
  isLoading: state.isLoading(),
}));