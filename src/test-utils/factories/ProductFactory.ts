/**
 * Factory pour créer des produits de test
 * Support pour différents types de produits et variantes
 */

import type { Database } from '@/lib/supabase/types'

type Product = Database['public']['Tables']['products']['Row']
type ProductVariant = Database['public']['Tables']['product_variants']['Row']

export interface MockProduct extends Partial<Product> {
  id: string
  name: string
  slug: string
  price: number
  is_active: boolean
}

export interface MockProductVariant extends Partial<ProductVariant> {
  id: string
  product_id: string
  name: string
  price: number
  stock_quantity: number
}

export interface ProductWithVariants {
  product: MockProduct
  variants: MockProductVariant[]
}

export class ProductFactory {
  private static productCounter = 1
  private static variantCounter = 1
  
  /**
   * Crée un produit simple sans variantes
   */
  static simple(overrides: Partial<MockProduct> = {}): MockProduct {
    const id = overrides.id || `product-${this.productCounter++}`
    const name = overrides.name || `Produit Test ${this.productCounter}`
    
    return {
      id,
      name,
      slug: overrides.slug || name.toLowerCase().replace(/\s+/g, '-'),
      description: 'Description du produit de test',
      price: 29.99,
      category: 'test',
      stock_quantity: 100,
      image_url: 'https://example.com/image.jpg',
      is_active: true,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      shop_id: 'shop-1',
      weight: 100,
      dimensions: '10x10x10',
      sku: `SKU-${id.toUpperCase()}`,
      tags: ['test'],
      is_featured: false,
      discount_percentage: null,
      meta_title: null,
      meta_description: null,
      certification_bio: false,
      certification_local: false,
      certification_artisanal: false,
      origin_country: 'France',
      origin_region: 'Ile-de-France',
      harvest_season: null,
      storage_instructions: null,
      usage_instructions: null,
      nutritional_info: null,
      allergens: null,
      conservation_duration: null,
      producer_notes: null,
      awards: null,
      ...overrides,
    }
  }
  
  /**
   * Crée un produit avec variantes
   */
  static withVariants(
    variantCount: number = 2,
    productOverrides: Partial<MockProduct> = {},
    variantOverrides: Partial<MockProductVariant>[] = []
  ): ProductWithVariants {
    const product = this.simple(productOverrides)
    
    const variants = Array.from({ length: variantCount }, (_, index) => {
      const variantId = `variant-${this.variantCounter++}`
      const variantOverride = variantOverrides[index] || {}
      
      return {
        id: variantId,
        product_id: product.id,
        name: `Variante ${index + 1}`,
        sku: `${product.sku}-V${index + 1}`,
        price: product.price + (index * 5),
        stock_quantity: 50 - (index * 10),
        weight: 100 + (index * 20),
        is_active: true,
        sort_order: index,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        ...variantOverride,
      }
    })
    
    return { product, variants }
  }
  
  /**
   * Crée un produit en rupture de stock
   */
  static outOfStock(overrides: Partial<MockProduct> = {}): MockProduct {
    return this.simple({
      stock_quantity: 0,
      is_active: false,
      ...overrides,
    })
  }
  
  /**
   * Crée un produit en promotion
   */
  static onSale(discountPercentage: number = 20, overrides: Partial<MockProduct> = {}): MockProduct {
    return this.simple({
      discount_percentage: discountPercentage,
      ...overrides,
    })
  }
  
  /**
   * Crée un produit bio certifié
   */
  static organic(overrides: Partial<MockProduct> = {}): MockProduct {
    return this.simple({
      certification_bio: true,
      certification_local: true,
      tags: ['bio', 'local', 'certifié'],
      ...overrides,
    })
  }
  
  /**
   * Crée un produit artisanal
   */
  static artisanal(overrides: Partial<MockProduct> = {}): MockProduct {
    return this.simple({
      certification_artisanal: true,
      tags: ['artisanal', 'fait-main'],
      ...overrides,
    })
  }
  
  /**
   * Crée un produit avec des catégories spécifiques
   */
  static inCategory(category: string, overrides: Partial<MockProduct> = {}): MockProduct {
    return this.simple({
      category,
      tags: [category],
      ...overrides,
    })
  }
  
  /**
   * Crée plusieurs produits pour les tests de liste
   */
  static createBatch(
    count: number,
    factory: () => MockProduct = () => this.simple()
  ): MockProduct[] {
    return Array.from({ length: count }, () => factory())
  }
  
  /**
   * Crée des produits de différentes catégories
   */
  static mixedCategories(): MockProduct[] {
    return [
      this.inCategory('légumes', { name: 'Carottes Bio' }),
      this.inCategory('fruits', { name: 'Pommes Locales' }),
      this.inCategory('herbes', { name: 'Basilic Frais' }),
      this.inCategory('épices', { name: 'Curcuma en Poudre' }),
    ]
  }
  
  /**
   * Reset les compteurs pour des tests reproductibles
   */
  static resetCounters(): void {
    this.productCounter = 1
    this.variantCounter = 1
  }
}