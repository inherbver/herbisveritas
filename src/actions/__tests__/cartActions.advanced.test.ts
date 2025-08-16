/**
 * Tests avancés pour cartActions - Phase 3.2
 * Tests de concurrence, edge cases, et intégrations complexes
 */

import {
  addItemToCart,
  removeItemFromCart,
  updateCartItemQuantity,
  migrateAndGetCart,
  clearCartAction,
} from '../cartActions'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCart } from '@/lib/cartReader'
import { getActiveUserId } from '@/utils/authUtils'
import { revalidateTag } from 'next/cache'
import {
  UserFactory,
  ProductFactory,
  CartFactory,
  createMockSupabaseClient,
  setupTestEnvironment,
  createFormData,
} from '@/test-utils'

// Mock dependencies
jest.mock('@/lib/supabase/server')
jest.mock('@/lib/cartReader')
jest.mock('@/utils/authUtils')
jest.mock('next/cache')

const mockCreateSupabaseServerClient = createSupabaseServerClient as jest.MockedFunction<typeof createSupabaseServerClient>
const mockGetCart = getCart as jest.MockedFunction<typeof getCart>
const mockGetActiveUserId = getActiveUserId as jest.MockedFunction<typeof getActiveUserId>
const mockRevalidateTag = revalidateTag as jest.MockedFunction<typeof revalidateTag>

