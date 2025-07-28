/**
 * Cart Repository Implementation with Supabase
 * 
 * Handles cart persistence with proper mapping between domain entities
 * and database records.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { Result } from "@/lib/core/result";
import { DatabaseError, NotFoundError, ErrorUtils } from "@/lib/core/errors";
import { logger } from "@/lib/core/logger";
import { BaseSupabaseRepository } from "./base-supabase.repository";
import { Cart } from "@/lib/domain/entities/cart.entity";
import { CartRepository } from "@/lib/domain/services/cart.service";

/**
 * Database interfaces for cart-related tables
 */
interface CartRecord {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface CartItemRecord {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  added_at: string;
}

interface ProductRecord {
  id: string;
  name: string;
  price: number;
  stock: number;
  slug?: string;
  image_url?: string;
  is_active: boolean;
}

/**
 * Combined cart with items data structure from database
 */
interface CartWithItemsRecord extends CartRecord {
  cart_items: (CartItemRecord & {
    products: ProductRecord;
  })[];
}

/**
 * Supabase Cart Repository implementation
 */
export class SupabaseCartRepository extends BaseSupabaseRepository<Cart, Partial<Cart>, Partial<Cart>> implements CartRepository {
  
  constructor(supabase: SupabaseClient) {
    super(supabase, 'carts');
  }

  /**
   * Find cart by user ID with all items and product details
   */
  async findByUserId(userId: string): Promise<Result<Cart | null, Error>> {
    try {
      const { data, error } = await this.supabase
        .from('carts')
        .select(`
          id,
          user_id,
          created_at,
          updated_at,
          cart_items (
            id,
            cart_id,
            product_id,
            quantity,
            added_at,
            products (
              id,
              name,
              price,
              stock,
              slug,
              image_url,
              is_active
            )
          )
        `)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        logger.error('Failed to find cart by user ID', error, { userId });
        return Result.error(ErrorUtils.fromSupabaseError(error));
      }

      if (!data) {
        return Result.ok(null);
      }

      const mappingResult = this.mapCartWithItemsFromDatabase(data as CartWithItemsRecord);
      if (mappingResult.isError()) {
        return Result.error(mappingResult.getError());
      }

      return Result.ok(mappingResult.getValue());
    } catch (error) {
      logger.error('Exception in findByUserId', error, { userId });
      return Result.error(new DatabaseError('Database operation failed', error));
    }
  }

  /**
   * Find cart by ID with all items and product details
   */
  async findById(cartId: string): Promise<Result<Cart | null, Error>> {
    try {
      const { data, error } = await this.supabase
        .from('carts')
        .select(`
          id,
          user_id,
          created_at,
          updated_at,
          cart_items (
            id,
            cart_id,
            product_id,
            quantity,
            added_at,
            products (
              id,
              name,
              price,
              stock,
              slug,
              image_url,
              is_active
            )
          )
        `)
        .eq('id', cartId)
        .maybeSingle();

      if (error) {
        logger.error('Failed to find cart by ID', error, { cartId });
        return Result.error(ErrorUtils.fromSupabaseError(error));
      }

      if (!data) {
        return Result.ok(null);
      }

      const mappingResult = this.mapCartWithItemsFromDatabase(data as CartWithItemsRecord);
      if (mappingResult.isError()) {
        return Result.error(mappingResult.getError());
      }

      return Result.ok(mappingResult.getValue());
    } catch (error) {
      logger.error('Exception in findById', error, { cartId });
      return Result.error(new DatabaseError('Database operation failed', error));
    }
  }

