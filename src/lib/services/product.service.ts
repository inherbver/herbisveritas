/**
 * Product Service - Couche d'intégration avec migration progressive
 * 
 * Cette couche utilise les feature flags pour décider entre l'ancien système
 * (productActions) et le nouveau ProductRepository.
 * 
 * Pattern "Strangler Fig" : remplace progressivement l'ancien code.
 */

import { Result } from '@/lib/core/result';
import { LogUtils } from '@/lib/core/logger';
import { isRepositoryEnabled } from '@/lib/config/feature-flags';
import { ProductSupabaseRepository } from '@/lib/infrastructure/repositories/product.supabase.repository';
import type { 
  IProductRepository,
  Product,
  ProductWithTranslations,
  ProductWithCurrentTranslation,
  ProductSearchParams,
  PaginatedProducts,
  CreateProductData,
  UpdateProductData,
  ProductStatus,
  StockUpdate
} from '@/lib/domain/interfaces/product.repository.interface';

// Import des anciennes fonctions (fallback)
import { 
  createProduct as createProductLegacy, 
  updateProduct as updateProductLegacy,
  deleteProduct as deleteProductLegacy,
  updateProductStatus as updateProductStatusLegacy
} from '@/actions/productActions';
import type { ProductFormValues } from '@/lib/validators/product-validator';

export class ProductService {
  private repository: IProductRepository;

  constructor() {
    this.repository = new ProductSupabaseRepository();
  }

  // === Opérations CRUD principales ===

