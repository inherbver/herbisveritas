/**
 * Base repository interface with common CRUD operations
 */

import { Result } from "@/lib/core/result";
import { DatabaseError } from "@/lib/core/errors";

/**
 * Generic repository interface
 */
export interface Repository<TEntity, TCreateInput = Partial<TEntity>, TUpdateInput = Partial<TEntity>> {
  /**
   * Find entity by ID
   */
  findById(id: string): Promise<Result<TEntity | null, DatabaseError>>;

  /**
   * Find multiple entities with optional filtering
   */
  findMany(options?: FindManyOptions<TEntity>): Promise<Result<TEntity[], DatabaseError>>;

  /**
   * Find first entity matching criteria
   */
  findFirst(criteria: Partial<TEntity>): Promise<Result<TEntity | null, DatabaseError>>;

  /**
   * Create new entity
   */
  create(data: TCreateInput): Promise<Result<TEntity, DatabaseError>>;

  /**
   * Update existing entity
   */
  update(id: string, data: TUpdateInput): Promise<Result<TEntity, DatabaseError>>;

  /**
   * Delete entity by ID
   */
  delete(id: string): Promise<Result<boolean, DatabaseError>>;

  /**
   * Count entities matching criteria
   */
  count(criteria?: Partial<TEntity>): Promise<Result<number, DatabaseError>>;

  /**
   * Check if entity exists
   */
  exists(criteria: Partial<TEntity>): Promise<Result<boolean, DatabaseError>>;
}

/**
 * Find many options
 */
export interface FindManyOptions<TEntity> {
  where?: Partial<TEntity>;
  select?: (keyof TEntity)[];
  orderBy?: {
    field: keyof TEntity;
    direction: 'asc' | 'desc';
  }[];
  limit?: number;
  offset?: number;
  include?: string[];
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page: number;
  limit: number;
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Search options
 */
export interface SearchOptions<TEntity> extends FindManyOptions<TEntity> {
  search?: {
    fields: (keyof TEntity)[];
    query: string;
  };
}

/**
 * Transaction interface
 */
export interface Transaction {
  commit(): Promise<Result<void, DatabaseError>>;
  rollback(): Promise<Result<void, DatabaseError>>;
}

/**
 * Repository with transaction support
 */
export interface TransactionalRepository<TEntity, TCreateInput = Partial<TEntity>, TUpdateInput = Partial<TEntity>> 
  extends Repository<TEntity, TCreateInput, TUpdateInput> {
  
  /**
   * Execute operations within a transaction
   */
  withTransaction<T>(
    callback: (tx: Transaction, repo: Repository<TEntity, TCreateInput, TUpdateInput>) => Promise<Result<T, DatabaseError>>
  ): Promise<Result<T, DatabaseError>>;
}

/**
 * Repository factory interface
 */
export interface RepositoryFactory {
  createCartRepository(): Repository<any>;
  createProductRepository(): Repository<any>;
  createUserRepository(): Repository<any>;
  createOrderRepository(): Repository<any>;
}