  /**
   * Save cart with all its items
   */
  async save(cart: Cart): Promise<Result<Cart, Error>> {
    try {
      // Start transaction using Supabase's built-in transaction support
      const { error: cartError } = await this.supabase
        .from('carts')
        .upsert({
          id: cart.id,
          user_id: cart.userId,
          created_at: cart.createdAt.toISOString(),
          updated_at: cart.updatedAt.toISOString(),
        })
        .select()
        .single();

      if (cartError) {
        logger.error('Failed to save cart', cartError, { cartId: cart.id });
        return Result.error(ErrorUtils.fromSupabaseError(cartError));
      }

      // Get current cart items to determine what to add/update/delete
      const { data: currentItems, error: currentItemsError } = await this.supabase
        .from('cart_items')
        .select('id, product_id')
        .eq('cart_id', cart.id);

      if (currentItemsError) {
        logger.error('Failed to get current cart items', currentItemsError, { cartId: cart.id });
        return Result.error(ErrorUtils.fromSupabaseError(currentItemsError));
      }

      const currentItemIds = new Set((currentItems || []).map(item => item.id));
      const newItems = cart.getItems();
      const newItemIds = new Set(newItems.map(item => item.id));

      // Delete items that are no longer in the cart
      const itemsToDelete = Array.from(currentItemIds).filter(id => !newItemIds.has(id));
      if (itemsToDelete.length > 0) {
        const { error: deleteError } = await this.supabase
          .from('cart_items')
          .delete()
          .in('id', itemsToDelete);

        if (deleteError) {
          logger.error('Failed to delete cart items', deleteError, { cartId: cart.id, itemsToDelete });
          return Result.error(ErrorUtils.fromSupabaseError(deleteError));
        }
      }

      // Upsert current items
      if (newItems.length > 0) {
        const itemRecords = newItems.map(item => ({
          id: item.id,
          cart_id: cart.id,
          product_id: item.productReference.id,
          quantity: item.quantity.value,
          added_at: item.addedAt.toISOString(),
        }));

        const { error: itemsError } = await this.supabase
          .from('cart_items')
          .upsert(itemRecords);

        if (itemsError) {
          logger.error('Failed to save cart items', itemsError, { cartId: cart.id });
          return Result.error(ErrorUtils.fromSupabaseError(itemsError));
        }
      }

      // Return the saved cart by fetching it with all items
      const savedCartResult = await this.findById(cart.id);
      if (savedCartResult.isError()) {
        return Result.error(savedCartResult.getError());
      }

      const savedCartWithItems = savedCartResult.getValue();
      if (!savedCartWithItems) {
        return Result.error(new NotFoundError('Cart', cart.id));
      }

      return Result.ok(savedCartWithItems);
    } catch (error) {
      logger.error('Exception in save cart', error, { cartId: cart.id });
      return Result.error(new DatabaseError('Database operation failed', error));
    }
  }

  /**
   * Delete cart and all its items
   */
  async delete(cartId: string): Promise<Result<void, Error>> {
    try {
      // Delete cart items first (foreign key constraint)
      const { error: itemsError } = await this.supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', cartId);

      if (itemsError) {
        logger.error('Failed to delete cart items', itemsError, { cartId });
        return Result.error(ErrorUtils.fromSupabaseError(itemsError));
      }

      // Delete cart
      const { error: cartError } = await this.supabase
        .from('carts')
        .delete()
        .eq('id', cartId);

      if (cartError) {
        logger.error('Failed to delete cart', cartError, { cartId });
        return Result.error(ErrorUtils.fromSupabaseError(cartError));
      }

      return Result.ok(undefined);
    } catch (error) {
      logger.error('Exception in delete cart', error, { cartId });
      return Result.error(new DatabaseError('Database operation failed', error));
    }
  }

