/**
 * Tests pour le service de validation des produits
 * Service critique pour la validation du panier avant checkout
 */

import { ProductValidationService } from '../product-validation.service';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createMockSupabaseChain } from '@/test-utils/supabase-mock-helper';
import { CheckoutBusinessError, CheckoutErrorCode } from '../checkout.service';


import { setupServerActionMocks } from '@/test-utils/server-action-mocks';// Mock des dépendances
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/core/logger');

// Setup des mocks standards pour Server Actions
setupServerActionMocks();

describe('ProductValidationService', () => {
  let service: ProductValidationService;
  let mockSupabaseClient: any;

  const mockProducts = [
    {
      id: 'product-1',
      name: 'Produit 1',
      price: 19.99,
      image_url: 'https://example.com/product1.jpg',
      is_available: true,
      stock: 10,
    },
    {
      id: 'product-2',
      name: 'Produit 2',
      price: 29.99,
      image_url: 'https://example.com/product2.jpg',
      is_available: true,
      stock: 5,
    },
    {
      id: 'product-3',
      name: 'Produit indisponible',
      price: 39.99,
      image_url: null,
      is_available: false,
      stock: 0,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProductValidationService();
    
    mockSupabaseClient = {
      from: jest.fn(),
    };
    
    (createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabaseClient);
  });

  describe('validateCartProducts', () => {
    it('should successfully validate cart products', async () => {
      // Arrange
      const cartItems = [
        { productId: 'product-1', quantity: 2 },
        { productId: 'product-2', quantity: 1 },
      ];

      const productsChain = createMockSupabaseChain({
        data: [mockProducts[0], mockProducts[1]],
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        returns: jest.fn().mockResolvedValue({
          data: [mockProducts[0], mockProducts[1]],
          error: null,
        }),
      });

      // Act
      const result = await service.validateCartProducts(cartItems);

      // Assert
      expect(result?.success ?? true).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.isValid).toBe(true);
      expect(result.data?.items).toHaveLength(2);
      expect(result.data?.totalAmount).toBe(19.99 * 2 + 29.99);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('products');
    });

    it('should throw error for empty cart', async () => {
      // Arrange
      const cartItems: any[] = [];

      // Act
      const result = await service.validateCartProducts(cartItems);

      // Assert
      expect(result?.success).toBe(false);
      expect(result.error).toContain('panier est vide');
    });

    it('should handle product not found', async () => {
      // Arrange
      const cartItems = [
        { productId: 'non-existent', quantity: 1 },
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        returns: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      // Act
      const result = await service.validateCartProducts(cartItems);

      // Assert
      expect(result?.success).toBe(false);
      expect(result.error).toContain('Produit non trouvé');
    });

    it('should handle unavailable product', async () => {
      // Arrange
      const cartItems = [
        { productId: 'product-3', quantity: 1 },
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        returns: jest.fn().mockResolvedValue({
          data: [mockProducts[2]], // Produit indisponible
          error: null,
        }),
      });

      // Act
      const result = await service.validateCartProducts(cartItems);

      // Assert
      expect(result?.success).toBe(false);
      expect(result.error).toContain('Produit non disponible');
    });

    it('should handle insufficient stock', async () => {
      // Arrange
      const cartItems = [
        { productId: 'product-2', quantity: 10 }, // Stock = 5
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        returns: jest.fn().mockResolvedValue({
          data: [mockProducts[1]],
          error: null,
        }),
      });

      // Act
      const result = await service.validateCartProducts(cartItems);

      // Assert
      expect(result?.success).toBe(false);
      expect(result.error).toContain('Stock insuffisant');
      expect(result.error).toContain('Disponible: 5');
      expect(result.error).toContain('Demandé: 10');
    });

    it('should handle database errors', async () => {
      // Arrange
      const cartItems = [
        { productId: 'product-1', quantity: 1 },
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        returns: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection error' },
        }),
      });

      // Act
      const result = await service.validateCartProducts(cartItems);

      // Assert
      expect(result?.success).toBe(false);
      expect(result.error).toContain('Erreur lors de la validation');
    });

    it('should calculate correct total amount for multiple items', async () => {
      // Arrange
      const cartItems = [
        { productId: 'product-1', quantity: 3 },
        { productId: 'product-2', quantity: 2 },
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        returns: jest.fn().mockResolvedValue({
          data: [mockProducts[0], mockProducts[1]],
          error: null,
        }),
      });

      // Act
      const result = await service.validateCartProducts(cartItems);

      // Assert
      expect(result?.success ?? true).toBe(true);
      expect(result.data?.totalAmount).toBe(19.99 * 3 + 29.99 * 2);
      expect(result.data?.items[0].quantity).toBe(3);
      expect(result.data?.items[1].quantity).toBe(2);
    });
  });

  describe('validateSingleProduct', () => {
    it('should validate single product successfully', async () => {
      // Arrange
      const productId = 'product-1';
      const requestedQuantity = 5;

      const chain = createMockSupabaseChain({
        data: mockProducts[0],
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue(chain);

      // Act
      const result = await service.validateSingleProduct(productId, requestedQuantity);

      // Assert
      expect(result?.success ?? true).toBe(true);
      expect(result.data).toEqual(mockProducts[0]);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('products');
    });

    it('should reject unavailable product', async () => {
      // Arrange
      const productId = 'product-3';
      const requestedQuantity = 1;

      const chain = createMockSupabaseChain({
        data: mockProducts[2], // Produit indisponible
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue(chain);

      // Act
      const result = await service.validateSingleProduct(productId, requestedQuantity);

      // Assert
      expect(result?.success).toBe(false);
      expect(result.error).toContain('Produit non disponible');
    });

    it('should reject when stock insufficient', async () => {
      // Arrange
      const productId = 'product-2';
      const requestedQuantity = 10; // Stock = 5

      const chain = createMockSupabaseChain({
        data: mockProducts[1],
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue(chain);

      // Act
      const result = await service.validateSingleProduct(productId, requestedQuantity);

      // Assert
      expect(result?.success).toBe(false);
      expect(result.error).toContain('Stock insuffisant');
    });

    it('should handle product not found', async () => {
      // Arrange
      const productId = 'non-existent';
      const requestedQuantity = 1;

      const chain = createMockSupabaseChain({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      mockSupabaseClient.from.mockReturnValue(chain);

      // Act
      const result = await service.validateSingleProduct(productId, requestedQuantity);

      // Assert
      expect(result?.success).toBe(false);
      expect(result.error).toContain('Erreur lors de la validation');
    });

    it('should validate exact stock quantity', async () => {
      // Arrange
      const productId = 'product-2';
      const requestedQuantity = 5; // Exactement le stock disponible

      const chain = createMockSupabaseChain({
        data: mockProducts[1],
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue(chain);

      // Act
      const result = await service.validateSingleProduct(productId, requestedQuantity);

      // Assert
      expect(result?.success ?? true).toBe(true);
      expect(result.data).toEqual(mockProducts[1]);
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const productId = 'product-1';
      const requestedQuantity = 1;

      const chain = createMockSupabaseChain({
        data: null,
        error: { message: 'Connection timeout' },
      });

      mockSupabaseClient.from.mockReturnValue(chain);

      // Act
      const result = await service.validateSingleProduct(productId, requestedQuantity);

      // Assert
      expect(result?.success).toBe(false);
      expect(result.error).toContain('Erreur lors de la validation');
    });
  });
});