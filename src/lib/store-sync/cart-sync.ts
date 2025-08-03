/**
 * Cart Store Synchronization System
 * 
 * This module handles the synchronization between the client store and server actions.
 * It provides optimistic updates with rollback capabilities and handles error states.
 */

import { useCartStore } from "@/stores/cart.store";
import { getCart } from "@/actions/cart.actions";
import { logger, LogUtils } from "@/lib/core/logger";
import type { CartItem, CartData } from "@/types/cart";

// Import unified actions
import {
  addItemToCart as addItemToCartAction,
  removeItemFromCart as removeItemFromCartAction,
  updateCartItemQuantity as updateCartItemQuantityAction,
  clearCartAction,
} from "@/actions/cart.actions";

/**
 * Cart sync manager class
 */
export class CartSyncManager {
  private static instance: CartSyncManager | null = null;
  private syncInProgress = false;
  private syncQueue: Array<() => Promise<void>> = [];
  private lastSyncTime = 0;
  private readonly MIN_SYNC_INTERVAL = 2000; // Minimum 2 seconds between syncs

  private constructor() {}

  static getInstance(): CartSyncManager {
    if (!CartSyncManager.instance) {
      CartSyncManager.instance = new CartSyncManager();
    }
    return CartSyncManager.instance;
  }

  /**
   * Syncs the store with server state
   */
  async syncWithServer(): Promise<void> {
    if (this.syncInProgress) {
      return;
    }

    // Throttle sync calls to prevent excessive requests
    const now = Date.now();
    if (now - this.lastSyncTime < this.MIN_SYNC_INTERVAL) {
      logger.info('Cart sync throttled - too frequent requests');
      return;
    }
    this.lastSyncTime = now;

    this.syncInProgress = true;
    const store = useCartStore.getState();
    
    try {
      store.setLoading('sync', true);
      store.setError('sync', null);

      const cartResult = await getCart();
      
      if (cartResult.success && cartResult.data) {
        this.updateStoreFromServerData(cartResult.data);
        store.markSyncComplete();
        logger.info('Cart sync completed successfully');
      } else {
        throw new Error('Failed to fetch cart from server');
      }
    } catch (error) {
      logger.error('Cart sync failed', error);
      store.setError('sync', 'Erreur de synchronisation avec le serveur');
    } finally {
      store.setLoading('sync', false);
      this.syncInProgress = false;
      await this.processQueue();
    }
  }

