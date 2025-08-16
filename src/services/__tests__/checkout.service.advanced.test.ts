/**
 * Tests avancés pour checkout.service - Phase 3.2
 * Tests d'intégration Stripe, gestion d'erreurs, et recovery
 */

import { CheckoutService } from '../checkout.service'
import { AddressValidationService } from '../address-validation.service'
import { CartService } from '../cart.service'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import {
  UserFactory,
  ProductFactory,
  CartFactory,
  createMockSupabaseClient,
  setupTestEnvironment,
} from '@/test-utils'

// Mock dependencies
jest.mock('../address-validation.service')
jest.mock('../cart.service')
jest.mock('@/lib/supabase/server')
jest.mock('@/lib/stripe')

const mockAddressValidationService = AddressValidationService as jest.Mocked<typeof AddressValidationService>
const mockCartService = CartService as jest.Mocked<typeof CartService>
const mockCreateSupabaseServerClient = createSupabaseServerClient as jest.MockedFunction<typeof createSupabaseServerClient>
const mockStripe = stripe as jest.Mocked<typeof stripe>

describe('CheckoutService - Advanced Integration Tests (Phase 3.2)', () => {
  let cleanup: () => void
  let checkoutService: CheckoutService
  
  beforeEach(() => {
    ({ cleanup } = setupTestEnvironment())
    jest.clearAllMocks()
    
    checkoutService = new CheckoutService()
  })
  
  afterEach(() => {
    cleanup()
  })

  describe('Stripe Integration Tests', () => {
    it('should create checkout session with proper metadata', async () => {
      // Arrange
      const user = UserFactory.authenticated()
      const cart = CartFactory.forUser(user.user.id, 2)
      
      const checkoutData = {
        userId: user.user.id,
        cartId: cart.cart.id,
        shippingAddress: {
          line1: '123 Test Street',
          city: 'Paris',
          postal_code: '75001',
          country: 'FR',
        },
        billingAddress: {
          line1: '123 Test Street',
          city: 'Paris',
          postal_code: '75001',
          country: 'FR',
        },
        shippingMethod: 'standard',
      }
      
      // Mock successful validation
      mockAddressValidationService.validateAndProcessAddresses.mockResolvedValue({
        success: true,
        data: {
          shippingAddress: checkoutData.shippingAddress,
          billingAddress: checkoutData.billingAddress,
        },
      })
      
      // Mock cart retrieval
      mockCartService.getCartWithItems.mockResolvedValue({
        success: true,
        data: cart,
      })
      
      // Mock Stripe session creation
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_test_session_id',
        url: 'https://checkout.stripe.com/pay/cs_test_session_id',
        payment_status: 'unpaid',
        status: 'open',
        metadata: {
          user_id: user.user.id,
          cart_id: cart.cart.id,
          shipping_method: 'standard',
        },
      } as any)
      
      const mockSupabase = createMockSupabaseClient({ user, cart })
      mockCreateSupabaseServerClient.mockReturnValue(mockSupabase as any)
      
      // Act
      const result = await checkoutService.createCheckoutSession(checkoutData)
      
      // Assert
      expect(result.success).toBe(true)
      expect(result.data?.sessionUrl).toBe('https://checkout.stripe.com/pay/cs_test_session_id')
      
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith({
        payment_method_types: ['card'],
        line_items: expect.arrayContaining([
          expect.objectContaining({
            price_data: expect.objectContaining({
              currency: 'eur',
              product_data: expect.objectContaining({
                name: expect.any(String),
              }),
              unit_amount: expect.any(Number),
            }),
            quantity: expect.any(Number),
          }),
        ]),
        mode: 'payment',
        success_url: expect.stringContaining('/checkout/success'),
        cancel_url: expect.stringContaining('/checkout/cancel'),
        metadata: {
          user_id: user.user.id,
          cart_id: cart.cart.id,
          shipping_method: 'standard',
        },
        shipping_address_collection: {
          allowed_countries: ['FR', 'BE', 'LU', 'DE', 'ES', 'IT'],
        },
        billing_address_collection: 'required',
      })
    })
    
    it('should handle Stripe API errors gracefully', async () => {
      // Arrange
      const user = UserFactory.authenticated()
      const cart = CartFactory.forUser(user.user.id, 1)
      
      const checkoutData = {
        userId: user.user.id,
        cartId: cart.cart.id,
        shippingAddress: {
          line1: '123 Test Street',
          city: 'Paris',
          postal_code: '75001',
          country: 'FR',
        },
        billingAddress: {
          line1: '123 Test Street',
          city: 'Paris',
          postal_code: '75001',
          country: 'FR',
        },
        shippingMethod: 'standard',
      }
      
      // Mock successful validation
      mockAddressValidationService.validateAndProcessAddresses.mockResolvedValue({
        success: true,
        data: {
          shippingAddress: checkoutData.shippingAddress,
          billingAddress: checkoutData.billingAddress,
        },
      })
      
      mockCartService.getCartWithItems.mockResolvedValue({
        success: true,
        data: cart,
      })
      
      // Mock Stripe error
      const stripeError = new Error('Your card was declined.')
      ;(stripeError as any).type = 'StripeCardError'
      ;(stripeError as any).code = 'card_declined'
      
      mockStripe.checkout.sessions.create.mockRejectedValue(stripeError)
      
      const mockSupabase = createMockSupabaseClient({ user, cart })
      mockCreateSupabaseServerClient.mockReturnValue(mockSupabase as any)
      
      // Act
      const result = await checkoutService.createCheckoutSession(checkoutData)
      
      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('carte')
    })
    
    it('should retry failed Stripe operations with exponential backoff', async () => {
      // Arrange
      const user = UserFactory.authenticated()
      const cart = CartFactory.forUser(user.user.id, 1)
      
      const checkoutData = {
        userId: user.user.id,
        cartId: cart.cart.id,
        shippingAddress: {
          line1: '123 Test Street',
          city: 'Paris',
          postal_code: '75001',
          country: 'FR',
        },
        billingAddress: {
          line1: '123 Test Street',
          city: 'Paris',
          postal_code: '75001',
          country: 'FR',
        },
        shippingMethod: 'standard',
      }
      
      mockAddressValidationService.validateAndProcessAddresses.mockResolvedValue({
        success: true,
        data: {
          shippingAddress: checkoutData.shippingAddress,
          billingAddress: checkoutData.billingAddress,
        },
      })
      
      mockCartService.getCartWithItems.mockResolvedValue({
        success: true,
        data: cart,
      })
      
      // Mock temporary Stripe failure then success
      let attemptCount = 0
      mockStripe.checkout.sessions.create.mockImplementation(() => {
        attemptCount++
        if (attemptCount < 3) {
          const error = new Error('Rate limit exceeded')
          ;(error as any).type = 'StripeRateLimitError'
          return Promise.reject(error)
        }
        
        return Promise.resolve({
          id: 'cs_test_session_id',
          url: 'https://checkout.stripe.com/pay/cs_test_session_id',
          payment_status: 'unpaid',
          status: 'open',
        } as any)
      })
      
      const mockSupabase = createMockSupabaseClient({ user, cart })
      mockCreateSupabaseServerClient.mockReturnValue(mockSupabase as any)
      
      // Act
      const startTime = Date.now()
      const result = await checkoutService.createCheckoutSession(checkoutData)
      const endTime = Date.now()
      
      // Assert
      expect(result.success).toBe(true)
      expect(attemptCount).toBe(3) // 2 échecs + 1 succès
      expect(endTime - startTime).toBeGreaterThan(100) // Délai de retry
    })
  })

  describe('Webhook Processing Tests', () => {
    it('should process successful payment webhook', async () => {
      // Arrange
      const user = UserFactory.authenticated()
      const orderId = 'order-123'
      
      const webhookEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_session_id',
            payment_status: 'paid',
            payment_intent: 'pi_test_payment_intent',
            metadata: {
              user_id: user.user.id,
              cart_id: 'cart-123',
              order_id: orderId,
            },
            customer_details: {
              email: user.user.email,
              name: 'John Doe',
            },
            amount_total: 5999, // 59.99 EUR
            currency: 'eur',
          },
        },
      }
      
      const mockSupabase = createMockSupabaseClient({ user })
      
      // Mock order update
      mockSupabase.from = jest.fn((table) => {
        if (table === 'orders') {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: orderId,
                status: 'paid',
                stripe_payment_intent_id: 'pi_test_payment_intent',
                amount: 59.99,
              },
              error: null,
            }),
          }
        }
        
        return {
          select: jest.fn().mockReturnThis(),
          then: jest.fn().mockResolvedValue({ data: [], error: null }),
        }
      }) as any
      
      mockCreateSupabaseServerClient.mockReturnValue(mockSupabase as any)
      
      // Act
      const result = await checkoutService.processWebhook(webhookEvent)
      
      // Assert
      expect(result.success).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('orders')
    })
    
    it('should handle idempotent webhook processing', async () => {
      // Arrange
      const user = UserFactory.authenticated()
      const orderId = 'order-123'
      
      const webhookEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_session_id',
            payment_status: 'paid',
            metadata: {
              order_id: orderId,
            },
          },
        },
      }
      
      const mockSupabase = createMockSupabaseClient({ user })
      
      // Mock order already processed
      mockSupabase.from = jest.fn((table) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: orderId,
                status: 'paid', // Déjà traité
                stripe_payment_intent_id: 'pi_existing',
              },
              error: null,
            }),
          }
        }
        
        return {
          select: jest.fn().mockReturnThis(),
          then: jest.fn().mockResolvedValue({ data: [], error: null }),
        }
      }) as any
      
      mockCreateSupabaseServerClient.mockReturnValue(mockSupabase as any)
      
      // Act - Traiter le même webhook deux fois
      const result1 = await checkoutService.processWebhook(webhookEvent)
      const result2 = await checkoutService.processWebhook(webhookEvent)
      
      // Assert
      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      // Le deuxième traitement devrait être ignoré sans erreur
    })
    
    it('should handle webhook signature validation', async () => {
      // Arrange
      const invalidWebhookEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_malicious_session',
            payment_status: 'paid',
            metadata: {
              order_id: 'malicious-order',
            },
          },
        },
      }
      
      // Mock signature validation failure
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature')
      })
      
      // Act
      const result = await checkoutService.processWebhook(invalidWebhookEvent)
      
      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('signature')
    })
  })

  describe('Error Recovery Tests', () => {
    it('should recover from temporary database failures', async () => {
      // Arrange
      const user = UserFactory.authenticated()
      const cart = CartFactory.forUser(user.user.id, 1)
      
      const checkoutData = {
        userId: user.user.id,
        cartId: cart.cart.id,
        shippingAddress: {
          line1: '123 Test Street',
          city: 'Paris',
          postal_code: '75001',
          country: 'FR',
        },
        billingAddress: {
          line1: '123 Test Street',
          city: 'Paris',
          postal_code: '75001',
          country: 'FR',
        },
        shippingMethod: 'standard',
      }
      
      mockAddressValidationService.validateAndProcessAddresses.mockResolvedValue({
        success: true,
        data: {
          shippingAddress: checkoutData.shippingAddress,
          billingAddress: checkoutData.billingAddress,
        },
      })
      
      // Mock temporary database failure then success
      let dbCallCount = 0
      mockCartService.getCartWithItems.mockImplementation(() => {
        dbCallCount++
        if (dbCallCount < 3) {
          return Promise.resolve({
            success: false,
            error: 'Database connection timeout',
          })
        }
        
        return Promise.resolve({
          success: true,
          data: cart,
        })
      })
      
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_test_session_id',
        url: 'https://checkout.stripe.com/pay/cs_test_session_id',
      } as any)
      
      const mockSupabase = createMockSupabaseClient({ user, cart })
      mockCreateSupabaseServerClient.mockReturnValue(mockSupabase as any)
      
      // Act
      const result = await checkoutService.createCheckoutSession(checkoutData)
      
      // Assert
      expect(result.success).toBe(true)
      expect(dbCallCount).toBe(3) // 2 échecs + 1 succès
    })
    
    it('should implement circuit breaker for external services', async () => {
      // Arrange
      const user = UserFactory.authenticated()
      const cart = CartFactory.forUser(user.user.id, 1)
      
      const checkoutData = {
        userId: user.user.id,
        cartId: cart.cart.id,
        shippingAddress: {
          line1: '123 Test Street',
          city: 'Paris',
          postal_code: '75001',
          country: 'FR',
        },
        billingAddress: {
          line1: '123 Test Street',
          city: 'Paris',
          postal_code: '75001',
          country: 'FR',
        },
        shippingMethod: 'standard',
      }
      
      // Mock repeated Stripe failures (should trigger circuit breaker)
      mockStripe.checkout.sessions.create.mockRejectedValue(
        new Error('Service unavailable')
      )
      
      mockAddressValidationService.validateAndProcessAddresses.mockResolvedValue({
        success: true,
        data: {
          shippingAddress: checkoutData.shippingAddress,
          billingAddress: checkoutData.billingAddress,
        },
      })
      
      mockCartService.getCartWithItems.mockResolvedValue({
        success: true,
        data: cart,
      })
      
      const mockSupabase = createMockSupabaseClient({ user, cart })
      mockCreateSupabaseServerClient.mockReturnValue(mockSupabase as any)
      
      // Act - Faire plusieurs tentatives rapides
      const promises = Array.from({ length: 5 }, () => 
        checkoutService.createCheckoutSession(checkoutData)
      )
      
      const results = await Promise.all(promises)
      
      // Assert
      results.forEach(result => {
        expect(result.success).toBe(false)
      })
      
      // Après plusieurs échecs, le circuit breaker devrait être ouvert
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalled()
    })
  })

  describe('Performance and Load Tests', () => {
    it('should handle high concurrency checkout requests', async () => {
      // Arrange
      const users = UserFactory.createBatch(10, () => UserFactory.authenticated())
      const carts = users.map(user => CartFactory.forUser(user.user.id, 2))
      
      const checkoutRequests = users.map((user, index) => ({
        userId: user.user.id,
        cartId: carts[index].cart.id,
        shippingAddress: {
          line1: '123 Test Street',
          city: 'Paris',
          postal_code: '75001',
          country: 'FR',
        },
        billingAddress: {
          line1: '123 Test Street',
          city: 'Paris',
          postal_code: '75001',
          country: 'FR',
        },
        shippingMethod: 'standard',
      }))
      
      // Mock successful responses
      mockAddressValidationService.validateAndProcessAddresses.mockResolvedValue({
        success: true,
        data: {
          shippingAddress: checkoutRequests[0].shippingAddress,
          billingAddress: checkoutRequests[0].billingAddress,
        },
      })
      
      checkoutRequests.forEach((_, index) => {
        mockCartService.getCartWithItems.mockResolvedValueOnce({
          success: true,
          data: carts[index],
        })
      })
      
      mockStripe.checkout.sessions.create.mockImplementation(() => 
        Promise.resolve({
          id: `cs_test_session_${Date.now()}_${Math.random()}`,
          url: `https://checkout.stripe.com/pay/cs_test_session_${Date.now()}`,
        } as any)
      )
      
      const mockSupabase = createMockSupabaseClient()
      mockCreateSupabaseServerClient.mockReturnValue(mockSupabase as any)
      
      // Act
      const startTime = Date.now()
      const promises = checkoutRequests.map(data => 
        checkoutService.createCheckoutSession(data)
      )
      
      const results = await Promise.all(promises)
      const endTime = Date.now()
      
      // Assert
      const successfulResults = results.filter(r => r.success)
      expect(successfulResults.length).toBeGreaterThan(5) // Au moins 50% de succès
      
      const duration = endTime - startTime
      expect(duration).toBeLessThan(5000) // Moins de 5 secondes pour 10 requêtes
    })
    
    it('should implement proper timeout handling', async () => {
      // Arrange
      const user = UserFactory.authenticated()
      const cart = CartFactory.forUser(user.user.id, 1)
      
      const checkoutData = {
        userId: user.user.id,
        cartId: cart.cart.id,
        shippingAddress: {
          line1: '123 Test Street',
          city: 'Paris',
          postal_code: '75001',
          country: 'FR',
        },
        billingAddress: {
          line1: '123 Test Street',
          city: 'Paris',
          postal_code: '75001',
          country: 'FR',
        },
        shippingMethod: 'standard',
      }
      
      // Mock long-running Stripe operation
      mockStripe.checkout.sessions.create.mockImplementation(() => 
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              id: 'cs_test_session_id',
              url: 'https://checkout.stripe.com/pay/cs_test_session_id',
            } as any)
          }, 10000) // 10 secondes
        })
      )
      
      mockAddressValidationService.validateAndProcessAddresses.mockResolvedValue({
        success: true,
        data: {
          shippingAddress: checkoutData.shippingAddress,
          billingAddress: checkoutData.billingAddress,
        },
      })
      
      mockCartService.getCartWithItems.mockResolvedValue({
        success: true,
        data: cart,
      })
      
      const mockSupabase = createMockSupabaseClient({ user, cart })
      mockCreateSupabaseServerClient.mockReturnValue(mockSupabase as any)
      
      // Act
      const result = await checkoutService.createCheckoutSession(checkoutData)
      
      // Assert
      // L'opération devrait échouer par timeout avant 10 secondes
      expect(result.success).toBe(false)
      expect(result.error).toContain('timeout')
    })
  })
})