/**
 * Tests for Cart Domain Service
 */

import { CartDomainService } from "../cart.service";
import { Result } from "@/lib/core/result";
import { BusinessError, NotFoundError, ValidationError } from "@/lib/core/errors";
import { Cart, CartItem, Money, Quantity, ProductReference } from "@/entities/cart.entity";

// Mock repositories and dependencies
const mockCartRepository = {
  findByUserId: jest.fn(),
  findById: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
};

const mockProductRepository = {
  findById: jest.fn(),
  findByIds: jest.fn(),
  updateStock: jest.fn(),
};

const mockUserRepository = {
  exists: jest.fn(),
  isActive: jest.fn(),
};

const mockEventPublisher = {
  publish: jest.fn(),
};

// Mock product data
const mockProduct = {
  id: "prod-1",
  name: "Test Product",
  slug: "test-product",
  price: new Money(29.99, "EUR"),
  stock: new Quantity(100),
  isActive: true,
  imageUrl: "test.jpg",
};

// Mock cart data
const createMockCart = (userId: string, items = []) => {
  const cart = new Cart(`cart-${userId}`, userId);
  // Add mock methods
  cart.getItemById = jest.fn((itemId) => items.find((item) => item.id === itemId));
  cart.getItemByProductId = jest.fn((productId) =>
    items.find((item) => item.productReference?.id === productId)
  );
  cart.addItem = jest.fn(() => Result.ok(cart));
  cart.removeItem = jest.fn(() => Result.ok(cart));
  cart.updateItemQuantity = jest.fn(() => Result.ok(cart));
  cart.clear = jest.fn(() => cart);
  cart.getTotalAmount = jest.fn(() => new Money(29.99, "EUR"));
  cart.getTotalItems = jest.fn(() => items.length);
  cart.isEmpty = jest.fn(() => items.length === 0);
  cart.getItems = jest.fn(() => items);
  return cart;
};

