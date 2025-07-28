/**
 * Product Repository Implementation with Supabase
 * 
 * Handles product data access with proper mapping between domain entities
 * and database records.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { Result } from "@/lib/core/result";
import { DatabaseError, ErrorUtils } from "@/lib/core/errors";
import { logger } from "@/lib/core/logger";
import { BaseSupabaseRepository } from "./base-supabase.repository";
import { Money, Quantity, ProductReference } from "@/lib/domain/entities/cart.entity";
import { ProductRepository } from "@/lib/domain/services/cart.service";

/**
 * Database interface for products table
 */
interface ProductRecord {
  id: string;
  name: string;
  price: number;
  stock: number;
  slug?: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Translation fields (assuming single locale for simplicity)
  description_short?: string;
  description_long?: string;
}

/**
 * Product with translations record
 */
interface ProductWithTranslationsRecord extends ProductRecord {
  product_translations: Array<{
    locale: string;
    name: string;
    description_short?: string;
    description_long?: string;
  }>;
}

/**
 * Supabase Product Repository implementation
 */
export class SupabaseProductRepository extends BaseSupabaseRepository<ProductReference, Partial<ProductReference>, Partial<ProductReference>> implements ProductRepository {
  
  constructor(supabase: SupabaseClient) {
    super(supabase, 'products');
  }

