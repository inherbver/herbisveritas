/**
 * Product Repository Interface
 * 
 * Centralise toutes les opérations liées aux produits.
 * Remplace progressivement les opérations dans productActions.
 */

import { Result } from '@/lib/core/result';
import { Repository } from './repository.interface';

// Types pour les entités Product
export type ProductStatus = 'active' | 'inactive' | 'draft';

export interface ProductTranslation {
  id: string;
  product_id: string;
  locale: string;
  name: string;
  short_description?: string | null;
  description_long?: string | null;
  usage_instructions?: string | null;
  properties?: string | null;
  composition_text?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  slug: string;
  price: number;
  stock: number;
  unit: string;
  image_url: string;
  inci_list: string[];
  status: ProductStatus;
  is_active: boolean;
  is_new: boolean;
  is_on_promotion: boolean;
  labels: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface ProductWithTranslations extends Product {
  translations?: ProductTranslation[];
}

export interface ProductWithCurrentTranslation extends Product {
  name: string;
  short_description?: string | null;
  description_long?: string | null;
  usage_instructions?: string | null;
  properties?: string | null;
  composition_text?: string | null;
}

// Types pour les opérations CRUD
export interface CreateProductData {
  slug: string;
  price: number;
  stock: number;
  unit: string;
  image_url: string;
  inci_list: string[];
  status: ProductStatus;
  is_active: boolean;
  is_new: boolean;
  is_on_promotion: boolean;
  labels?: string[] | null;
}

export interface UpdateProductData {
  slug?: string;
  price?: number;
  stock?: number;
  unit?: string;
  image_url?: string;
  inci_list?: string[];
  status?: ProductStatus;
  is_active?: boolean;
  is_new?: boolean;
  is_on_promotion?: boolean;
  labels?: string[] | null;
}

export interface CreateProductTranslationData {
  locale: string;
  name: string;
  short_description?: string | null;
  description_long?: string | null;
  usage_instructions?: string | null;
  properties?: string | null;
  composition_text?: string | null;
}

export interface UpdateProductTranslationData {
  name?: string;
  short_description?: string | null;
  description_long?: string | null;
  usage_instructions?: string | null;
  properties?: string | null;
  composition_text?: string | null;
}

// Types pour les filtres et recherches
export interface ProductFilters {
  status?: ProductStatus;
  is_active?: boolean;
  is_new?: boolean;
  is_on_promotion?: boolean;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  labels?: string[];
  search?: string;
}

export interface ProductSearchParams {
  filters?: ProductFilters;
  locale?: string;
  sort_by?: 'name' | 'price' | 'created_at' | 'stock';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface PaginatedProducts {
  products: ProductWithCurrentTranslation[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Types pour la gestion du stock
export interface StockUpdate {
  product_id: string;
  quantity_delta: number; // Positif pour ajouter, négatif pour retirer
  reason: 'sale' | 'return' | 'adjustment' | 'restock';
  reference?: string; // Ex: order_id pour une vente
}

export interface StockMovement {
  id: string;
  product_id: string;
  quantity_before: number;
  quantity_after: number;
  quantity_delta: number;
  reason: string;
  reference?: string;
  created_at: string;
}

/**
 * Interface du Repository Product
 * 
 * Couvre toutes les opérations nécessaires pour la gestion des produits
 * dans l'application e-commerce.
 */
export interface IProductRepository extends Repository<Product> {
  // === Opérations de base ===
  
  /**
   * Trouve un produit par slug avec traductions
   */
  findBySlug(slug: string, locale?: string): Promise<Result<ProductWithCurrentTranslation | null, Error>>;
  
  /**
   * Trouve un produit avec toutes ses traductions
   */
  findByIdWithTranslations(id: string): Promise<Result<ProductWithTranslations | null, Error>>;
  
  /**
   * Trouve les produits actifs avec pagination et filtres
   */
  findActiveProducts(params: ProductSearchParams): Promise<Result<PaginatedProducts, Error>>;
  
  /**
   * Trouve tous les produits (admin) avec pagination et filtres
   */
  findAllProducts(params: ProductSearchParams): Promise<Result<PaginatedProducts, Error>>;
  
  // === Opérations CRUD ===
  
  /**
   * Crée un nouveau produit
   */
  createProduct(productData: CreateProductData): Promise<Result<Product, Error>>;
  
  /**
   * Met à jour un produit existant
   */
  updateProduct(productId: string, productData: UpdateProductData): Promise<Result<Product, Error>>;
  
  /**
   * Supprime un produit (soft delete)
   */
  deleteProduct(productId: string): Promise<Result<void, Error>>;
  
  /**
   * Met à jour le statut d'un produit
   */
  updateProductStatus(productId: string, status: ProductStatus): Promise<Result<Product, Error>>;
  
  // === Opérations de traduction ===
  
  /**
   * Crée une traduction pour un produit
   */
  createTranslation(productId: string, translationData: CreateProductTranslationData): Promise<Result<ProductTranslation, Error>>;
  
  /**
   * Met à jour une traduction existante
   */
  updateTranslation(productId: string, locale: string, translationData: UpdateProductTranslationData): Promise<Result<ProductTranslation, Error>>;
  
  /**
   * Supprime une traduction
   */
  deleteTranslation(productId: string, locale: string): Promise<Result<void, Error>>;
  
  /**
   * Trouve la traduction d'un produit pour une locale
   */
  findTranslation(productId: string, locale: string): Promise<Result<ProductTranslation | null, Error>>;
  
  // === Opérations de gestion du stock ===
  
  /**
   * Met à jour le stock d'un produit
   */
  updateStock(productId: string, newStock: number): Promise<Result<Product, Error>>;
  
  /**
   * Ajuste le stock avec traçabilité
   */
  adjustStock(update: StockUpdate): Promise<Result<{ product: Product; movement: StockMovement }, Error>>;
  
  /**
   * Vérifie la disponibilité en stock
   */
  checkStockAvailability(productId: string, requestedQuantity: number): Promise<Result<boolean, Error>>;
  
  /**
   * Réserve du stock (transaction)
   */
  reserveStock(productId: string, quantity: number, reference: string): Promise<Result<Product, Error>>;
  
  /**
   * Libère du stock réservé
   */
  releaseStock(productId: string, quantity: number, reference: string): Promise<Result<Product, Error>>;
  
  /**
   * Obtient l'historique des mouvements de stock
   */
  getStockMovements(productId: string, limit?: number): Promise<Result<StockMovement[], Error>>;
  
  // === Opérations de recherche ===
  
  /**
   * Recherche de produits par terme
   */
  searchProducts(query: string, filters?: ProductFilters, locale?: string): Promise<Result<ProductWithCurrentTranslation[], Error>>;
  
  /**
   * Trouve les produits en vedette
   */
  getFeaturedProducts(limit?: number, locale?: string): Promise<Result<ProductWithCurrentTranslation[], Error>>;
  
  /**
   * Trouve les nouveaux produits
   */
  getNewProducts(limit?: number, locale?: string): Promise<Result<ProductWithCurrentTranslation[], Error>>;
  
  /**
   * Trouve les produits en promotion
   */
  getPromotionalProducts(limit?: number, locale?: string): Promise<Result<ProductWithCurrentTranslation[], Error>>;
  
  /**
   * Trouve les produits par étiquettes
   */
  findByLabels(labels: string[], locale?: string): Promise<Result<ProductWithCurrentTranslation[], Error>>;
  
  /**
   * Trouve les produits similaires
   */
  findSimilarProducts(productId: string, limit?: number, locale?: string): Promise<Result<ProductWithCurrentTranslation[], Error>>;
  
  // === Opérations de validation ===
  
  /**
   * Valide les données d'un produit avant création/mise à jour
   */
  validateProductData(productData: CreateProductData | UpdateProductData): Promise<Result<void, Error>>;
  
  /**
   * Vérifie si un slug est disponible
   */
  isSlugAvailable(slug: string, excludeProductId?: string): Promise<Result<boolean, Error>>;
  
  /**
   * Valide la cohérence des traductions
   */
  validateTranslations(translations: CreateProductTranslationData[]): Promise<Result<void, Error>>;
  
  // === Opérations de cache (Context7 requirement) ===
  
  /**
   * Met en cache les produits fréquemment demandés
   */
  cachePopularProducts(locale?: string): Promise<Result<void, Error>>;
  
  /**
   * Invalide le cache pour un produit
   */
  invalidateProductCache(productId: string): Promise<Result<void, Error>>;
  
  /**
   * Obtient les produits depuis le cache
   */
  getCachedProducts(key: string): Promise<Result<ProductWithCurrentTranslation[] | null, Error>>;
  
  // === Opérations utilitaires ===
  
  /**
   * Compte les produits par statut
   */
  countProductsByStatus(): Promise<Result<Record<ProductStatus, number>, Error>>;
  
  /**
   * Obtient les statistiques des produits
   */
  getProductStats(): Promise<Result<{
    total: number;
    active: number;
    inactive: number;
    draft: number;
    out_of_stock: number;
    low_stock: number;
  }, Error>>;
  
  /**
   * Trouve les produits en rupture de stock
   */
  findOutOfStockProducts(): Promise<Result<ProductWithCurrentTranslation[], Error>>;
  
  /**
   * Trouve les produits en stock faible
   */
  findLowStockProducts(threshold?: number): Promise<Result<ProductWithCurrentTranslation[], Error>>;
  
  /**
   * Génère un slug unique à partir d'un nom
   */
  generateUniqueSlug(name: string): Promise<Result<string, Error>>;
  
  /**
   * Optimise les images de produits (URLs, formats)
   */
  optimizeProductImages(productId: string): Promise<Result<Product, Error>>;
}

/**
 * Repository Service Token pour le Container DI
 */
export const PRODUCT_REPOSITORY_TOKEN = 'ProductRepository' as const;

/**
 * Configuration des limites de stock
 */
export const STOCK_CONFIG = {
  LOW_STOCK_THRESHOLD: 10,
  CRITICAL_STOCK_THRESHOLD: 5,
  MAX_RESERVATION_TIME: 30 * 60 * 1000, // 30 minutes en ms
} as const;