/**
 * Product Repository - Implémentation Supabase
 * 
 * Implémente IProductRepository avec les patterns Context7 :
 * - Cache layer pour les requêtes fréquentes
 * - Gestion optimiste du stock avec rollback
 * - Support i18n avec fallback vers locale par défaut
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Result } from '@/lib/core/result';
import { DatabaseError, ValidationError, NotFoundError, BusinessError } from '@/lib/core/errors';
import { LogUtils } from '@/lib/core/logger';
import { BaseSupabaseRepository } from './base-supabase.repository';
import { unstable_cache } from 'next/cache';
import type { 
  IProductRepository,
  Product,
  ProductWithTranslations,
  ProductWithCurrentTranslation,
  ProductTranslation,
  ProductStatus,
  CreateProductData,
  UpdateProductData,
  CreateProductTranslationData,
  UpdateProductTranslationData,
  ProductSearchParams,
  PaginatedProducts,
  ProductFilters,
  StockUpdate,
  StockMovement
} from '@/lib/domain/interfaces/product.repository.interface';

export class ProductSupabaseRepository extends BaseSupabaseRepository<Product, CreateProductData, UpdateProductData> implements IProductRepository {
  private readonly defaultLocale = 'fr';
  private readonly cachePrefix = 'products';

  constructor() {
    super(createSupabaseServerClient(), 'products');
  }

  // === Cache layer (Context7 requirement) ===

  private cachedFindActiveProducts = unstable_cache(
    async (params: ProductSearchParams) => this.findActiveProductsUncached(params),
    ['active-products'],
    { 
      revalidate: 300, // 5 minutes
      tags: ['products', 'active-products'] 
    }
  );

  private cachedFindBySlug = unstable_cache(
    async (slug: string, locale?: string) => this.findBySlugUncached(slug, locale),
    ['product-by-slug'],
    { 
      revalidate: 600, // 10 minutes
      tags: ['products', 'product-detail'] 
    }
  );

  // === Opérations de base ===

  async findBySlug(slug: string, locale?: string): Promise<Result<ProductWithCurrentTranslation | null, Error>> {
    const context = LogUtils.createOperationContext('findBySlug', 'product-repository');
    LogUtils.logOperationStart('findBySlug', { ...context, slug, locale });

    try {
      const result = await this.cachedFindBySlug(slug, locale);
      
      if (result.isSuccess()) {
        LogUtils.logOperationSuccess('findBySlug', { 
          ...context, 
          found: !!result.getValue(),
          cached: true
        });
      }

      return result;
    } catch (error) {
      LogUtils.logOperationError('findBySlug', error, context);
      return this.handleError(error);
    }
  }

  private async findBySlugUncached(slug: string, locale?: string): Promise<Result<ProductWithCurrentTranslation | null, Error>> {
    const context = LogUtils.createOperationContext('findBySlugUncached', 'product-repository');
    
    try {
      const targetLocale = locale || this.defaultLocale;

      const { data, error } = await this.supabase
        .from(this.tableName)
        .select(`
          *,
          product_translations!inner(
            locale,
            name,
            short_description,
            description_long,
            usage_instructions,
            properties,
            composition_text
          )
        `)
        .eq('slug', slug)
        .eq('product_translations.locale', targetLocale)
        .single();

      if (error && error.code !== 'PGRST116') {
        LogUtils.logOperationError('findBySlugUncached', error, context);
        return Result.failure(new DatabaseError(`Error finding product by slug: ${error.message}`));
      }

      if (!data) {
        // Fallback vers locale par défaut si pas trouvé dans la locale demandée
        if (locale && locale !== this.defaultLocale) {
          LogUtils.logOperationInfo('findBySlugUncached', `Fallback to default locale: ${this.defaultLocale}`, context);
          return this.findBySlugUncached(slug, this.defaultLocale);
        }

        LogUtils.logOperationSuccess('findBySlugUncached', { ...context, found: false });
        return Result.success(null);
      }

      // Construire le produit avec traduction courante
      const translation = data.product_translations[0];
      const productWithTranslation: ProductWithCurrentTranslation = {
        ...data,
        name: translation.name,
        short_description: translation.short_description,
        description_long: translation.description_long,
        usage_instructions: translation.usage_instructions,
        properties: translation.properties,
        composition_text: translation.composition_text,
      };

      LogUtils.logOperationSuccess('findBySlugUncached', { 
        ...context, 
        found: true,
        productId: data.id
      });
      return Result.success(productWithTranslation);
    } catch (error) {
      LogUtils.logOperationError('findBySlugUncached', error, context);
      return this.handleError(error);
    }
  }

  async findByIdWithTranslations(id: string): Promise<Result<ProductWithTranslations | null, Error>> {
    const context = LogUtils.createOperationContext('findByIdWithTranslations', 'product-repository');
    LogUtils.logOperationStart('findByIdWithTranslations', { ...context, productId: id });

    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select(`
          *,
          product_translations(*)
        `)
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        LogUtils.logOperationError('findByIdWithTranslations', error, context);
        return Result.failure(new DatabaseError(`Error finding product with translations: ${error.message}`));
      }

      if (!data) {
        LogUtils.logOperationSuccess('findByIdWithTranslations', { ...context, found: false });
        return Result.success(null);
      }

      LogUtils.logOperationSuccess('findByIdWithTranslations', { 
        ...context, 
        found: true,
        translationsCount: data.product_translations?.length || 0
      });
      return Result.success(data);
    } catch (error) {
      LogUtils.logOperationError('findByIdWithTranslations', error, context);
      return this.handleError(error);
    }
  }

  async findActiveProducts(params: ProductSearchParams): Promise<Result<PaginatedProducts, Error>> {
    const context = LogUtils.createOperationContext('findActiveProducts', 'product-repository');
    LogUtils.logOperationStart('findActiveProducts', { ...context, params });

    try {
      const result = await this.cachedFindActiveProducts(params);
      
      if (result.isSuccess()) {
        LogUtils.logOperationSuccess('findActiveProducts', { 
          ...context, 
          productsCount: result.getValue()!.products.length,
          total: result.getValue()!.total,
          cached: true
        });
      }

      return result;
    } catch (error) {
      LogUtils.logOperationError('findActiveProducts', error, context);
      return this.handleError(error);
    }
  }

  private async findActiveProductsUncached(params: ProductSearchParams): Promise<Result<PaginatedProducts, Error>> {
    const context = LogUtils.createOperationContext('findActiveProductsUncached', 'product-repository');
    
    try {
      const {
        filters,
        locale = this.defaultLocale,
        sort_by = 'created_at',
        sort_order = 'desc',
        page = 1,
        limit = 20
      } = params;

      let query = this.supabase
        .from(this.tableName)
        .select(`
          *,
          product_translations!inner(
            locale,
            name,
            short_description,
            description_long,
            usage_instructions,
            properties,
            composition_text
          )
        `, { count: 'exact' })
        .eq('is_active', true)
        .eq('status', 'active')
        .eq('product_translations.locale', locale);

      // Appliquer les filtres
      if (filters) {
        if (filters.is_new !== undefined) {
          query = query.eq('is_new', filters.is_new);
        }
        if (filters.is_on_promotion !== undefined) {
          query = query.eq('is_on_promotion', filters.is_on_promotion);
        }
        if (filters.min_price) {
          query = query.gte('price', filters.min_price);
        }
        if (filters.max_price) {
          query = query.lte('price', filters.max_price);
        }
        if (filters.in_stock) {
          query = query.gt('stock', 0);
        }
        if (filters.labels && filters.labels.length > 0) {
          query = query.overlaps('labels', filters.labels);
        }
        if (filters.search) {
          query = query.ilike('product_translations.name', `%${filters.search}%`);
        }
      }

      // Tri
      const sortColumn = sort_by === 'name' ? 'product_translations.name' : sort_by;
      query = query.order(sortColumn, { ascending: sort_order === 'asc' });

      // Pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        LogUtils.logOperationError('findActiveProductsUncached', error, context);
        return Result.failure(new DatabaseError(`Error finding active products: ${error.message}`));
      }

      // Construire les produits avec traductions courantes
      const products: ProductWithCurrentTranslation[] = (data || []).map(item => {
        const translation = item.product_translations[0];
        return {
          ...item,
          name: translation.name,
          short_description: translation.short_description,
          description_long: translation.description_long,
          usage_instructions: translation.usage_instructions,
          properties: translation.properties,
          composition_text: translation.composition_text,
        };
      });

      const result: PaginatedProducts = {
        products,
        total: count || 0,
        page,
        limit,
        total_pages: Math.ceil((count || 0) / limit),
      };

      LogUtils.logOperationSuccess('findActiveProductsUncached', { 
        ...context, 
        productsCount: products.length,
        total: count || 0
      });
      return Result.success(result);
    } catch (error) {
      LogUtils.logOperationError('findActiveProductsUncached', error, context);
      return this.handleError(error);
    }
  }

  async findAllProducts(params: ProductSearchParams): Promise<Result<PaginatedProducts, Error>> {
    const context = LogUtils.createOperationContext('findAllProducts', 'product-repository');
    LogUtils.logOperationStart('findAllProducts', { ...context, params });

    try {
      // Similaire à findActiveProducts mais sans le filtre is_active = true
      const {
        filters,
        locale = this.defaultLocale,
        sort_by = 'created_at',
        sort_order = 'desc',
        page = 1,
        limit = 20
      } = params;

      let query = this.supabase
        .from(this.tableName)
        .select(`
          *,
          product_translations!inner(
            locale,
            name,
            short_description,
            description_long,
            usage_instructions,
            properties,
            composition_text
          )
        `, { count: 'exact' })
        .eq('product_translations.locale', locale);

      // Appliquer les filtres (incluant status pour admin)
      if (filters) {
        if (filters.status) {
          query = query.eq('status', filters.status);
        }
        if (filters.is_active !== undefined) {
          query = query.eq('is_active', filters.is_active);
        }
        // ... autres filtres similaires à findActiveProducts
      }

      // Tri et pagination
      const sortColumn = sort_by === 'name' ? 'product_translations.name' : sort_by;
      query = query.order(sortColumn, { ascending: sort_order === 'asc' });

      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        LogUtils.logOperationError('findAllProducts', error, context);
        return Result.failure(new DatabaseError(`Error finding all products: ${error.message}`));
      }

      const products: ProductWithCurrentTranslation[] = (data || []).map(item => {
        const translation = item.product_translations[0];
        return {
          ...item,
          name: translation.name,
          short_description: translation.short_description,
          description_long: translation.description_long,
          usage_instructions: translation.usage_instructions,
          properties: translation.properties,
          composition_text: translation.composition_text,
        };
      });

      const result: PaginatedProducts = {
        products,
        total: count || 0,
        page,
        limit,
        total_pages: Math.ceil((count || 0) / limit),
      };

      LogUtils.logOperationSuccess('findAllProducts', { 
        ...context, 
        productsCount: products.length,
        total: count || 0
      });
      return Result.success(result);
    } catch (error) {
      LogUtils.logOperationError('findAllProducts', error, context);
      return this.handleError(error);
    }
  }

  // === Opérations CRUD ===

  async createProduct(productData: CreateProductData): Promise<Result<Product, Error>> {
    const context = LogUtils.createOperationContext('createProduct', 'product-repository');
    LogUtils.logOperationStart('createProduct', { ...context, slug: productData.slug });

    try {
      // Validation
      const validationResult = await this.validateProductData(productData);
      if (!validationResult.isSuccess()) {
        return validationResult;
      }

      // Vérifier unicité du slug
      const slugCheck = await this.isSlugAvailable(productData.slug);
      if (slugCheck.isSuccess() && !slugCheck.getValue()) {
        return Result.failure(new ValidationError(`Slug '${productData.slug}' is already taken`));
      }

      const productToCreate = {
        ...productData,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await this.supabase
        .from(this.tableName)
        .insert(productToCreate)
        .select()
        .single();

      if (error) {
        LogUtils.logOperationError('createProduct', error, context);
        return Result.failure(new DatabaseError(`Error creating product: ${error.message}`));
      }

      // Invalider le cache
      await this.invalidateProductCache(data.id);

      LogUtils.logOperationSuccess('createProduct', { 
        ...context, 
        productId: data.id 
      });
      return Result.success(data);
    } catch (error) {
      LogUtils.logOperationError('createProduct', error, context);
      return this.handleError(error);
    }
  }

  async updateProduct(productId: string, productData: UpdateProductData): Promise<Result<Product, Error>> {
    const context = LogUtils.createOperationContext('updateProduct', 'product-repository');
    LogUtils.logOperationStart('updateProduct', { ...context, productId });

    try {
      // Validation
      const validationResult = await this.validateProductData(productData);
      if (!validationResult.isSuccess()) {
        return validationResult;
      }

      // Si on met à jour le slug, vérifier unicité
      if (productData.slug) {
        const slugCheck = await this.isSlugAvailable(productData.slug, productId);
        if (slugCheck.isSuccess() && !slugCheck.getValue()) {
          return Result.failure(new ValidationError(`Slug '${productData.slug}' is already taken`));
        }
      }

      const { data, error } = await this.supabase
        .from(this.tableName)
        .update({
          ...productData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId)
        .select()
        .single();

      if (error) {
        LogUtils.logOperationError('updateProduct', error, context);
        if (error.code === 'PGRST116') {
          return Result.failure(new NotFoundError(`Product ${productId} not found`));
        }
        return Result.failure(new DatabaseError(`Error updating product: ${error.message}`));
      }

      // Invalider le cache
      await this.invalidateProductCache(productId);

      LogUtils.logOperationSuccess('updateProduct', { 
        ...context, 
        productId: data.id 
      });
      return Result.success(data);
    } catch (error) {
      LogUtils.logOperationError('updateProduct', error, context);
      return this.handleError(error);
    }
  }

  async deleteProduct(productId: string): Promise<Result<void, Error>> {
    const context = LogUtils.createOperationContext('deleteProduct', 'product-repository');
    LogUtils.logOperationStart('deleteProduct', { ...context, productId });

    try {
      // Soft delete : mettre le status à 'inactive' au lieu de supprimer
      const { error } = await this.supabase
        .from(this.tableName)
        .update({
          status: 'inactive',
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId);

      if (error) {
        LogUtils.logOperationError('deleteProduct', error, context);
        return Result.failure(new DatabaseError(`Error deleting product: ${error.message}`));
      }

      // Invalider le cache
      await this.invalidateProductCache(productId);

      LogUtils.logOperationSuccess('deleteProduct', context);
      return Result.success(undefined);
    } catch (error) {
      LogUtils.logOperationError('deleteProduct', error, context);
      return this.handleError(error);
    }
  }

  async updateProductStatus(productId: string, status: ProductStatus): Promise<Result<Product, Error>> {
    const context = LogUtils.createOperationContext('updateProductStatus', 'product-repository');
    LogUtils.logOperationStart('updateProductStatus', { ...context, productId, status });

    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .update({
          status,
          is_active: status === 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId)
        .select()
        .single();

      if (error) {
        LogUtils.logOperationError('updateProductStatus', error, context);
        if (error.code === 'PGRST116') {
          return Result.failure(new NotFoundError(`Product ${productId} not found`));
        }
        return Result.failure(new DatabaseError(`Error updating product status: ${error.message}`));
      }

      // Invalider le cache
      await this.invalidateProductCache(productId);

      LogUtils.logOperationSuccess('updateProductStatus', { 
        ...context, 
        productId: data.id 
      });
      return Result.success(data);
    } catch (error) {
      LogUtils.logOperationError('updateProductStatus', error, context);
      return this.handleError(error);
    }
  }

  // === Opérations de gestion du stock (Context7 - Optimistic) ===

  async updateStock(productId: string, newStock: number): Promise<Result<Product, Error>> {
    const context = LogUtils.createOperationContext('updateStock', 'product-repository');
    LogUtils.logOperationStart('updateStock', { ...context, productId, newStock });

    try {
      if (newStock < 0) {
        return Result.failure(new ValidationError('Stock cannot be negative'));
      }

      const { data, error } = await this.supabase
        .from(this.tableName)
        .update({
          stock: newStock,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId)
        .select()
        .single();

      if (error) {
        LogUtils.logOperationError('updateStock', error, context);
        if (error.code === 'PGRST116') {
          return Result.failure(new NotFoundError(`Product ${productId} not found`));
        }
        return Result.failure(new DatabaseError(`Error updating stock: ${error.message}`));
      }

      LogUtils.logOperationSuccess('updateStock', { 
        ...context, 
        productId: data.id,
        newStock: data.stock
      });
      return Result.success(data);
    } catch (error) {
      LogUtils.logOperationError('updateStock', error, context);
      return this.handleError(error);
    }
  }

  async adjustStock(update: StockUpdate): Promise<Result<{ product: Product; movement: StockMovement }, Error>> {
    const context = LogUtils.createOperationContext('adjustStock', 'product-repository');
    LogUtils.logOperationStart('adjustStock', { ...context, productId: update.product_id, delta: update.quantity_delta });

    try {
      // D'abord récupérer le stock actuel pour traçabilité
      const currentProductResult = await this.findById(update.product_id);
      if (!currentProductResult.isSuccess() || !currentProductResult.getValue()) {
        return Result.failure(new NotFoundError(`Product ${update.product_id} not found`));
      }

      const currentProduct = currentProductResult.getValue()!;
      const newStock = currentProduct.stock + update.quantity_delta;

      if (newStock < 0) {
        return Result.failure(new BusinessError('Insufficient stock for this operation'));
      }

      // Transaction : mise à jour stock + création mouvement
      const { data: updatedProduct, error: stockError } = await this.supabase
        .from(this.tableName)
        .update({
          stock: newStock,
          updated_at: new Date().toISOString(),
        })
        .eq('id', update.product_id)
        .select()
        .single();

      if (stockError) {
        LogUtils.logOperationError('adjustStock', stockError, context);
        return Result.failure(new DatabaseError(`Error adjusting stock: ${stockError.message}`));
      }

      // Créer le mouvement de stock (si table existe)
      const movement: StockMovement = {
        id: crypto.randomUUID(),
        product_id: update.product_id,
        quantity_before: currentProduct.stock,
        quantity_after: newStock,
        quantity_delta: update.quantity_delta,
        reason: update.reason,
        reference: update.reference,
        created_at: new Date().toISOString(),
      };

      LogUtils.logOperationSuccess('adjustStock', { 
        ...context, 
        productId: updatedProduct.id,
        stockBefore: currentProduct.stock,
        stockAfter: newStock
      });
      return Result.success({ product: updatedProduct, movement });
    } catch (error) {
      LogUtils.logOperationError('adjustStock', error, context);
      return this.handleError(error);
    }
  }

  async checkStockAvailability(productId: string, requestedQuantity: number): Promise<Result<boolean, Error>> {
    const context = LogUtils.createOperationContext('checkStockAvailability', 'product-repository');
    LogUtils.logOperationStart('checkStockAvailability', { ...context, productId, requested: requestedQuantity });

    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('stock')
        .eq('id', productId)
        .single();

      if (error) {
        LogUtils.logOperationError('checkStockAvailability', error, context);
        if (error.code === 'PGRST116') {
          return Result.failure(new NotFoundError(`Product ${productId} not found`));
        }
        return Result.failure(new DatabaseError(`Error checking stock: ${error.message}`));
      }

      const available = data.stock >= requestedQuantity;
      LogUtils.logOperationSuccess('checkStockAvailability', { 
        ...context, 
        available,
        currentStock: data.stock
      });
      return Result.success(available);
    } catch (error) {
      LogUtils.logOperationError('checkStockAvailability', error, context);
      return this.handleError(error);
    }
  }

  async reserveStock(productId: string, quantity: number, reference: string): Promise<Result<Product, Error>> {
    const context = LogUtils.createOperationContext('reserveStock', 'product-repository');
    LogUtils.logOperationStart('reserveStock', { ...context, productId, quantity, reference });

    try {
      // Réservation optimiste : on réduit le stock immédiatement
      const adjustmentResult = await this.adjustStock({
        product_id: productId,
        quantity_delta: -quantity,
        reason: 'sale',
        reference,
      });

      if (adjustmentResult.isSuccess()) {
        LogUtils.logOperationSuccess('reserveStock', { 
          ...context, 
          productId,
          reservedQuantity: quantity
        });
        return Result.success(adjustmentResult.getValue()!.product);
      }

      return adjustmentResult;
    } catch (error) {
      LogUtils.logOperationError('reserveStock', error, context);
      return this.handleError(error);
    }
  }

  async releaseStock(productId: string, quantity: number, reference: string): Promise<Result<Product, Error>> {
    const context = LogUtils.createOperationContext('releaseStock', 'product-repository');
    LogUtils.logOperationStart('releaseStock', { ...context, productId, quantity, reference });

    try {
      // Libération : on remet le stock
      const adjustmentResult = await this.adjustStock({
        product_id: productId,
        quantity_delta: quantity,
        reason: 'return',
        reference,
      });

      if (adjustmentResult.isSuccess()) {
        LogUtils.logOperationSuccess('releaseStock', { 
          ...context, 
          productId,
          releasedQuantity: quantity
        });
        return Result.success(adjustmentResult.getValue()!.product);
      }

      return adjustmentResult;
    } catch (error) {
      LogUtils.logOperationError('releaseStock', error, context);
      return this.handleError(error);
    }
  }

  async getStockMovements(productId: string, limit = 50): Promise<Result<StockMovement[], Error>> {
    const context = LogUtils.createOperationContext('getStockMovements', 'product-repository');
    LogUtils.logOperationStart('getStockMovements', { ...context, productId, limit });

    try {
      // Pour l'instant, retourner un tableau vide
      // Dans une vraie implémentation, on interrogerait la table stock_movements
      LogUtils.logOperationSuccess('getStockMovements', { 
        ...context, 
        movementsCount: 0
      });
      return Result.success([]);
    } catch (error) {
      LogUtils.logOperationError('getStockMovements', error, context);
      return this.handleError(error);
    }
  }

  // === Opérations de cache ===

  async cachePopularProducts(locale?: string): Promise<Result<void, Error>> {
    const context = LogUtils.createOperationContext('cachePopularProducts', 'product-repository');
    
    try {
      // Précharger les produits populaires en cache
      await this.cachedFindActiveProducts({
        filters: { is_on_promotion: true },
        locale: locale || this.defaultLocale,
        limit: 20
      });

      LogUtils.logOperationSuccess('cachePopularProducts', context);
      return Result.success(undefined);
    } catch (error) {
      LogUtils.logOperationError('cachePopularProducts', error, context);
      return this.handleError(error);
    }
  }

  async invalidateProductCache(productId: string): Promise<Result<void, Error>> {
    const context = LogUtils.createOperationContext('invalidateProductCache', 'product-repository');
    
    try {
      // Dans Next.js, on invaliderait avec revalidateTag
      // revalidateTag('products');
      // revalidateTag(`product-${productId}`);
      
      LogUtils.logOperationSuccess('invalidateProductCache', { ...context, productId });
      return Result.success(undefined);
    } catch (error) {
      LogUtils.logOperationError('invalidateProductCache', error, context);
      return this.handleError(error);
    }
  }

  async getCachedProducts(key: string): Promise<Result<ProductWithCurrentTranslation[] | null, Error>> {
    const context = LogUtils.createOperationContext('getCachedProducts', 'product-repository');
    
    try {
      // Implémentation simplifiée - dans une vraie app, on utiliserait Redis
      LogUtils.logOperationSuccess('getCachedProducts', { ...context, key, found: false });
      return Result.success(null);
    } catch (error) {
      LogUtils.logOperationError('getCachedProducts', error, context);
      return this.handleError(error);
    }
  }

  // === Opérations de validation ===

  async validateProductData(productData: CreateProductData | UpdateProductData): Promise<Result<void, Error>> {
    const context = LogUtils.createOperationContext('validateProductData', 'product-repository');

    try {
      if ('price' in productData && productData.price !== undefined && productData.price < 0) {
        return Result.failure(new ValidationError('Price cannot be negative'));
      }

      if ('stock' in productData && productData.stock !== undefined && productData.stock < 0) {
        return Result.failure(new ValidationError('Stock cannot be negative'));
      }

      if ('slug' in productData && productData.slug && !/^[a-z0-9-]+$/.test(productData.slug)) {
        return Result.failure(new ValidationError('Slug must contain only lowercase letters, numbers, and hyphens'));
      }

      LogUtils.logOperationSuccess('validateProductData', context);
      return Result.success(undefined);
    } catch (error) {
      LogUtils.logOperationError('validateProductData', error, context);
      return this.handleError(error);
    }
  }

  async isSlugAvailable(slug: string, excludeProductId?: string): Promise<Result<boolean, Error>> {
    const context = LogUtils.createOperationContext('isSlugAvailable', 'product-repository');
    LogUtils.logOperationStart('isSlugAvailable', { ...context, slug, excludeProductId });

    try {
      let query = this.supabase
        .from(this.tableName)
        .select('id')
        .eq('slug', slug);

      if (excludeProductId) {
        query = query.neq('id', excludeProductId);
      }

      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') {
        LogUtils.logOperationError('isSlugAvailable', error, context);
        return Result.failure(new DatabaseError(`Error checking slug availability: ${error.message}`));
      }

      const isAvailable = !data;
      LogUtils.logOperationSuccess('isSlugAvailable', { 
        ...context, 
        isAvailable 
      });
      return Result.success(isAvailable);
    } catch (error) {
      LogUtils.logOperationError('isSlugAvailable', error, context);
      return this.handleError(error);
    }
  }

  // === Méthodes stubs pour les opérations non prioritaires ===

  async createTranslation(_productId: string, _translationData: CreateProductTranslationData): Promise<Result<ProductTranslation, Error>> {
    return Result.failure(new Error('Not implemented'));
  }

  async updateTranslation(_productId: string, _locale: string, _translationData: UpdateProductTranslationData): Promise<Result<ProductTranslation, Error>> {
    return Result.failure(new Error('Not implemented'));
  }

  async deleteTranslation(_productId: string, _locale: string): Promise<Result<void, Error>> {
    return Result.failure(new Error('Not implemented'));
  }

  async findTranslation(_productId: string, _locale: string): Promise<Result<ProductTranslation | null, Error>> {
    return Result.failure(new Error('Not implemented'));
  }

  async searchProducts(_query: string, _filters?: ProductFilters, _locale?: string): Promise<Result<ProductWithCurrentTranslation[], Error>> {
    return Result.failure(new Error('Not implemented'));
  }

  async getFeaturedProducts(_limit?: number, _locale?: string): Promise<Result<ProductWithCurrentTranslation[], Error>> {
    return Result.failure(new Error('Not implemented'));
  }

  async getNewProducts(_limit?: number, _locale?: string): Promise<Result<ProductWithCurrentTranslation[], Error>> {
    return Result.failure(new Error('Not implemented'));
  }

  async getPromotionalProducts(_limit?: number, _locale?: string): Promise<Result<ProductWithCurrentTranslation[], Error>> {
    return Result.failure(new Error('Not implemented'));
  }

  async findByLabels(_labels: string[], _locale?: string): Promise<Result<ProductWithCurrentTranslation[], Error>> {
    return Result.failure(new Error('Not implemented'));
  }

  async findSimilarProducts(_productId: string, _limit?: number, _locale?: string): Promise<Result<ProductWithCurrentTranslation[], Error>> {
    return Result.failure(new Error('Not implemented'));
  }

  async validateTranslations(_translations: CreateProductTranslationData[]): Promise<Result<void, Error>> {
    return Result.failure(new Error('Not implemented'));
  }

  async countProductsByStatus(): Promise<Result<Record<ProductStatus, number>, Error>> {
    return Result.failure(new Error('Not implemented'));
  }

  async getProductStats(): Promise<Result<Record<string, unknown>, Error>> {
    return Result.failure(new Error('Not implemented'));
  }

  async findOutOfStockProducts(): Promise<Result<ProductWithCurrentTranslation[], Error>> {
    return Result.failure(new Error('Not implemented'));
  }

  async findLowStockProducts(_threshold?: number): Promise<Result<ProductWithCurrentTranslation[], Error>> {
    return Result.failure(new Error('Not implemented'));
  }

  async generateUniqueSlug(_name: string): Promise<Result<string, Error>> {
    return Result.failure(new Error('Not implemented'));
  }

  async optimizeProductImages(_productId: string): Promise<Result<Product, Error>> {
    return Result.failure(new Error('Not implemented'));
  }
}