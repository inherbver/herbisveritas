/**
 * Article CRUD Service - V1 Simplifié
 *
 * Service dédié aux opérations CRUD de base sur les articles.
 * Adapté au schéma monolingue existant, harmonisé avec les autres services.
 *
 * Fonctionnalités V1 :
 * - CRUD complet (Create, Read, Update, Delete)
 * - Gestion des statuts avec dates automatiques
 * - Soft delete pour préservation des données
 * - Opérations de recherche flexible
 * - Comptage et vérification d'existence
 */

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { Result } from "@/lib/core/result";
import { DatabaseError, ValidationError, NotFoundError } from "@/lib/core/errors";
import { LogUtils } from "@/lib/core/logger";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// Types de base pour les articles (schéma monolingue)
export type ArticleStatus = "draft" | "published" | "archived" | "scheduled";
export type ArticleType = "blog" | "news" | "guide" | "tutorial" | "announcement";

export interface ArticleData {
  id: string;
  type: ArticleType;
  status: ArticleStatus;
  author_id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featured_image_url?: string;
  featured_image_alt?: string;
  published_at?: string;
  scheduled_at?: string;
  reading_time_minutes?: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  tags: string[];
  categories: string[];
  is_featured: boolean;
  is_pinned: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateArticleRequest {
  type: ArticleType;
  author_id: string;
  title: string;
  slug?: string;
  content: string;
  excerpt?: string;
  featured_image_url?: string;
  featured_image_alt?: string;
  status?: ArticleStatus;
  published_at?: string;
  scheduled_at?: string;
  tags?: string[];
  categories?: string[];
  is_featured?: boolean;
  is_pinned?: boolean;
  sort_order?: number;
}

export interface UpdateArticleRequest {
  type?: ArticleType;
  title?: string;
  slug?: string;
  content?: string;
  excerpt?: string;
  featured_image_url?: string;
  featured_image_alt?: string;
  status?: ArticleStatus;
  published_at?: string;
  scheduled_at?: string;
  tags?: string[];
  categories?: string[];
  is_featured?: boolean;
  is_pinned?: boolean;
  sort_order?: number;
}

// Type de la table articles de Supabase
type SupabaseArticleRow = Database["public"]["Tables"]["articles"]["Row"];

/**
 * Transforme une ligne Supabase en ArticleData
 */
function transformSupabaseRowToArticleData(row: SupabaseArticleRow): ArticleData {
  return {
    id: row.id,
    type: "blog", // Valeur par défaut car pas encore dans la DB
    status: (row.status as ArticleStatus) || "draft",
    author_id: row.author_id,
    title: row.title,
    slug: row.slug,
    content: typeof row.content === "string" ? row.content : JSON.stringify(row.content),
    excerpt: row.excerpt || undefined,
    featured_image_url: row.featured_image || undefined,
    featured_image_alt: undefined, // Pas encore dans la DB
    published_at: row.published_at || undefined,
    scheduled_at: undefined, // Pas encore dans la DB
    reading_time_minutes: undefined, // Pas encore dans la DB
    view_count: row.view_count || 0,
    like_count: 0, // Pas encore dans la DB
    comment_count: 0, // Pas encore dans la DB
    tags: [], // Pas encore dans la DB
    categories: [], // Pas encore dans la DB
    is_featured: false, // Pas encore dans la DB
    is_pinned: false, // Pas encore dans la DB
    sort_order: 0, // Pas encore dans la DB
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

export class ArticleCRUDService {
  private adminClient: SupabaseClient<Database>;

  constructor() {
    this.adminClient = createSupabaseAdminClient();
  }

  // === Opérations CREATE ===

  /**
   * Crée un nouvel article
   */
  async createArticle(request: CreateArticleRequest): Promise<Result<ArticleData, Error>> {
    const context = LogUtils.createOperationContext("createArticle", "article-crud-service");
    LogUtils.logOperationStart("createArticle", { ...context, title: request.title });

    try {
      // Générer un slug unique si pas fourni
      const slug = request.slug || (await this.generateUniqueSlug(request.title));

      // Vérifier l'unicité du slug
      const slugTaken = await this.isSlugTaken(slug);
      if (slugTaken.isSuccess() && slugTaken.getValue()) {
        return Result.failure(new ValidationError(`Le slug '${slug}' est déjà utilisé`));
      }

      // Préparer les données avec valeurs par défaut
      const articleData = {
        ...request,
        slug,
        status: request.status || ("draft" as ArticleStatus),
        view_count: 0,
        like_count: 0,
        comment_count: 0,
        tags: request.tags || [],
        categories: request.categories || [],
        is_featured: request.is_featured || false,
        is_pinned: request.is_pinned || false,
        sort_order: request.sort_order || 0,
      };

      // Si le statut est "published" et pas de published_at, définir maintenant
      if (articleData.status === "published" && !articleData.published_at) {
        articleData.published_at = new Date().toISOString();
      }

      const { data, error } = await this.adminClient
        .from("articles")
        .insert(articleData)
        .select()
        .single();

      if (error) {
        LogUtils.logOperationError("createArticle", error, context);
        return Result.failure(new DatabaseError(`Erreur lors de la création: ${error.message}`));
      }

      LogUtils.logOperationInfo("createArticle", "Article créé avec succès", {
        ...context,
        articleId: data.id,
        status: data.status,
      });

      return Result.success(transformSupabaseRowToArticleData(data));
    } catch (error) {
      LogUtils.logOperationError("createArticle", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Erreur inconnue"));
    }
  }

  // === Opérations READ ===

  /**
   * Trouve un article par son ID
   */
  async findById(articleId: string): Promise<Result<ArticleData | null, Error>> {
    const context = LogUtils.createOperationContext("findById", "article-crud-service");
    LogUtils.logOperationStart("findById", { ...context, articleId });

    try {
      const { data, error } = await this.adminClient
        .from("articles")
        .select("*")
        .eq("id", articleId)
        .single();

      if (error && error.code !== "PGRST116") {
        LogUtils.logOperationError("findById", error, context);
        return Result.failure(new DatabaseError(`Erreur de recherche: ${error.message}`));
      }

      if (!data) {
        LogUtils.logOperationInfo("findById", "Article non trouvé", { ...context, found: false });
        return Result.success(null);
      }

      LogUtils.logOperationInfo("findById", "Article trouvé", {
        ...context,
        found: true,
        status: data.status,
      });

      return Result.success(transformSupabaseRowToArticleData(data));
    } catch (error) {
      LogUtils.logOperationError("findById", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Erreur inconnue"));
    }
  }

  /**
   * Trouve un article par son slug
   */
  async findBySlug(slug: string): Promise<Result<ArticleData | null, Error>> {
    const context = LogUtils.createOperationContext("findBySlug", "article-crud-service");
    LogUtils.logOperationStart("findBySlug", { ...context, slug });

    try {
      const { data, error } = await this.adminClient
        .from("articles")
        .select("*")
        .eq("slug", slug)
        .single();

      if (error && error.code !== "PGRST116") {
        LogUtils.logOperationError("findBySlug", error, context);
        return Result.failure(new DatabaseError(`Erreur de recherche: ${error.message}`));
      }

      if (!data) {
        LogUtils.logOperationInfo("findBySlug", "Article non trouvé", { ...context, found: false });
        return Result.success(null);
      }

      LogUtils.logOperationInfo("findBySlug", "Article trouvé", {
        ...context,
        found: true,
        articleId: data.id,
      });

      return Result.success(transformSupabaseRowToArticleData(data));
    } catch (error) {
      LogUtils.logOperationError("findBySlug", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Erreur inconnue"));
    }
  }

  /**
   * Trouve plusieurs articles selon des critères
   */
  async findMany(
    options: {
      where?: Partial<ArticleData>;
      orderBy?: { field: string; direction: "asc" | "desc" };
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<Result<ArticleData[], Error>> {
    const context = LogUtils.createOperationContext("findMany", "article-crud-service");
    LogUtils.logOperationStart("findMany", { ...context, options });

    try {
      let query = this.adminClient.from("articles").select("*");

      // Appliquer les filtres WHERE
      if (options.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      // Appliquer le tri
      if (options.orderBy) {
        query = query.order(options.orderBy.field, {
          ascending: options.orderBy.direction === "asc",
        });
      } else {
        // Tri par défaut : plus récents en premier
        query = query.order("created_at", { ascending: false });
      }

      // Appliquer la pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        const end = options.offset + (options.limit || 100) - 1;
        query = query.range(options.offset, end);
      }

      const { data, error } = await query;

      if (error) {
        LogUtils.logOperationError("findMany", error, context);
        return Result.failure(new DatabaseError(`Erreur de recherche: ${error.message}`));
      }

      LogUtils.logOperationInfo("findMany", "Articles récupérés", {
        ...context,
        count: data?.length || 0,
      });

      return Result.success((data || []).map(transformSupabaseRowToArticleData));
    } catch (error) {
      LogUtils.logOperationError("findMany", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Erreur inconnue"));
    }
  }

  // === Opérations UPDATE ===

  /**
   * Met à jour un article
   */
  async updateArticle(
    articleId: string,
    request: UpdateArticleRequest
  ): Promise<Result<ArticleData, Error>> {
    const context = LogUtils.createOperationContext("updateArticle", "article-crud-service");
    LogUtils.logOperationStart("updateArticle", { ...context, articleId });

    try {
      // Vérifier que l'article existe
      const existsResult = await this.findById(articleId);
      if (existsResult.isError()) {
        return Result.failure(existsResult.getError());
      }
      if (!existsResult.getValue()) {
        return Result.failure(new NotFoundError("Article", articleId));
      }

      const updateData = { ...request };

      // Si on change le slug, vérifier l'unicité
      if (request.slug) {
        const slugTaken = await this.isSlugTaken(request.slug, articleId);
        if (slugTaken.isSuccess() && slugTaken.getValue()) {
          return Result.failure(new ValidationError(`Le slug '${request.slug}' est déjà utilisé`));
        }
      }

      // Gestion automatique de la date de publication
      if (request.status === "published") {
        const currentArticle = existsResult.getValue()!;
        if (!currentArticle.published_at) {
          updateData.published_at = new Date().toISOString();
        }
      }

      const { data, error } = await this.adminClient
        .from("articles")
        .update(updateData)
        .eq("id", articleId)
        .select()
        .single();

      if (error) {
        LogUtils.logOperationError("updateArticle", error, context);
        return Result.failure(new DatabaseError(`Erreur de mise à jour: ${error.message}`));
      }

      LogUtils.logOperationInfo("updateArticle", "Article mis à jour", {
        ...context,
        articleId: data.id,
        status: data.status,
      });

      return Result.success(transformSupabaseRowToArticleData(data));
    } catch (error) {
      LogUtils.logOperationError("updateArticle", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Erreur inconnue"));
    }
  }

  /**
   * Met à jour uniquement le statut d'un article
   */
  async updateStatus(
    articleId: string,
    status: ArticleStatus
  ): Promise<Result<ArticleData, Error>> {
    const context = LogUtils.createOperationContext("updateStatus", "article-crud-service");
    LogUtils.logOperationStart("updateStatus", { ...context, articleId, status });

    try {
      const updateData: UpdateArticleRequest = { status };

      // Gestion automatique de published_at lors de la publication
      if (status === "published") {
        const articleResult = await this.findById(articleId);
        if (articleResult.isSuccess() && articleResult.getValue()) {
          const article = articleResult.getValue()!;
          if (!article.published_at) {
            updateData.published_at = new Date().toISOString();
          }
        }
      }

      const { data, error } = await this.adminClient
        .from("articles")
        .update(updateData)
        .eq("id", articleId)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return Result.failure(new NotFoundError("Article", articleId));
        }
        LogUtils.logOperationError("updateStatus", error, context);
        return Result.failure(
          new DatabaseError(`Erreur de mise à jour du statut: ${error.message}`)
        );
      }

      LogUtils.logOperationInfo("updateStatus", "Statut mis à jour", {
        ...context,
        articleId: data.id,
        newStatus: data.status,
      });

      return Result.success(transformSupabaseRowToArticleData(data));
    } catch (error) {
      LogUtils.logOperationError("updateStatus", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Erreur inconnue"));
    }
  }

  // === Opérations DELETE ===

  /**
   * Suppression soft (archive l'article)
   */
  async deleteArticle(articleId: string): Promise<Result<void, Error>> {
    const context = LogUtils.createOperationContext("deleteArticle", "article-crud-service");
    LogUtils.logOperationStart("deleteArticle", { ...context, articleId });

    try {
      // Soft delete : changer le statut vers "archived"
      const result = await this.updateStatus(articleId, "archived");

      if (result.isError()) {
        return Result.failure(result.getError());
      }

      LogUtils.logOperationInfo("deleteArticle", "Article archivé", {
        ...context,
        articleId,
        softDeleted: true,
      });

      return Result.success(undefined);
    } catch (error) {
      LogUtils.logOperationError("deleteArticle", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Erreur inconnue"));
    }
  }

  // === Opérations utilitaires ===

  /**
   * Compte le nombre d'articles selon des critères
   */
  async count(criteria?: Partial<ArticleData>): Promise<Result<number, Error>> {
    const context = LogUtils.createOperationContext("count", "article-crud-service");
    LogUtils.logOperationStart("count", { ...context, criteria });

    try {
      let query = this.adminClient.from("articles").select("*", { count: "exact", head: true });

      if (criteria) {
        Object.entries(criteria).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      const { count, error } = await query;

      if (error) {
        LogUtils.logOperationError("count", error, context);
        return Result.failure(new DatabaseError(`Erreur de comptage: ${error.message}`));
      }

      LogUtils.logOperationInfo("count", "Comptage effectué", {
        ...context,
        totalCount: count || 0,
      });

      return Result.success(count || 0);
    } catch (error) {
      LogUtils.logOperationError("count", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Erreur inconnue"));
    }
  }

  /**
   * Vérifie si un article existe selon des critères
   */
  async exists(criteria: Partial<ArticleData>): Promise<Result<boolean, Error>> {
    const context = LogUtils.createOperationContext("exists", "article-crud-service");
    LogUtils.logOperationStart("exists", { ...context, criteria });

    try {
      const result = await this.findMany({ where: criteria, limit: 1 });

      if (result.isError()) {
        return Result.failure(result.getError());
      }

      const exists = result.getValue().length > 0;

      LogUtils.logOperationInfo("exists", "Vérification effectuée", {
        ...context,
        exists,
      });

      return Result.success(exists);
    } catch (error) {
      LogUtils.logOperationError("exists", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Erreur inconnue"));
    }
  }

  // === Helpers privés ===

  /**
   * Génère un slug unique à partir d'un titre
   */
  private async generateUniqueSlug(title: string): Promise<string> {
    const baseSlug = title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const isTaken = await this.isSlugTaken(slug);
      if (isTaken.isSuccess() && !isTaken.getValue()) {
        break;
      }
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  /**
   * Vérifie si un slug est déjà pris
   */
  private async isSlugTaken(slug: string, excludeId?: string): Promise<Result<boolean, Error>> {
    try {
      let query = this.adminClient.from("articles").select("id").eq("slug", slug);

      if (excludeId) {
        query = query.neq("id", excludeId);
      }

      const { data, error } = await query.single();

      if (error && error.code !== "PGRST116") {
        return Result.failure(new DatabaseError(`Erreur vérification slug: ${error.message}`));
      }

      return Result.success(!!data);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error("Erreur inconnue"));
    }
  }

  // === Alias pour compatibilité ===

  /**
   * Alias pour createArticle
   */
  async create(data: CreateArticleRequest): Promise<Result<ArticleData, Error>> {
    return this.createArticle(data);
  }

  /**
   * Alias pour updateArticle
   */
  async update(id: string, data: UpdateArticleRequest): Promise<Result<ArticleData, Error>> {
    return this.updateArticle(id, data);
  }

  /**
   * Alias pour deleteArticle qui retourne un boolean
   */
  async delete(id: string): Promise<Result<boolean, Error>> {
    const result = await this.deleteArticle(id);
    if (result.isError()) {
      return Result.failure(result.getError());
    }
    return Result.success(true);
  }
}
