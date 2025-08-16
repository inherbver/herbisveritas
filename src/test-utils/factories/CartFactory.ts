/**
 * Factory pour créer des paniers de test
 * Support pour différents états de panier et scénarios
 */

import type { Database } from '@/lib/supabase/types'
import { ProductFactory } from './ProductFactory'

type CartItem = Database['public']['Tables']['cart_items']['Row']
type Cart = Database['public']['Tables']['carts']['Row']

export interface MockCartItem extends Partial<CartItem> {
  id: string
  cart_id: string
  product_id: string
  quantity: number
  unit_price: number
}

export interface MockCart extends Partial<Cart> {
  id: string
  user_id?: string | null
  guest_id?: string | null
}

export interface CartWithItems {
  cart: MockCart
  items: MockCartItem[]
}

export class CartFactory {
  private static cartCounter = 1
  private static itemCounter = 1
  
  /**
   * Crée un panier vide
   */
  static empty(userId?: string, guestId?: string): MockCart {
    const id = `cart-${this.cartCounter++}`
    
    return {
      id,
      user_id: userId || null,
      guest_id: guestId || null,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    }
  }
  
  /**
   * Crée un panier avec des articles
   */
  static withItems(
    userId?: string,
    itemCount: number = 2,
    guestId?: string
  ): CartWithItems {
    const cart = this.empty(userId, guestId)
    
    const items = Array.from({ length: itemCount }, (_, index) => {
      const product = ProductFactory.simple({
        id: `product-${index + 1}`,
        name: `Produit ${index + 1}`,
        price: 10 + (index * 5),
      })
      
      return this.createCartItem({
        cart_id: cart.id,
        product_id: product.id,
        quantity: index + 1,
        unit_price: product.price,
      })
    })
    
    return { cart, items }
  }
  
  /**
   * Crée un article de panier
   */
  static createCartItem(overrides: Partial<MockCartItem> = {}): MockCartItem {
    const id = overrides.id || `item-${this.itemCounter++}`
    
    return {
      id,
      cart_id: 'cart-1',
      product_id: 'product-1',
      product_variant_id: null,
      quantity: 1,
      unit_price: 29.99,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      ...overrides,
    }
  }
  
  /**
   * Crée un panier pour utilisateur authentifié
   */
  static forUser(userId: string, itemCount: number = 3): CartWithItems {
    return this.withItems(userId, itemCount)
  }
  
  /**
   * Crée un panier pour utilisateur invité
   */
  static forGuest(guestId: string, itemCount: number = 1): CartWithItems {
    return this.withItems(undefined, itemCount, guestId)
  }
  
  /**
   * Crée un panier avec des produits en promotion
   */
  static withDiscountedItems(userId?: string, guestId?: string): CartWithItems {
    const cart = this.empty(userId, guestId)
    
    const discountedProduct = ProductFactory.onSale(20, {
      id: 'discounted-product',
      name: 'Produit en Promotion',
      price: 50,
    })
    
    const regularProduct = ProductFactory.simple({
      id: 'regular-product',
      name: 'Produit Normal',
      price: 30,
    })
    
    const items = [
      this.createCartItem({
        cart_id: cart.id,
        product_id: discountedProduct.id,
        quantity: 2,
        unit_price: discountedProduct.price,
      }),
      this.createCartItem({
        cart_id: cart.id,
        product_id: regularProduct.id,
        quantity: 1,
        unit_price: regularProduct.price,
      }),
    ]
    
    return { cart, items }
  }
  
  /**
   * Crée un panier avec de grandes quantités (test limite)
   */
  static withLargeQuantities(userId?: string, guestId?: string): CartWithItems {
    const cart = this.empty(userId, guestId)
    
    const product = ProductFactory.simple({
      id: 'bulk-product',
      name: 'Produit en Vrac',
      price: 5,
    })
    
    const items = [
      this.createCartItem({
        cart_id: cart.id,
        product_id: product.id,
        quantity: 50, // Grande quantité
        unit_price: product.price,
      }),
    ]
    
    return { cart, items }
  }
  
  /**
   * Crée un panier avec des produits en rupture de stock
   */
  static withOutOfStockItems(userId?: string, guestId?: string): CartWithItems {
    const cart = this.empty(userId, guestId)
    
    const outOfStockProduct = ProductFactory.outOfStock({
      id: 'out-of-stock-product',
      name: 'Produit Épuisé',
      price: 25,
    })
    
    const items = [
      this.createCartItem({
        cart_id: cart.id,
        product_id: outOfStockProduct.id,
        quantity: 1,
        unit_price: outOfStockProduct.price,
      }),
    ]
    
    return { cart, items }
  }
  
  /**
   * Crée un panier avec des variantes de produits
   */
  static withVariants(userId?: string, guestId?: string): CartWithItems {
    const cart = this.empty(userId, guestId)
    const { product, variants } = ProductFactory.withVariants(2)
    
    const items = variants.map((variant, index) => 
      this.createCartItem({
        cart_id: cart.id,
        product_id: product.id,
        product_variant_id: variant.id,
        quantity: index + 1,
        unit_price: variant.price,
      })
    )
    
    return { cart, items }
  }
  
  /**
   * Calcule le total d'un panier
   */
  static calculateTotal(cartWithItems: CartWithItems): number {
    return cartWithItems.items.reduce(
      (total, item) => total + (item.unit_price * item.quantity),
      0
    )
  }
  
  /**
   * Calcule le nombre total d'articles
   */
  static calculateItemCount(cartWithItems: CartWithItems): number {
    return cartWithItems.items.reduce(
      (total, item) => total + item.quantity,
      0
    )
  }
  
  /**
   * Reset les compteurs pour des tests reproductibles
   */
  static resetCounters(): void {
    this.cartCounter = 1
    this.itemCounter = 1
  }
}