/**
 * Tests pour product-validator - Validation des produits critique
 */

import {
  productSchema,
  createProductSchema,
  updateProductSchema,
  validateProductData,
} from '../product-validator';

describe('Product Validator', () => {
  const validProductData = {
    name: 'Test Product',
    description: 'A test product description',
    price: 29.99,
    stock: 100,
    category_id: 'cat-123',
    is_active: true,
    weight: 0.5,
    dimensions: {
      length: 10,
      width: 8,
      height: 5,
    },
    tags: ['test', 'product'],
  };

  describe('Product Schema Validation', () => {
    it('should validate complete product data', () => {
      // Act
      const result = productSchema.safeParse(validProductData);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Test Product');
        expect(result.data.price).toBe(29.99);
      }
    });

    it('should require mandatory fields', () => {
      // Arrange
      const incompleteData = {
        description: 'Missing name and price',
      };

      // Act
      const result = productSchema.safeParse(incompleteData);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ path: ['name'] }),
            expect.objectContaining({ path: ['price'] }),
          ])
        );
      }
    });

    it('should validate price constraints', () => {
      const testCases = [
        { price: -5, shouldPass: false }, // Negative price
        { price: 0, shouldPass: false }, // Zero price
        { price: 0.01, shouldPass: true }, // Minimum valid price
        { price: 999999, shouldPass: true }, // High price
        { price: '29.99', shouldPass: false }, // String price
      ];

      testCases.forEach(({ price, shouldPass }) => {
        // Act
        const result = productSchema.safeParse({
          ...validProductData,
          price,
        });

        // Assert
        expect(result.success).toBe(shouldPass);
      });
    });

    it('should validate stock quantities', () => {
      const testCases = [
        { stock: -1, shouldPass: false }, // Negative stock
        { stock: 0, shouldPass: true }, // Zero stock (out of stock)
        { stock: 1000000, shouldPass: true }, // High stock
        { stock: 1.5, shouldPass: false }, // Decimal stock
        { stock: '100', shouldPass: false }, // String stock
      ];

      testCases.forEach(({ stock, shouldPass }) => {
        // Act
        const result = productSchema.safeParse({
          ...validProductData,
          stock,
        });

        // Assert
        expect(result.success).toBe(shouldPass);
      });
    });
  });

  describe('Create Product Schema', () => {
    it('should validate new product creation', () => {
      // Arrange
      const newProductData = {
        name: 'New Product',
        description: 'A brand new product',
        price: 19.99,
        category_id: 'cat-456',
      };

      // Act
      const result = createProductSchema.safeParse(newProductData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should apply default values for optional fields', () => {
      // Arrange
      const minimalData = {
        name: 'Minimal Product',
        description: 'Minimal description',
        price: 9.99,
        category_id: 'cat-789',
      };

      // Act
      const result = createProductSchema.safeParse(minimalData);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.is_active).toBe(true); // Default value
        expect(result.data.stock).toBe(0); // Default value
      }
    });
  });

  describe('Update Product Schema', () => {
    it('should allow partial updates', () => {
      // Arrange
      const updateData = {
        price: 39.99,
        stock: 50,
      };

      // Act
      const result = updateProductSchema.safeParse(updateData);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.price).toBe(39.99);
        expect(result.data.stock).toBe(50);
        expect(result.data.name).toBeUndefined(); // Not updated
      }
    });

    it('should validate updated fields', () => {
      // Arrange
      const invalidUpdate = {
        price: -10, // Invalid negative price
        stock: 'invalid', // Invalid string stock
      };

      // Act
      const result = updateProductSchema.safeParse(invalidUpdate);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Product Data Validation Function', () => {
    it('should return validation results', () => {
      // Act
      const result = validateProductData(validProductData);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(expect.objectContaining(validProductData));
      expect(result.errors).toBeUndefined();
    });

    it('should return validation errors', () => {
      // Arrange
      const invalidData = {
        name: '', // Empty name
        price: -5, // Negative price
      };

      // Act
      const result = validateProductData(invalidData);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('should handle null input', () => {
      // Act
      const result = validateProductData(null);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('Edge Cases and Complex Validation', () => {
    it('should validate product names with special characters', () => {
      const testNames = [
        'Product with "quotes"',
        'Product with émojis 🎉',
        'Product with (parentheses)',
        'Product with & ampersand',
        'Product with números 123',
      ];

      testNames.forEach(name => {
        // Act
        const result = productSchema.safeParse({
          ...validProductData,
          name,
        });

        // Assert
        expect(result.success).toBe(true);
      });
    });

    it('should validate very long product names', () => {
      // Arrange
      const longName = 'a'.repeat(1000);

      // Act
      const result = productSchema.safeParse({
        ...validProductData,
        name: longName,
      });

      // Assert
      expect(result.success).toBe(false); // Should have max length limit
    });

    it('should validate dimensions object', () => {
      const testDimensions = [
        { dimensions: { length: 10, width: 8, height: 5 }, shouldPass: true },
        { dimensions: { length: -5, width: 8, height: 5 }, shouldPass: false },
        { dimensions: { length: 10 }, shouldPass: false }, // Missing width/height
        { dimensions: 'invalid', shouldPass: false },
        { dimensions: null, shouldPass: true }, // Optional field
      ];

      testDimensions.forEach(({ dimensions, shouldPass }) => {
        // Act
        const result = productSchema.safeParse({
          ...validProductData,
          dimensions,
        });

        // Assert
        expect(result.success).toBe(shouldPass);
      });
    });

    it('should validate tags array', () => {
      const testTags = [
        { tags: ['tag1', 'tag2'], shouldPass: true },
        { tags: [], shouldPass: true }, // Empty array OK
        { tags: ['a'.repeat(100)], shouldPass: false }, // Too long tag
        { tags: Array(100).fill('tag'), shouldPass: false }, // Too many tags
        { tags: 'not-array', shouldPass: false },
        { tags: null, shouldPass: true }, // Optional field
      ];

      testTags.forEach(({ tags, shouldPass }) => {
        // Act
        const result = productSchema.safeParse({
          ...validProductData,
          tags,
        });

        // Assert
        expect(result.success).toBe(shouldPass);
      });
    });
  });

  describe('Precision and Formatting', () => {
    it('should handle decimal precision for prices', () => {
      const testPrices = [
        { price: 29.99, shouldPass: true },
        { price: 29.999, shouldPass: true }, // Should round appropriately
        { price: 29, shouldPass: true }, // Whole number
        { price: 29.9999999, shouldPass: true },
      ];

      testPrices.forEach(({ price, shouldPass }) => {
        // Act
        const result = productSchema.safeParse({
          ...validProductData,
          price,
        });

        // Assert
        expect(result.success).toBe(shouldPass);
      });
    });

    it('should validate weight measurements', () => {
      const testWeights = [
        { weight: 0.1, shouldPass: true }, // Light item
        { weight: 100.5, shouldPass: true }, // Heavy item
        { weight: 0, shouldPass: true }, // Weightless (digital product)
        { weight: -0.5, shouldPass: false }, // Negative weight
        { weight: null, shouldPass: true }, // Optional field
      ];

      testWeights.forEach(({ weight, shouldPass }) => {
        // Act
        const result = productSchema.safeParse({
          ...validProductData,
          weight,
        });

        // Assert
        expect(result.success).toBe(shouldPass);
      });
    });
  });
});