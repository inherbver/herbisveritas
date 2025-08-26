/**
 * Tests pour product-validator - Validation des produits critique
 */

import {
  productSchema,
  productFormSchema,
  getDefaultProductValues,
} from '../product-validator';

describe('Product Validator', () => {
  const validProductData = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    slug: 'test-product',
    price: 29.99,
    stock: 100,
    unit: 'piece',
    image_url: '/images/test-product.jpg',
    inci_list: ['ingredient1', 'ingredient2'],
    status: 'active' as const,
    is_active: true,
    is_new: false,
    is_on_promotion: false,
    translations: [
      {
        locale: 'fr',
        name: 'Test Product',
        short_description: 'A test product description',
        description_long: 'Detailed description',
        usage_instructions: 'How to use',
        properties: 'Product properties',
        composition_text: 'Composition',
      },
    ],
  };

  describe('Product Schema Validation', () => {
    it('should validate complete product data', () => {
      // Act
      const result = productSchema.safeParse(validProductData);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.slug).toBe('test-product');
        expect(result.data.price).toBe(29.99);
        expect(result.data.translations[0].name).toBe('Test Product');
      }
    });

    it('should require mandatory fields', () => {
      // Arrange
      const incompleteData = {
        price: 10,
        stock: 5,
      };

      // Act
      const result = productSchema.safeParse(incompleteData);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map(issue => issue.path[0]);
        expect(paths).toContain('slug');
        expect(paths).toContain('unit');
        expect(paths).toContain('image_url');
        expect(paths).toContain('inci_list');
        expect(paths).toContain('status');
        expect(paths).toContain('translations');
      }
    });

    it('should validate price constraints', () => {
      const testCases = [
        { price: -5, shouldPass: false }, // Negative price
        { price: 0, shouldPass: true }, // Zero price allowed
        { price: 0.01, shouldPass: true }, // Minimum valid price
        { price: 999999, shouldPass: true }, // High price
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

  describe('Product Form Schema', () => {
    it('should apply default status if not provided', () => {
      // Arrange
      const dataWithoutStatus = {
        slug: 'test-product',
        price: 29.99,
        stock: 100,
        unit: 'piece',
        image_url: '/images/test.jpg',
        inci_list: ['ingredient1'],
        is_active: true,
        is_new: false,
        is_on_promotion: false,
        translations: [
          {
            locale: 'fr',
            name: 'Test',
          },
        ],
      };

      // Act
      const result = productFormSchema.safeParse(dataWithoutStatus);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('active');
      }
    });
  });

  describe('Default Values', () => {
    it('should generate valid default values', () => {
      // Act
      const defaults = getDefaultProductValues();

      // Assert
      expect(defaults).toBeDefined();
      expect(defaults.status).toBe('active');
      expect(defaults.is_active).toBe(true);
      expect(defaults.translations).toHaveLength(1);
      expect(defaults.translations[0].locale).toBe('fr');
    });
  });

  describe('Edge Cases and Complex Validation', () => {
    it('should validate product translations with special characters', () => {
      const testNames = [
        'Product with "quotes"',
        'Product with émojis 🎉',
        'Product with (parentheses)',
        'Product with & ampersand',
        'Product with números 123',
      ];

      testNames.forEach(name => {
        // Act
        const testData = {
          ...validProductData,
          translations: [{
            ...validProductData.translations[0],
            name,
          }],
        };
        const result = productSchema.safeParse(testData);

        // Assert
        expect(result.success).toBe(true);
      });
    });

    it('should validate very long product names', () => {
      // Arrange
      const longName = 'a'.repeat(1000);
      const testData = {
        ...validProductData,
        translations: [{
          ...validProductData.translations[0],
          name: longName,
        }],
      };

      // Act  
      const result = productSchema.safeParse(testData);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should validate slug format', () => {
      const testCases = [
        { slug: 'valid-slug', shouldPass: true },
        { slug: 'slug-with-123', shouldPass: true },
        { slug: 'INVALID', shouldPass: false }, // Uppercase
        { slug: 'invalid slug', shouldPass: false }, // Space
        { slug: 'invalid_slug', shouldPass: false }, // Underscore
        { slug: 'ab', shouldPass: false }, // Too short
      ];

      testCases.forEach(({ slug, shouldPass }) => {
        // Act
        const result = productSchema.safeParse({
          ...validProductData,
          slug,
        });

        // Assert
        expect(result.success).toBe(shouldPass);
      });
    });

    it('should validate translations array', () => {
      // Test empty translations
      const emptyTranslations = {
        ...validProductData,
        translations: [],
      };
      
      const result1 = productSchema.safeParse(emptyTranslations);
      expect(result1.success).toBe(false);

      // Test multiple translations
      const multipleTranslations = {
        ...validProductData,
        translations: [
          {
            locale: 'fr',
            name: 'Produit Test',
            short_description: 'Description courte',
          },
          {
            locale: 'en',
            name: 'Test Product',
            short_description: 'Short description',
          },
        ],
      };
      
      const result2 = productSchema.safeParse(multipleTranslations);
      expect(result2.success).toBe(true);
    });
  });

  describe('Precision and Formatting', () => {
    it('should handle decimal precision for prices', () => {
      const testCases = [
        29.99,
        29.999, // Should be allowed
        0.01,
        1000000.99,
      ];

      testCases.forEach(price => {
        // Act
        const result = productSchema.safeParse({
          ...validProductData,
          price,
        });

        // Assert
        expect(result.success).toBe(true);
      });
    });

    it('should validate boolean fields', () => {
      // Arrange
      const booleanData = {
        ...validProductData,
        is_active: 'true', // Wrong type
        is_new: 1, // Wrong type
        is_on_promotion: null, // Wrong type
      };

      // Act
      const result = productSchema.safeParse(booleanData);

      // Assert
      expect(result.success).toBe(false);
    });
  });
});