  /**
   * Find product by ID with translations
   */
  async findById(productId: string): Promise<Result<ProductReference | null, Error>> {
    try {
      const { data, error } = await this.supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          stock,
          slug,
          image_url,
          is_active,
          created_at,
          updated_at,
          description_short,
          description_long,
          product_translations (
            locale,
            name,
            description_short,
            description_long
          )
        `)
        .eq('id', productId)
        .eq('is_active', true) // Only return active products
        .maybeSingle();

      if (error) {
        logger.error('Failed to find product by ID', error, { productId });
        return Result.error(ErrorUtils.fromSupabaseError(error));
      }

      if (!data) {
        return Result.ok(null);
      }

      const mappingResult = this.mapProductWithTranslationsFromDatabase(data as ProductWithTranslationsRecord);
      if (mappingResult.isError()) {
        return Result.error(mappingResult.getError());
      }

      return Result.ok(mappingResult.getValue());
    } catch (error) {
      logger.error('Exception in findById', error, { productId });
      return Result.error(new DatabaseError('Database operation failed', error));
    }
  }

  /**
   * Find multiple products by IDs
   */
  async findByIds(productIds: string[]): Promise<Result<ProductReference[], Error>> {
    try {
      if (productIds.length === 0) {
        return Result.ok([]);
      }

      const { data, error } = await this.supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          stock,
          slug,
          image_url,
          is_active,
          created_at,
          updated_at,
          description_short,
          description_long,
          product_translations (
            locale,
            name,
            description_short,
            description_long
          )
        `)
        .in('id', productIds)
        .eq('is_active', true);

      if (error) {
        logger.error('Failed to find products by IDs', error, { productIds });
        return Result.error(ErrorUtils.fromSupabaseError(error));
      }

      if (!data) {
        return Result.ok([]);
      }

      // Map all products
      const products: ProductReference[] = [];
      for (const productData of data as ProductWithTranslationsRecord[]) {
        const mappingResult = this.mapProductWithTranslationsFromDatabase(productData);
        if (mappingResult.isError()) {
          logger.warn('Failed to map product in findByIds', mappingResult.getError(), { productId: productData.id });
          continue;
        }
        products.push(mappingResult.getValue());
      }

      return Result.ok(products);
    } catch (error) {
      logger.error('Exception in findByIds', error, { productIds });
      return Result.error(new DatabaseError('Database operation failed', error));
    }
  }

  /**
   * Update product stock
   */
  async updateStock(productId: string, newStock: number): Promise<Result<void, Error>> {
    try {
      if (newStock < 0) {
        return Result.error(new DatabaseError('Stock cannot be negative'));
      }

      const { error } = await this.supabase
        .from('products')
        .update({ 
          stock: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (error) {
        logger.error('Failed to update product stock', error, { productId, newStock });
        return Result.error(ErrorUtils.fromSupabaseError(error));
      }

      return Result.ok(undefined);
    } catch (error) {
      logger.error('Exception in updateStock', error, { productId, newStock });
      return Result.error(new DatabaseError('Database operation failed', error));
    }
  }

  /**
   * Find products with low stock (for inventory management)
   */
  async findLowStockProducts(threshold: number = 10): Promise<Result<ProductReference[], Error>> {
    try {
      const { data, error } = await this.supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          stock,
          slug,
          image_url,
          is_active,
          created_at,
          updated_at,
          description_short,
          description_long
        `)
        .eq('is_active', true)
        .lte('stock', threshold)
        .order('stock', { ascending: true });

      if (error) {
        logger.error('Failed to find low stock products', error, { threshold });
        return Result.error(ErrorUtils.fromSupabaseError(error));
      }

      if (!data) {
        return Result.ok([]);
      }

      // Map products
      const products: ProductReference[] = [];
      for (const productData of data as ProductRecord[]) {
        const mappingResult = this.mapFromDatabase(productData);
        if (mappingResult.isError()) {
          logger.warn('Failed to map product in findLowStockProducts', mappingResult.getError(), { productId: productData.id });
          continue;
        }
        products.push(mappingResult.getValue());
      }

      return Result.ok(products);
    } catch (error) {
      logger.error('Exception in findLowStockProducts', error, { threshold });
      return Result.error(new DatabaseError('Database operation failed', error));
    }
  }

  /**
   * Reserve stock for cart items (atomic operation)
   */
  async reserveStock(
    reservations: Array<{ productId: string; quantity: number }>
  ): Promise<Result<void, Error>> {
    try {
      // Use RPC function for atomic stock reservation
      const { error } = await this.supabase.rpc('reserve_product_stock', {
        reservations: reservations.map(r => ({
          product_id: r.productId,
          quantity: r.quantity
        }))
      });

      if (error) {
        logger.error('Failed to reserve stock', error, { reservations });
        return Result.error(ErrorUtils.fromSupabaseError(error));
      }

      return Result.ok(undefined);
    } catch (error) {
      logger.error('Exception in reserveStock', error, { reservations });
      return Result.error(new DatabaseError('Database operation failed', error));
    }
  }

  /**
   * Release reserved stock (for cart cleanup or order cancellation)
   */
  async releaseStock(
    releases: Array<{ productId: string; quantity: number }>
  ): Promise<Result<void, Error>> {
    try {
      // Use RPC function for atomic stock release
      const { error } = await this.supabase.rpc('release_product_stock', {
        releases: releases.map(r => ({
          product_id: r.productId,
          quantity: r.quantity
        }))
      });

      if (error) {
        logger.error('Failed to release stock', error, { releases });
        return Result.error(ErrorUtils.fromSupabaseError(error));
      }

      return Result.ok(undefined);
    } catch (error) {
      logger.error('Exception in releaseStock', error, { releases });
      return Result.error(new DatabaseError('Database operation failed', error));
    }
  }

  /**
   * Search products by name or description
   */
  async searchProducts(
    query: string,
    options: {
      limit?: number;
      offset?: number;
      categoryId?: string;
      priceMin?: number;
      priceMax?: number;
    } = {}
  ): Promise<Result<{ products: ProductReference[]; total: number }, Error>> {
    try {
      let supabaseQuery = this.supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          stock,
          slug,
          image_url,
          is_active,
          created_at,
          updated_at,
          description_short,
          description_long
        `, { count: 'exact' })
        .eq('is_active', true)
        .or(`name.ilike.%${query}%,description_short.ilike.%${query}%,description_long.ilike.%${query}%`);

      // Apply filters
      if (options.categoryId) {
        supabaseQuery = supabaseQuery.eq('category_id', options.categoryId);
      }
      if (options.priceMin !== undefined) {
        supabaseQuery = supabaseQuery.gte('price', options.priceMin);
      }
      if (options.priceMax !== undefined) {
        supabaseQuery = supabaseQuery.lte('price', options.priceMax);
      }

      // Apply pagination
      if (options.limit) {
        supabaseQuery = supabaseQuery.limit(options.limit);
      }
      if (options.offset) {
        supabaseQuery = supabaseQuery.range(
          options.offset,
          options.offset + (options.limit || 20) - 1
        );
      }

      // Order by relevance (name matches first, then description matches)
      supabaseQuery = supabaseQuery.order('name');

      const { data, error, count } = await supabaseQuery;

      if (error) {
        logger.error('Failed to search products', error, { query, options });
        return Result.error(ErrorUtils.fromSupabaseError(error));
      }

      if (!data) {
        return Result.ok({ products: [], total: count || 0 });
      }

      // Map products
      const products: ProductReference[] = [];
      for (const productData of data as ProductRecord[]) {
        const mappingResult = this.mapFromDatabase(productData);
        if (mappingResult.isError()) {
          logger.warn('Failed to map product in searchProducts', mappingResult.getError(), { productId: productData.id });
          continue;
        }
        products.push(mappingResult.getValue());
      }

      return Result.ok({ products, total: count || 0 });
    } catch (error) {
      logger.error('Exception in searchProducts', error, { query, options });
      return Result.error(new DatabaseError('Database operation failed', error));
    }
  }

  /**
   * Map product from database record to domain entity
   */
  mapFromDatabase(record: ProductRecord): Result<ProductReference, DatabaseError> {
    try {
      const productReference: ProductReference = {
        id: record.id,
        name: record.name,
        price: new Money(record.price),
        stock: new Quantity(record.stock),
        slug: record.slug,
        imageUrl: record.image_url,
        isActive: record.is_active,
      };

      return Result.ok(productReference);
    } catch (error) {
      logger.error('Failed to map product from database', error, { productId: record.id });
      return Result.error(new DatabaseError('Failed to map product from database', error));
    }
  }

  /**
   * Map product to database record
   */
  mapToDatabase(entity: Partial<ProductReference>): any {
    return {
      id: entity.id,
      name: entity.name,
      price: entity.price?.amount,
      stock: entity.stock?.value,
      slug: entity.slug,
      image_url: entity.imageUrl,
      is_active: entity.isActive ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Map product update to database record
   */
  mapUpdateToDatabase(entity: Partial<ProductReference>): any {
    const data: any = {
      updated_at: new Date().toISOString(),
    };

    if (entity.name) data.name = entity.name;
    if (entity.price) data.price = entity.price.amount;
    if (entity.stock) data.stock = entity.stock.value;
    if (entity.slug) data.slug = entity.slug;
    if (entity.imageUrl !== undefined) data.image_url = entity.imageUrl;
    if (entity.isActive !== undefined) data.is_active = entity.isActive;

    return data;
  }

  /**
   * Map product with translations from database record to domain entity
   */
  private mapProductWithTranslationsFromDatabase(
    record: ProductWithTranslationsRecord
  ): Result<ProductReference, DatabaseError> {
    try {
      // For now, we'll use the default language or first translation
      // In a full implementation, you'd handle locale-specific mapping
      let productName = record.name;
      
      if (record.product_translations && record.product_translations.length > 0) {
        // Use French translation if available, otherwise first available
        const frTranslation = record.product_translations.find(t => t.locale === 'fr');
        const translation = frTranslation || record.product_translations[0];
        if (translation.name) {
          productName = translation.name;
        }
      }

      const productReference: ProductReference = {
        id: record.id,
        name: productName,
        price: new Money(record.price),
        stock: new Quantity(record.stock),
        slug: record.slug,
        imageUrl: record.image_url,
        isActive: record.is_active,
      };

      return Result.ok(productReference);
    } catch (error) {
      logger.error('Failed to map product with translations from database', error, { productId: record.id });
      return Result.error(new DatabaseError('Failed to map product from database', error));
    }
  }
}