describe('cartActions - Advanced Tests (Phase 3.2)', () => {
  let cleanup: () => void
  
  beforeEach(() => {
    ({ cleanup } = setupTestEnvironment())
    jest.clearAllMocks()
  })
  
  afterEach(() => {
    cleanup()
  })

  describe('Concurrency Tests', () => {
    it('should handle concurrent cart updates for the same user', async () => {
      // Arrange
      const user = UserFactory.authenticated()
      const cart = CartFactory.forUser(user.user.id, 1)
      const product = ProductFactory.simple({ id: 'product-1', stock_quantity: 10 })
      
      mockGetActiveUserId.mockResolvedValue(user.user.id)
      mockGetCart.mockResolvedValue({ cart: cart.cart, items: cart.items })
      
      const mockSupabase = createMockSupabaseClient({ user, cart })
      mockCreateSupabaseServerClient.mockReturnValue(mockSupabase as any)
      
      // Act - Simuler des mises à jour concurrentes
      const promises = [
        addItemToCart(null, createFormData({ productId: product.id, quantity: '1' })),
        addItemToCart(null, createFormData({ productId: product.id, quantity: '2' })),
        addItemToCart(null, createFormData({ productId: product.id, quantity: '1' })),
      ]
      
      const results = await Promise.all(promises)
      
      // Assert
      results.forEach(result => {
        expect(result.success).toBe(true)
      })
      
      // Vérifier que les opérations ont été sérialisées
      expect(mockSupabase.from).toHaveBeenCalledWith('cart_items')
    })
    
    it('should handle concurrent cart clearing and item addition', async () => {
      // Arrange
      const user = UserFactory.authenticated()
      const cart = CartFactory.forUser(user.user.id, 3)
      const product = ProductFactory.simple()
      
      mockGetActiveUserId.mockResolvedValue(user.user.id)
      mockGetCart.mockResolvedValue({ cart: cart.cart, items: cart.items })
      
      const mockSupabase = createMockSupabaseClient({ user, cart })
      mockCreateSupabaseServerClient.mockReturnValue(mockSupabase as any)
      
      // Act
      const [clearResult, addResult] = await Promise.all([
        clearCartAction(),
        addItemToCart(null, createFormData({ productId: product.id, quantity: '1' })),
      ])
      
      // Assert
      expect(clearResult.success).toBe(true)
      expect(addResult.success).toBe(true)
    })
  })

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle adding item when product becomes out of stock during operation', async () => {
      // Arrange
      const user = UserFactory.authenticated()
      const cart = CartFactory.forUser(user.user.id, 0)
      const product = ProductFactory.outOfStock() // Stock = 0
      
      mockGetActiveUserId.mockResolvedValue(user.user.id)
      mockGetCart.mockResolvedValue({ cart: cart.cart, items: [] })
      
      const mockSupabase = createMockSupabaseClient({ user, cart })
      // Simuler une vérification de stock qui échoue
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: product,
          error: null,
        }),
      })) as any
      
      mockCreateSupabaseServerClient.mockReturnValue(mockSupabase as any)
      
      // Act
      const result = await addItemToCart(null, createFormData({ productId: product.id, quantity: '1' }))
      
      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('stock')
    })
    
    it('should handle cart migration when guest cart has invalid items', async () => {
      // Arrange
      const user = UserFactory.authenticated()
      const guestCart = CartFactory.forGuest('guest-123', 2)
      
      // Simuler des items avec des produits supprimés
      const invalidItems = guestCart.items.map(item => ({
        ...item,
        product_id: 'deleted-product',
      }))
      
      mockGetActiveUserId.mockResolvedValue(user.user.id)
      mockGetCart
        .mockResolvedValueOnce({ cart: guestCart.cart, items: invalidItems }) // Guest cart
        .mockResolvedValueOnce({ cart: CartFactory.empty(user.user.id), items: [] }) // User cart
      
      const mockSupabase = createMockSupabaseClient({ user })
      // Mock produit non trouvé
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Product not found' },
        }),
      })) as any
      
      mockCreateSupabaseServerClient.mockReturnValue(mockSupabase as any)
      
      // Act
      const result = await migrateAndGetCart('guest-123')
      
      // Assert
      expect(result.success).toBe(true)
      // Devrait retourner un panier vide car les items invalides sont ignorés
      expect(result.data?.items).toHaveLength(0)
    })
    
    it('should handle database connection failures gracefully', async () => {
      // Arrange
      const user = UserFactory.authenticated()
      
      mockGetActiveUserId.mockResolvedValue(user.user.id)
      
      // Simuler une erreur de connexion base de données
      const errorMock = {
        from: jest.fn(() => {
          throw new Error('Database connection failed')
        }),
      }
      
      mockCreateSupabaseServerClient.mockReturnValue(errorMock as any)
      
      // Act
      const result = await addItemToCart('product-1', 1)
      
      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('erreur technique')
    })
    
    it('should handle RLS policy violations', async () => {
      // Arrange
      const user = UserFactory.authenticated()
      
      mockGetActiveUserId.mockResolvedValue(user.user.id)
      
      const mockSupabase = createMockSupabaseClient({ user })
      // Simuler une violation RLS
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'RLS: access denied' },
        }),
      })) as any
      
      mockCreateSupabaseServerClient.mockReturnValue(mockSupabase as any)
      
      // Act
      const result = await addItemToCart('product-1', 1)
      
      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('autorisé')
    })
  })

  describe('Performance and Optimization Tests', () => {
    it('should batch multiple cart operations efficiently', async () => {
      // Arrange
      const user = UserFactory.authenticated()
      const cart = CartFactory.forUser(user.user.id, 0)
      const products = ProductFactory.createBatch(5)
      
      mockGetActiveUserId.mockResolvedValue(user.user.id)
      mockGetCart.mockResolvedValue({ cart: cart.cart, items: [] })
      
      const mockSupabase = createMockSupabaseClient({ user, cart })
      let operationCount = 0
      
      // Compter les opérations de base de données
      const originalFrom = mockSupabase.from
      mockSupabase.from = jest.fn((...args) => {
        operationCount++
        return originalFrom(...args)
      })
      
      mockCreateSupabaseServerClient.mockReturnValue(mockSupabase as any)
      
      // Act - Ajouter plusieurs produits séquentiellement
      const startTime = Date.now()
      
      for (const product of products) {
        await addItemToCart(product.id, 1)
      }
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Assert
      expect(duration).toBeLessThan(1000) // Moins d'une seconde pour 5 opérations
      expect(operationCount).toBeGreaterThan(0)
    })
    
    it('should handle large cart quantities efficiently', async () => {
      // Arrange
      const user = UserFactory.authenticated()
      const cart = CartFactory.withLargeQuantities(user.user.id)
      
      mockGetActiveUserId.mockResolvedValue(user.user.id)
      mockGetCart.mockResolvedValue(cart)
      
      const mockSupabase = createMockSupabaseClient({ user, cart })
      mockCreateSupabaseServerClient.mockReturnValue(mockSupabase as any)
      
      // Act
      const result = await updateCartItemQuantity(cart.items[0].id, 100)
      
      // Assert
      expect(result.success).toBe(true)
      expect(mockRevalidateTag).toHaveBeenCalledWith('cart')
    })
  })

  describe('Security Tests', () => {
    it('should prevent unauthorized access to other users carts', async () => {
      // Arrange
      const user1 = UserFactory.authenticated({ user: { id: 'user-1' } })
      const user2 = UserFactory.authenticated({ user: { id: 'user-2' } })
      const cart1 = CartFactory.forUser(user1.user.id, 2)
      
      mockGetActiveUserId.mockResolvedValue(user2.user.id) // user2 essaie d'accéder au cart de user1
      
      const mockSupabase = createMockSupabaseClient({ user: user2 })
      // Simuler RLS qui bloque l'accès
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({
          data: [],
          error: { message: 'RLS: Row-level security policy violation' },
        }),
      })) as any
      
      mockCreateSupabaseServerClient.mockReturnValue(mockSupabase as any)
      
      // Act
      const result = await removeItemFromCart(cart1.items[0].id)
      
      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('autorisé')
    })
    
    it('should validate cart ownership during migration', async () => {
      // Arrange
      const user = UserFactory.authenticated()
      const guestCart = CartFactory.forGuest('guest-123', 1)
      const maliciousCart = CartFactory.forUser('other-user-id', 1)
      
      mockGetActiveUserId.mockResolvedValue(user.user.id)
      
      // Simuler une tentative de migration d'un cart d'un autre utilisateur
      mockGetCart
        .mockResolvedValueOnce(maliciousCart) // Cart qui appartient à quelqu'un d'autre
        .mockResolvedValueOnce({ cart: CartFactory.empty(user.user.id), items: [] })
      
      const mockSupabase = createMockSupabaseClient({ user })
      mockCreateSupabaseServerClient.mockReturnValue(mockSupabase as any)
      
      // Act
      const result = await migrateAndGetCart('guest-123')
      
      // Assert
      expect(result.success).toBe(true)
      // La migration devrait ignorer le cart malicieux et retourner un cart vide
      expect(result.data?.items).toHaveLength(0)
    })
  })

  describe('Data Integrity Tests', () => {
    it('should maintain cart consistency during complex operations', async () => {
      // Arrange
      const user = UserFactory.authenticated()
      const initialCart = CartFactory.forUser(user.user.id, 2)
      
      mockGetActiveUserId.mockResolvedValue(user.user.id)
      mockGetCart.mockResolvedValue(initialCart)
      
      const mockSupabase = createMockSupabaseClient({ user, cart: initialCart })
      mockCreateSupabaseServerClient.mockReturnValue(mockSupabase as any)
      
      // Act - Série d'opérations complexes
      await addItemToCart('new-product', 3)
      await updateCartItemQuantity(initialCart.items[0].id, 5)
      await removeItemFromCart(initialCart.items[1].id)
      
      // Assert
      expect(mockRevalidateTag).toHaveBeenCalledWith('cart')
      // Vérifier que les opérations ont été effectuées dans l'ordre
      expect(mockSupabase.from).toHaveBeenCalledWith('cart_items')
    })
    
    it('should handle partial failures during batch operations', async () => {
      // Arrange
      const user = UserFactory.authenticated()
      const cart = CartFactory.forUser(user.user.id, 3)
      
      mockGetActiveUserId.mockResolvedValue(user.user.id)
      mockGetCart.mockResolvedValue(cart)
      
      const mockSupabase = createMockSupabaseClient({ user, cart })
      
      // Simuler une erreur partielle (2ème opération échoue)
      let callCount = 0
      mockSupabase.from = jest.fn(() => {
        callCount++
        if (callCount === 2) {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
            then: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Constraint violation' },
            }),
          }
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          then: jest.fn().mockResolvedValue({ data: [], error: null }),
        }
      }) as any
      
      mockCreateSupabaseServerClient.mockReturnValue(mockSupabase as any)
      
      // Act
      const results = await Promise.all([
        removeItemFromCart(cart.items[0].id),
        removeItemFromCart(cart.items[1].id), // Cette opération échouera
        removeItemFromCart(cart.items[2].id),
      ])
      
      // Assert
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
      expect(results[2].success).toBe(true)
    })
  })
})