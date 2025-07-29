/**
 * Cart Actions V2 Integration Tests
 * 
 * Tests the complete Server Actions flow with dependency injection,
 * validation coordination, and domain services.
 */

import { beforeEach, describe, expect, it, jest, afterEach } from '@jest/globals';
import { 
  addItemToCartV2,
  removeItemFromCartV2,
  updateCartItemQuantityV2,
  clearCartV2,
  getCartV2,
  mergeCartsV2
} from '../cart-actions-v2';
// import { ContainerConfiguration } from '@/lib/infrastructure/container/container.config';
// import { SERVICE_TOKENS } from '@/lib/infrastructure/container/container';
import { Cart } from '@/lib/domain/entities/cart.entity';
import { Money } from '@/lib/domain/value-objects/money';
import { Quantity } from '@/lib/domain/value-objects/quantity';
import { ProductReference } from '@/lib/domain/value-objects/product-reference';
import { BusinessError } from '@/lib/core/errors';

// Mock external dependencies
jest.mock('@/utils/authUtils', () => ({
  getActiveUserId: jest.fn()
}));

jest.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: jest.fn()
}));

jest.mock('next/cache', () => ({
  revalidateTag: jest.fn()
}));

jest.mock('@/lib/core/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  LogUtils: {
    createUserActionContext: jest.fn(() => ({ userId: 'unknown' })),
    logOperationStart: jest.fn(),
    logOperationSuccess: jest.fn(),
    logOperationError: jest.fn(),
  }
}));

// Mock container configuration
jest.mock('@/lib/infrastructure/container/container.config', () => ({
  createRequestScopedContainer: jest.fn(),
  SERVICE_TOKENS: {
    CART_DOMAIN_SERVICE: 'CartDomainService'
  }
}));

