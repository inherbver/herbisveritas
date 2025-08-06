/**
 * Article Search Service V1
 *
 * Service de recherche simplifiée pour articles monolingues.
 * Features de base : recherche textuelle, pagination, tri par popularité/date.
 */

import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import { Result } from "@/lib/core/result";
import { DatabaseError, NotFoundError } from "@/lib/core/errors";
import { LogUtils } from "@/lib/core/logger";
import type { Database } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

// Types simplifiés pour le schéma monolingue
export type Article = Database["public"]["Tables"]["articles"]["Row"];

export interface ArticleFilters {
  status?: string;
  author_id?: string;
  published_after?: string;
  published_before?: string;
}

export interface SearchParams {
  filters?: ArticleFilters;
  page?: number;
  limit?: number;
  sort_by?: "title" | "published_at" | "view_count";
  sort_order?: "asc" | "desc";
}

export interface PaginatedArticles {
  articles: Article[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export class ArticleSearchService {
  private adminClient: SupabaseClient<Database>;
  private serviceName = "ArticleSearchService";
  private readonly DEFAULT_LIMIT = 10;
  private readonly MAX_LIMIT = 100;

  constructor() {
    this.adminClient = createSupabaseAdminClient();
  }

  /**
   * Helper pour gérer les erreurs
   */
  private handleError(error: unknown): Result<never, Error> {
    if (error instanceof Error) {
      return Result.failure(new DatabaseError(error.message));
    }
    return Result.failure(new DatabaseError("Unknown error occurred"));
  }

  /**
   * Construit une requête de base avec filtres
   */
  private buildQuery(filters?: ArticleFilters) {
    let query = this.adminClient.from("articles").select("*");

    if (filters) {
      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.author_id) {
        query = query.eq("author_id", filters.author_id);
      }
      if (filters.published_after) {
        query = query.gte("published_at", filters.published_after);
      }
      if (filters.published_before) {
        query = query.lte("published_at", filters.published_before);
      }
    }

    return query;
  }

  /**
   * Recherche d'articles par texte (titre et excerpt uniquement)
   */
  async searchArticles(
    searchQuery: string,
    filters?: ArticleFilters
  ): Promise<Result<Article[], Error>> {
    const context = LogUtils.createOperationContext("searchArticles", this.serviceName);
    LogUtils.logOperationStart("searchArticles", context);

    try {
      let query = this.buildQuery(filters);

      // Recherche textuelle sur titre et excerpt seulement
      query = query.or(`title.ilike.%${searchQuery}%,excerpt.ilike.%${searchQuery}%`);

      // Tri par pertinence : vues puis date de publication
      query = query.order("view_count", { ascending: false, nullsFirst: false });
      query = query.order("published_at", { ascending: false, nullsFirst: false });

      const { data, error } = await query;

      if (error) throw error;

      LogUtils.logOperationInfo("searchArticles", `Found ${data?.length || 0} articles`, context);
      return Result.success(data || []);
    } catch (error) {
      LogUtils.logOperationError("searchArticles", error, context);
      return this.handleError(error);
    }
  }

  /**
   * Récupère les articles publiés avec pagination
   */
  async findPublishedArticles(params: SearchParams): Promise<Result<PaginatedArticles, Error>> {
    const context = LogUtils.createOperationContext("findPublishedArticles", this.serviceName);
    LogUtils.logOperationStart("findPublishedArticles", context);

    try {
      const page = params.page || 1;
      const limit = Math.min(params.limit || this.DEFAULT_LIMIT, this.MAX_LIMIT);
      const offset = (page - 1) * limit;

      // Ajouter le filtre "published" aux filtres existants
      const publishedFilters: ArticleFilters = {
        ...params.filters,
        status: "published",
      };

      let query = this.buildQuery(publishedFilters);

      // Tri
      const sortBy = params.sort_by || "published_at";
      const sortOrder = params.sort_order || "desc";

      if (sortBy === "published_at") {
        query = query.order("published_at", { ascending: sortOrder === "asc", nullsFirst: false });
      } else if (sortBy === "view_count") {
        query = query.order("view_count", { ascending: sortOrder === "asc", nullsFirst: false });
      } else if (sortBy === "title") {
        query = query.order("title", { ascending: sortOrder === "asc" });
      }

      // Pagination
      query = query.range(offset, offset + limit - 1);

      // Count total en parallèle - nouvelle requête séparée
      let countQuery = this.adminClient
        .from("articles")
        .select("*", { count: "exact", head: true });

      // Appliquer les mêmes filtres que pour la requête principale
      if (publishedFilters.status) {
        countQuery = countQuery.eq("status", publishedFilters.status);
      }
      if (publishedFilters.author_id) {
        countQuery = countQuery.eq("author_id", publishedFilters.author_id);
      }
      if (publishedFilters.published_after) {
        countQuery = countQuery.gte("published_at", publishedFilters.published_after);
      }
      if (publishedFilters.published_before) {
        countQuery = countQuery.lte("published_at", publishedFilters.published_before);
      }

      const [articlesResult, countResult] = await Promise.all([query, countQuery]);

      if (articlesResult.error) throw articlesResult.error;
      if (countResult.error) throw countResult.error;

      const articles = articlesResult.data || [];
      const totalCount = countResult.count || 0;

      const result: PaginatedArticles = {
        articles,
        total: totalCount,
        page,
        limit,
        total_pages: Math.ceil(totalCount / limit),
        has_next: page * limit < totalCount,
        has_previous: page > 1,
      };

      LogUtils.logOperationInfo(
        "findPublishedArticles",
        `Found ${articles.length}/${totalCount} published articles`,
        context
      );
      return Result.success(result);
    } catch (error) {
      LogUtils.logOperationError("findPublishedArticles", error, context);
      return this.handleError(error);
    }
  }

  /**
   * Trouve un article par son slug
   */
  async findBySlug(slug: string): Promise<Result<Article | null, Error>> {
    const context = LogUtils.createOperationContext("findBySlug", this.serviceName);
    LogUtils.logOperationStart("findBySlug", context);

    try {
      const { data, error } = await this.adminClient
        .from("articles")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No rows returned
          LogUtils.logOperationInfo("findBySlug", `Article with slug '${slug}' not found`, context);
          return Result.success(null);
        }
        throw error;
      }

      LogUtils.logOperationInfo("findBySlug", `Found article: ${data.title}`, context);
      return Result.success(data);
    } catch (error) {
      LogUtils.logOperationError("findBySlug", error, context);
      return this.handleError(error);
    }
  }

  /**
   * Récupère les articles récents
   */
  async getRecentArticles(limit: number = 10): Promise<Result<Article[], Error>> {
    const context = LogUtils.createOperationContext("getRecentArticles", this.serviceName);
    LogUtils.logOperationStart("getRecentArticles", context);

    try {
      const { data, error } = await this.adminClient
        .from("articles")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(Math.min(limit, this.MAX_LIMIT));

      if (error) throw error;

      LogUtils.logOperationInfo(
        "getRecentArticles",
        `Found ${data?.length || 0} recent articles`,
        context
      );
      return Result.success(data || []);
    } catch (error) {
      LogUtils.logOperationError("getRecentArticles", error, context);
      return this.handleError(error);
    }
  }

  /**
   * Récupère les articles populaires (par vues)
   */
  async getPopularArticles(limit: number = 10): Promise<Result<Article[], Error>> {
    const context = LogUtils.createOperationContext("getPopularArticles", this.serviceName);
    LogUtils.logOperationStart("getPopularArticles", context);

    try {
      const { data, error } = await this.adminClient
        .from("articles")
        .select("*")
        .eq("status", "published")
        .not("view_count", "is", null)
        .order("view_count", { ascending: false })
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(Math.min(limit, this.MAX_LIMIT));

      if (error) throw error;

      LogUtils.logOperationInfo(
        "getPopularArticles",
        `Found ${data?.length || 0} popular articles`,
        context
      );
      return Result.success(data || []);
    } catch (error) {
      LogUtils.logOperationError("getPopularArticles", error, context);
      return this.handleError(error);
    }
  }
}
