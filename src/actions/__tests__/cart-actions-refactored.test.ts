/**
 * Integration tests for refactored cart actions
 */

import { addItemToCart, removeItemFromCart, updateCartItemQuantity } from '../cart-actions-refactored';

// Mock dependencies
jest.mock('@/utils/authUtils');
jest.mock('@/lib/cartReader');
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/core/logger');

const mockGetActiveUserId = jest.requireMock('@/utils/authUtils').getActiveUserId;
const mockGetCart = jest.requireMock('@/lib/cartReader').getCart;
const mockCreateSupabaseServerClient = jest.requireMock('@/lib/supabase/server').createSupabaseServerClient;
const mockLogger = jest.requireMock('@/lib/core/logger').logger;

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        maybeSingle: jest.fn(),
        single: jest.fn(),
      })),
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(),
    })),
    update: jest.fn(() => ({
      eq: jest.fn(),
    })),
  })),
  rpc: jest.fn(),
};

// Mock next/cache
jest.mock('next/cache', () => ({
  revalidateTag: jest.fn(),
}));

describe('Refactored Cart Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateSupabaseServerClient.mockResolvedValue(mockSupabaseClient);
    mockLogger.info = jest.fn();
    mockLogger.error = jest.fn();
  });

  describe('addItemToCart', () => {
    it('should successfully add item to cart', async () => {
      // Setup mocks
      mockGetActiveUserId.mockResolvedValue('user-123');
      
      mockSupabaseClient.from().select().eq().maybeSingle.mockResolvedValue({
        data: { id: 'cart-123' },
        error: null,
      });
      
      mockSupabaseClient.rpc.mockResolvedValue({ error: null });
      
      mockGetCart.mockResolvedValue({
        success: true,
        data: {
          items: [
            {
              id: 'item-123',
              product_id: 'product-123',
              quantity: 2,
              product: {
                name: 'Test Product',
                price: 29.99,
                image_url: 'https://example.com/image.jpg',
                slug: 'test-product',
              },
            },
          ],
        },
      });

      // Create form data
      const formData = new FormData();
      formData.append('productId', 'product-123');
      formData.append('quantity', '2');

      // Execute action
      const result = await addItemToCart(null, formData);

      // Verify result
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.message).toBe('Article ajouté au panier avec succès');

      // Verify database calls
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('add_or_update_cart_item', {
        p_cart_id: 'cart-123',
        p_product_id: 'product-123',
        p_quantity_to_add: 2,
      });

      // Verify logging
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Starting add_item_to_cart'),
        expect.any(Object)
      );
    });

    it('should handle authentication error', async () => {
      mockGetActiveUserId.mockResolvedValue(null);

      const formData = new FormData();
      formData.append('productId', 'product-123');
      formData.append('quantity', '2');

      const result = await addItemToCart(null, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Utilisateur non authentifié');

      // Verify error logging
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      const formData = new FormData();
      formData.append('productId', 'invalid-uuid');
      formData.append('quantity', '2');

      const result = await addItemToCart(null, formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('invalide');
    });

    it('should handle database errors', async () => {
      mockGetActiveUserId.mockResolvedValue('user-123');
      
      mockSupabaseClient.from().select().eq().maybeSingle.mockResolvedValue({
        data: { id: 'cart-123' },
        error: null,
      });
      
      mockSupabaseClient.rpc.mockResolvedValue({
        error: { message: 'Database error', code: 'DB_ERROR' },
      });

      const formData = new FormData();
      formData.append('productId', '123e4567-e89b-12d3-a456-426614174000');
      formData.append('quantity', '2');

      const result = await addItemToCart(null, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Verify error logging
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to complete add_item_to_cart'),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should create new cart if none exists', async () => {
      mockGetActiveUserId.mockResolvedValue('user-123');
      
      // No existing cart
      mockSupabaseClient.from().select().eq().maybeSingle
        .mockResolvedValueOnce({ data: null, error: null });
      
      // Cart creation
      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: { id: 'new-cart-123' },
        error: null,
      });
      
      mockSupabaseClient.rpc.mockResolvedValue({ error: null });
      
      mockGetCart.mockResolvedValue({
        success: true,
        data: { items: [] },
      });

      const formData = new FormData();
      formData.append('productId', '123e4567-e89b-12d3-a456-426614174000');
      formData.append('quantity', '1');

      const result = await addItemToCart(null, formData);

      expect(result.success).toBe(true);
      
      // Verify cart creation
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith({
        user_id: 'user-123',
      });
    });
  });

  describe('removeItemFromCart', () => {
    it('should successfully remove item from cart', async () => {
      mockGetActiveUserId.mockResolvedValue('user-123');
      
      mockSupabaseClient.from().delete().eq.mockResolvedValue({ error: null });
      
      mockGetCart.mockResolvedValue({
        success: true,
        data: { items: [] },
      });

      const result = await removeItemFromCart({
        cartItemId: '123e4567-e89b-12d3-a456-426614174000',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Article supprimé du panier');

      // Verify delete call
      expect(mockSupabaseClient.from().delete().eq).toHaveBeenCalledWith(
        'id',
        '123e4567-e89b-12d3-a456-426614174000'
      );
    });

    it('should handle validation errors', async () => {
      const result = await removeItemFromCart({
        cartItemId: 'invalid-uuid',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('invalide');
    });

    it('should handle database deletion errors', async () => {
      mockGetActiveUserId.mockResolvedValue('user-123');
      
      mockSupabaseClient.from().delete().eq.mockResolvedValue({
        error: { message: 'Delete failed', code: 'DELETE_ERROR' },
      });

      const result = await removeItemFromCart({
        cartItemId: '123e4567-e89b-12d3-a456-426614174000',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('updateCartItemQuantity', () => {
    it('should successfully update item quantity', async () => {
      mockGetActiveUserId.mockResolvedValue('user-123');
      
      mockSupabaseClient.from().update().eq.mockResolvedValue({ error: null });
      
      mockGetCart.mockResolvedValue({
        success: true,
        data: {
          items: [
            {
              id: '123e4567-e89b-12d3-a456-426614174000',
              quantity: 5,
            },
          ],
        },
      });

      const result = await updateCartItemQuantity({
        cartItemId: '123e4567-e89b-12d3-a456-426614174000',
        quantity: 5,
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Quantité mise à jour');

      // Verify update call
      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith({ quantity: 5 });
    });

    it('should remove item when quantity is zero', async () => {
      mockGetActiveUserId.mockResolvedValue('user-123');
      
      mockSupabaseClient.from().delete().eq.mockResolvedValue({ error: null });
      
      mockGetCart.mockResolvedValue({
        success: true,
        data: { items: [] },
      });

      const result = await updateCartItemQuantity({
        cartItemId: '123e4567-e89b-12d3-a456-426614174000',
        quantity: 0,
      });

      expect(result.success).toBe(true);

      // Verify delete was called instead of update
      expect(mockSupabaseClient.from().delete).toHaveBeenCalled();
      expect(mockSupabaseClient.from().update).not.toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      const result = await updateCartItemQuantity({
        cartItemId: 'invalid-uuid',
        quantity: 5,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('invalide');
    });

    it('should handle negative quantities', async () => {
      mockGetActiveUserId.mockResolvedValue('user-123');
      
      mockSupabaseClient.from().delete().eq.mockResolvedValue({ error: null });
      
      mockGetCart.mockResolvedValue({
        success: true,
        data: { items: [] },
      });

      const result = await updateCartItemQuantity({
        cartItemId: '123e4567-e89b-12d3-a456-426614174000',
        quantity: -1,
      });

      expect(result.success).toBe(true);

      // Should treat negative as removal
      expect(mockSupabaseClient.from().delete).toHaveBeenCalled();
    });
  });

  describe('Error handling and logging', () => {
    it('should log operation start and success', async () => {
      mockGetActiveUserId.mockResolvedValue('user-123');
      mockSupabaseClient.from().select().eq().maybeSingle.mockResolvedValue({
        data: { id: 'cart-123' },
        error: null,
      });
      mockSupabaseClient.rpc.mockResolvedValue({ error: null });
      mockGetCart.mockResolvedValue({ success: true, data: { items: [] } });

      const formData = new FormData();
      formData.append('productId', '123e4567-e89b-12d3-a456-426614174000');
      formData.append('quantity', '1');

      await addItemToCart(null, formData);

      // Verify start logging
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Starting add_item_to_cart',
        expect.objectContaining({
          userId: 'unknown', // Initially unknown, updated later
          action: 'add_item_to_cart',
          resource: 'cart',
        })
      );

      // Verify success logging
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Successfully completed add_item_to_cart',
        expect.objectContaining({
          userId: 'user-123',
          action: 'add_item_to_cart',
          resource: 'cart',
        })
      );
    });

    it('should log errors with context', async () => {
      mockGetActiveUserId.mockRejectedValue(new Error('Auth service down'));

      const formData = new FormData();
      formData.append('productId', '123e4567-e89b-12d3-a456-426614174000');
      formData.append('quantity', '1');

      await addItemToCart(null, formData);

      // Verify error logging
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to complete add_item_to_cart',
        expect.any(Error),
        expect.objectContaining({
          action: 'add_item_to_cart',
          resource: 'cart',
        })
      );
    });
  });

  describe('Result Pattern integration', () => {
    it('should return consistent result format for success', async () => {
      mockGetActiveUserId.mockResolvedValue('user-123');
      mockSupabaseClient.from().select().eq().maybeSingle.mockResolvedValue({
        data: { id: 'cart-123' },
        error: null,
      });
      mockSupabaseClient.rpc.mockResolvedValue({ error: null });
      mockGetCart.mockResolvedValue({ success: true, data: { items: [] } });

      const formData = new FormData();
      formData.append('productId', '123e4567-e89b-12d3-a456-426614174000');
      formData.append('quantity', '1');

      const result = await addItemToCart(null, formData);

      expect(result).toMatchObject({
        success: true,
        data: expect.anything(),
        message: expect.any(String),
      });
      expect(result).not.toHaveProperty('error');
    });

    it('should return consistent result format for errors', async () => {
      mockGetActiveUserId.mockResolvedValue(null);

      const formData = new FormData();
      formData.append('productId', '123e4567-e89b-12d3-a456-426614174000');
      formData.append('quantity', '1');

      const result = await addItemToCart(null, formData);

      expect(result).toMatchObject({
        success: false,
        error: expect.any(String),
      });
      expect(result).not.toHaveProperty('data');
      expect(result).not.toHaveProperty('message');
    });
  });
});