describe('Cart Actions V2 Integration Tests', () => {
  let mockGetActiveUserId: jest.Mock;
  let mockCreateSupabaseServerClient: jest.Mock;
  let mockCreateRequestScopedContainer: jest.Mock;
  let mockCartDomainService: unknown;
  let mockScope: unknown;
  let mockSupabase: unknown;

  const mockUserId = 'user-123';
  const mockProductId = 'product-456';

  beforeEach(() => {
    // Setup mocks
    const authUtils = jest.requireActual('@/utils/authUtils');
    const supabaseServer = jest.requireActual('@/lib/supabase/server');
    const containerConfig = jest.requireActual('@/lib/infrastructure/container/container.config');
    
    mockGetActiveUserId = authUtils.getActiveUserId as jest.Mock;
    mockCreateSupabaseServerClient = supabaseServer.createSupabaseServerClient as jest.Mock;
    mockCreateRequestScopedContainer = containerConfig.createRequestScopedContainer as jest.Mock;

    // Mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    // Mock cart domain service
    mockCartDomainService = {
      addItemToCart: jest.fn(),
      removeItemFromCart: jest.fn(),
      updateItemQuantity: jest.fn(),
      clearCart: jest.fn(),
      getCartByUserId: jest.fn(),
      mergeCarts: jest.fn(),
    };

    // Mock scope
    mockScope = {
      resolve: jest.fn().mockReturnValue(mockCartDomainService),
      dispose: jest.fn(),
    };

    // Setup default mock implementations
    mockCreateSupabaseServerClient.mockResolvedValue(mockSupabase);
    mockGetActiveUserId.mockResolvedValue(mockUserId);
    mockCreateRequestScopedContainer.mockResolvedValue({
      container: {},
      scope: mockScope
    });

    // Mock user profile lookup
    mockSupabase.single.mockResolvedValue({
      data: { role: 'user' },
      error: null
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addItemToCartV2', () => {
    it('should successfully add item to cart', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('productId', mockProductId);
      formData.append('quantity', '2');

      // Mock product details lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: mockProductId,
          name: 'Test Product',
          price: 10.99,
          stock: 10,
          slug: 'test-product',
          image_url: 'https://example.com/image.jpg',
          is_active: true
        },
        error: null
      });

      const mockCart = new Cart(mockUserId);
      mockCart.id = 'cart-123';
      mockCart.addItem(
        'item-1',
        new ProductReference(mockProductId, 'Test Product', new Money(10.99), 'test-product', 'https://example.com/image.jpg'),
        new Quantity(2)
      );

      mockCartDomainService.addItemToCart.mockResolvedValue({
        isError: () => false,
        getValue: () => mockCart
      });

      // Act
      const result = await addItemToCartV2({}, formData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.id).toBe('cart-123');
      expect(result.data.items).toHaveLength(1);
      expect(result.data.totalItems).toBe(2);
      expect(result.message).toBe('Article ajouté au panier avec succès');

      // Verify service calls
      expect(mockCartDomainService.addItemToCart).toHaveBeenCalledWith(mockUserId, mockProductId, 2);
      expect(mockScope.dispose).toHaveBeenCalled();
    });

    it('should fail when user is not authenticated', async () => {
      // Arrange
      mockGetActiveUserId.mockResolvedValue(null);
      const formData = new FormData();
      formData.append('productId', mockProductId);
      formData.append('quantity', '1');

      // Act
      const result = await addItemToCartV2({}, formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentification requise');
      expect(mockCartDomainService.addItemToCart).not.toHaveBeenCalled();
    });

    it('should fail when product ID is missing', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('quantity', '1');

      // Act
      const result = await addItemToCartV2({}, formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('ID produit requis');
    });

    it('should fail when product is not found', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('productId', mockProductId);
      formData.append('quantity', '1');

      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });

      // Act
      const result = await addItemToCartV2({}, formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Produit non trouvé');
    });

    it('should handle domain service errors', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('productId', mockProductId);
      formData.append('quantity', '1');

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: mockProductId,
          name: 'Test Product',
          price: 10.99,
          stock: 10,
          slug: 'test-product',
          image_url: 'https://example.com/image.jpg',
          is_active: true
        },
        error: null
      });

      mockCartDomainService.addItemToCart.mockResolvedValue({
        isError: () => true,
        getError: () => new BusinessError('Stock insuffisant pour ce produit')
      });

      // Act
      const result = await addItemToCartV2({}, formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Stock insuffisant');
      expect(mockScope.dispose).not.toHaveBeenCalled(); // Should not dispose on error
    });

    it('should handle validation errors', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('productId', mockProductId);
      formData.append('quantity', '0'); // Invalid quantity

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: mockProductId,
          name: 'Test Product',
          price: 10.99,
          stock: 10,
          slug: 'test-product',
          image_url: 'https://example.com/image.jpg',
          is_active: true
        },
        error: null
      });

      // Act
      const result = await addItemToCartV2({}, formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Données invalides');
    });

    it('should handle unexpected errors gracefully', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('productId', mockProductId);
      formData.append('quantity', '1');

      mockGetActiveUserId.mockRejectedValue(new Error('Unexpected auth error'));

      // Act
      const result = await addItemToCartV2({}, formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Une erreur inattendue s\'est produite');
    });
  });

  describe('removeItemFromCartV2', () => {
    const cartItemId = 'cart-item-123';

    it('should successfully remove item from cart', async () => {
      // Arrange
      const mockCart = new Cart(mockUserId);
      mockCart.id = 'cart-123';

      mockCartDomainService.removeItemFromCart.mockResolvedValue({
        isError: () => false,
        getValue: () => mockCart
      });

      // Act
      const result = await removeItemFromCartV2({ cartItemId });

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.message).toBe('Article supprimé du panier');
      expect(mockCartDomainService.removeItemFromCart).toHaveBeenCalledWith(mockUserId, cartItemId);
      expect(mockScope.dispose).toHaveBeenCalled();
    });

    it('should fail when user is not authenticated', async () => {
      // Arrange
      mockGetActiveUserId.mockResolvedValue(null);

      // Act
      const result = await removeItemFromCartV2({ cartItemId });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentification requise');
    });

    it('should handle domain service errors', async () => {
      // Arrange
      mockCartDomainService.removeItemFromCart.mockResolvedValue({
        isError: () => true,
        getError: () => new BusinessError('Article non trouvé dans le panier')
      });

      // Act
      const result = await removeItemFromCartV2({ cartItemId });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Article non trouvé');
      expect(mockScope.dispose).toHaveBeenCalled(); // Should dispose even on error
    });
  });

  describe('updateCartItemQuantityV2', () => {
    const cartItemId = 'cart-item-123';
    const newQuantity = 3;

    it('should successfully update item quantity', async () => {
      // Arrange
      const mockCart = new Cart(mockUserId);
      mockCart.id = 'cart-123';

      mockCartDomainService.updateItemQuantity.mockResolvedValue({
        isError: () => false,
        getValue: () => mockCart
      });

      // Act
      const result = await updateCartItemQuantityV2({ cartItemId, quantity: newQuantity });

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.message).toBe('Quantité mise à jour');
      expect(mockCartDomainService.updateItemQuantity).toHaveBeenCalledWith(mockUserId, cartItemId, newQuantity);
    });

    it('should handle stock validation errors', async () => {
      // Arrange
      mockCartDomainService.updateItemQuantity.mockResolvedValue({
        isError: () => true,
        getError: () => new BusinessError('Stock insuffisant pour cette quantité')
      });

      // Act
      const result = await updateCartItemQuantityV2({ cartItemId, quantity: newQuantity });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Stock insuffisant');
    });
  });

  describe('clearCartV2', () => {
    it('should successfully clear cart', async () => {
      // Arrange
      const mockCart = new Cart(mockUserId);
      mockCart.id = 'cart-123';

      mockCartDomainService.clearCart.mockResolvedValue({
        isError: () => false,
        getValue: () => mockCart
      });

      // Act
      const result = await clearCartV2();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.items).toEqual([]);
      expect(result.data.totalItems).toBe(0);
      expect(result.message).toBe('Panier vidé avec succès');
      expect(mockCartDomainService.clearCart).toHaveBeenCalledWith(mockUserId);
    });

    it('should fail when user is not authenticated', async () => {
      // Arrange
      mockGetActiveUserId.mockResolvedValue(null);

      // Act
      const result = await clearCartV2();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentification requise');
    });
  });

  describe('getCartV2', () => {
    it('should successfully retrieve cart', async () => {
      // Arrange
      const mockCart = new Cart(mockUserId);
      mockCart.id = 'cart-123';
      mockCart.addItem(
        'item-1',
        new ProductReference(mockProductId, 'Test Product', new Money(10.99), 'test-product'),
        new Quantity(1)
      );

      mockCartDomainService.getCartByUserId.mockResolvedValue({
        isError: () => false,
        getValue: () => mockCart
      });

      // Act
      const result = await getCartV2();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.id).toBe('cart-123');
      expect(result.data.items).toHaveLength(1);
      expect(mockCartDomainService.getCartByUserId).toHaveBeenCalledWith(mockUserId);
    });

    it('should handle empty cart', async () => {
      // Arrange
      mockCartDomainService.getCartByUserId.mockResolvedValue({
        isError: () => false,
        getValue: () => null
      });

      // Act
      const result = await getCartV2();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.id).toBeNull();
      expect(result.data.items).toEqual([]);
      expect(result.data.totalItems).toBe(0);
    });

    it('should handle domain service errors', async () => {
      // Arrange
      mockCartDomainService.getCartByUserId.mockResolvedValue({
        isError: () => true,
        getError: () => new BusinessError('Erreur de récupération')
      });

      // Act
      const result = await getCartV2();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Erreur de récupération');
    });
  });

  describe('mergeCartsV2', () => {
    const guestUserId = 'guest-123';

    it('should successfully merge carts', async () => {
      // Arrange
      const mockMergedCart = new Cart(mockUserId);
      mockMergedCart.id = 'merged-cart-123';
      mockMergedCart.addItem(
        'item-1',
        new ProductReference(mockProductId, 'Test Product', new Money(10.99), 'test-product'),
        new Quantity(2)
      );

      mockCartDomainService.mergeCarts.mockResolvedValue({
        isError: () => false,
        getValue: () => mockMergedCart
      });

      // Act
      const result = await mergeCartsV2({ guestUserId });

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.id).toBe('merged-cart-123');
      expect(result.message).toBe('Paniers fusionnés avec succès');
      expect(mockCartDomainService.mergeCarts).toHaveBeenCalledWith(guestUserId, mockUserId);
    });

    it('should handle merge validation errors', async () => {
      // Arrange
      mockCartDomainService.mergeCarts.mockResolvedValue({
        isError: () => true,
        getError: () => new BusinessError('Impossible de fusionner les paniers')
      });

      // Act
      const result = await mergeCartsV2({ guestUserId });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Impossible de fusionner');
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle container resolution failures', async () => {
      // Arrange
      mockCreateRequestScopedContainer.mockRejectedValue(new Error('Container error'));
      const formData = new FormData();
      formData.append('productId', mockProductId);
      formData.append('quantity', '1');

      // Act
      const result = await addItemToCartV2({}, formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Une erreur inattendue s\'est produite');
    });

    it('should handle profile lookup failures', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Profile not found' }
      });
      
      const formData = new FormData();
      formData.append('productId', mockProductId);
      formData.append('quantity', '1');

      // Act
      const result = await addItemToCartV2({}, formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Erreur lors de la vérification de l\'utilisateur');
    });

    it('should properly dispose scoped services on success', async () => {
      // Arrange
      const mockCart = new Cart(mockUserId);
      mockCartDomainService.clearCart.mockResolvedValue({
        isError: () => false,
        getValue: () => mockCart
      });

      // Act
      await clearCartV2();

      // Assert
      expect(mockScope.dispose).toHaveBeenCalled();
    });

    it('should handle concurrent action calls safely', async () => {
      // Arrange
      const formData1 = new FormData();
      formData1.append('productId', 'product-1');
      formData1.append('quantity', '1');

      const formData2 = new FormData();
      formData2.append('productId', 'product-2');
      formData2.append('quantity', '2');

      // Mock product details for both products
      mockSupabase.single
        .mockResolvedValueOnce({ // First product lookup
          data: {
            id: 'product-1',
            name: 'Product 1',
            price: 10.99,
            stock: 10,
            slug: 'product-1',
            image_url: 'https://example.com/image1.jpg',
            is_active: true
          },
          error: null
        })
        .mockResolvedValueOnce({ // Second product lookup
          data: {
            id: 'product-2',
            name: 'Product 2',
            price: 15.99,
            stock: 5,
            slug: 'product-2',
            image_url: 'https://example.com/image2.jpg',
            is_active: true
          },
          error: null
        });

      const mockCart1 = new Cart(mockUserId);
      const mockCart2 = new Cart(mockUserId);

      mockCartDomainService.addItemToCart
        .mockResolvedValueOnce({ isError: () => false, getValue: () => mockCart1 })
        .mockResolvedValueOnce({ isError: () => false, getValue: () => mockCart2 });

      // Act
      const [result1, result2] = await Promise.all([
        addItemToCartV2({}, formData1),
        addItemToCartV2({}, formData2)
      ]);

      // Assert
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(mockScope.dispose).toHaveBeenCalledTimes(2);
    });
  });
});