  /**
   * Adds an operation to the sync queue
   */
  private async queueOperation(operation: () => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.syncQueue.push(async () => {
        try {
          await operation();
          resolve();
        } catch (error) {
          reject(error);
        }
      });
      
      if (!this.syncInProgress) {
        this.processQueue();
      }
    });
  }

  /**
   * Processes queued operations
   */
  private async processQueue(): Promise<void> {
    while (this.syncQueue.length > 0 && !this.syncInProgress) {
      const operation = this.syncQueue.shift();
      if (operation) {
        await operation();
      }
    }
  }

  /**
   * Updates store from server data
   */
  private updateStoreFromServerData(cartData: CartData): void {
    const store = useCartStore.getState();
    
    // Transform server cart data to store format
    const storeItems: CartItem[] = cartData.items?.map(item => ({
      id: item.id,
      productId: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.image,
      slug: item.slug,
    })) || [];

    store.setItems(storeItems);
  }

  /**
   * Add item with optimistic update
   */
  async addItem(
    productId: string,
    quantity: number,
    itemDetails: {
      name: string;
      price: number;
      image?: string;
      slug?: string;
    }
  ): Promise<void> {
    const store = useCartStore.getState();
    const context = LogUtils.createUserActionContext('unknown', 'add_item_to_cart', 'cart', { productId, quantity });
    
    // Optimistic update
    const optimisticItem: CartItem = {
      id: `temp-${productId}-${Date.now()}`, // Temporary ID
      productId,
      quantity,
      ...itemDetails,
    };
    
    store.addItemOptimistic(optimisticItem);
    store.setLoading('add', true);
    store.setError('add', null);

    try {
      LogUtils.logOperationStart('add_item_to_cart', context);
      
      // Create FormData for the action
      const formData = new FormData();
      formData.append('productId', productId);
      formData.append('quantity', quantity.toString());
      
      const result = await addItemToCartAction(null, formData);
      
      if (result.success) {
        LogUtils.logOperationSuccess('add_item_to_cart', context);
        // Don't auto-sync after successful add - let the component decide
        // await this.syncWithServer(); // Sync to get the correct server state
      } else {
        throw new Error(result.error || 'Failed to add item');
      }
    } catch (error) {
      LogUtils.logOperationError('add_item_to_cart', error, context);
      
      // Rollback optimistic update
      store.rollbackOptimisticUpdate(`add-${productId}`);
      store.setError('add', error instanceof Error ? error.message : 'Erreur lors de l\'ajout');
      
      // Sync to restore correct state
      await this.syncWithServer();
    } finally {
      store.setLoading('add', false);
    }
  }

  /**
   * Remove item with optimistic update
   */
  async removeItem(cartItemId: string): Promise<void> {
    const store = useCartStore.getState();
    const context = LogUtils.createUserActionContext('unknown', 'remove_item_from_cart', 'cart', { cartItemId });
    
    // Store current item for potential rollback
    const currentItem = store.getItemById(cartItemId);
    
    // Optimistic update
    store.removeItemOptimistic(cartItemId);
    store.setLoading('remove', true);
    store.setError('remove', null);

    try {
      LogUtils.logOperationStart('remove_item_from_cart', context);
      
      const result = await removeItemFromCartAction({ cartItemId });
      
      if (result.success) {
        LogUtils.logOperationSuccess('remove_item_from_cart', context);
        // Don't auto-sync after successful remove - let the component decide
        // await this.syncWithServer();
      } else {
        throw new Error(result.error || 'Failed to remove item');
      }
    } catch (error) {
      LogUtils.logOperationError('remove_item_from_cart', error, context);
      
      // Rollback optimistic update
      if (currentItem) {
        store.addItemOptimistic(currentItem);
      }
      store.setError('remove', error instanceof Error ? error.message : 'Erreur lors de la suppression');
      
      await this.syncWithServer();
    } finally {
      store.setLoading('remove', false);
    }
  }

  /**
   * Update item quantity with optimistic update
   */
  async updateItemQuantity(cartItemId: string, newQuantity: number): Promise<void> {
    const store = useCartStore.getState();
    const context = LogUtils.createUserActionContext('unknown', 'update_item_quantity', 'cart', { cartItemId, newQuantity });
    
    // Store current quantity for potential rollback
    const currentItem = store.getItemById(cartItemId);
    const currentQuantity = currentItem?.quantity || 0;
    
    // Optimistic update
    store.updateItemQuantityOptimistic(cartItemId, newQuantity);
    store.setLoading('update', true);
    store.setError('update', null);

    try {
      LogUtils.logOperationStart('update_item_quantity', context);
      
      const result = await updateCartItemQuantityAction({ cartItemId, quantity: newQuantity });
      
      if (result.success) {
        LogUtils.logOperationSuccess('update_item_quantity', context);
        // Don't auto-sync after successful update - let the component decide
        // await this.syncWithServer();
      } else {
        throw new Error(result.error || 'Failed to update quantity');
      }
    } catch (error) {
      LogUtils.logOperationError('update_item_quantity', error, context);
      
      // Rollback optimistic update
      store.updateItemQuantityOptimistic(cartItemId, currentQuantity);
      store.setError('update', error instanceof Error ? error.message : 'Erreur lors de la mise à jour');
      
      await this.syncWithServer();
    } finally {
      store.setLoading('update', false);
    }
  }

  /**
   * Clear cart
   */
  async clearCart(): Promise<void> {
    const store = useCartStore.getState();
    const context = LogUtils.createUserActionContext('unknown', 'clear_cart', 'cart');
    
    // Store current items for potential rollback
    const currentItems = [...store.items];
    
    // Optimistic update
    store.setItems([]);
    store.setLoading('clear', true);
    store.setError('clear', null);

    try {
      LogUtils.logOperationStart('clear_cart', context);
      
      const result = await clearCartAction(null);
      
      if (result.success) {
        LogUtils.logOperationSuccess('clear_cart', context);
        // Don't auto-sync after successful clear - let the component decide
        // await this.syncWithServer();
      } else {
        throw new Error(result.error || 'Failed to clear cart');
      }
    } catch (error) {
      LogUtils.logOperationError('clear_cart', error, context);
      
      // Rollback optimistic update
      store.setItems(currentItems);
      store.setError('clear', error instanceof Error ? error.message : 'Erreur lors de la vidange');
      
      await this.syncWithServer();
    } finally {
      store.setLoading('clear', false);
    }
  }
}

/**
 * Singleton instance
 */
export const cartSyncManager = CartSyncManager.getInstance();

/**
 * React hooks for cart operations
 */
export const useCartOperations = () => {
  return {
    addItem: (productId: string, quantity: number, itemDetails: {
      name: string;
      price: number;
      image?: string;
      slug?: string;
    }) => cartSyncManager.addItem(productId, quantity, itemDetails),
    
    removeItem: (cartItemId: string) => cartSyncManager.removeItem(cartItemId),
    
    updateItemQuantity: (cartItemId: string, newQuantity: number) => 
      cartSyncManager.updateItemQuantity(cartItemId, newQuantity),
    
    clearCart: () => cartSyncManager.clearCart(),
    
    syncWithServer: () => cartSyncManager.syncWithServer(),
  };
};

/**
 * Auto-sync hook for components that need to ensure cart is synced
 */
import { useEffect } from 'react';

export const useCartAutoSync = (intervalMs: number = 60000) => { // Reduced from 30s to 60s
  
  useEffect(() => {
    // Initial sync with delay to avoid overwhelming on page load
    const initialSyncTimer = setTimeout(() => {
      cartSyncManager.syncWithServer();
    }, 1000);
    
    // Set up periodic sync with much longer interval
    const interval = setInterval(() => {
      cartSyncManager.syncWithServer();
    }, intervalMs);
    
    return () => {
      clearTimeout(initialSyncTimer);
      clearInterval(interval);
    };
  }, [intervalMs]);
};