  /**
   * Find all carts for admin/reporting purposes
   */
  async findAllWithPagination(options: {
    page: number;
    limit: number;
    userId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<Result<{ carts: Cart[]; total: number }, Error>> {
    try {
      let query = this.supabase
        .from('carts')
        .select(`
          id,
          user_id,
          created_at,
          updated_at,
          cart_items (
            id,
            cart_id,
            product_id,
            quantity,
            added_at,
            products (
              id,
              name,
              price,
              stock,
              slug,
              image_url,
              is_active
            )
          )
        `, { count: 'exact' });

      // Apply filters
      if (options.userId) {
        query = query.eq('user_id', options.userId);
      }
      if (options.dateFrom) {
        query = query.gte('created_at', options.dateFrom.toISOString());
      }
      if (options.dateTo) {
        query = query.lte('created_at', options.dateTo.toISOString());
      }

      // Apply pagination
      const offset = (options.page - 1) * options.limit;
      query = query.range(offset, offset + options.limit - 1);

      // Order by creation date (newest first)
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        logger.error('Failed to find carts with pagination', error, { options });
        return Result.error(ErrorUtils.fromSupabaseError(error));
      }

      if (!data) {
        return Result.ok({ carts: [], total: count || 0 });
      }

      // Map carts
      const carts: Cart[] = [];
      for (const cartData of data as CartWithItemsRecord[]) {
        const mappingResult = this.mapCartWithItemsFromDatabase(cartData);
        if (mappingResult.isError()) {
          logger.warn('Failed to map cart in findAllWithPagination', mappingResult.getError(), { cartId: cartData.id });
          continue;
        }
        carts.push(mappingResult.getValue());
      }

      return Result.ok({ carts, total: count || 0 });
    } catch (error) {
      logger.error('Exception in findAllWithPagination', error, { options });
      return Result.error(new DatabaseError('Database operation failed', error));
    }
  }

  /**
   * Get cart statistics for admin dashboard
   */
  async getCartStatistics(): Promise<Result<{
    totalCarts: number;
    activeCarts: number;
    totalItems: number;
    averageItemsPerCart: number;
  }, Error>> {
    try {
      // Get cart counts
      const { count: totalCarts, error: totalError } = await this.supabase
        .from('carts')
        .select('*', { count: 'exact', head: true });

      if (totalError) {
        return Result.error(ErrorUtils.fromSupabaseError(totalError));
      }

      // Get active carts (with items)
      const { count: activeCarts, error: activeError } = await this.supabase
        .from('carts')
        .select('cart_items!inner(*)', { count: 'exact', head: true });

      if (activeError) {
        return Result.error(ErrorUtils.fromSupabaseError(activeError));
      }

      // Get total items count
      const { count: totalItems, error: itemsError } = await this.supabase
        .from('cart_items')
        .select('*', { count: 'exact', head: true });

      if (itemsError) {
        return Result.error(ErrorUtils.fromSupabaseError(itemsError));
      }

      const averageItemsPerCart = (activeCarts || 0) > 0 ? (totalItems || 0) / (activeCarts || 1) : 0;

      return Result.ok({
        totalCarts: totalCarts || 0,
        activeCarts: activeCarts || 0,
        totalItems: totalItems || 0,
        averageItemsPerCart: Math.round(averageItemsPerCart * 100) / 100,
      });
    } catch (error) {
      logger.error('Exception in getCartStatistics', error);
      return Result.error(new DatabaseError('Database operation failed', error));
    }
  }

  /**
   * Required by base class but not used for carts (use specific methods instead)
   */
  mapFromDatabase(raw: any): Result<Cart, DatabaseError> {
    return Result.error(new DatabaseError('Use mapCartWithItemsFromDatabase instead'));
  }

  mapToDatabase(entity: Partial<Cart>): any {
    return {
      id: entity.id,
      user_id: entity.userId,
      created_at: entity.createdAt?.toISOString(),
      updated_at: entity.updatedAt?.toISOString(),
    };
  }

  mapUpdateToDatabase(entity: Partial<Cart>): any {
    const data: any = {};
    if (entity.userId) data.user_id = entity.userId;
    if (entity.updatedAt) data.updated_at = entity.updatedAt.toISOString();
    return data;
  }

  /**
   * Map cart with items from database record to domain entity
   */
  private mapCartWithItemsFromDatabase(record: CartWithItemsRecord): Result<Cart, DatabaseError> {
    try {
      const items: Array<{
        id: string;
        productId: string;
        productName: string;
        productPrice: number;
        productStock: number;
        productSlug?: string;
        productImageUrl?: string;
        productIsActive: boolean;
        quantity: number;
        addedAt: Date;
      }> = [];

      // Map cart items
      for (const itemRecord of record.cart_items || []) {
        if (!itemRecord.products) {
          logger.warn('Cart item missing product data', { itemId: itemRecord.id });
          continue;
        }

        items.push({
          id: itemRecord.id,
          productId: itemRecord.product_id,
          productName: itemRecord.products.name,
          productPrice: itemRecord.products.price,
          productStock: itemRecord.products.stock,
          productSlug: itemRecord.products.slug,
          productImageUrl: itemRecord.products.image_url,
          productIsActive: itemRecord.products.is_active,
          quantity: itemRecord.quantity,
          addedAt: new Date(itemRecord.added_at),
        });
      }

      // Create cart using domain entity factory
      const cartResult = Cart.fromPrimitives({
        id: record.id,
        userId: record.user_id,
        items,
        createdAt: new Date(record.created_at),
        updatedAt: new Date(record.updated_at),
      });

      if (cartResult.isError()) {
        return Result.error(new DatabaseError(cartResult.getError().message));
      }

      return Result.ok(cartResult.getValue());
    } catch (error) {
      logger.error('Failed to map cart from database', error, { cartId: record.id });
      return Result.error(new DatabaseError('Failed to map cart from database', error));
    }
  }
}