  /**
   * Obtenir un produit par slug
   */
  async getProductBySlug(slug: string, locale?: string): Promise<Result<ProductWithCurrentTranslation | null, Error>> {
    const context = LogUtils.createOperationContext('getProductBySlug', 'product-service');
    LogUtils.logOperationStart('getProductBySlug', { ...context, slug, locale });

    try {
      if (isRepositoryEnabled('USE_PRODUCT_REPOSITORY')) {
        LogUtils.logOperationInfo('getProductBySlug', 'Using new ProductRepository', context);
        const result = await this.repository.findBySlug(slug, locale);
        
        if (result.isSuccess()) {
          LogUtils.logOperationSuccess('getProductBySlug', { 
            ...context, 
            source: 'repository', 
            found: !!result.getValue() 
          });
          return result;
        }

        LogUtils.logOperationWarning('getProductBySlug', 'Repository failed, falling back to legacy', context);
      }

      // Fallback vers l'ancien système
      LogUtils.logOperationInfo('getProductBySlug', 'Using legacy system (not implemented)', context);
      
      // TODO: Implémenter fallback vers l'ancien système
      // Pour l'instant, on retourne une erreur si le repository n'est pas disponible
      LogUtils.logOperationError('getProductBySlug', 'Legacy fallback not implemented', context);
      return Result.failure(new Error('Legacy fallback not implemented for getProductBySlug'));

    } catch (error) {
      LogUtils.logOperationError('getProductBySlug', error, context);
      return Result.failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Obtenir un produit avec toutes ses traductions
   */
  async getProductWithTranslations(productId: string): Promise<Result<ProductWithTranslations | null, Error>> {
    const context = LogUtils.createOperationContext('getProductWithTranslations', 'product-service');
    LogUtils.logOperationStart('getProductWithTranslations', { ...context, productId });

    try {
      if (isRepositoryEnabled('USE_PRODUCT_REPOSITORY')) {
        LogUtils.logOperationInfo('getProductWithTranslations', 'Using new ProductRepository', context);
        const result = await this.repository.findByIdWithTranslations(productId);
        
        if (result.isSuccess()) {
          LogUtils.logOperationSuccess('getProductWithTranslations', { 
            ...context, 
            source: 'repository', 
            found: !!result.getValue(),
            translationsCount: result.getValue()?.translations?.length || 0
          });
          return result;
        }

        LogUtils.logOperationWarning('getProductWithTranslations', 'Repository failed, falling back to legacy', context);
      }

      // Fallback: pas d'équivalent dans l'ancien système
      LogUtils.logOperationError('getProductWithTranslations', 'Legacy fallback not available', context);
      return Result.failure(new Error('Legacy fallback not available for getProductWithTranslations'));

    } catch (error) {
      LogUtils.logOperationError('getProductWithTranslations', error, context);
      return Result.failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Obtenir les produits actifs avec pagination
   */
  async getActiveProducts(params: ProductSearchParams): Promise<Result<PaginatedProducts, Error>> {
    const context = LogUtils.createOperationContext('getActiveProducts', 'product-service');
    LogUtils.logOperationStart('getActiveProducts', { ...context, params });

    try {
      if (isRepositoryEnabled('USE_PRODUCT_REPOSITORY')) {
        LogUtils.logOperationInfo('getActiveProducts', 'Using new ProductRepository', context);
        const result = await this.repository.findActiveProducts(params);
        
        if (result.isSuccess()) {
          LogUtils.logOperationSuccess('getActiveProducts', { 
            ...context, 
            source: 'repository', 
            productsCount: result.getValue()!.products.length,
            total: result.getValue()!.total
          });
          return result;
        }

        LogUtils.logOperationWarning('getActiveProducts', 'Repository failed, falling back to legacy', context);
      }

      // Fallback vers l'ancien système
      LogUtils.logOperationInfo('getActiveProducts', 'Using legacy system (not implemented)', context);
      
      // TODO: Implémenter fallback vers l'ancien système de requête produits
      LogUtils.logOperationError('getActiveProducts', 'Legacy fallback not implemented', context);
      return Result.failure(new Error('Legacy fallback not implemented for getActiveProducts'));

    } catch (error) {
      LogUtils.logOperationError('getActiveProducts', error, context);
      return Result.failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Obtenir tous les produits (admin)
   */
  async getAllProducts(params: ProductSearchParams): Promise<Result<PaginatedProducts, Error>> {
    const context = LogUtils.createOperationContext('getAllProducts', 'product-service');
    LogUtils.logOperationStart('getAllProducts', { ...context, params });

    try {
      if (isRepositoryEnabled('USE_PRODUCT_REPOSITORY')) {
        LogUtils.logOperationInfo('getAllProducts', 'Using new ProductRepository', context);
        const result = await this.repository.findAllProducts(params);
        
        if (result.isSuccess()) {
          LogUtils.logOperationSuccess('getAllProducts', { 
            ...context, 
            source: 'repository', 
            productsCount: result.getValue()!.products.length,
            total: result.getValue()!.total
          });
          return result;
        }

        LogUtils.logOperationWarning('getAllProducts', 'Repository failed, falling back to legacy', context);
      }

      // Fallback vers l'ancien système
      LogUtils.logOperationInfo('getAllProducts', 'Using legacy system (not implemented)', context);
      LogUtils.logOperationError('getAllProducts', 'Legacy fallback not implemented', context);
      return Result.failure(new Error('Legacy fallback not implemented for getAllProducts'));

    } catch (error) {
      LogUtils.logOperationError('getAllProducts', error, context);
      return Result.failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Créer un nouveau produit
   */
  async createProduct(productData: CreateProductData, translationData?: any): Promise<Result<Product, Error>> {
    const context = LogUtils.createOperationContext('createProduct', 'product-service');
    LogUtils.logOperationStart('createProduct', { ...context, slug: productData.slug });

    try {
      if (isRepositoryEnabled('USE_PRODUCT_REPOSITORY')) {
        LogUtils.logOperationInfo('createProduct', 'Using new ProductRepository', context);
        
        // Validation via repository
        const validationResult = await this.repository.validateProductData(productData);
        if (!validationResult.isSuccess()) {
          LogUtils.logOperationError('createProduct', validationResult.getError(), context);
          return validationResult;
        }

        const result = await this.repository.createProduct(productData);
        
        if (result.isSuccess()) {
          LogUtils.logOperationSuccess('createProduct', { 
            ...context, 
            source: 'repository',
            productId: result.getValue()!.id
          });
          return result;
        }

        LogUtils.logOperationWarning('createProduct', 'Repository failed, falling back to legacy', context);
      }

      // Fallback vers l'ancien système
      LogUtils.logOperationInfo('createProduct', 'Using legacy productActions', context);
      
      // Conversion des données pour le format legacy
      const legacyData: ProductFormValues = {
        id: crypto.randomUUID(),
        slug: productData.slug,
        price: productData.price,
        stock: productData.stock,
        unit: productData.unit,
        image_url: productData.image_url,
        inci_list: productData.inci_list,
        status: productData.status,
        is_active: productData.is_active,
        is_new: productData.is_new,
        is_on_promotion: productData.is_on_promotion,
        translations: translationData || []
      };

      const legacyResult = await createProductLegacy(legacyData);
      
      if (legacyResult.success && legacyResult.data) {
        LogUtils.logOperationSuccess('createProduct', { 
          ...context, 
          source: 'legacy' 
        });
        return Result.success(legacyResult.data as Product);
      }

      LogUtils.logOperationError('createProduct', 'Legacy createProduct failed', context);
      return Result.failure(new Error(legacyResult.error || 'Failed to create product via legacy system'));

    } catch (error) {
      LogUtils.logOperationError('createProduct', error, context);
      return Result.failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Mettre à jour un produit existant
   */
  async updateProduct(productId: string, productData: UpdateProductData): Promise<Result<Product, Error>> {
    const context = LogUtils.createOperationContext('updateProduct', 'product-service');
    LogUtils.logOperationStart('updateProduct', { ...context, productId });

    try {
      if (isRepositoryEnabled('USE_PRODUCT_REPOSITORY')) {
        LogUtils.logOperationInfo('updateProduct', 'Using new ProductRepository', context);
        
        // Validation via repository
        const validationResult = await this.repository.validateProductData(productData);
        if (!validationResult.isSuccess()) {
          return validationResult;
        }

        const result = await this.repository.updateProduct(productId, productData);
        
        if (result.isSuccess()) {
          LogUtils.logOperationSuccess('updateProduct', { 
            ...context, 
            source: 'repository' 
          });
          return result;
        }

        LogUtils.logOperationWarning('updateProduct', 'Repository failed, falling back to legacy', context);
      }

      // Fallback vers l'ancien système
      LogUtils.logOperationInfo('updateProduct', 'Using legacy productActions', context);
      
      // Conversion pour format legacy (partiel)
      const legacyData: Partial<ProductFormValues> = {
        slug: productData.slug,
        price: productData.price,
        stock: productData.stock,
        unit: productData.unit,
        image_url: productData.image_url,
        inci_list: productData.inci_list,
        status: productData.status,
        is_active: productData.is_active,
        is_new: productData.is_new,
        is_on_promotion: productData.is_on_promotion,
      };

      const legacyResult = await updateProductLegacy(productId, legacyData as ProductFormValues);
      
      if (legacyResult.success && legacyResult.data) {
        LogUtils.logOperationSuccess('updateProduct', { 
          ...context, 
          source: 'legacy' 
        });
        return Result.success(legacyResult.data as Product);
      }

      LogUtils.logOperationError('updateProduct', 'Legacy updateProduct failed', context);
      return Result.failure(new Error(legacyResult.error || 'Failed to update product via legacy system'));

    } catch (error) {
      LogUtils.logOperationError('updateProduct', error, context);
      return Result.failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Supprimer un produit
   */
  async deleteProduct(productId: string): Promise<Result<void, Error>> {
    const context = LogUtils.createOperationContext('deleteProduct', 'product-service');
    LogUtils.logOperationStart('deleteProduct', { ...context, productId });

    try {
      if (isRepositoryEnabled('USE_PRODUCT_REPOSITORY')) {
        LogUtils.logOperationInfo('deleteProduct', 'Using new ProductRepository', context);
        const result = await this.repository.deleteProduct(productId);
        
        if (result.isSuccess()) {
          LogUtils.logOperationSuccess('deleteProduct', { 
            ...context, 
            source: 'repository' 
          });
          return result;
        }

        LogUtils.logOperationWarning('deleteProduct', 'Repository failed, falling back to legacy', context);
      }

      // Fallback vers l'ancien système
      LogUtils.logOperationInfo('deleteProduct', 'Using legacy productActions', context);
      const legacyResult = await deleteProductLegacy({ id: productId });
      
      if (legacyResult.success) {
        LogUtils.logOperationSuccess('deleteProduct', { 
          ...context, 
          source: 'legacy' 
        });
        return Result.success(undefined);
      }

      LogUtils.logOperationError('deleteProduct', 'Legacy deleteProduct failed', context);
      return Result.failure(new Error(legacyResult.error || 'Failed to delete product via legacy system'));

    } catch (error) {
      LogUtils.logOperationError('deleteProduct', error, context);
      return Result.failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Mettre à jour le statut d'un produit
   */
  async updateProductStatus(productId: string, status: ProductStatus): Promise<Result<Product, Error>> {
    const context = LogUtils.createOperationContext('updateProductStatus', 'product-service');
    LogUtils.logOperationStart('updateProductStatus', { ...context, productId, status });

    try {
      if (isRepositoryEnabled('USE_PRODUCT_REPOSITORY')) {
        LogUtils.logOperationInfo('updateProductStatus', 'Using new ProductRepository', context);
        const result = await this.repository.updateProductStatus(productId, status);
        
        if (result.isSuccess()) {
          LogUtils.logOperationSuccess('updateProductStatus', { 
            ...context, 
            source: 'repository' 
          });
          return result;
        }

        LogUtils.logOperationWarning('updateProductStatus', 'Repository failed, falling back to legacy', context);
      }

      // Fallback vers l'ancien système
      LogUtils.logOperationInfo('updateProductStatus', 'Using legacy productActions', context);
      const legacyResult = await updateProductStatusLegacy({ productId, status });
      
      if (legacyResult.success && legacyResult.data) {
        LogUtils.logOperationSuccess('updateProductStatus', { 
          ...context, 
          source: 'legacy' 
        });
        return Result.success(legacyResult.data as Product);
      }

      LogUtils.logOperationError('updateProductStatus', 'Legacy updateProductStatus failed', context);
      return Result.failure(new Error(legacyResult.error || 'Failed to update product status via legacy system'));

    } catch (error) {
      LogUtils.logOperationError('updateProductStatus', error, context);
      return Result.failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  // === Opérations de gestion du stock ===

  /**
   * Vérifier la disponibilité en stock
   */
  async checkStockAvailability(productId: string, requestedQuantity: number): Promise<Result<boolean, Error>> {
    const context = LogUtils.createOperationContext('checkStockAvailability', 'product-service');
    LogUtils.logOperationStart('checkStockAvailability', { ...context, productId, requested: requestedQuantity });

    try {
      if (isRepositoryEnabled('USE_PRODUCT_REPOSITORY')) {
        LogUtils.logOperationInfo('checkStockAvailability', 'Using new ProductRepository', context);
        const result = await this.repository.checkStockAvailability(productId, requestedQuantity);
        
        if (result.isSuccess()) {
          LogUtils.logOperationSuccess('checkStockAvailability', { 
            ...context, 
            source: 'repository',
            available: result.getValue()
          });
          return result;
        }
      }

      // Fallback: récupérer le produit et vérifier manuellement
      LogUtils.logOperationInfo('checkStockAvailability', 'Using fallback check', context);
      
      // TODO: Implémenter fallback via récupération produit
      LogUtils.logOperationError('checkStockAvailability', 'Fallback not implemented', context);
      return Result.failure(new Error('Fallback not implemented for checkStockAvailability'));

    } catch (error) {
      LogUtils.logOperationError('checkStockAvailability', error, context);
      return Result.failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Mettre à jour le stock d'un produit
   */
  async updateStock(productId: string, newStock: number): Promise<Result<Product, Error>> {
    const context = LogUtils.createOperationContext('updateStock', 'product-service');
    LogUtils.logOperationStart('updateStock', { ...context, productId, newStock });

    try {
      if (isRepositoryEnabled('USE_PRODUCT_REPOSITORY')) {
        LogUtils.logOperationInfo('updateStock', 'Using new ProductRepository', context);
        const result = await this.repository.updateStock(productId, newStock);
        
        if (result.isSuccess()) {
          LogUtils.logOperationSuccess('updateStock', { 
            ...context, 
            source: 'repository' 
          });
          return result;
        }
      }

      // Fallback: utiliser updateProduct avec seulement le stock
      LogUtils.logOperationInfo('updateStock', 'Using fallback updateProduct', context);
      return await this.updateProduct(productId, { stock: newStock });

    } catch (error) {
      LogUtils.logOperationError('updateStock', error, context);
      return Result.failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Ajuster le stock avec traçabilité
   */
  async adjustStock(update: StockUpdate): Promise<Result<{ product: Product; movement: any }, Error>> {
    const context = LogUtils.createOperationContext('adjustStock', 'product-service');
    LogUtils.logOperationStart('adjustStock', { ...context, productId: update.product_id, delta: update.quantity_delta });

    try {
      if (isRepositoryEnabled('USE_PRODUCT_REPOSITORY')) {
        LogUtils.logOperationInfo('adjustStock', 'Using new ProductRepository', context);
        const result = await this.repository.adjustStock(update);
        
        if (result.isSuccess()) {
          LogUtils.logOperationSuccess('adjustStock', { 
            ...context, 
            source: 'repository' 
          });
          return result;
        }
      }

      // Fallback: ajustement simple sans traçabilité
      LogUtils.logOperationInfo('adjustStock', 'Using fallback simple adjustment', context);
      
      // D'abord récupérer le stock actuel (pas d'équivalent direct dans l'ancien système)
      LogUtils.logOperationError('adjustStock', 'Fallback not available - complex operation', context);
      return Result.failure(new Error('Fallback not available for adjustStock - requires repository'));

    } catch (error) {
      LogUtils.logOperationError('adjustStock', error, context);
      return Result.failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Réserver du stock
   */
  async reserveStock(productId: string, quantity: number, reference: string): Promise<Result<Product, Error>> {
    const context = LogUtils.createOperationContext('reserveStock', 'product-service');
    LogUtils.logOperationStart('reserveStock', { ...context, productId, quantity, reference });

    try {
      if (isRepositoryEnabled('USE_PRODUCT_REPOSITORY')) {
        LogUtils.logOperationInfo('reserveStock', 'Using new ProductRepository', context);
        const result = await this.repository.reserveStock(productId, quantity, reference);
        
        if (result.isSuccess()) {
          LogUtils.logOperationSuccess('reserveStock', { 
            ...context, 
            source: 'repository' 
          });
          return result;
        }
      }

      // Fallback: utiliser adjustStock
      LogUtils.logOperationInfo('reserveStock', 'Using fallback adjustStock', context);
      const adjustResult = await this.adjustStock({
        product_id: productId,
        quantity_delta: -quantity,
        reason: 'sale',
        reference,
      });

      if (adjustResult.isSuccess()) {
        return Result.success(adjustResult.getValue()!.product);
      }

      return adjustResult;

    } catch (error) {
      LogUtils.logOperationError('reserveStock', error, context);
      return Result.failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Libérer du stock réservé
   */
  async releaseStock(productId: string, quantity: number, reference: string): Promise<Result<Product, Error>> {
    const context = LogUtils.createOperationContext('releaseStock', 'product-service');
    LogUtils.logOperationStart('releaseStock', { ...context, productId, quantity, reference });

    try {
      if (isRepositoryEnabled('USE_PRODUCT_REPOSITORY')) {
        LogUtils.logOperationInfo('releaseStock', 'Using new ProductRepository', context);
        const result = await this.repository.releaseStock(productId, quantity, reference);
        
        if (result.isSuccess()) {
          LogUtils.logOperationSuccess('releaseStock', { 
            ...context, 
            source: 'repository' 
          });
          return result;
        }
      }

      // Fallback: utiliser adjustStock
      LogUtils.logOperationInfo('releaseStock', 'Using fallback adjustStock', context);
      const adjustResult = await this.adjustStock({
        product_id: productId,
        quantity_delta: quantity,
        reason: 'return',
        reference,
      });

      if (adjustResult.isSuccess()) {
        return Result.success(adjustResult.getValue()!.product);
      }

      return adjustResult;

    } catch (error) {
      LogUtils.logOperationError('releaseStock', error, context);
      return Result.failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  // === Opérations de validation ===

  /**
   * Valider les données d'un produit
   */
  async validateProduct(productData: CreateProductData | UpdateProductData): Promise<Result<void, Error>> {
    const context = LogUtils.createOperationContext('validateProduct', 'product-service');

    try {
      if (isRepositoryEnabled('USE_PRODUCT_REPOSITORY')) {
        LogUtils.logOperationInfo('validateProduct', 'Using new ProductRepository', context);
        return await this.repository.validateProductData(productData);
      }

      // Fallback: validation basique
      LogUtils.logOperationInfo('validateProduct', 'Using basic validation', context);
      
      if ('price' in productData && productData.price !== undefined && productData.price < 0) {
        return Result.failure(new Error('Price cannot be negative'));
      }

      if ('stock' in productData && productData.stock !== undefined && productData.stock < 0) {
        return Result.failure(new Error('Stock cannot be negative'));
      }

      LogUtils.logOperationSuccess('validateProduct', { ...context, source: 'basic' });
      return Result.success(undefined);

    } catch (error) {
      LogUtils.logOperationError('validateProduct', error, context);
      return Result.failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Vérifier la disponibilité d'un slug
   */
  async isSlugAvailable(slug: string, excludeProductId?: string): Promise<Result<boolean, Error>> {
    const context = LogUtils.createOperationContext('isSlugAvailable', 'product-service');
    LogUtils.logOperationStart('isSlugAvailable', { ...context, slug, excludeProductId });

    try {
      if (isRepositoryEnabled('USE_PRODUCT_REPOSITORY')) {
        LogUtils.logOperationInfo('isSlugAvailable', 'Using new ProductRepository', context);
        return await this.repository.isSlugAvailable(slug, excludeProductId);
      }

      // Fallback: pas d'équivalent simple dans l'ancien système
      LogUtils.logOperationError('isSlugAvailable', 'Fallback not available', context);
      return Result.failure(new Error('Fallback not available for isSlugAvailable'));

    } catch (error) {
      LogUtils.logOperationError('isSlugAvailable', error, context);
      return Result.failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  // === Opérations de cache ===

  /**
   * Précharger les produits populaires en cache
   */
  async cachePopularProducts(locale?: string): Promise<Result<void, Error>> {
    const context = LogUtils.createOperationContext('cachePopularProducts', 'product-service');

    try {
      if (isRepositoryEnabled('USE_PRODUCT_REPOSITORY')) {
        LogUtils.logOperationInfo('cachePopularProducts', 'Using new ProductRepository', context);
        return await this.repository.cachePopularProducts(locale);
      }

      // Fallback: pas de cache dans l'ancien système
      LogUtils.logOperationSuccess('cachePopularProducts', { ...context, source: 'noop' });
      return Result.success(undefined);

    } catch (error) {
      LogUtils.logOperationError('cachePopularProducts', error, context);
      return Result.failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Invalider le cache pour un produit
   */
  async invalidateProductCache(productId: string): Promise<Result<void, Error>> {
    const context = LogUtils.createOperationContext('invalidateProductCache', 'product-service');

    try {
      if (isRepositoryEnabled('USE_PRODUCT_REPOSITORY')) {
        LogUtils.logOperationInfo('invalidateProductCache', 'Using new ProductRepository', context);
        return await this.repository.invalidateProductCache(productId);
      }

      // Fallback: pas de cache dans l'ancien système
      LogUtils.logOperationSuccess('invalidateProductCache', { ...context, source: 'noop' });
      return Result.success(undefined);

    } catch (error) {
      LogUtils.logOperationError('invalidateProductCache', error, context);
      return Result.failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }
}

// Instance singleton pour utilisation dans l'application
export const productService = new ProductService();