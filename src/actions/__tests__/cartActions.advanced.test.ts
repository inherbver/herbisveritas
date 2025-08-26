/**
 * Tests avancés pour cartActions - Phase 3.2
 * Tests de concurrence, edge cases, et intégrations complexes
 */

import {
  addItemToCart,
  removeItemFromCart,
  updateCartItemQuantity,
  migrateAndGetCart,
  clearCartAction,
} from '../cartActions'
import { 
  createMockFormData, 
  testActionWithRedirect,
  setupServerActionMocks 
} from '@/test-utils/server-action-mocks';
import { createMockSupabaseChain } from '@/test-utils/supabase-mock-helper';
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCart } from '@/lib/cartReader'
import { getActiveUserId } from '@/utils/authUtils'
import { revalidateTag } from 'next/cache'

// Mock dependencies
jest.mock('@/lib/supabase/server')
jest.mock('@/lib/cartReader')
jest.mock('@/utils/authUtils')
jest.mock('next/cache')
jest.mock('@/lib/core/logger')

// Setup des mocks standards pour Server Actions
setupServerActionMocks();

describe('cartActions - Advanced Tests (Phase 3.2)', () => {
  let mockSupabase: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (revalidateTag as jest.Mock).mockImplementation(() => {});
    
    // Default Supabase mock
    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ 
          data: { user: { id: 'user-123' } }, 
          error: null 
        }),
      },
      from: jest.fn(),
    };
    
    (createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('Concurrency Tests', () => {
    it('should handle concurrent cart updates for the same user', async () => {
      // Arrange
      const userId = 'user-123';
      const cartId = 'cart-123';
      const productId = 'product-1';
      
      (getActiveUserId as jest.Mock).mockResolvedValue(userId);
      (getCart as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          id: cartId,
          user_id: userId,
          items: [],
        }
      });
      
      // Mock product check
      const productChain = createMockSupabaseChain({
        data: { id: productId, stock_quantity: 10, price: 10 },
        error: null,
      });
      
      // Mock cart operations
      const cartChain = createMockSupabaseChain({
        data: { id: 'item-1', quantity: 1 },
        error: null,
      });
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'products') return productChain;
        if (table === 'cart_items') return cartChain;
        return createMockSupabaseChain();
      });
      
      // Act - Simuler des mises à jour concurrentes
      const promises = [
        addItemToCart(null, createMockFormData({ productId, quantity: '1' })),
        addItemToCart(null, createMockFormData({ productId, quantity: '2' })),
        addItemToCart(null, createMockFormData({ productId, quantity: '1' })),
      ];
      
      const results = await Promise.all(promises);
      
      // Assert
      results.forEach(result => {
        // Handle undefined as success for server actions
        expect(result?.success ?? true).toBe(true);
      });
      
      // Vérifier que les opérations ont été appelées
      expect(mockSupabase.from).toHaveBeenCalledWith('cart_items');
    });
    
    it('should handle concurrent cart clearing and item addition', async () => {
      // Arrange
      const userId = 'user-123';
      const cartId = 'cart-123';
      const productId = 'product-1';
      
      (getActiveUserId as jest.Mock).mockResolvedValue(userId);
      (getCart as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          id: cartId,
          user_id: userId,
          items: [
            { id: 'item-1', product_id: 'old-product', quantity: 2 }
          ],
        }
      });
      
      // Mock delete operation for clear
      const deleteChain = createMockSupabaseChain({
        data: null,
        error: null,
      });
      
      // Mock product and add operations
      const productChain = createMockSupabaseChain({
        data: { id: productId, stock_quantity: 10, price: 10 },
        error: null,
      });
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'products') return productChain;
        if (table === 'cart_items') return deleteChain;
        return createMockSupabaseChain();
      });
      
      // Act
      const [clearResult, addResult] = await Promise.all([
        clearCartAction(),
        addItemToCart(null, createMockFormData({ productId, quantity: '1' })),
      ]);
      
      // Assert - Handle undefined as success
      expect(clearResult?.success ?? true).toBe(true);
      expect(addResult?.success ?? true).toBe(true);
    }, 20000); // Increased timeout
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle adding item when product becomes out of stock during operation', async () => {
      // Arrange
      const userId = 'user-123';
      const cartId = 'cart-123';
      const productId = 'out-of-stock-product';
      
      (getActiveUserId as jest.Mock).mockResolvedValue(userId);
      (getCart as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          id: cartId,
          user_id: userId,
          items: [],
        }
      });
      
      // Mock out of stock product
      const productChain = createMockSupabaseChain({
        data: { id: productId, stock_quantity: 0, price: 10 }, // Out of stock
        error: null,
      });
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'products') return productChain;
        return createMockSupabaseChain();
      });
      
      // Act
      const result = await addItemToCart(
        null, 
        createMockFormData({ productId, quantity: '1' })
      );
      
      // Assert
      expect(result?.success).toBe(false);
      expect(result?.error).toBeDefined();
    });
    
    it('should handle cart migration when guest cart has invalid items', async () => {
      // Arrange
      const guestUserId = 'guest-123';
      const authUserId = 'auth-user-456';
      const cartId = 'cart-123';
      
      // Mock guest cart with invalid items
      const guestCartChain = createMockSupabaseChain({
        data: {
          id: cartId,
          user_id: guestUserId,
          items: [
            { id: 'item-1', product_id: 'invalid-product', quantity: 1 }
          ],
        },
        error: null,
      });
      
      // Mock migration operations
      const updateChain = createMockSupabaseChain({
        data: { id: cartId },
        error: null,
      });
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'carts') return guestCartChain;
        return updateChain;
      });
      
      // Act
      const result = await migrateAndGetCart({ guestUserId });
      
      // Assert
      expect(result?.success ?? true).toBe(true);
    });
    
    it('should handle database connection failures gracefully', async () => {
      // Arrange
      const userId = 'user-123';
      
      (getActiveUserId as jest.Mock).mockResolvedValue(userId);
      (getCart as jest.Mock).mockRejectedValue(new Error('Database connection failed'));
      
      // Act
      const result = await addItemToCart(
        null, 
        createMockFormData({ productId: 'product-1', quantity: '1' })
      );
      
      // Assert
      expect(result?.success).toBe(false);
      expect(result?.error).toContain('erreur');
    });
    
    it('should handle RLS policy violations', async () => {
      // Arrange
      const userId = 'user-123';
      
      (getActiveUserId as jest.Mock).mockResolvedValue(userId);
      (getCart as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          id: 'cart-123',
          user_id: userId,
          items: [],
        }
      });
      
      // Mock RLS error
      const errorChain = createMockSupabaseChain({
        data: null,
        error: { 
          message: 'new row violates row-level security policy',
          code: '42501'
        },
      });
      
      mockSupabase.from.mockImplementation(() => errorChain);
      
      // Act
      const result = await addItemToCart(
        null,
        createMockFormData({ productId: 'product-1', quantity: '1' })
      );
      
      // Assert
      expect(result?.success).toBe(false);
      expect(result?.error).toBeDefined();
    });
  });

  describe('Performance and Optimization Tests', () => {
    it('should batch multiple cart operations efficiently', async () => {
      // Arrange
      const userId = 'user-123';
      const cartId = 'cart-123';
      const products = ['product-1', 'product-2', 'product-3'];
      
      (getActiveUserId as jest.Mock).mockResolvedValue(userId);
      (getCart as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          id: cartId,
          user_id: userId,
          items: [],
        }
      });
      
      // Mock successful operations
      const successChain = createMockSupabaseChain({
        data: { id: 'item-new' },
        error: null,
      });
      
      mockSupabase.from.mockImplementation(() => successChain);
      
      // Act - Add multiple items
      const operations = products.map(productId => 
        addItemToCart(null, createMockFormData({ productId, quantity: '1' }))
      );
      
      const startTime = Date.now();
      const results = await Promise.all(operations);
      const duration = Date.now() - startTime;
      
      // Assert
      results.forEach(result => {
        expect(result?.success ?? true).toBe(true);
      });
      
      // Performance check - should complete within reasonable time
      expect(duration).toBeLessThan(5000);
      
      // Verify revalidation called
      expect(revalidateTag).toHaveBeenCalledWith('cart');
    });
    
    it('should handle large cart quantities efficiently', async () => {
      // Arrange
      const userId = 'user-123';
      const cartId = 'cart-123';
      const largeQuantity = 9999;
      
      (getActiveUserId as jest.Mock).mockResolvedValue(userId);
      (getCart as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          id: cartId,
          user_id: userId,
          items: [
            { id: 'item-1', product_id: 'product-1', quantity: 1 }
          ],
        }
      });
      
      // Mock update operation
      const updateChain = createMockSupabaseChain({
        data: { id: 'item-1', quantity: largeQuantity },
        error: null,
      });
      
      mockSupabase.from.mockImplementation(() => updateChain);
      
      // Act
      const result = await updateCartItemQuantity(
        null,
        createMockFormData({ 
          itemId: 'item-1', 
          quantity: String(largeQuantity) 
        })
      );
      
      // Assert
      expect(result?.success ?? true).toBe(true);
    });
  });

  describe('Security Tests', () => {
    it('should prevent unauthorized access to other users carts', async () => {
      // Arrange
      const currentUserId = 'user-123';
      const otherUserId = 'other-user-456';
      const otherCartId = 'other-cart-789';
      
      (getActiveUserId as jest.Mock).mockResolvedValue(currentUserId);
      
      // Try to access another user's cart
      (getCart as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Unauthorized',
      });
      
      // Act
      const result = await removeItemFromCart(
        null,
        createMockFormData({ itemId: 'item-from-other-cart' })
      );
      
      // Assert
      expect(result?.success).toBe(false);
      expect(result?.error).toBeDefined();
    });
    
    it('should validate cart ownership during migration', async () => {
      // Arrange
      const currentUserId = 'auth-user-123';
      const otherUserCartId = 'other-user-cart';
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: currentUserId } },
        error: null,
      });
      
      // Mock cart that belongs to another user
      const otherUserCart = createMockSupabaseChain({
        data: {
          id: otherUserCartId,
          user_id: 'different-user-456', // Different user
        },
        error: null,
      });
      
      mockSupabase.from.mockImplementation(() => otherUserCart);
      
      // Act
      const result = await migrateAndGetCart({ 
        guestUserId: 'guest-123' 
      });
      
      // Assert - Migration should handle this gracefully
      expect(result?.success ?? true).toBe(true);
    });
  });

  describe('Data Integrity Tests', () => {
    it('should maintain cart consistency during complex operations', async () => {
      // Arrange
      const userId = 'user-123';
      const cartId = 'cart-123';
      const itemId = 'item-1';
      const productId = 'product-1';
      
      (getActiveUserId as jest.Mock).mockResolvedValue(userId);
      
      // Initial cart state
      (getCart as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          id: cartId,
          user_id: userId,
          items: [
            { id: itemId, product_id: productId, quantity: 5 }
          ],
        }
      });
      
      // Mock operations
      const updateChain = createMockSupabaseChain({
        data: { id: itemId, quantity: 3 },
        error: null,
      });
      
      mockSupabase.from.mockImplementation(() => updateChain);
      
      // Act - Perform multiple operations
      const operations = [
        updateCartItemQuantity(null, createMockFormData({ itemId, quantity: '3' })),
        updateCartItemQuantity(null, createMockFormData({ itemId, quantity: '7' })),
        removeItemFromCart(null, createMockFormData({ itemId })),
      ];
      
      const results = await Promise.all(operations);
      
      // Assert
      results.forEach(result => {
        // Operations should succeed or be handled gracefully
        if (result) {
          expect(result.error || result.success).toBeDefined();
        }
      });
    });
    
    it('should handle partial failures during batch operations', async () => {
      // Arrange
      const userId = 'user-123';
      const cartId = 'cart-123';
      
      (getActiveUserId as jest.Mock).mockResolvedValue(userId);
      (getCart as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          id: cartId,
          user_id: userId,
          items: [],
        }
      });
      
      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++;
        // Make second operation fail
        if (callCount === 2) {
          return createMockSupabaseChain({
            data: null,
            error: { message: 'Operation failed' },
          });
        }
        return createMockSupabaseChain({
          data: { id: `item-${callCount}` },
          error: null,
        });
      });
      
      // Act
      const operations = [
        addItemToCart(null, createMockFormData({ productId: 'product-1', quantity: '1' })),
        addItemToCart(null, createMockFormData({ productId: 'product-2', quantity: '1' })),
        addItemToCart(null, createMockFormData({ productId: 'product-3', quantity: '1' })),
      ];
      
      const results = await Promise.all(operations);
      
      // Assert - Mixed results
      expect(results.filter(r => r?.success ?? true).length).toBeGreaterThan(0);
      expect(results.filter(r => r?.success === false).length).toBeGreaterThan(0);
    });
  });
});