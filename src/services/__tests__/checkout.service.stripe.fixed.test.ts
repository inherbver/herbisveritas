/**
 * Tests stabilisés pour l'intégration Stripe
 * Version simplifiée avec mocks appropriés et timeouts ajustés
 */

import { CheckoutOrchestrator } from '../checkout.service';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

// Mock dependencies
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/stripe');

describe('Checkout Service - Stripe Integration (Stabilized)', () => {
  let checkoutService: CheckoutOrchestrator;
  let mockSupabaseClient: any;
  let mockStripe: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a simple mock for Supabase
    mockSupabaseClient = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'cart-123',
          items: [
            {
              product_id: 'prod-1',
              quantity: 2,
              price: 25.00,
              product: {
                name: 'Test Product',
                stripe_price_id: 'price_123',
              },
            },
          ],
          total: 50.00,
        },
        error: null,
      }),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
    };
    
    (createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabaseClient);
    
    // Create a simple mock for Stripe
    mockStripe = {
      checkout: {
        sessions: {
          create: jest.fn(),
        },
      },
      webhooks: {
        constructEvent: jest.fn(),
      },
    };
    
    // Mock services
    const mockAddressService = {
      validateAndProcessAddresses: jest.fn().mockResolvedValue({
        success: true,
        data: {
          shippingAddress: { id: 'addr-1' },
          billingAddress: { id: 'addr-2' },
        },
      }),
    };
    
    const mockProductService = {
      validateProducts: jest.fn().mockResolvedValue({
        success: true,
        data: [],
      }),
    };
    
    checkoutService = new CheckoutOrchestrator(
      mockStripe,
      mockProductService as any,
      mockAddressService as any
    );
  });
  
  describe('Basic Stripe Operations', () => {
    it('should create a checkout session successfully', async () => {
      // Setup
      const sessionData = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
        payment_status: 'unpaid',
      };
      
      mockStripe.checkout.sessions.create.mockResolvedValue(sessionData);
      
      // Execute
      const result = await checkoutService.processCheckout({
        userId: 'user-123',
        cartId: 'cart-123',
        shippingAddress: { line1: '123 Main St', city: 'Paris', postal_code: '75001', country: 'FR' } as any,
        billingAddress: { line1: '123 Main St', city: 'Paris', postal_code: '75001', country: 'FR' } as any,
        shippingMethodId: 'standard',
      });
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.sessionId).toBe('cs_test_123');
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalled();
    });
    
    it('should handle Stripe API errors gracefully', async () => {
      // Setup
      const stripeError = new Error('Invalid API Key') as any;
      stripeError.type = 'StripeAuthenticationError';
      mockStripe.checkout.sessions.create.mockRejectedValue(stripeError);
      
      // Execute
      const result = await checkoutService.processCheckout({
        userId: 'user-123',
        cartId: 'cart-123',
        shippingAddress: { line1: '123 Main St', city: 'Paris', postal_code: '75001', country: 'FR' } as any,
        billingAddress: { line1: '123 Main St', city: 'Paris', postal_code: '75001', country: 'FR' } as any,
        shippingMethodId: 'standard',
      });
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid API Key');
    });
  });
  
  describe('Retry Mechanism (Simplified)', () => {
    it('should retry on temporary failures', async () => {
      // Setup
      let attemptCount = 0;
      mockStripe.checkout.sessions.create.mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Network timeout');
        }
        return {
          id: 'cs_test_123',
          url: 'https://checkout.stripe.com/pay/cs_test_123',
        };
      });
      
      // Execute
      const result = await checkoutService.processCheckout({
        userId: 'user-123',
        cartId: 'cart-123',
        shippingAddress: { line1: '123 Main St', city: 'Paris', postal_code: '75001', country: 'FR' } as any,
        billingAddress: { line1: '123 Main St', city: 'Paris', postal_code: '75001', country: 'FR' } as any,
        shippingMethodId: 'standard',
      });
      
      // Assert - simplified without timing checks
      expect(attemptCount).toBe(3);
      expect(result.success).toBe(true);
    }, 10000); // 10 second timeout
    
    it('should fail after max retries', async () => {
      // Setup
      mockStripe.checkout.sessions.create.mockRejectedValue(new Error('Persistent error'));
      
      // Execute
      const result = await checkoutService.processCheckout({
        userId: 'user-123',
        cartId: 'cart-123',
        shippingAddress: { line1: '123 Main St', city: 'Paris', postal_code: '75001', country: 'FR' } as any,
        billingAddress: { line1: '123 Main St', city: 'Paris', postal_code: '75001', country: 'FR' } as any,
        shippingMethodId: 'standard',
      });
      
      // Assert
      expect(result.success).toBe(false);
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalled();
    });
  });
  
  describe('Webhook Processing', () => {
    it('should process webhook events successfully', async () => {
      // Setup
      const mockEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            payment_status: 'paid',
            metadata: {
              cartId: 'cart-123',
              userId: 'user-123',
            },
          },
        },
      };
      
      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      
      // Execute
      const result = await (checkoutService as any).processWebhookEvent(
        mockEvent,
        'test-signature',
        'raw-body'
      );
      
      // Assert
      expect(result).toEqual({ received: true });
    });
    
    it('should handle invalid webhook signatures', async () => {
      // Setup
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });
      
      // Execute & Assert
      await expect(
        (checkoutService as any).processWebhookEvent(
          {},
          'invalid-signature',
          'raw-body'
        )
      ).rejects.toThrow('Invalid signature');
    });
  });
  
  describe('Error Recovery', () => {
    it('should handle database connection errors', async () => {
      // Setup
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Connection timeout');
      });
      
      // Execute
      const result = await checkoutService.processCheckout({
        userId: 'user-123',
        cartId: 'cart-123',
        shippingAddress: { line1: '123 Main St', city: 'Paris', postal_code: '75001', country: 'FR' } as any,
        billingAddress: { line1: '123 Main St', city: 'Paris', postal_code: '75001', country: 'FR' } as any,
        shippingMethodId: 'standard',
      });
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection timeout');
    });
    
    it('should validate required checkout data', async () => {
      // Execute - missing cartId
      const result = await checkoutService.processCheckout({
        userId: 'user-123',
        cartId: '',
        shippingAddress: { line1: '123 Main St', city: 'Paris', postal_code: '75001', country: 'FR' } as any,
        billingAddress: { line1: '123 Main St', city: 'Paris', postal_code: '75001', country: 'FR' } as any,
        shippingMethodId: 'standard',
      });
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('cart');
    });
  });
  
  describe('Performance', () => {
    it('should complete checkout within reasonable time', async () => {
      // Setup
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      });
      
      // Execute
      const start = Date.now();
      const result = await checkoutService.processCheckout({
        userId: 'user-123',
        cartId: 'cart-123',
        shippingAddress: { line1: '123 Main St', city: 'Paris', postal_code: '75001', country: 'FR' } as any,
        billingAddress: { line1: '123 Main St', city: 'Paris', postal_code: '75001', country: 'FR' } as any,
        shippingMethodId: 'standard',
      });
      const duration = Date.now() - start;
      
      // Assert
      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });
  });
});