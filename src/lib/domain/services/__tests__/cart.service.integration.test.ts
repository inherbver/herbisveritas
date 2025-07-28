/**
 * Cart Domain Service Integration Tests
 * 
 * Tests the entire service layer with real dependency injection
 * and validates all error scenarios properly.
 */

import { beforeEach, describe, expect, it, jest, afterEach } from '@jest/globals';
import { ContainerConfiguration } from '@/lib/infrastructure/container/container.config';
import { SERVICE_TOKENS } from '@/lib/infrastructure/container/container';
import { CartDomainService } from '../cart.service';
import { Cart } from '@/lib/domain/entities/cart.entity';
import { Money } from '@/lib/domain/value-objects/money';
import { Quantity } from '@/lib/domain/value-objects/quantity';
import { ProductReference } from '@/lib/domain/value-objects/product-reference';
import { BusinessError, ValidationError } from '@/lib/core/errors';

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: jest.fn()
}));

// Mock logger
jest.mock('@/lib/core/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  LogUtils: {
    createUserActionContext: jest.fn(() => ({})),
    logOperationStart: jest.fn(),
    logOperationSuccess: jest.fn(),
    logOperationError: jest.fn(),
  }
}));

describe('CartDomainService Integration Tests', () => {
  let container: any;
  let cartService: CartDomainService;
  let mockCartRepository: any;
  let mockProductRepository: any;
  let mockUserRepository: any;
  let mockEventPublisher: any;
  let scope: any;

  beforeEach(async () => {
    // Create mock repositories
    mockCartRepository = {
      findByUserId: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      findByUserIdWithItems: jest.fn(),
    };

    mockProductRepository = {
      findById: jest.fn(),
      existsAndActive: jest.fn(),
      checkStock: jest.fn(),
    };

    mockUserRepository = {
      exists: jest.fn(),
      isActive: jest.fn(),
    };

    mockEventPublisher = {
      publish: jest.fn(),
    };

    // Configure test container with mocks
    const containerResult = ContainerConfiguration.configureTest({
      [SERVICE_TOKENS.CART_REPOSITORY]: mockCartRepository,
      [SERVICE_TOKENS.PRODUCT_REPOSITORY]: mockProductRepository,
      [SERVICE_TOKENS.USER_REPOSITORY]: mockUserRepository,
      [SERVICE_TOKENS.EVENT_PUBLISHER]: mockEventPublisher,
    });

    if (containerResult.isError()) {
      throw new Error(`Failed to create test container: ${containerResult.getError().message}`);
    }

    container = containerResult.getValue();
    scope = container.createScope();
    cartService = scope.resolve<CartDomainService>(SERVICE_TOKENS.CART_DOMAIN_SERVICE);
  });

  afterEach(() => {
    scope?.dispose();
    jest.clearAllMocks();
  });

  describe('addItemToCart', () => {
    const userId = 'user-123';
    const productId = 'product-456';
    const quantity = 2;

    beforeEach(() => {
      // Setup default successful responses
      mockUserRepository.exists.mockResolvedValue({ isError: () => false, getValue: () => true });
      mockUserRepository.isActive.mockResolvedValue({ isError: () => false, getValue: () => true });
      mockProductRepository.existsAndActive.mockResolvedValue({ isError: () => false, getValue: () => true });
      mockProductRepository.checkStock.mockResolvedValue({ isError: () => false, getValue: () => true });
      mockProductRepository.findById.mockResolvedValue({
        isError: () => false,
        getValue: () => new ProductReference(
          productId,
          'Test Product',
          new Money(10.99),
          'test-slug',
          'https://example.com/image.jpg'
        )
      });
    });

    it('should successfully add item to new cart', async () => {
      // Arrange
      mockCartRepository.findByUserId.mockResolvedValue({
        isError: () => false,
        getValue: () => null
      });

      const newCart = new Cart(userId);
      newCart.addItem(
        'cart-item-id',
        new ProductReference(productId, 'Test Product', new Money(10.99), 'test-slug', 'https://example.com/image.jpg'),
        new Quantity(quantity)
      );

      mockCartRepository.save.mockResolvedValue({
        isError: () => false,
        getValue: () => newCart
      });

      // Act
      const result = await cartService.addItemToCart(userId, productId, quantity);

      // Assert
      expect(result.isError()).toBe(false);
      const cart = result.getValue();
      expect(cart.userId).toBe(userId);
      expect(cart.getTotalQuantity().value).toBe(quantity);
      expect(cart.getSubtotal().amount).toBe(10.99 * quantity);

      // Verify repository calls
      expect(mockUserRepository.exists).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.isActive).toHaveBeenCalledWith(userId);
      expect(mockProductRepository.existsAndActive).toHaveBeenCalledWith(productId);
      expect(mockProductRepository.checkStock).toHaveBeenCalledWith(productId, quantity);
      expect(mockCartRepository.findByUserId).toHaveBeenCalledWith(userId);
      expect(mockCartRepository.save).toHaveBeenCalled();
      expect(mockEventPublisher.publish).toHaveBeenCalled();
    });

    it('should successfully add item to existing cart', async () => {
      // Arrange
      const existingCart = new Cart(userId);
      existingCart.addItem(
        'existing-item',
        new ProductReference('other-product', 'Other Product', new Money(5.99), 'other-slug'),
        new Quantity(1)
      );

      mockCartRepository.findByUserId.mockResolvedValue({
        isError: () => false,
        getValue: () => existingCart
      });

      mockCartRepository.save.mockResolvedValue({
        isError: () => false,
        getValue: () => existingCart
      });

      // Act
      const result = await cartService.addItemToCart(userId, productId, quantity);

      // Assert
      expect(result.isError()).toBe(false);
      const cart = result.getValue();
      expect(cart.getItems()).toHaveLength(2);
      expect(cart.getTotalQuantity().value).toBe(3); // 1 + 2
    });

    it('should fail when user does not exist', async () => {
      // Arrange
      mockUserRepository.exists.mockResolvedValue({
        isError: () => false,
        getValue: () => false
      });

      // Act
      const result = await cartService.addItemToCart(userId, productId, quantity);

      // Assert
      expect(result.isError()).toBe(true);
      expect(result.getError()).toBeInstanceOf(BusinessError);
      expect(result.getError().message).toContain('Utilisateur non trouvé');
    });

    it('should fail when user is not active', async () => {
      // Arrange
      mockUserRepository.isActive.mockResolvedValue({
        isError: () => false,
        getValue: () => false
      });

      // Act
      const result = await cartService.addItemToCart(userId, productId, quantity);

      // Assert
      expect(result.isError()).toBe(true);
      expect(result.getError()).toBeInstanceOf(BusinessError);
      expect(result.getError().message).toContain('Compte utilisateur inactif');
    });

    it('should fail when product does not exist or is inactive', async () => {
      // Arrange
      mockProductRepository.existsAndActive.mockResolvedValue({
        isError: () => false,
        getValue: () => false
      });

      // Act
      const result = await cartService.addItemToCart(userId, productId, quantity);

      // Assert
      expect(result.isError()).toBe(true);
      expect(result.getError()).toBeInstanceOf(BusinessError);
      expect(result.getError().message).toContain('Produit non disponible');
    });

    it('should fail when product is out of stock', async () => {
      // Arrange
      mockProductRepository.checkStock.mockResolvedValue({
        isError: () => false,
        getValue: () => false
      });

      // Act
      const result = await cartService.addItemToCart(userId, productId, quantity);

      // Assert
      expect(result.isError()).toBe(true);
      expect(result.getError()).toBeInstanceOf(BusinessError);
      expect(result.getError().message).toContain('Stock insuffisant');
    });

    it('should handle repository errors gracefully', async () => {
      // Arrange
      mockCartRepository.findByUserId.mockResolvedValue({
        isError: () => true,
        getError: () => new Error('Database connection failed')
      });

      // Act
      const result = await cartService.addItemToCart(userId, productId, quantity);

      // Assert
      expect(result.isError()).toBe(true);
      expect(result.getError()).toBeInstanceOf(BusinessError);
      expect(result.getError().message).toContain('Erreur lors de la récupération du panier');
    });

    it('should handle invalid quantity (business rule validation)', async () => {
      // Act
      const result = await cartService.addItemToCart(userId, productId, 0);

      // Assert
      expect(result.isError()).toBe(true);
      expect(result.getError()).toBeInstanceOf(ValidationError);
      expect(result.getError().message).toContain('Quantité invalide');
    });

    it('should handle cart capacity limits', async () => {
      // Arrange
      const cart = new Cart(userId);
      // Add items up to the limit (assuming CART_CONSTRAINTS.MAX_ITEMS = 50)
      for (let i = 0; i < 50; i++) {
        cart.addItem(
          `item-${i}`,
          new ProductReference(`product-${i}`, `Product ${i}`, new Money(1.0), `slug-${i}`),
          new Quantity(1)
        );
      }

      mockCartRepository.findByUserId.mockResolvedValue({
        isError: () => false,
        getValue: () => cart
      });

      // Act
      const result = await cartService.addItemToCart(userId, productId, quantity);

      // Assert
      expect(result.isError()).toBe(true);
      expect(result.getError()).toBeInstanceOf(BusinessError);
      expect(result.getError().message).toContain('Limite d\'articles atteinte');
    });
  });

  describe('removeItemFromCart', () => {
    const userId = 'user-123';
    const cartItemId = 'cart-item-456';

    beforeEach(() => {
      mockUserRepository.exists.mockResolvedValue({ isError: () => false, getValue: () => true });
    });

    it('should successfully remove item from cart', async () => {
      // Arrange
      const cart = new Cart(userId);
      const itemToRemove = cart.addItem(
        cartItemId,
        new ProductReference('product-1', 'Product 1', new Money(10.99), 'product-1'),
        new Quantity(2)
      );

      mockCartRepository.findByUserIdWithItems.mockResolvedValue({
        isError: () => false,
        getValue: () => cart
      });

      mockCartRepository.save.mockResolvedValue({
        isError: () => false,
        getValue: () => cart
      });

      // Act
      const result = await cartService.removeItemFromCart(userId, cartItemId);

      // Assert
      expect(result.isError()).toBe(false);
      const updatedCart = result.getValue();
      expect(updatedCart.getItems()).toHaveLength(0);
      expect(mockCartRepository.save).toHaveBeenCalled();
      expect(mockEventPublisher.publish).toHaveBeenCalled();
    });

    it('should fail when cart not found', async () => {
      // Arrange
      mockCartRepository.findByUserIdWithItems.mockResolvedValue({
        isError: () => false,
        getValue: () => null
      });

      // Act
      const result = await cartService.removeItemFromCart(userId, cartItemId);

      // Assert
      expect(result.isError()).toBe(true);
      expect(result.getError()).toBeInstanceOf(BusinessError);
      expect(result.getError().message).toContain('Panier non trouvé');
    });

    it('should fail when item not found in cart', async () => {
      // Arrange
      const cart = new Cart(userId);
      cart.addItem(
        'different-item',
        new ProductReference('product-1', 'Product 1', new Money(10.99), 'product-1'),
        new Quantity(1)
      );

      mockCartRepository.findByUserIdWithItems.mockResolvedValue({
        isError: () => false,
        getValue: () => cart
      });

      // Act
      const result = await cartService.removeItemFromCart(userId, cartItemId);

      // Assert
      expect(result.isError()).toBe(true);
      expect(result.getError()).toBeInstanceOf(BusinessError);
      expect(result.getError().message).toContain('Article non trouvé dans le panier');
    });
  });

  describe('updateItemQuantity', () => {
    const userId = 'user-123';
    const cartItemId = 'cart-item-456';
    const newQuantity = 5;

    beforeEach(() => {
      mockUserRepository.exists.mockResolvedValue({ isError: () => false, getValue: () => true });
      mockProductRepository.checkStock.mockResolvedValue({ isError: () => false, getValue: () => true });
    });

    it('should successfully update item quantity', async () => {
      // Arrange
      const cart = new Cart(userId);
      cart.addItem(
        cartItemId,
        new ProductReference('product-1', 'Product 1', new Money(10.99), 'product-1'),
        new Quantity(2)
      );

      mockCartRepository.findByUserIdWithItems.mockResolvedValue({
        isError: () => false,
        getValue: () => cart
      });

      mockCartRepository.save.mockResolvedValue({
        isError: () => false,
        getValue: () => cart
      });

      // Act
      const result = await cartService.updateItemQuantity(userId, cartItemId, newQuantity);

      // Assert
      expect(result.isError()).toBe(false);
      const updatedCart = result.getValue();
      const item = updatedCart.getItems().find(i => i.id === cartItemId);
      expect(item?.quantity.value).toBe(newQuantity);
      expect(mockProductRepository.checkStock).toHaveBeenCalledWith('product-1', newQuantity);
    });

    it('should fail when stock is insufficient for new quantity', async () => {
      // Arrange
      const cart = new Cart(userId);
      cart.addItem(
        cartItemId,
        new ProductReference('product-1', 'Product 1', new Money(10.99), 'product-1'),
        new Quantity(2)
      );

      mockCartRepository.findByUserIdWithItems.mockResolvedValue({
        isError: () => false,
        getValue: () => cart
      });

      mockProductRepository.checkStock.mockResolvedValue({
        isError: () => false,
        getValue: () => false
      });

      // Act
      const result = await cartService.updateItemQuantity(userId, cartItemId, newQuantity);

      // Assert
      expect(result.isError()).toBe(true);
      expect(result.getError()).toBeInstanceOf(BusinessError);
      expect(result.getError().message).toContain('Stock insuffisant');
    });
  });

  describe('mergeCarts', () => {
    const fromUserId = 'guest-user';
    const toUserId = 'auth-user';

    beforeEach(() => {
      mockUserRepository.exists.mockResolvedValue({ isError: () => false, getValue: () => true });
    });

    it('should successfully merge carts', async () => {
      // Arrange
      const guestCart = new Cart(fromUserId);
      guestCart.addItem(
        'guest-item',
        new ProductReference('product-1', 'Product 1', new Money(5.99), 'product-1'),
        new Quantity(1)
      );

      const userCart = new Cart(toUserId);
      userCart.addItem(
        'user-item',
        new ProductReference('product-2', 'Product 2', new Money(10.99), 'product-2'),
        new Quantity(2)
      );

      mockCartRepository.findByUserIdWithItems
        .mockResolvedValueOnce({ isError: () => false, getValue: () => guestCart })
        .mockResolvedValueOnce({ isError: () => false, getValue: () => userCart });

      mockCartRepository.save.mockResolvedValue({
        isError: () => false,
        getValue: () => userCart
      });

      mockCartRepository.delete.mockResolvedValue({
        isError: () => false,
        getValue: () => undefined
      });

      // Act
      const result = await cartService.mergeCarts(fromUserId, toUserId);

      // Assert
      expect(result.isError()).toBe(false);
      const mergedCart = result.getValue();
      expect(mergedCart.getItems()).toHaveLength(2);
      expect(mergedCart.userId).toBe(toUserId);
      expect(mockCartRepository.delete).toHaveBeenCalledWith(fromUserId);
      expect(mockEventPublisher.publish).toHaveBeenCalled();
    });

    it('should handle case when guest cart is empty', async () => {
      // Arrange
      mockCartRepository.findByUserIdWithItems
        .mockResolvedValueOnce({ isError: () => false, getValue: () => null })
        .mockResolvedValueOnce({ isError: () => false, getValue: () => new Cart(toUserId) });

      // Act
      const result = await cartService.mergeCarts(fromUserId, toUserId);

      // Assert
      expect(result.isError()).toBe(false);
      expect(mockCartRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('clearCart', () => {
    const userId = 'user-123';

    beforeEach(() => {
      mockUserRepository.exists.mockResolvedValue({ isError: () => false, getValue: () => true });
    });

    it('should successfully clear cart', async () => {
      // Arrange
      const cart = new Cart(userId);
      cart.addItem(
        'item-1',
        new ProductReference('product-1', 'Product 1', new Money(10.99), 'product-1'),
        new Quantity(2)
      );

      mockCartRepository.findByUserIdWithItems.mockResolvedValue({
        isError: () => false,
        getValue: () => cart
      });

      mockCartRepository.save.mockResolvedValue({
        isError: () => false,
        getValue: () => cart
      });

      // Act
      const result = await cartService.clearCart(userId);

      // Assert
      expect(result.isError()).toBe(false);
      const clearedCart = result.getValue();
      expect(clearedCart.getItems()).toHaveLength(0);
      expect(mockEventPublisher.publish).toHaveBeenCalled();
    });

    it('should handle case when cart does not exist', async () => {
      // Arrange
      mockCartRepository.findByUserIdWithItems.mockResolvedValue({
        isError: () => false,
        getValue: () => null
      });

      // Act
      const result = await cartService.clearCart(userId);

      // Assert
      expect(result.isError()).toBe(false);
      const cart = result.getValue();
      expect(cart.isEmpty()).toBe(true);
      expect(cart.userId).toBe(userId);
    });
  });

  describe('getCartByUserId', () => {
    const userId = 'user-123';

    it('should successfully retrieve cart', async () => {
      // Arrange
      const cart = new Cart(userId);
      cart.addItem(
        'item-1',
        new ProductReference('product-1', 'Product 1', new Money(10.99), 'product-1'),
        new Quantity(2)
      );

      mockCartRepository.findByUserIdWithItems.mockResolvedValue({
        isError: () => false,
        getValue: () => cart
      });

      // Act
      const result = await cartService.getCartByUserId(userId);

      // Assert
      expect(result.isError()).toBe(false);
      const retrievedCart = result.getValue();
      expect(retrievedCart?.userId).toBe(userId);
      expect(retrievedCart?.getItems()).toHaveLength(1);
    });

    it('should return null when cart does not exist', async () => {
      // Arrange
      mockCartRepository.findByUserIdWithItems.mockResolvedValue({
        isError: () => false,
        getValue: () => null
      });

      // Act
      const result = await cartService.getCartByUserId(userId);

      // Assert
      expect(result.isError()).toBe(false);
      expect(result.getValue()).toBeNull();
    });

    it('should handle repository errors', async () => {
      // Arrange
      mockCartRepository.findByUserIdWithItems.mockResolvedValue({
        isError: () => true,
        getError: () => new Error('Database error')
      });

      // Act
      const result = await cartService.getCartByUserId(userId);

      // Assert
      expect(result.isError()).toBe(true);
      expect(result.getError()).toBeInstanceOf(BusinessError);
    });
  });
});