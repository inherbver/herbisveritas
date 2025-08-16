/**
 * Tests pour valider les factories de données
 */

import { UserFactory, ProductFactory, CartFactory } from '@/test-utils'

describe('Test Factories Validation', () => {
  beforeEach(() => {
    UserFactory.resetCounter()
    ProductFactory.resetCounters()
    CartFactory.resetCounters()
  })

  describe('UserFactory', () => {
    it('should create a guest user context', () => {
      const context = UserFactory.guest()
      
      expect(context.user).toBeNull()
      expect(context.profile).toBeNull()
    })
    
    it('should create an authenticated user', () => {
      const userWithProfile = UserFactory.authenticated()
      
      expect(userWithProfile.user).toBeDefined()
      expect(userWithProfile.user.id).toBeDefined()
      expect(userWithProfile.user.email).toContain('@')
      expect(userWithProfile.profile).toBeDefined()
      expect(userWithProfile.profile.is_admin).toBe(false)
    })
    
    it('should create an admin user', () => {
      const adminUser = UserFactory.admin()
      
      expect(adminUser.user).toBeDefined()
      expect(adminUser.profile.is_admin).toBe(true)
      expect(adminUser.user.email).toContain('@')
    })
    
    it('should create users with custom overrides', () => {
      const customUser = UserFactory.authenticated({
        user: { email: 'custom@test.com' },
        profile: { first_name: 'Custom', last_name: 'User' },
      })
      
      expect(customUser.user.email).toBe('custom@test.com')
      expect(customUser.profile.first_name).toBe('Custom')
      expect(customUser.profile.last_name).toBe('User')
    })
  })

  describe('ProductFactory', () => {
    it('should create a simple product', () => {
      const product = ProductFactory.simple()
      
      expect(product.id).toBeDefined()
      expect(product.name).toBeDefined()
      expect(product.slug).toBeDefined()
      expect(product.price).toBeGreaterThan(0)
      expect(product.is_active).toBe(true)
    })
    
    it('should create a product with variants', () => {
      const { product, variants } = ProductFactory.withVariants(3)
      
      expect(product).toBeDefined()
      expect(variants).toHaveLength(3)
      
      variants.forEach((variant, index) => {
        expect(variant.product_id).toBe(product.id)
        expect(variant.name).toBe(`Variante ${index + 1}`)
        expect(variant.price).toBeGreaterThan(0)
      })
    })
    
    it('should create an out of stock product', () => {
      const product = ProductFactory.outOfStock()
      
      expect(product.stock_quantity).toBe(0)
      expect(product.is_active).toBe(false)
    })
    
    it('should create a product on sale', () => {
      const product = ProductFactory.onSale(25)
      
      expect(product.discount_percentage).toBe(25)
    })
    
    it('should create products by category', () => {
      const products = ProductFactory.mixedCategories()
      
      expect(products).toHaveLength(4)
      expect(products.map(p => p.category)).toContain('légumes')
      expect(products.map(p => p.category)).toContain('fruits')
      expect(products.map(p => p.category)).toContain('herbes')
      expect(products.map(p => p.category)).toContain('épices')
    })
  })

  describe('CartFactory', () => {
    it('should create an empty cart', () => {
      const cart = CartFactory.empty('user-123')
      
      expect(cart.id).toBeDefined()
      expect(cart.user_id).toBe('user-123')
      expect(cart.guest_id).toBeNull()
    })
    
    it('should create a cart with items', () => {
      const { cart, items } = CartFactory.withItems('user-123', 3)
      
      expect(cart.user_id).toBe('user-123')
      expect(items).toHaveLength(3)
      
      items.forEach((item, index) => {
        expect(item.cart_id).toBe(cart.id)
        expect(item.quantity).toBe(index + 1)
        expect(item.unit_price).toBeGreaterThan(0)
      })
    })
    
    it('should create a guest cart', () => {
      const { cart, items } = CartFactory.forGuest('guest-456', 2)
      
      expect(cart.guest_id).toBe('guest-456')
      expect(cart.user_id).toBeNull()
      expect(items).toHaveLength(2)
    })
    
    it('should calculate cart total correctly', () => {
      const cartWithItems = CartFactory.withItems('user-123', 2)
      const total = CartFactory.calculateTotal(cartWithItems)
      
      const expectedTotal = cartWithItems.items.reduce(
        (sum, item) => sum + (item.unit_price * item.quantity),
        0
      )
      
      expect(total).toBe(expectedTotal)
    })
    
    it('should calculate item count correctly', () => {
      const cartWithItems = CartFactory.withItems('user-123', 3)
      const itemCount = CartFactory.calculateItemCount(cartWithItems)
      
      const expectedCount = cartWithItems.items.reduce(
        (sum, item) => sum + item.quantity,
        0
      )
      
      expect(itemCount).toBe(expectedCount)
    })
    
    it('should create cart with discounted items', () => {
      const { cart, items } = CartFactory.withDiscountedItems('user-123')
      
      expect(items.length).toBeGreaterThan(0)
      expect(cart.user_id).toBe('user-123')
    })
  })

  describe('Factory Integration', () => {
    it('should work together to create complete test scenarios', () => {
      const user = UserFactory.authenticated({ user: { id: 'test-user-123' } })
      const cart = CartFactory.forUser(user.user.id, 2)
      const products = ProductFactory.createBatch(5)
      
      expect(user.user.id).toBe('test-user-123')
      expect(cart.cart.user_id).toBe('test-user-123')
      expect(cart.items).toHaveLength(2)
      expect(products).toHaveLength(5)
      
      // Vérifier que chaque item du panier fait référence à un produit valide
      cart.items.forEach(item => {
        expect(item.product_id).toBeDefined()
        expect(item.cart_id).toBe(cart.cart.id)
      })
    })
  })
})