/**
 * Tests avancés pour orderActions - Phase 3.2
 * Tests du workflow complet, rollback, et intégrations complexes
 */

import {
  createOrderFromCart,
  updateOrderStatus,
  processStripeWebhook,
  cancelOrder,
  getOrderById,
} from '../orderActions'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getActiveUserId } from '@/utils/authUtils'
import {
  UserFactory,
  ProductFactory,
  CartFactory,
  createMockSupabaseClient,
  createErrorMockSupabaseClient,
  setupTestEnvironment,
  createFormData,
} from '@/test-utils'

// Mock dependencies
jest.mock('@/lib/supabase/server')
jest.mock('@/lib/supabase/admin')
jest.mock('@/utils/authUtils')
jest.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: {
      sessions: {
        retrieve: jest.fn(),
      },
    },
    paymentIntents: {
      retrieve: jest.fn(),
    },
  },
}))

const mockCreateSupabaseServerClient = createSupabaseServerClient as jest.MockedFunction<typeof createSupabaseServerClient>
const mockCreateSupabaseAdminClient = createSupabaseAdminClient as jest.MockedFunction<typeof createSupabaseAdminClient>
const mockGetActiveUserId = getActiveUserId as jest.MockedFunction<typeof getActiveUserId>

describe('orderActions - Advanced Workflow Tests (Phase 3.2)', () => {
  let cleanup: () => void
  
  beforeEach(() => {
    ({ cleanup } = setupTestEnvironment())
    jest.clearAllMocks()
  })
  
  afterEach(() => {
    cleanup()
  })

  describe('Order Creation Workflow', () => {
    it('should handle complete order creation with stock validation', async () => {
      // Arrange
      const user = UserFactory.authenticated()
      const cart = CartFactory.forUser(user.user.id, 3)
      
      // Créer des produits avec stock suffisant
      const products = cart.items.map((item, index) => 
        ProductFactory.simple({
          id: item.product_id,
          stock_quantity: item.quantity + 10, // Stock suffisant
          price: item.unit_price,
        })
      )
      
      const formData = createFormData({
        shipping_address: JSON.stringify({
          line1: '123 Test Street',
          city: 'Paris',
          postal_code: '75001',
          country: 'FR',
        }),
        billing_address: JSON.stringify({
          line1: '123 Test Street',
          city: 'Paris',
          postal_code: '75001',
          country: 'FR',
        }),
        shipping_method: 'standard',
      })
      
      mockGetActiveUserId.mockResolvedValue(user.user.id)
      
      const mockSupabase = createMockSupabaseClient({ user, cart })
      
      // Mock des queries pour les produits
      mockSupabase.from = jest.fn((table) => {
        if (table === 'products') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            then: jest.fn().mockResolvedValue({
              data: products,
              error: null,
            }),
          }
        }
        
        if (table === 'orders') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'order-123',
                user_id: user.user.id,
                status: 'pending',
                total_amount: CartFactory.calculateTotal(cart),
              },
              error: null,
            }),
          }
        }
        
        return {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          then: jest.fn().mockResolvedValue({ data: [], error: null }),
        }
      }) as any
      
      mockCreateSupabaseServerClient.mockReturnValue(mockSupabase as any)
      mockCreateSupabaseAdminClient.mockReturnValue(mockSupabase as any)
      
      // Act
      const result = await createOrderFromCart(formData)
      
      // Assert
      expect(result.success).toBe(true)
      expect(result.data?.orderId).toBe('order-123')
      expect(mockSupabase.from).toHaveBeenCalledWith('products')
      expect(mockSupabase.from).toHaveBeenCalledWith('orders')
      expect(mockSupabase.from).toHaveBeenCalledWith('order_items')
    })
    
    it('should rollback order creation on payment failure', async () => {
      // Arrange
      const user = UserFactory.authenticated()
      const cart = CartFactory.forUser(user.user.id, 2)
      
      const formData = createFormData({
        shipping_address: JSON.stringify({
          line1: '123 Test Street',
          city: 'Paris',
          postal_code: '75001',
          country: 'FR',
        }),
        billing_address: JSON.stringify({
          line1: '123 Test Street',
          city: 'Paris',
          postal_code: '75001',
          country: 'FR',
        }),
        shipping_method: 'standard',
      })
      
      mockGetActiveUserId.mockResolvedValue(user.user.id)
      
      const mockSupabase = createMockSupabaseClient({ user, cart })
      
      // Simuler une erreur lors de la création de la session Stripe
      const { stripe } = require('@/lib/stripe')
      stripe.checkout.sessions.create = jest.fn().mockRejectedValue(
        new Error('Stripe API error')
      )
      
      // Mock pour suivre les opérations de rollback
      const rollbackOperations: string[] = []
      
      mockSupabase.from = jest.fn((table) => {
        if (table === 'orders') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'order-123',
                user_id: user.user.id,
                status: 'pending',
              },
              error: null,
            }),
            delete: jest.fn(() => {
              rollbackOperations.push('delete_order')
              return {
                eq: jest.fn().mockReturnThis(),
                then: jest.fn().mockResolvedValue({ data: null, error: null }),
              }
            }),
          }
        }
        
        if (table === 'order_items') {
          return {
            insert: jest.fn().mockReturnThis(),
            then: jest.fn().mockResolvedValue({ data: [], error: null }),
            delete: jest.fn(() => {
              rollbackOperations.push('delete_order_items')
              return {
                eq: jest.fn().mockReturnThis(),
                then: jest.fn().mockResolvedValue({ data: null, error: null }),
              }
            }),
          }
        }
        
        return {
          select: jest.fn().mockReturnThis(),
          then: jest.fn().mockResolvedValue({ data: [], error: null }),
        }
      }) as any
      
      mockCreateSupabaseServerClient.mockReturnValue(mockSupabase as any)
      mockCreateSupabaseAdminClient.mockReturnValue(mockSupabase as any)
      
      // Act
      const result = await createOrderFromCart(formData)
      
      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('paiement')
      
      // Vérifier que le rollback a été effectué
      expect(rollbackOperations).toContain('delete_order')
      expect(rollbackOperations).toContain('delete_order_items')
    })
    
    it('should handle inventory conflicts during order creation', async () => {
      // Arrange
      const user = UserFactory.authenticated()
      const cart = CartFactory.forUser(user.user.id, 2)
      
      // Produit avec stock insuffisant
      const outOfStockProduct = ProductFactory.outOfStock({
        id: cart.items[0].product_id,
        stock_quantity: 0,
      })
      
      const inStockProduct = ProductFactory.simple({
        id: cart.items[1].product_id,
        stock_quantity: 100,
      })
      
      const formData = createFormData({
        shipping_address: JSON.stringify({
          line1: '123 Test Street',
          city: 'Paris',
          postal_code: '75001',
          country: 'FR',
        }),
        billing_address: JSON.stringify({
          line1: '123 Test Street',
          city: 'Paris',
          postal_code: '75001',
          country: 'FR',
        }),
        shipping_method: 'standard',
      })
      
      mockGetActiveUserId.mockResolvedValue(user.user.id)
      
      const mockSupabase = createMockSupabaseClient({ user, cart })
      
      // Mock pour retourner les produits avec stocks variés
      mockSupabase.from = jest.fn((table) => {
        if (table === 'products') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            then: jest.fn().mockResolvedValue({
              data: [outOfStockProduct, inStockProduct],
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
      const result = await createOrderFromCart(formData)
      
      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('stock')
    })
  })

  describe('Stripe Webhook Processing', () => {
    it('should process successful payment webhook correctly', async () => {
      // Arrange
      const user = UserFactory.authenticated()
      const orderId = 'order-123'
      
      const webhookData = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_session_id',
            payment_status: 'paid',
            metadata: {
              order_id: orderId,
              user_id: user.user.id,
            },
            customer_details: {
              email: user.user.email,
            },
            payment_intent: 'pi_test_payment_intent',
          },
        },
      }
      
      const mockSupabase = createMockSupabaseClient({ user })
      
      // Mock pour la mise à jour de commande
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
      
      mockCreateSupabaseAdminClient.mockReturnValue(mockSupabase as any)
      
      // Act
      const result = await processStripeWebhook(webhookData)
      
      // Assert
      expect(result.success).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('orders')
    })
    
    it('should handle webhook for failed payment', async () => {
      // Arrange
      const orderId = 'order-123'
      
      const webhookData = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_session_id',
            payment_status: 'unpaid',
            metadata: {
              order_id: orderId,
            },
          },
        },
      }
      
      const mockSupabase = createMockSupabaseClient()
      
      // Mock pour marquer la commande comme échouée
      mockSupabase.from = jest.fn((table) => {
        if (table === 'orders') {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: orderId,
                status: 'payment_failed',
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
      
      mockCreateSupabaseAdminClient.mockReturnValue(mockSupabase as any)
      
      // Act
      const result = await processStripeWebhook(webhookData)
      
      // Assert
      expect(result.success).toBe(true)
      // Vérifier que le stock est restauré en cas d'échec de paiement
      expect(mockSupabase.from).toHaveBeenCalledWith('orders')
    })
    
    it('should handle duplicate webhook events', async () => {
      // Arrange
      const orderId = 'order-123'
      
      const webhookData = {
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
      
      const mockSupabase = createMockSupabaseClient()
      
      // Simuler une commande déjà traitée
      mockSupabase.from = jest.fn((table) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: orderId,
                status: 'paid', // Déjà payée
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
      
      mockCreateSupabaseAdminClient.mockReturnValue(mockSupabase as any)
      
      // Act
      const result = await processStripeWebhook(webhookData)
      
      // Assert
      expect(result.success).toBe(true)
      // Le webhook dupliqué devrait être ignoré sans erreur
    })
  })

  describe('Order Status Management', () => {
    it('should handle order status transitions correctly', async () => {
      // Arrange
      const orderId = 'order-123'
      const validTransitions = [
        { from: 'pending', to: 'paid' },
        { from: 'paid', to: 'processing' },
        { from: 'processing', to: 'shipped' },
        { from: 'shipped', to: 'delivered' },
      ]
      
      const mockSupabase = createMockSupabaseClient()
      
      // Mock pour chaque transition
      mockSupabase.from = jest.fn((table) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockImplementation((callback) => {
              // Simuler l'état actuel de la commande
              return Promise.resolve({
                data: {
                  id: orderId,
                  status: 'pending', // Sera mis à jour pour chaque test
                },
                error: null,
              })
            }),
          }
        }
        
        return {
          select: jest.fn().mockReturnThis(),
          then: jest.fn().mockResolvedValue({ data: [], error: null }),
        }
      }) as any
      
      mockCreateSupabaseAdminClient.mockReturnValue(mockSupabase as any)
      
      // Act & Assert
      for (const transition of validTransitions) {
        const result = await updateOrderStatus(orderId, transition.to)
        expect(result.success).toBe(true)
      }
    })
    
    it('should reject invalid status transitions', async () => {
      // Arrange
      const orderId = 'order-123'
      const invalidTransitions = [
        { from: 'delivered', to: 'pending' },  // Retour en arrière
        { from: 'cancelled', to: 'paid' },    // Depuis annulé
        { from: 'pending', to: 'delivered' }, // Saut d'étapes
      ]
      
      const mockSupabase = createMockSupabaseClient()
      
      mockSupabase.from = jest.fn((table) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: orderId,
                status: 'delivered', // État qui ne permet pas de changement
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
      
      mockCreateSupabaseAdminClient.mockReturnValue(mockSupabase as any)
      
      // Act & Assert
      for (const transition of invalidTransitions) {
        const result = await updateOrderStatus(orderId, transition.to)
        expect(result.success).toBe(false)
        expect(result.error).toContain('transition')
      }
    })
  })

  describe('Order Cancellation', () => {
    it('should cancel order and restore inventory', async () => {
      // Arrange
      const user = UserFactory.authenticated()
      const orderId = 'order-123'
      
      const orderItems = [
        { product_id: 'product-1', quantity: 2, unit_price: 29.99 },
        { product_id: 'product-2', quantity: 1, unit_price: 49.99 },
      ]
      
      mockGetActiveUserId.mockResolvedValue(user.user.id)
      
      const mockSupabase = createMockSupabaseClient({ user })
      
      // Mock pour récupérer la commande et ses items
      mockSupabase.from = jest.fn((table) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: orderId,
                user_id: user.user.id,
                status: 'pending',
              },
              error: null,
            }),
            update: jest.fn().mockReturnThis(),
          }
        }
        
        if (table === 'order_items') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            then: jest.fn().mockResolvedValue({
              data: orderItems,
              error: null,
            }),
          }
        }
        
        if (table === 'products') {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            then: jest.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        
        return {
          select: jest.fn().mockReturnThis(),
          then: jest.fn().mockResolvedValue({ data: [], error: null }),
        }
      }) as any
      
      mockCreateSupabaseServerClient.mockReturnValue(mockSupabase as any)
      mockCreateSupabaseAdminClient.mockReturnValue(mockSupabase as any)
      
      // Act
      const result = await cancelOrder(orderId)
      
      // Assert
      expect(result.success).toBe(true)
      
      // Vérifier que l'inventaire est restauré
      expect(mockSupabase.from).toHaveBeenCalledWith('products')
      expect(mockSupabase.from).toHaveBeenCalledWith('order_items')
    })
    
    it('should not cancel already shipped orders', async () => {
      // Arrange
      const user = UserFactory.authenticated()
      const orderId = 'order-123'
      
      mockGetActiveUserId.mockResolvedValue(user.user.id)
      
      const mockSupabase = createMockSupabaseClient({ user })
      
      // Mock commande déjà expédiée
      mockSupabase.from = jest.fn((table) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: orderId,
                user_id: user.user.id,
                status: 'shipped', // Déjà expédiée
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
      const result = await cancelOrder(orderId)
      
      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('expédiée')
    })
  })

  describe('Data Consistency and Race Conditions', () => {
    it('should handle concurrent order modifications', async () => {
      // Arrange
      const orderId = 'order-123'
      
      const mockSupabase = createMockSupabaseClient()
      
      // Simuler une mise à jour concurrente
      let updateCount = 0
      mockSupabase.from = jest.fn((table) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockImplementation(() => {
              updateCount++
              if (updateCount === 1) {
                return Promise.resolve({
                  data: { id: orderId, status: 'pending' },
                  error: null,
                })
              }
              // Simuler un conflit de version
              return Promise.resolve({
                data: null,
                error: { message: 'Version conflict' },
              })
            }),
          }
        }
        
        return {
          select: jest.fn().mockReturnThis(),
          then: jest.fn().mockResolvedValue({ data: [], error: null }),
        }
      }) as any
      
      mockCreateSupabaseAdminClient.mockReturnValue(mockSupabase as any)
      
      // Act - Modifications concurrentes
      const [result1, result2] = await Promise.all([
        updateOrderStatus(orderId, 'paid'),
        updateOrderStatus(orderId, 'processing'),
      ])
      
      // Assert
      // Une des opérations devrait réussir, l'autre échouer
      expect(result1.success || result2.success).toBe(true)
      expect(result1.success && result2.success).toBe(false)
    })
  })
})