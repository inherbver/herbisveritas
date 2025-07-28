/**
 * Cart Repository Integration Tests
 * 
 * Tests the repository layer with mock Supabase client
 * to ensure proper data persistence and retrieval.
 */

import { beforeEach, describe, expect, it, jest, afterEach } from '@jest/globals';
import { SupabaseCartRepository } from '../cart.repository';
import { Cart } from '@/lib/domain/entities/cart.entity';
import { Money } from '@/lib/domain/value-objects/money';
import { Quantity } from '@/lib/domain/value-objects/quantity';
import { ProductReference } from '@/lib/domain/value-objects/product-reference';
import { DatabaseError } from '@/lib/core/errors';

// Mock logger
jest.mock('@/lib/core/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

describe('SupabaseCartRepository Integration Tests', () => {
  let repository: SupabaseCartRepository;
  let mockSupabase: any;

  beforeEach(() => {
    // Create comprehensive Supabase mock
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockReturnThis(),
      rpc: jest.fn().mockReturnThis(),
    };

    repository = new SupabaseCartRepository(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByUserId', () => {
    const userId = 'user-123';

    it('should successfully find cart by user ID', async () => {
      // Arrange
      const mockCartData = {
        id: 'cart-456',
        user_id: userId,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T01:00:00Z'
      };

      mockSupabase.single.mockResolvedValue({
        data: mockCartData,
        error: null
      });

      // Act
      const result = await repository.findByUserId(userId);

      // Assert
      expect(result.isError()).toBe(false);
      const cart = result.getValue();
      expect(cart).toBeInstanceOf(Cart);
      expect(cart.id).toBe(mockCartData.id);
      expect(cart.userId).toBe(userId);

      // Verify Supabase calls
      expect(mockSupabase.from).toHaveBeenCalledWith('carts');
      expect(mockSupabase.select).toHaveBeenCalledWith('id, user_id, created_at, updated_at');
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', userId);
      expect(mockSupabase.single).toHaveBeenCalled();
    });

    it('should return null when cart not found', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' } // Supabase "no rows returned" error
      });

      // Act
      const result = await repository.findByUserId(userId);

      // Assert
      expect(result.isError()).toBe(false);
      expect(result.getValue()).toBeNull();
    });

    it('should handle database errors', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'CONNECTION_ERROR', message: 'Connection failed' }
      });

      // Act
      const result = await repository.findByUserId(userId);

      // Assert
      expect(result.isError()).toBe(true);
      expect(result.getError()).toBeInstanceOf(DatabaseError);
      expect(result.getError().message).toContain('Erreur lors de la récupération du panier');
    });

    it('should handle unexpected errors', async () => {
      // Arrange
      mockSupabase.single.mockRejectedValue(new Error('Unexpected error'));

      // Act
      const result = await repository.findByUserId(userId);

      // Assert
      expect(result.isError()).toBe(true);
      expect(result.getError()).toBeInstanceOf(DatabaseError);
    });
  });

  describe('findByUserIdWithItems', () => {
    const userId = 'user-123';

    it('should successfully find cart with items', async () => {
      // Arrange
      const mockCartWithItems = {
        id: 'cart-456',
        user_id: userId,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T01:00:00Z',
        cart_items: [
          {
            id: 'item-1',
            product_id: 'product-1',
            quantity: 2,
            added_at: '2024-01-01T00:30:00Z',
            products: {
              id: 'product-1',
              name: 'Test Product',
              price: 10.99,
              slug: 'test-product',
              image_url: 'https://example.com/image.jpg'
            }
          }
        ]
      };

      mockSupabase.single.mockResolvedValue({
        data: mockCartWithItems,
        error: null
      });

      // Act
      const result = await repository.findByUserIdWithItems(userId);

      // Assert
      expect(result.isError()).toBe(false);
      const cart = result.getValue();
      expect(cart).toBeInstanceOf(Cart);
      expect(cart.getItems()).toHaveLength(1);

      const item = cart.getItems()[0];
      expect(item.productReference.name).toBe('Test Product');
      expect(item.quantity.value).toBe(2);

      // Verify complex Supabase query
      expect(mockSupabase.select).toHaveBeenCalledWith(`
        id,
        user_id,
        created_at,
        updated_at,
        cart_items (
          id,
          product_id,
          quantity,
          added_at,
          products (
            id,
            name,
            price,
            slug,
            image_url
          )
        )
      `);
    });

    it('should handle cart with no items', async () => {
      // Arrange
      const mockCartWithoutItems = {
        id: 'cart-456',
        user_id: userId,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T01:00:00Z',
        cart_items: []
      };

      mockSupabase.single.mockResolvedValue({
        data: mockCartWithoutItems,
        error: null
      });

      // Act
      const result = await repository.findByUserIdWithItems(userId);

      // Assert
      expect(result.isError()).toBe(false);
      const cart = result.getValue();
      expect(cart).toBeInstanceOf(Cart);
      expect(cart.getItems()).toHaveLength(0);
    });
  });

  describe('save', () => {
    it('should successfully save new cart', async () => {
      // Arrange
      const cart = new Cart('user-123');
      cart.addItem(
        'item-1',
        new ProductReference('product-1', 'Test Product', new Money(10.99), 'test-product'),
        new Quantity(2)
      );

      // Mock cart insert
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'new-cart-id',
          user_id: 'user-123',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        error: null
      });

      // Mock cart items insert
      mockSupabase.select.mockResolvedValueOnce({
        data: [
          {
            id: 'new-item-id',
            cart_id: 'new-cart-id',
            product_id: 'product-1',
            quantity: 2,
            added_at: '2024-01-01T00:00:00Z'
          }
        ],
        error: null
      });

      // Act
      const result = await repository.save(cart);

      // Assert
      expect(result.isError()).toBe(false);
      const savedCart = result.getValue();
      expect(savedCart.id).toBe('new-cart-id');

      // Verify insert operations
      expect(mockSupabase.from).toHaveBeenCalledWith('carts');
      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it('should successfully update existing cart', async () => {
      // Arrange
      const cart = new Cart('user-123');
      cart.id = 'existing-cart-id'; // Simulate existing cart
      cart.addItem(
        'item-1',
        new ProductReference('product-1', 'Test Product', new Money(10.99), 'test-product'),
        new Quantity(3)
      );

      // Mock cart update
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'existing-cart-id',
          user_id: 'user-123',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T01:00:00Z'
        },
        error: null
      });

      // Mock delete existing items
      mockSupabase.eq.mockReturnThis();

      // Mock insert new items
      mockSupabase.select.mockResolvedValueOnce({
        data: [
          {
            id: 'updated-item-id',
            cart_id: 'existing-cart-id',
            product_id: 'product-1',
            quantity: 3,
            added_at: '2024-01-01T01:00:00Z'
          }
        ],
        error: null
      });

      // Act
      const result = await repository.save(cart);

      // Assert
      expect(result.isError()).toBe(false);
      const savedCart = result.getValue();
      expect(savedCart.id).toBe('existing-cart-id');

      // Verify update operation
      expect(mockSupabase.update).toHaveBeenCalled();
    });

    it('should handle save errors', async () => {
      // Arrange
      const cart = new Cart('user-123');
      
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'CONSTRAINT_VIOLATION', message: 'Foreign key violation' }
      });

      // Act
      const result = await repository.save(cart);

      // Assert
      expect(result.isError()).toBe(true);
      expect(result.getError()).toBeInstanceOf(DatabaseError);
      expect(result.getError().message).toContain('Erreur lors de la sauvegarde du panier');
    });
  });

  describe('delete', () => {
    const userId = 'user-123';

    it('should successfully delete cart', async () => {
      // Arrange
      mockSupabase.eq.mockReturnThis();

      // Act
      const result = await repository.delete(userId);

      // Assert
      expect(result.isError()).toBe(false);

      // Verify delete operation
      expect(mockSupabase.from).toHaveBeenCalledWith('carts');
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', userId);
    });

    it('should handle delete errors', async () => {
      // Arrange
      mockSupabase.eq.mockRejectedValue(new Error('Delete failed'));

      // Act
      const result = await repository.delete(userId);

      // Assert
      expect(result.isError()).toBe(true);
      expect(result.getError()).toBeInstanceOf(DatabaseError);
      expect(result.getError().message).toContain('Erreur lors de la suppression du panier');
    });
  });

  describe('Edge cases and error scenarios', () => {
    it('should handle malformed cart data from database', async () => {
      // Arrange
      const malformedData = {
        id: 'cart-456',
        user_id: null, // Invalid: missing user_id
        created_at: 'invalid-date',
        updated_at: null
      };

      mockSupabase.single.mockResolvedValue({
        data: malformedData,
        error: null
      });

      // Act
      const result = await repository.findByUserId('user-123');

      // Assert
      expect(result.isError()).toBe(true);
      expect(result.getError()).toBeInstanceOf(DatabaseError);
    });

    it('should handle malformed cart items data', async () => {
      // Arrange
      const malformedCartWithItems = {
        id: 'cart-456',
        user_id: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T01:00:00Z',
        cart_items: [
          {
            id: 'item-1',
            product_id: null, // Invalid: missing product_id
            quantity: 'invalid', // Invalid: not a number
            added_at: '2024-01-01T00:30:00Z',
            products: null // Invalid: missing product data
          }
        ]
      };

      mockSupabase.single.mockResolvedValue({
        data: malformedCartWithItems,
        error: null
      });

      // Act
      const result = await repository.findByUserIdWithItems('user-123');

      // Assert
      expect(result.isError()).toBe(true);
      expect(result.getError()).toBeInstanceOf(DatabaseError);
    });

    it('should handle very large carts efficiently', async () => {
      // Arrange
      const largeCartData = {
        id: 'cart-456',
        user_id: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T01:00:00Z',
        cart_items: Array.from({ length: 100 }, (_, i) => ({
          id: `item-${i}`,
          product_id: `product-${i}`,
          quantity: i + 1,
          added_at: '2024-01-01T00:30:00Z',
          products: {
            id: `product-${i}`,
            name: `Product ${i}`,
            price: 10.99 + i,
            slug: `product-${i}`,
            image_url: `https://example.com/image-${i}.jpg`
          }
        }))
      };

      mockSupabase.single.mockResolvedValue({
        data: largeCartData,
        error: null
      });

      // Act
      const startTime = Date.now();
      const result = await repository.findByUserIdWithItems('user-123');
      const endTime = Date.now();

      // Assert
      expect(result.isError()).toBe(false);
      const cart = result.getValue();
      expect(cart.getItems()).toHaveLength(100);
      
      // Performance assertion (should complete within reasonable time)
      expect(endTime - startTime).toBeLessThan(1000); // 1 second
    });

    it('should handle concurrent save operations', async () => {
      // Arrange
      const cart1 = new Cart('user-123');
      const cart2 = new Cart('user-456');
      
      cart1.addItem(
        'item-1',
        new ProductReference('product-1', 'Product 1', new Money(10.99), 'product-1'),
        new Quantity(1)
      );
      
      cart2.addItem(
        'item-2',
        new ProductReference('product-2', 'Product 2', new Money(15.99), 'product-2'),
        new Quantity(2)
      );

      // Mock successful saves
      mockSupabase.single
        .mockResolvedValueOnce({
          data: { id: 'cart-1', user_id: 'user-123', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
          error: null
        })
        .mockResolvedValueOnce({
          data: { id: 'cart-2', user_id: 'user-456', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
          error: null
        });

      mockSupabase.select
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null });

      // Act
      const [result1, result2] = await Promise.all([
        repository.save(cart1),
        repository.save(cart2)
      ]);

      // Assert
      expect(result1.isError()).toBe(false);
      expect(result2.isError()).toBe(false);
      expect(result1.getValue().userId).toBe('user-123');
      expect(result2.getValue().userId).toBe('user-456');
    });
  });
});