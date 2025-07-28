/**
 * Tests for cart validation layers
 */

import { CartApiValidator } from '../api/cart-api.validator';
import { CartDomainValidator, CART_CONSTRAINTS } from '../domain/cart-domain.validator';
import { CartValidationCoordinator } from '../cart-validation-coordinator';
import { ValidationError, BusinessError } from '../../core/errors';

describe('Cart Validation', () => {
  describe('API Layer Validation', () => {
    describe('validateAddToCartFormData', () => {
      it('should validate correct form data', () => {
        const formData = new FormData();
        formData.append('productId', '123e4567-e89b-12d3-a456-426614174000');
        formData.append('quantity', '2');

        const result = CartApiValidator.validateAddToCartFormData(formData);

        expect(result.isSuccess()).toBe(true);
        const data = result.getValue();
        expect(data.productId).toBe('123e4567-e89b-12d3-a456-426614174000');
        expect(data.quantity).toBe(2);
      });

      it('should reject invalid UUID', () => {
        const formData = new FormData();
        formData.append('productId', 'invalid-uuid');
        formData.append('quantity', '2');

        const result = CartApiValidator.validateAddToCartFormData(formData);

        expect(result.isError()).toBe(true);
        expect(result.getError()).toBeInstanceOf(ValidationError);
      });

      it('should reject invalid quantity', () => {
        const formData = new FormData();
        formData.append('productId', '123e4567-e89b-12d3-a456-426614174000');
        formData.append('quantity', '0');

        const result = CartApiValidator.validateAddToCartFormData(formData);

        expect(result.isError()).toBe(true);
        expect(result.getError()).toBeInstanceOf(ValidationError);
      });

      it('should convert string quantity to number', () => {
        const formData = new FormData();
        formData.append('productId', '123e4567-e89b-12d3-a456-426614174000');
        formData.append('quantity', '5');

        const result = CartApiValidator.validateAddToCartFormData(formData);

        expect(result.isSuccess()).toBe(true);
        expect(typeof result.getValue().quantity).toBe('number');
        expect(result.getValue().quantity).toBe(5);
      });

      it('should reject quantity over limit', () => {
        const formData = new FormData();
        formData.append('productId', '123e4567-e89b-12d3-a456-426614174000');
        formData.append('quantity', '1000');

        const result = CartApiValidator.validateAddToCartFormData(formData);

        expect(result.isError()).toBe(true);
      });
    });

    describe('validateAddToCartJson', () => {
      it('should validate correct JSON data', () => {
        const jsonData = {
          productId: '123e4567-e89b-12d3-a456-426614174000',
          quantity: 3,
        };

        const result = CartApiValidator.validateAddToCartJson(jsonData);

        expect(result.isSuccess()).toBe(true);
        const data = result.getValue();
        expect(data.productId).toBe('123e4567-e89b-12d3-a456-426614174000');
        expect(data.quantity).toBe(3);
      });

      it('should reject missing fields', () => {
        const jsonData = {
          productId: '123e4567-e89b-12d3-a456-426614174000',
          // quantity missing
        };

        const result = CartApiValidator.validateAddToCartJson(jsonData);

        expect(result.isError()).toBe(true);
      });
    });

    describe('validateRemoveFromCartFormData', () => {
      it('should validate correct form data', () => {
        const formData = new FormData();
        formData.append('cartItemId', '123e4567-e89b-12d3-a456-426614174000');

        const result = CartApiValidator.validateRemoveFromCartFormData(formData);

        expect(result.isSuccess()).toBe(true);
        expect(result.getValue().cartItemId).toBe('123e4567-e89b-12d3-a456-426614174000');
      });

      it('should reject invalid UUID', () => {
        const formData = new FormData();
        formData.append('cartItemId', 'invalid-uuid');

        const result = CartApiValidator.validateRemoveFromCartFormData(formData);

        expect(result.isError()).toBe(true);
      });
    });

    describe('validateUpdateQuantityFormData', () => {
      it('should validate correct form data', () => {
        const formData = new FormData();
        formData.append('cartItemId', '123e4567-e89b-12d3-a456-426614174000');
        formData.append('quantity', '5');

        const result = CartApiValidator.validateUpdateQuantityFormData(formData);

        expect(result.isSuccess()).toBe(true);
        const data = result.getValue();
        expect(data.cartItemId).toBe('123e4567-e89b-12d3-a456-426614174000');
        expect(data.quantity).toBe(5);
      });

      it('should accept zero quantity', () => {
        const formData = new FormData();
        formData.append('cartItemId', '123e4567-e89b-12d3-a456-426614174000');
        formData.append('quantity', '0');

        const result = CartApiValidator.validateUpdateQuantityFormData(formData);

        expect(result.isSuccess()).toBe(true);
        expect(result.getValue().quantity).toBe(0);
      });
    });
  });

  describe('Domain Layer Validation', () => {
    describe('validateAddItem', () => {
      it('should validate correct domain data', () => {
        const domainData = {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          productId: '123e4567-e89b-12d3-a456-426614174001',
          quantity: 2,
          productDetails: {
            name: 'Test Product',
            price: 29.99,
            stock: 10,
            image: 'https://example.com/image.jpg',
            slug: 'test-product',
          },
        };

        const result = CartDomainValidator.validateAddItem(domainData);

        expect(result.isSuccess()).toBe(true);
        expect(result.getValue()).toEqual(domainData);
      });

      it('should reject when quantity exceeds stock', () => {
        const domainData = {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          productId: '123e4567-e89b-12d3-a456-426614174001',
          quantity: 15, // More than stock
          productDetails: {
            name: 'Test Product',
            price: 29.99,
            stock: 10,
            image: 'https://example.com/image.jpg',
            slug: 'test-product',
          },
        };

        const result = CartDomainValidator.validateAddItem(domainData);

        expect(result.isError()).toBe(true);
        expect(result.getError()).toBeInstanceOf(BusinessError);
        expect(result.getError().message).toContain('Stock insuffisant');
      });

      it('should reject quantity over domain limit', () => {
        const domainData = {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          productId: '123e4567-e89b-12d3-a456-426614174001',
          quantity: CART_CONSTRAINTS.MAX_QUANTITY_PER_ITEM + 1,
          productDetails: {
            name: 'Test Product',
            price: 29.99,
            stock: 200,
          },
        };

        const result = CartDomainValidator.validateAddItem(domainData);

        expect(result.isError()).toBe(true);
        expect(result.getError()).toBeInstanceOf(ValidationError);
      });

      it('should reject invalid product details', () => {
        const domainData = {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          productId: '123e4567-e89b-12d3-a456-426614174001',
          quantity: 2,
          productDetails: {
            name: '', // Empty name
            price: -10, // Negative price
            stock: 10,
          },
        };

        const result = CartDomainValidator.validateAddItem(domainData);

        expect(result.isError()).toBe(true);
        expect(result.getError()).toBeInstanceOf(ValidationError);
      });
    });

    describe('validateCartState', () => {
      it('should validate correct cart state', () => {
        const cartData = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          userId: '123e4567-e89b-12d3-a456-426614174001',
          items: [
            {
              id: '123e4567-e89b-12d3-a456-426614174002',
              productId: '123e4567-e89b-12d3-a456-426614174003',
              quantity: 2,
              name: 'Product 1',
              price: 29.99,
            },
            {
              id: '123e4567-e89b-12d3-a456-426614174004',
              productId: '123e4567-e89b-12d3-a456-426614174005',
              quantity: 3,
              name: 'Product 2',
              price: 39.99,
            },
          ],
        };

        const result = CartDomainValidator.validateCartState(cartData);

        expect(result.isSuccess()).toBe(true);
      });

      it('should reject cart with total quantity over limit', () => {
        const items = Array.from({ length: 10 }, (_, i) => ({
          id: `123e4567-e89b-12d3-a456-42661417400${i}`,
          productId: `123e4567-e89b-12d3-a456-42661417500${i}`,
          quantity: CART_CONSTRAINTS.MAX_TOTAL_QUANTITY / 5, // Will exceed total
          name: `Product ${i}`,
          price: 29.99,
        }));

        const cartData = {
          userId: '123e4567-e89b-12d3-a456-426614174001',
          items,
        };

        const result = CartDomainValidator.validateCartState(cartData);

        expect(result.isError()).toBe(true);
        expect(result.getError()).toBeInstanceOf(BusinessError);
      });

      it('should reject cart with duplicate products', () => {
        const cartData = {
          userId: '123e4567-e89b-12d3-a456-426614174001',
          items: [
            {
              id: '123e4567-e89b-12d3-a456-426614174002',
              productId: '123e4567-e89b-12d3-a456-426614174003', // Same product
              quantity: 2,
              name: 'Product 1',
              price: 29.99,
            },
            {
              id: '123e4567-e89b-12d3-a456-426614174004',
              productId: '123e4567-e89b-12d3-a456-426614174003', // Same product
              quantity: 3,
              name: 'Product 1',
              price: 29.99,
            },
          ],
        };

        const result = CartDomainValidator.validateCartState(cartData);

        expect(result.isError()).toBe(true);
        expect(result.getError()).toBeInstanceOf(BusinessError);
        expect(result.getError().message).toContain('Produits en double');
      });
    });

    describe('validateQuantityUpdate', () => {
      it('should validate safe quantity update', () => {
        const result = CartDomainValidator.validateQuantityUpdate(2, 5, 10);

        expect(result.isSuccess()).toBe(true);
      });

      it('should reject negative quantity', () => {
        const result = CartDomainValidator.validateQuantityUpdate(2, -1, 10);

        expect(result.isError()).toBe(true);
        expect(result.getError()).toBeInstanceOf(BusinessError);
      });

      it('should reject quantity exceeding stock', () => {
        const result = CartDomainValidator.validateQuantityUpdate(2, 15, 10);

        expect(result.isError()).toBe(true);
        expect(result.getError()).toBeInstanceOf(BusinessError);
        expect(result.getError().message).toContain('Stock insuffisant');
      });

      it('should reject quantity exceeding per-item limit', () => {
        const result = CartDomainValidator.validateQuantityUpdate(
          2, 
          CART_CONSTRAINTS.MAX_QUANTITY_PER_ITEM + 1, 
          200
        );

        expect(result.isError()).toBe(true);
        expect(result.getError()).toBeInstanceOf(BusinessError);
      });
    });

    describe('canAddItemToCart', () => {
      it('should allow adding item to cart with capacity', () => {
        const cartData = {
          userId: '123e4567-e89b-12d3-a456-426614174001',
          items: [
            {
              id: '123e4567-e89b-12d3-a456-426614174002',
              productId: '123e4567-e89b-12d3-a456-426614174003',
              quantity: 2,
              name: 'Product 1',
              price: 29.99,
            },
          ],
        };

        const result = CartDomainValidator.canAddItemToCart(cartData, 3);

        expect(result.isSuccess()).toBe(true);
      });

      it('should reject adding item when total quantity would exceed limit', () => {
        const cartData = {
          userId: '123e4567-e89b-12d3-a456-426614174001',
          items: [
            {
              id: '123e4567-e89b-12d3-a456-426614174002',
              productId: '123e4567-e89b-12d3-a456-426614174003',
              quantity: CART_CONSTRAINTS.MAX_TOTAL_QUANTITY - 1,
              name: 'Product 1',
              price: 29.99,
            },
          ],
        };

        const result = CartDomainValidator.canAddItemToCart(cartData, 5);

        expect(result.isError()).toBe(true);
        expect(result.getError()).toBeInstanceOf(BusinessError);
      });

      it('should reject adding item when max items reached', () => {
        const items = Array.from({ length: CART_CONSTRAINTS.MAX_ITEMS_IN_CART }, (_, i) => ({
          id: `123e4567-e89b-12d3-a456-42661417400${i}`,
          productId: `123e4567-e89b-12d3-a456-42661417500${i}`,
          quantity: 1,
          name: `Product ${i}`,
          price: 29.99,
        }));

        const cartData = {
          userId: '123e4567-e89b-12d3-a456-426614174001',
          items,
        };

        const result = CartDomainValidator.canAddItemToCart(cartData, 1);

        expect(result.isError()).toBe(true);
        expect(result.getError()).toBeInstanceOf(BusinessError);
      });
    });
  });

  describe('Validation Coordinator', () => {
    const mockUserContext = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      role: 'user',
      isAuthenticated: true,
    };

    const mockProductDetails = {
      id: '123e4567-e89b-12d3-a456-426614174001',
      name: 'Test Product',
      price: 29.99,
      stock: 10,
      image: 'https://example.com/image.jpg',
      slug: 'test-product',
      isActive: true,
    };

    describe('validateAddToCart', () => {
      it('should validate complete add to cart flow', async () => {
        const formData = new FormData();
        formData.append('productId', mockProductDetails.id);
        formData.append('quantity', '2');

        const result = await CartValidationCoordinator.validateAddToCart(
          formData,
          mockUserContext,
          mockProductDetails
        );

        expect(result.isSuccess()).toBe(true);
        const validated = result.getValue();
        expect(validated.userId).toBe(mockUserContext.id);
        expect(validated.productId).toBe(mockProductDetails.id);
        expect(validated.quantity).toBe(2);
        expect(validated.productDetails.name).toBe(mockProductDetails.name);
      });

      it('should reject inactive product', async () => {
        const formData = new FormData();
        formData.append('productId', mockProductDetails.id);
        formData.append('quantity', '2');

        const inactiveProduct = { ...mockProductDetails, isActive: false };

        const result = await CartValidationCoordinator.validateAddToCart(
          formData,
          mockUserContext,
          inactiveProduct
        );

        expect(result.isError()).toBe(true);
        expect(result.getError()).toBeInstanceOf(BusinessError);
        expect(result.getError().message).toContain('non disponible');
      });

      it('should reject quantity exceeding stock', async () => {
        const formData = new FormData();
        formData.append('productId', mockProductDetails.id);
        formData.append('quantity', '15'); // More than stock

        const result = await CartValidationCoordinator.validateAddToCart(
          formData,
          mockUserContext,
          mockProductDetails
        );

        expect(result.isError()).toBe(true);
        expect(result.getError()).toBeInstanceOf(BusinessError);
      });

      it('should pass through API validation errors', async () => {
        const formData = new FormData();
        formData.append('productId', 'invalid-uuid');
        formData.append('quantity', '2');

        const result = await CartValidationCoordinator.validateAddToCart(
          formData,
          mockUserContext,
          mockProductDetails
        );

        expect(result.isError()).toBe(true);
        expect(result.getError()).toBeInstanceOf(ValidationError);
      });
    });

    describe('validateRemoveFromCart', () => {
      it('should validate remove from cart', async () => {
        const formData = new FormData();
        formData.append('cartItemId', '123e4567-e89b-12d3-a456-426614174002');

        const result = await CartValidationCoordinator.validateRemoveFromCart(
          formData,
          mockUserContext
        );

        expect(result.isSuccess()).toBe(true);
        const validated = result.getValue();
        expect(validated.userId).toBe(mockUserContext.id);
        expect(validated.cartItemId).toBe('123e4567-e89b-12d3-a456-426614174002');
      });
    });

    describe('validateUpdateQuantity', () => {
      it('should validate quantity update', async () => {
        const formData = new FormData();
        formData.append('cartItemId', '123e4567-e89b-12d3-a456-426614174002');
        formData.append('quantity', '5');

        const result = await CartValidationCoordinator.validateUpdateQuantity(
          formData,
          mockUserContext,
          10 // available stock
        );

        expect(result.isSuccess()).toBe(true);
        const validated = result.getValue();
        expect(validated.quantity).toBe(5);
      });

      it('should reject quantity exceeding available stock', async () => {
        const formData = new FormData();
        formData.append('cartItemId', '123e4567-e89b-12d3-a456-426614174002');
        formData.append('quantity', '15');

        const result = await CartValidationCoordinator.validateUpdateQuantity(
          formData,
          mockUserContext,
          10 // available stock
        );

        expect(result.isError()).toBe(true);
        expect(result.getError()).toBeInstanceOf(BusinessError);
      });
    });
  });
});