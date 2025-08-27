/**
 * Factory pour créer des produits de test
 * Support pour différents types de produits et variantes
 */

import type { Database } from "@/types/supabase";

type Product = Database["public"]["Tables"]["products"]["Row"];

// Interface pour les tests avec des propriétés optionnelles étendues
interface TestProduct {
  // Required properties for tests
  id: string;
  name: string;
  slug: string;
  price: number;
  is_active: boolean;
  // Optional properties that might not exist in real schema
  stock_quantity?: number;
}

export interface MockProduct {
  // All required Product properties
  id: string;
  name: string;
  slug: string;
  price: number;
  is_active: boolean;
  stock: number;
  stock_quantity?: number; // Alias pour compatibilité avec les tests
  created_at: string;
  updated_at: string;
  currency: string;
  // All optional Product properties (acceptent undefined pour compatibilité)
  category?: string | null;
  description_long?: string | null;
  description_short?: string | null;
  image_url?: string | null;
  inci_list?: string[] | null;
  is_new?: boolean;
  is_on_promotion?: boolean;
  labels?: string[] | null;
  status?: string | null;
  unit?: string | null;
  discount_percentage?: number | null;
}

export interface ProductWithVariants {
  product: MockProduct;
  variants: any[];
}

export class ProductFactory {
  private static productCounter = 1;
  private static variantCounter = 1;

  /**
   * Crée un produit simple sans variantes
   */
  static simple(overrides: Partial<MockProduct> = {}): MockProduct {
    const id = overrides.id || `product-${this.productCounter++}`;
    const name = overrides.name || `Produit Test ${this.productCounter}`;

    const baseProduct = {
      id,
      name,
      slug: overrides.slug || name.toLowerCase().replace(/\s+/g, "-"),
      description_long: "Description longue du produit de test",
      description_short: "Description courte du produit de test",
      price: 29.99,
      stock: 100,
      stock_quantity: 100, // Alias pour compatibilité
      category: "test",
      image_url: "https://example.com/image.jpg",
      is_active: true,
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-01T00:00:00.000Z",
      currency: "EUR",
      is_new: false,
      is_on_promotion: false,
      labels: ["test"],
      status: null,
      unit: null,
      discount_percentage: null,
      ...overrides,
    };

    // S'assurer que les valeurs undefined deviennent null
    return {
      ...baseProduct,
      stock_quantity: baseProduct.stock_quantity ?? baseProduct.stock, // Alias pour compatibilité
      category: baseProduct.category ?? null,
      description_long: baseProduct.description_long ?? null,
      description_short: baseProduct.description_short ?? null,
      image_url: baseProduct.image_url ?? null,
      inci_list: baseProduct.inci_list ?? null,
      is_new: baseProduct.is_new ?? false,
      is_on_promotion: baseProduct.is_on_promotion ?? false,
      labels: baseProduct.labels ?? null,
      status: baseProduct.status ?? null,
      unit: baseProduct.unit ?? null,
      discount_percentage: baseProduct.discount_percentage ?? null,
    };
  }

  /**
   * Crée un produit avec variantes
   */
  static withVariants(
    variantCount: number = 2,
    productOverrides: Partial<MockProduct> = {},
    variantOverrides: any[] = [],
  ): ProductWithVariants {
    const product = this.simple(productOverrides);

    const variants = Array.from({ length: variantCount }, (_, index) => {
      const variantId = `variant-${this.variantCounter++}`;
      const variantOverride = variantOverrides[index] || {};

      return {
        id: variantId,
        product_id: product.id,
        name: `Variante ${index + 1}`,
        price: product.price + index * 5,
        stock: 50 - index * 10,
        ...variantOverride,
      };
    });

    return { product, variants };
  }

  /**
   * Crée un produit en rupture de stock
   */
  static outOfStock(overrides: Partial<MockProduct> = {}): MockProduct {
    return this.simple({
      stock: 0,
      stock_quantity: 0, // Alias pour compatibilité
      is_active: false,
      ...overrides,
    });
  }

  /**
   * Crée un produit en promotion
   */
  static onSale(
    discountPercentage: number = 20,
    overrides: Partial<MockProduct> = {},
  ): MockProduct {
    return this.simple({
      is_on_promotion: true,
      discount_percentage: discountPercentage,
      ...overrides,
    });
  }

  /**
   * Crée un produit bio certifié
   */
  static organic(overrides: Partial<MockProduct> = {}): MockProduct {
    return this.simple({
      labels: ["bio", "local", "certifié"],
      ...overrides,
    });
  }

  /**
   * Crée un produit artisanal
   */
  static artisanal(overrides: Partial<MockProduct> = {}): MockProduct {
    return this.simple({
      labels: ["artisanal", "fait-main"],
      ...overrides,
    });
  }

  /**
   * Crée un produit avec des catégories spécifiques
   */
  static inCategory(
    category: string,
    overrides: Partial<MockProduct> = {},
  ): MockProduct {
    return this.simple({
      category,
      labels: [category],
      ...overrides,
    });
  }

  /**
   * Crée plusieurs produits pour les tests de liste
   */
  static createBatch(
    count: number,
    factory: () => MockProduct = () => this.simple(),
  ): MockProduct[] {
    return Array.from({ length: count }, () => factory());
  }

  /**
   * Crée des produits de différentes catégories
   */
  static mixedCategories(): MockProduct[] {
    return [
      this.inCategory("légumes", { name: "Carottes Bio" }),
      this.inCategory("fruits", { name: "Pommes Locales" }),
      this.inCategory("herbes", { name: "Basilic Frais" }),
      this.inCategory("épices", { name: "Curcuma en Poudre" }),
    ];
  }

  /**
   * Reset les compteurs pour des tests reproductibles
   */
  static resetCounters(): void {
    this.productCounter = 1;
    this.variantCounter = 1;
  }
}