describe("CartDomainService", () => {
  let cartService: CartDomainService;

  beforeEach(() => {
    jest.clearAllMocks();
    cartService = new CartDomainService(
      mockCartRepository,
      mockProductRepository,
      mockUserRepository,
      mockEventPublisher
    );
  });

  describe("addItemToCart", () => {
    it("should add item to cart successfully", async () => {
      const userId = "user-123";
      const productId = "prod-1";
      const quantity = 2;

      // Setup mocks
      mockUserRepository.exists.mockResolvedValue(Result.ok(true));
      mockUserRepository.isActive.mockResolvedValue(Result.ok(true));
      mockProductRepository.findById.mockResolvedValue(Result.ok(mockProduct));

      const mockCart = createMockCart(userId);
      mockCartRepository.findByUserId.mockResolvedValue(Result.ok(mockCart));
      mockCartRepository.save.mockResolvedValue(Result.ok(mockCart));

      // Execute
      const result = await cartService.addItemToCart(userId, productId, quantity);

      // Assert
      expect(result.isError()).toBe(false);
      expect(mockUserRepository.exists).toHaveBeenCalledWith(userId);
      expect(mockProductRepository.findById).toHaveBeenCalledWith(productId);
      expect(mockCart.addItem).toHaveBeenCalled();
      expect(mockCartRepository.save).toHaveBeenCalled();
      expect(mockEventPublisher.publish).toHaveBeenCalled();
    });

    it("should create new cart if user has no cart", async () => {
      const userId = "user-new";
      const productId = "prod-1";
      const quantity = 1;

      // Setup mocks
      mockUserRepository.exists.mockResolvedValue(Result.ok(true));
      mockUserRepository.isActive.mockResolvedValue(Result.ok(true));
      mockProductRepository.findById.mockResolvedValue(Result.ok(mockProduct));
      mockCartRepository.findByUserId.mockResolvedValue(Result.ok(null));

      const newCart = createMockCart(userId);
      mockCartRepository.save.mockResolvedValue(Result.ok(newCart));

      // Execute
      const result = await cartService.addItemToCart(userId, productId, quantity);

      // Assert
      expect(result.isError()).toBe(false);
      expect(mockCartRepository.save).toHaveBeenCalled();
    });

    it("should fail if user does not exist", async () => {
      const userId = "user-invalid";
      const productId = "prod-1";
      const quantity = 1;

      // Setup mocks
      mockUserRepository.exists.mockResolvedValue(Result.ok(false));

      // Execute
      const result = await cartService.addItemToCart(userId, productId, quantity);

      // Assert
      expect(result.isError()).toBe(true);
      expect(result.getError()).toBeInstanceOf(NotFoundError);
      expect(mockProductRepository.findById).not.toHaveBeenCalled();
    });

    it("should fail if user is not active", async () => {
      const userId = "user-inactive";
      const productId = "prod-1";
      const quantity = 1;

      // Setup mocks
      mockUserRepository.exists.mockResolvedValue(Result.ok(true));
      mockUserRepository.isActive.mockResolvedValue(Result.ok(false));

      // Execute
      const result = await cartService.addItemToCart(userId, productId, quantity);

      // Assert
      expect(result.isError()).toBe(true);
      expect(result.getError()).toBeInstanceOf(BusinessError);
    });

    it("should fail if product does not exist", async () => {
      const userId = "user-123";
      const productId = "prod-invalid";
      const quantity = 1;

      // Setup mocks
      mockUserRepository.exists.mockResolvedValue(Result.ok(true));
      mockUserRepository.isActive.mockResolvedValue(Result.ok(true));
      mockProductRepository.findById.mockResolvedValue(Result.ok(null));

      // Execute
      const result = await cartService.addItemToCart(userId, productId, quantity);

      // Assert
      expect(result.isError()).toBe(true);
      expect(result.getError()).toBeInstanceOf(NotFoundError);
    });

    it("should fail if quantity is invalid", async () => {
      const userId = "user-123";
      const productId = "prod-1";
      const quantity = -1;

      // Setup mocks
      mockUserRepository.exists.mockResolvedValue(Result.ok(true));
      mockUserRepository.isActive.mockResolvedValue(Result.ok(true));
      mockProductRepository.findById.mockResolvedValue(Result.ok(mockProduct));

      // Execute
      const result = await cartService.addItemToCart(userId, productId, quantity);

      // Assert
      expect(result.isError()).toBe(true);
      expect(result.getError()).toBeInstanceOf(ValidationError);
    });

    it("should fail if quantity exceeds stock", async () => {
      const userId = "user-123";
      const productId = "prod-1";
      const quantity = 200; // More than stock

      // Setup mocks
      mockUserRepository.exists.mockResolvedValue(Result.ok(true));
      mockUserRepository.isActive.mockResolvedValue(Result.ok(true));
      mockProductRepository.findById.mockResolvedValue(Result.ok(mockProduct));

      const mockCart = createMockCart(userId);
      mockCart.addItem.mockReturnValue(
        Result.error(new BusinessError("Quantité insuffisante en stock"))
      );
      mockCartRepository.findByUserId.mockResolvedValue(Result.ok(mockCart));

      // Execute
      const result = await cartService.addItemToCart(userId, productId, quantity);

      // Assert
      expect(result.isError()).toBe(true);
      expect(result.getError()).toBeInstanceOf(BusinessError);
    });
  });

  describe("removeItemFromCart", () => {
    it("should remove item from cart successfully", async () => {
      const userId = "user-123";
      const itemId = "item-1";
      const items = [new CartItem("item-1", mockProduct, new Quantity(2))];

      // Setup mocks
      mockUserRepository.exists.mockResolvedValue(Result.ok(true));
      mockUserRepository.isActive.mockResolvedValue(Result.ok(true));

      const mockCart = createMockCart(userId, items);
      mockCart.getItemById.mockReturnValue(items[0]);
      mockCartRepository.findByUserId.mockResolvedValue(Result.ok(mockCart));
      mockCartRepository.save.mockResolvedValue(Result.ok(mockCart));

      // Execute
      const result = await cartService.removeItemFromCart(userId, itemId);

      // Assert
      expect(result.isError()).toBe(false);
      expect(mockCart.removeItem).toHaveBeenCalledWith(itemId);
      expect(mockCartRepository.save).toHaveBeenCalled();
      expect(mockEventPublisher.publish).toHaveBeenCalled();
    });

    it("should fail if cart does not exist", async () => {
      const userId = "user-no-cart";
      const itemId = "item-1";

      // Setup mocks
      mockUserRepository.exists.mockResolvedValue(Result.ok(true));
      mockUserRepository.isActive.mockResolvedValue(Result.ok(true));
      mockCartRepository.findByUserId.mockResolvedValue(Result.ok(null));

      // Execute
      const result = await cartService.removeItemFromCart(userId, itemId);

      // Assert
      expect(result.isError()).toBe(true);
      expect(result.getError()).toBeInstanceOf(NotFoundError);
    });

    it("should fail if item does not exist in cart", async () => {
      const userId = "user-123";
      const itemId = "item-invalid";

      // Setup mocks
      mockUserRepository.exists.mockResolvedValue(Result.ok(true));
      mockUserRepository.isActive.mockResolvedValue(Result.ok(true));

      const mockCart = createMockCart(userId, []);
      mockCart.getItemById.mockReturnValue(null);
      mockCartRepository.findByUserId.mockResolvedValue(Result.ok(mockCart));

      // Execute
      const result = await cartService.removeItemFromCart(userId, itemId);

      // Assert
      expect(result.isError()).toBe(true);
      expect(result.getError()).toBeInstanceOf(NotFoundError);
    });
  });

  describe("updateItemQuantity", () => {
    it("should update item quantity successfully", async () => {
      const userId = "user-123";
      const itemId = "item-1";
      const newQuantity = 5;
      const items = [new CartItem("item-1", mockProduct, new Quantity(2))];

      // Setup mocks
      mockUserRepository.exists.mockResolvedValue(Result.ok(true));
      mockUserRepository.isActive.mockResolvedValue(Result.ok(true));
      mockProductRepository.findById.mockResolvedValue(Result.ok(mockProduct));

      const mockCart = createMockCart(userId, items);
      mockCart.getItemById.mockReturnValue(items[0]);
      mockCartRepository.findByUserId.mockResolvedValue(Result.ok(mockCart));
      mockCartRepository.save.mockResolvedValue(Result.ok(mockCart));

      // Execute
      const result = await cartService.updateItemQuantity(userId, itemId, newQuantity);

      // Assert
      expect(result.isError()).toBe(false);
      expect(mockCart.updateItemQuantity).toHaveBeenCalled();
      expect(mockCartRepository.save).toHaveBeenCalled();
      expect(mockEventPublisher.publish).toHaveBeenCalled();
    });

    it("should remove item if quantity is zero", async () => {
      const userId = "user-123";
      const itemId = "item-1";
      const newQuantity = 0;
      const items = [new CartItem("item-1", mockProduct, new Quantity(2))];

      // Setup mocks
      mockUserRepository.exists.mockResolvedValue(Result.ok(true));
      mockUserRepository.isActive.mockResolvedValue(Result.ok(true));

      const mockCart = createMockCart(userId, items);
      mockCart.getItemById.mockReturnValue(items[0]);
      // When updateItemQuantity is called with 0, it returns the result of removeItem
      mockCart.updateItemQuantity.mockReturnValue(Result.ok(mockCart));
      mockCartRepository.findByUserId.mockResolvedValue(Result.ok(mockCart));
      mockCartRepository.save.mockResolvedValue(Result.ok(mockCart));

      // Execute
      const result = await cartService.updateItemQuantity(userId, itemId, newQuantity);

      // Assert
      expect(result.isError()).toBe(false);
      expect(mockCart.updateItemQuantity).toHaveBeenCalledWith(itemId, expect.any(Quantity));
    });
  });

  describe("clearCart", () => {
    it("should clear cart successfully", async () => {
      const userId = "user-123";
      const mockProduct2 = { ...mockProduct, id: "prod-2", price: new Money(19.99, "EUR") };
      const items = [
        new CartItem("item-1", mockProduct, new Quantity(2)),
        new CartItem("item-2", mockProduct2, new Quantity(1)),
      ];

      // Setup mocks
      mockUserRepository.exists.mockResolvedValue(Result.ok(true));
      mockUserRepository.isActive.mockResolvedValue(Result.ok(true));

      const mockCart = createMockCart(userId, items);
      mockCartRepository.findByUserId.mockResolvedValue(Result.ok(mockCart));
      mockCartRepository.save.mockResolvedValue(Result.ok(mockCart));

      // Execute
      const result = await cartService.clearCart(userId);

      // Assert
      expect(result.isError()).toBe(false);
      expect(mockCart.clear).toHaveBeenCalled();
      expect(mockCartRepository.save).toHaveBeenCalled();
    });
  });

  describe("getCartByUserId", () => {
    it("should return cart successfully", async () => {
      const userId = "user-123";
      const mockProduct2 = { ...mockProduct, id: "prod-2", price: new Money(19.99, "EUR") };
      const items = [
        new CartItem("item-1", mockProduct, new Quantity(2)),
        new CartItem("item-2", mockProduct2, new Quantity(1)),
      ];

      // Setup mocks
      mockUserRepository.exists.mockResolvedValue(Result.ok(true));
      mockUserRepository.isActive.mockResolvedValue(Result.ok(true));

      const mockCart = createMockCart(userId, items);
      mockCart.getTotalAmount.mockReturnValue(new Money(79.97, "EUR"));
      mockCart.getTotalItems.mockReturnValue(3);
      mockCartRepository.findByUserId.mockResolvedValue(Result.ok(mockCart));
      // Mock for validateCartItems - get products by IDs
      mockProductRepository.findByIds.mockResolvedValue(
        Result.ok([
          { ...mockProduct, id: "prod-1", price: new Money(29.99, "EUR"), stock: new Quantity(10) },
          { ...mockProduct2, id: "prod-2", price: new Money(19.99, "EUR"), stock: new Quantity(5) },
        ])
      );

      // Execute
      const result = await cartService.getCartByUserId(userId);

      // Assert
      expect(result.isError()).toBe(false);
      const cart = result.getValue();
      expect(cart).toBeTruthy();
    });

    it("should return null if no cart exists", async () => {
      const userId = "user-no-cart";

      // Setup mocks
      mockUserRepository.exists.mockResolvedValue(Result.ok(true));
      mockUserRepository.isActive.mockResolvedValue(Result.ok(true));
      mockCartRepository.findByUserId.mockResolvedValue(Result.ok(null));

      // Execute
      const result = await cartService.getCartByUserId(userId);

      // Assert
      expect(result.isError()).toBe(false);
      const cart = result.getValue();
      expect(cart).toBeNull();
    });
  });

  describe("mergeCarts", () => {
    it("should merge carts from guest to user", async () => {
      const fromUserId = "guest-456";
      const toUserId = "user-123";
      const mockProduct2 = { ...mockProduct, id: "prod-2", price: new Money(19.99, "EUR") };

      const userItems = [new CartItem("item-1", mockProduct, new Quantity(1))];

      const guestItems = [
        new CartItem("item-2", mockProduct2, new Quantity(2)),
        new CartItem("item-3", mockProduct, new Quantity(1)), // Same product
      ];

      // Setup mocks
      mockUserRepository.exists.mockResolvedValue(Result.ok(true));
      mockUserRepository.isActive.mockResolvedValue(Result.ok(true));

      const userCart = createMockCart(toUserId, userItems);
      const guestCart = createMockCart(fromUserId, guestItems);

      // Mock both cart fetches
      mockCartRepository.findByUserId
        .mockResolvedValueOnce(Result.ok(guestCart)) // from cart
        .mockResolvedValueOnce(Result.ok(userCart)); // to cart
      mockCartRepository.save.mockResolvedValue(Result.ok(userCart));
      mockCartRepository.delete.mockResolvedValue(Result.ok(undefined));

      // Execute
      const result = await cartService.mergeCarts(fromUserId, toUserId);

      // Assert
      expect(result.isError()).toBe(false);
      expect(mockCartRepository.save).toHaveBeenCalled();
      expect(mockCartRepository.delete).toHaveBeenCalled();
    });
  });

  /* Commenting out private method tests
  describe("validateCartItems", () => {
    it("should validate all cart items successfully", async () => {
      const userId = "user-123";
      const mockProduct2 = { ...mockProduct, id: "prod-2", price: new Money(19.99, "EUR") };
      const items = [
        new CartItem("item-1", mockProduct, new Quantity(2)),
        new CartItem("item-2", mockProduct2, new Quantity(1)),
      ];

      // Setup mocks
      mockUserRepository.exists.mockResolvedValue(Result.ok(true));
      mockUserRepository.isActive.mockResolvedValue(Result.ok(true));
      
      const mockCart = createMockCart(userId, items);
      mockCartRepository.findByUserId.mockResolvedValue(Result.ok(mockCart));
      
      mockProductRepository.findByIds.mockResolvedValue(
        Result.ok([
          { ...mockProduct, id: "prod-1", price: 29.99, stock: 10 },
          { ...mockProduct, id: "prod-2", price: 19.99, stock: 5 },
        ])
      );

      // Execute
      const result = await cartService.validateCartItems(userId);

      // Assert
      expect(result.isError()).toBe(false);
      const validation = result.getValue();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should detect out of stock items", async () => {
      const userId = "user-123";
      const items = [
        new CartItem("item-1", mockProduct, new Quantity(5)),
      ];

      // Setup mocks
      mockUserRepository.exists.mockResolvedValue(Result.ok(true));
      mockUserRepository.isActive.mockResolvedValue(Result.ok(true));
      
      const mockCart = createMockCart(userId, items);
      mockCartRepository.findByUserId.mockResolvedValue(Result.ok(mockCart));
      
      mockProductRepository.findByIds.mockResolvedValue(
        Result.ok([
          { ...mockProduct, id: "prod-1", price: 29.99, stock: 2 }, // Not enough stock
        ])
      );

      // Execute
      const result = await cartService.validateCartItems(userId);

      // Assert
      expect(result.isError()).toBe(false);
      const validation = result.getValue();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("Stock insuffisant pour prod-1");
    });

    it("should detect price changes", async () => {
      const userId = "user-123";
      const items = [
        new CartItem("item-1", mockProduct, new Quantity(1)),
      ];

      // Setup mocks
      mockUserRepository.exists.mockResolvedValue(Result.ok(true));
      mockUserRepository.isActive.mockResolvedValue(Result.ok(true));
      
      const mockCart = createMockCart(userId, items);
      mockCartRepository.findByUserId.mockResolvedValue(Result.ok(mockCart));
      
      mockProductRepository.findByIds.mockResolvedValue(
        Result.ok([
          { ...mockProduct, id: "prod-1", price: 39.99, stock: 10 }, // Price changed
        ])
      );

      // Execute
      const result = await cartService.validateCartItems(userId);

      // Assert
      expect(result.isError()).toBe(false);
      const validation = result.getValue();
      expect(validation.warnings).toContain("Le prix de prod-1 a changé");
    });
  }); */
});
