/**
 * Base Supabase Repository Implementation
 * 
 * Provides common functionality for all Supabase repositories
 * with type safety and error handling.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { Result } from "@/lib/core/result";
import { DatabaseError, NotFoundError, ErrorUtils } from "@/lib/core/errors";
import { logger } from "@/lib/core/logger";
import { Repository, FindManyOptions, PaginatedResult } from "@/lib/domain/interfaces/repository.interface";

/**
 * Supabase query builder type helpers
 */
type SupabaseQueryBuilder = ReturnType<SupabaseClient['from']>;
type SupabaseSelectBuilder = ReturnType<SupabaseQueryBuilder['select']>;

/**
 * Base repository for Supabase with common operations
 */
export abstract class BaseSupabaseRepository<
  TEntity,
  TCreateInput = Partial<TEntity>,
  TUpdateInput = Partial<TEntity>
> implements Repository<TEntity, TCreateInput, TUpdateInput> {
  
  constructor(
    protected readonly supabase: SupabaseClient,
    protected readonly tableName: string
  ) {}

  /**
   * Abstract methods that must be implemented by concrete repositories
   */
  abstract mapFromDatabase(raw: any): Result<TEntity, DatabaseError>;
  abstract mapToDatabase(entity: TCreateInput): any;
  abstract mapUpdateToDatabase(entity: TUpdateInput): any;

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<Result<TEntity | null, DatabaseError>> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        logger.error(`Repository findById failed for ${this.tableName}`, error, { id });
        return Result.error(ErrorUtils.fromSupabaseError(error) as DatabaseError);
      }

      if (!data) {
        return Result.ok(null);
      }

      const mappingResult = this.mapFromDatabase(data);
      if (mappingResult.isError()) {
        return Result.error(mappingResult.getError());
      }

      return Result.ok(mappingResult.getValue());
    } catch (error) {
      logger.error(`Repository findById exception for ${this.tableName}`, error, { id });
      return Result.error(new DatabaseError('Database operation failed', error));
    }
  }

  /**
   * Find multiple entities
   */
  async findMany(options: FindManyOptions<TEntity> = {}): Promise<Result<TEntity[], DatabaseError>> {
    try {
      let query = this.supabase.from(this.tableName).select('*');

      // Apply where conditions
      if (options.where) {
        query = this.applyWhereConditions(query, options.where);
      }

      // Apply ordering
      if (options.orderBy) {
        for (const order of options.orderBy) {
          query = query.order(order.field as string, { ascending: order.direction === 'asc' });
        }
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
      }

      const { data, error } = await query;

      if (error) {
        logger.error(`Repository findMany failed for ${this.tableName}`, error, { options });
        return Result.error(ErrorUtils.fromSupabaseError(error) as DatabaseError);
      }

      if (!data) {
        return Result.ok([]);
      }

      // Map all entities
      const entities: TEntity[] = [];
      for (const raw of data) {
        const mappingResult = this.mapFromDatabase(raw);
        if (mappingResult.isError()) {
          logger.warn(`Failed to map entity in findMany for ${this.tableName}`, mappingResult.getError(), { raw });
          continue; // Skip invalid entities
        }
        entities.push(mappingResult.getValue());
      }

      return Result.ok(entities);
    } catch (error) {
      logger.error(`Repository findMany exception for ${this.tableName}`, error, { options });
      return Result.error(new DatabaseError('Database operation failed', error));
    }
  }

  /**
   * Find first entity matching criteria
   */
  async findFirst(criteria: Partial<TEntity>): Promise<Result<TEntity | null, DatabaseError>> {
    const result = await this.findMany({ where: criteria, limit: 1 });
    if (result.isError()) {
      return Result.error(result.getError());
    }

    const entities = result.getValue();
    return Result.ok(entities.length > 0 ? entities[0] : null);
  }

  /**
   * Create new entity
   */
  async create(data: TCreateInput): Promise<Result<TEntity, DatabaseError>> {
    try {
      const dbData = this.mapToDatabase(data);
      
      const { data: createdData, error } = await this.supabase
        .from(this.tableName)
        .insert(dbData)
        .select()
        .single();

      if (error) {
        logger.error(`Repository create failed for ${this.tableName}`, error, { data: dbData });
        return Result.error(ErrorUtils.fromSupabaseError(error) as DatabaseError);
      }

      if (!createdData) {
        return Result.error(new DatabaseError('Create operation returned no data'));
      }

      const mappingResult = this.mapFromDatabase(createdData);
      if (mappingResult.isError()) {
        return Result.error(mappingResult.getError());
      }

      return Result.ok(mappingResult.getValue());
    } catch (error) {
      logger.error(`Repository create exception for ${this.tableName}`, error, { data });
      return Result.error(new DatabaseError('Database operation failed', error));
    }
  }

  /**
   * Update existing entity
   */
  async update(id: string, data: TUpdateInput): Promise<Result<TEntity, DatabaseError>> {
    try {
      const dbData = this.mapUpdateToDatabase(data);
      
      const { data: updatedData, error } = await this.supabase
        .from(this.tableName)
        .update(dbData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error(`Repository update failed for ${this.tableName}`, error, { id, data: dbData });
        return Result.error(ErrorUtils.fromSupabaseError(error) as DatabaseError);
      }

      if (!updatedData) {
        return Result.error(new NotFoundError(this.tableName, id));
      }

      const mappingResult = this.mapFromDatabase(updatedData);
      if (mappingResult.isError()) {
        return Result.error(mappingResult.getError());
      }

      return Result.ok(mappingResult.getValue());
    } catch (error) {
      logger.error(`Repository update exception for ${this.tableName}`, error, { id, data });
      return Result.error(new DatabaseError('Database operation failed', error));
    }
  }

  /**
   * Delete entity by ID
   */
  async delete(id: string): Promise<Result<boolean, DatabaseError>> {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) {
        logger.error(`Repository delete failed for ${this.tableName}`, error, { id });
        return Result.error(ErrorUtils.fromSupabaseError(error) as DatabaseError);
      }

      return Result.ok(true);
    } catch (error) {
      logger.error(`Repository delete exception for ${this.tableName}`, error, { id });
      return Result.error(new DatabaseError('Database operation failed', error));
    }
  }

  /**
   * Count entities matching criteria
   */
  async count(criteria?: Partial<TEntity>): Promise<Result<number, DatabaseError>> {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      if (criteria) {
        query = this.applyWhereConditions(query, criteria);
      }

      const { count, error } = await query;

      if (error) {
        logger.error(`Repository count failed for ${this.tableName}`, error, { criteria });
        return Result.error(ErrorUtils.fromSupabaseError(error) as DatabaseError);
      }

      return Result.ok(count || 0);
    } catch (error) {
      logger.error(`Repository count exception for ${this.tableName}`, error, { criteria });
      return Result.error(new DatabaseError('Database operation failed', error));
    }
  }

  /**
   * Check if entity exists
   */
  async exists(criteria: Partial<TEntity>): Promise<Result<boolean, DatabaseError>> {
    const countResult = await this.count(criteria);
    if (countResult.isError()) {
      return Result.error(countResult.getError());
    }

    return Result.ok(countResult.getValue() > 0);
  }

  /**
   * Find with pagination
   */
  async findWithPagination(
    options: FindManyOptions<TEntity> & { page: number; limit: number }
  ): Promise<Result<PaginatedResult<TEntity>, DatabaseError>> {
    const offset = (options.page - 1) * options.limit;
    
    // Get total count
    const countResult = await this.count(options.where);
    if (countResult.isError()) {
      return Result.error(countResult.getError());
    }

    const total = countResult.getValue();

    // Get paginated data
    const dataResult = await this.findMany({
      ...options,
      offset,
      limit: options.limit,
    });

    if (dataResult.isError()) {
      return Result.error(dataResult.getError());
    }

    const data = dataResult.getValue();
    const totalPages = Math.ceil(total / options.limit);

    const paginatedResult: PaginatedResult<TEntity> = {
      data,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        totalPages,
        hasNext: options.page < totalPages,
        hasPrev: options.page > 1,
      },
    };

    return Result.ok(paginatedResult);
  }

  /**
   * Batch create entities
   */
  async createMany(data: TCreateInput[]): Promise<Result<TEntity[], DatabaseError>> {
    try {
      const dbData = data.map(item => this.mapToDatabase(item));
      
      const { data: createdData, error } = await this.supabase
        .from(this.tableName)
        .insert(dbData)
        .select();

      if (error) {
        logger.error(`Repository createMany failed for ${this.tableName}`, error, { count: data.length });
        return Result.error(ErrorUtils.fromSupabaseError(error) as DatabaseError);
      }

      if (!createdData) {
        return Result.error(new DatabaseError('Batch create operation returned no data'));
      }

      // Map all entities
      const entities: TEntity[] = [];
      for (const raw of createdData) {
        const mappingResult = this.mapFromDatabase(raw);
        if (mappingResult.isError()) {
          logger.warn(`Failed to map entity in createMany for ${this.tableName}`, mappingResult.getError(), { raw });
          continue;
        }
        entities.push(mappingResult.getValue());
      }

      return Result.ok(entities);
    } catch (error) {
      logger.error(`Repository createMany exception for ${this.tableName}`, error, { count: data.length });
      return Result.error(new DatabaseError('Database operation failed', error));
    }
  }

  /**
   * Batch delete entities
   */
  async deleteMany(ids: string[]): Promise<Result<boolean, DatabaseError>> {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .in('id', ids);

      if (error) {
        logger.error(`Repository deleteMany failed for ${this.tableName}`, error, { ids });
        return Result.error(ErrorUtils.fromSupabaseError(error) as DatabaseError);
      }

      return Result.ok(true);
    } catch (error) {
      logger.error(`Repository deleteMany exception for ${this.tableName}`, error, { ids });
      return Result.error(new DatabaseError('Database operation failed', error));
    }
  }

  /**
   * Execute raw SQL query (use with caution)
   */
  protected async executeRawQuery<T>(
    query: string,
    params?: any[]
  ): Promise<Result<T[], DatabaseError>> {
    try {
      const { data, error } = await this.supabase.rpc('execute_sql', {
        query,
        params: params || [],
      });

      if (error) {
        logger.error(`Raw query failed for ${this.tableName}`, error, { query, params });
        return Result.error(ErrorUtils.fromSupabaseError(error) as DatabaseError);
      }

      return Result.ok(data || []);
    } catch (error) {
      logger.error(`Raw query exception for ${this.tableName}`, error, { query, params });
      return Result.error(new DatabaseError('Raw query execution failed', error));
    }
  }

  /**
   * Apply where conditions to query
   */
  private applyWhereConditions(
    query: SupabaseSelectBuilder,
    where: Partial<TEntity>
  ): SupabaseSelectBuilder {
    let modifiedQuery = query;

    for (const [key, value] of Object.entries(where)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          modifiedQuery = modifiedQuery.in(key, value);
        } else if (typeof value === 'object' && value.hasOwnProperty('operator')) {
          // Support for complex operators like { operator: 'gte', value: 100 }
          const condition = value as { operator: string; value: any };
          switch (condition.operator) {
            case 'gte':
              modifiedQuery = modifiedQuery.gte(key, condition.value);
              break;
            case 'lte':
              modifiedQuery = modifiedQuery.lte(key, condition.value);
              break;
            case 'gt':
              modifiedQuery = modifiedQuery.gt(key, condition.value);
              break;
            case 'lt':
              modifiedQuery = modifiedQuery.lt(key, condition.value);
              break;
            case 'like':
              modifiedQuery = modifiedQuery.like(key, condition.value);
              break;
            case 'ilike':
              modifiedQuery = modifiedQuery.ilike(key, condition.value);
              break;
          }
        } else {
          modifiedQuery = modifiedQuery.eq(key, value);
        }
      }
    }

    return modifiedQuery;
  }

  /**
   * Helper method to generate UUID
   */
  protected generateId(): string {
    return crypto.randomUUID();
  }

  /**
   * Helper method to get current timestamp
   */
  protected getCurrentTimestamp(): Date {
    return new Date();
  }

  /**
   * Validate entity before database operation
   */
  protected validateEntity(entity: TCreateInput | TUpdateInput): Result<void, DatabaseError> {
    // Override in concrete repositories for specific validation
    return Result.ok(undefined);
  }
}