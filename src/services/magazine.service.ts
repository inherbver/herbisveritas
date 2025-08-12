/**
 * Service Magazine Unifié - Architecture Pragmatique
 *
 * Remplace les 8 services article-* par UN service cohérent
 * Contient toute la logique métier pour le magazine
 */

import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { slugify } from "@/utils/slugify";

// Types business simples
export type ArticleStatus = "draft" | "published" | "scheduled" | "archived";
export type ArticleType = "blog" | "news" | "guide" | "tutorial";

export interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featured_image_url?: string;
  featured_image_alt?: string;
  status: ArticleStatus;
  type: ArticleType;
  author_id: string;
  published_at?: Date;
  scheduled_at?: Date;
  view_count: number;
  like_count: number;
  tags: string[];
  categories: string[];
  is_featured: boolean;
  reading_time_minutes?: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateArticleData {
  title: string;
  content: string;
  excerpt?: string;
  type: ArticleType;
  status?: ArticleStatus;
  featured_image_url?: string;
  featured_image_alt?: string;
  scheduled_at?: Date;
  tags?: string[];
  categories?: string[];
  is_featured?: boolean;
}

export interface UpdateArticleData extends Partial<CreateArticleData> {
  slug?: string;
  published_at?: Date | null;
}

export interface ArticleFilters {
  status?: ArticleStatus;
  type?: ArticleType;
  author_id?: string;
  tags?: string[];
  categories?: string[];
  is_featured?: boolean;
}

export interface ArticleSearchOptions extends ArticleFilters {
  limit?: number;
  offset?: number;
  sort?: "published_at" | "created_at" | "updated_at" | "view_count";
  order?: "asc" | "desc";
}

// Erreurs métier
export class BusinessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Service Magazine unifié
 * Centralise toute la logique métier des articles
 */
export class MagazineService {
  private supabasePromise: Promise<SupabaseClient>;
  private adminClient: SupabaseClient;

  constructor() {
    this.supabasePromise = createSupabaseServerClient();
    this.adminClient = createSupabaseAdminClient();
  }

  private async getSupabase(): Promise<SupabaseClient> {
    return this.supabasePromise;
  }

  // === CRUD OPERATIONS ===

  async createArticle(authorId: string, data: CreateArticleData): Promise<Article> {
    this.validateArticleData(data);

    const slug = await this.generateUniqueSlug(data.title);
    const readingTime = this.calculateReadingTime(data.content);

    const articleData = {
      ...data,
      slug,
      author_id: authorId,
      status: data.status || "draft",
      reading_time_minutes: readingTime,
      view_count: 0,
      like_count: 0,
      tags: data.tags || [],
      categories: data.categories || [],
      is_featured: data.is_featured || false,
    };

    const supabase = await this.getSupabase();
    const { data: article, error } = await supabase
      .from("articles")
      .insert(articleData)
      .select()
      .single();

    if (error) {
      console.error("Error creating article:", error);
      throw new BusinessError("Erreur lors de la création de l'article");
    }

    return this.mapToArticle(article);
  }

  async updateArticle(id: string, data: UpdateArticleData): Promise<Article> {
    this.validateArticleData(data);

    const updateData: Partial<
      UpdateArticleData & { slug?: string; reading_time_minutes?: number }
    > = { ...data };

    // Regenerate slug if title changed
    if (data.title) {
      updateData.slug = await this.generateUniqueSlug(data.title, id);
    }

    // Recalculate reading time if content changed
    if (data.content) {
      updateData.reading_time_minutes = this.calculateReadingTime(data.content);
    }

    updateData.updated_at = new Date().toISOString();

    const supabase = await this.getSupabase();
    const { data: article, error } = await supabase
      .from("articles")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating article:", error);
      throw new BusinessError("Erreur lors de la mise à jour de l'article");
    }

    return this.mapToArticle(article);
  }

  async getArticleById(id: string): Promise<Article | null> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase.from("articles").select("*").eq("id", id).maybeSingle();

    if (error) {
      console.error("Error fetching article:", error);
      throw new BusinessError("Erreur lors de la récupération de l'article");
    }

    return data ? this.mapToArticle(data) : null;
  }

  async getArticleBySlug(slug: string): Promise<Article | null> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (error) {
      console.error("Error fetching article by slug:", error);
      throw new BusinessError("Erreur lors de la récupération de l'article");
    }

    if (data) {
      // Increment view count asynchronously
      this.incrementViewCount(data.id).catch(console.error);
      return this.mapToArticle(data);
    }

    return null;
  }

  async deleteArticle(id: string): Promise<void> {
    const supabase = await this.getSupabase();
    const { error } = await supabase.from("articles").update({ status: "archived" }).eq("id", id);

    if (error) {
      console.error("Error archiving article:", error);
      throw new BusinessError("Erreur lors de la suppression de l'article");
    }
  }

  // === SEARCH & FILTERING ===

  async searchArticles(
    query?: string,
    options: ArticleSearchOptions = {}
  ): Promise<{
    articles: Article[];
    totalCount: number;
  }> {
    const supabase = await this.getSupabase();
    let queryBuilder = supabase.from("articles").select("*", { count: "exact" });

    // Text search
    if (query) {
      queryBuilder = queryBuilder.or(
        `title.ilike.%${query}%,content.ilike.%${query}%,excerpt.ilike.%${query}%`
      );
    }

    // Filters
    if (options.status) {
      queryBuilder = queryBuilder.eq("status", options.status);
    }
    if (options.type) {
      queryBuilder = queryBuilder.eq("type", options.type);
    }
    if (options.author_id) {
      queryBuilder = queryBuilder.eq("author_id", options.author_id);
    }
    if (options.is_featured !== undefined) {
      queryBuilder = queryBuilder.eq("is_featured", options.is_featured);
    }
    if (options.tags && options.tags.length > 0) {
      queryBuilder = queryBuilder.overlaps("tags", options.tags);
    }
    if (options.categories && options.categories.length > 0) {
      queryBuilder = queryBuilder.overlaps("categories", options.categories);
    }

    // Sorting
    const sortField = options.sort || "published_at";
    const sortOrder = options.order || "desc";
    queryBuilder = queryBuilder.order(sortField, { ascending: sortOrder === "asc" });

    // Pagination
    if (options.limit) {
      queryBuilder = queryBuilder.limit(options.limit);
    }
    if (options.offset) {
      queryBuilder = queryBuilder.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, count, error } = await queryBuilder;

    if (error) {
      console.error("Error searching articles:", error);
      throw new BusinessError("Erreur lors de la recherche d'articles");
    }

    return {
      articles: (data || []).map(this.mapToArticle),
      totalCount: count || 0,
    };
  }

  async getFeaturedArticles(limit = 5): Promise<Article[]> {
    const { articles } = await this.searchArticles(undefined, {
      status: "published",
      is_featured: true,
      limit,
      sort: "published_at",
      order: "desc",
    });
    return articles;
  }

  async getRecentArticles(limit = 10): Promise<Article[]> {
    const { articles } = await this.searchArticles(undefined, {
      status: "published",
      limit,
      sort: "published_at",
      order: "desc",
    });
    return articles;
  }

  async getPopularArticles(limit = 10): Promise<Article[]> {
    const { articles } = await this.searchArticles(undefined, {
      status: "published",
      limit,
      sort: "view_count",
      order: "desc",
    });
    return articles;
  }

  // === PUBLISHING WORKFLOW ===

  async publishArticle(id: string): Promise<Article> {
    const article = await this.getArticleById(id);
    if (!article) {
      throw new BusinessError("Article non trouvé");
    }

    if (article.status === "published") {
      throw new BusinessError("Article déjà publié");
    }

    return this.updateArticle(id, {
      status: "published",
      published_at: new Date(),
    });
  }

  async scheduleArticle(id: string, scheduledAt: Date): Promise<Article> {
    if (scheduledAt <= new Date()) {
      throw new ValidationError("La date de programmation doit être dans le futur");
    }

    return this.updateArticle(id, {
      status: "scheduled",
      scheduled_at: scheduledAt,
    });
  }

  async unpublishArticle(id: string): Promise<Article> {
    return this.updateArticle(id, {
      status: "draft",
      published_at: undefined,
    });
  }

  // === ANALYTICS ===

  async incrementViewCount(id: string): Promise<void> {
    const supabase = await this.getSupabase();
    const { error } = await supabase.rpc("increment_article_view_count", { article_id: id });

    if (error) {
      console.error("Error incrementing view count:", error);
    }
  }

  async incrementLikeCount(id: string): Promise<void> {
    const supabase = await this.getSupabase();
    const { error } = await supabase.rpc("increment_article_like_count", { article_id: id });

    if (error) {
      console.error("Error incrementing like count:", error);
      throw new BusinessError("Erreur lors du like de l'article");
    }
  }

  async getArticleStats(id: string): Promise<{
    views: number;
    likes: number;
    readingTime: number;
  }> {
    const article = await this.getArticleById(id);
    if (!article) {
      throw new BusinessError("Article non trouvé");
    }

    return {
      views: article.view_count,
      likes: article.like_count,
      readingTime: article.reading_time_minutes || 0,
    };
  }

  // === TAXONOMIES ===

  async getAllTags(): Promise<string[]> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from("articles")
      .select("tags")
      .eq("status", "published");

    if (error) {
      console.error("Error fetching tags:", error);
      return [];
    }

    const allTags = new Set<string>();
    data?.forEach((article: Article) => {
      article.tags?.forEach((tag: string) => allTags.add(tag));
    });

    return Array.from(allTags).sort();
  }

  async getAllCategories(): Promise<string[]> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from("articles")
      .select("categories")
      .eq("status", "published");

    if (error) {
      console.error("Error fetching categories:", error);
      return [];
    }

    const allCategories = new Set<string>();
    data?.forEach((article: Article) => {
      article.categories?.forEach((category: string) => allCategories.add(category));
    });

    return Array.from(allCategories).sort();
  }

  // === PRIVATE HELPERS ===

  private validateArticleData(data: Partial<CreateArticleData>): void {
    if (data.title && data.title.length < 5) {
      throw new ValidationError("Le titre doit contenir au moins 5 caractères");
    }

    if (data.title && data.title.length > 200) {
      throw new ValidationError("Le titre ne peut pas dépasser 200 caractères");
    }

    if (data.content && data.content.length < 100) {
      throw new ValidationError("Le contenu doit contenir au moins 100 caractères");
    }

    if (data.excerpt && data.excerpt.length > 500) {
      throw new ValidationError("L'extrait ne peut pas dépasser 500 caractères");
    }

    if (data.tags && data.tags.length > 10) {
      throw new ValidationError("Maximum 10 tags autorisés");
    }

    if (data.categories && data.categories.length > 5) {
      throw new ValidationError("Maximum 5 catégories autorisées");
    }
  }

  private async generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
    const baseSlug = slugify(title);
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const supabase = await this.getSupabase();
      let query = supabase.from("articles").select("id").eq("slug", slug);

      if (excludeId) {
        query = query.neq("id", excludeId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error("Error checking slug uniqueness:", error);
        break;
      }

      if (!data) {
        return slug;
      }

      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    return slug;
  }

  private calculateReadingTime(content: string): number {
    // Remove HTML tags and calculate words
    const plainText = content.replace(/<[^>]*>/g, "");
    const wordCount = plainText.split(/\s+/).length;
    // Average reading speed: 200 words per minute
    return Math.ceil(wordCount / 200);
  }

  private mapToArticle(data: Record<string, unknown>): Article {
    return {
      id: data.id,
      title: data.title,
      slug: data.slug,
      content: data.content,
      excerpt: data.excerpt,
      featured_image_url: data.featured_image_url,
      featured_image_alt: data.featured_image_alt,
      status: data.status,
      type: data.type,
      author_id: data.author_id,
      published_at: data.published_at ? new Date(data.published_at) : undefined,
      scheduled_at: data.scheduled_at ? new Date(data.scheduled_at) : undefined,
      view_count: data.view_count || 0,
      like_count: data.like_count || 0,
      tags: data.tags || [],
      categories: data.categories || [],
      is_featured: data.is_featured || false,
      reading_time_minutes: data.reading_time_minutes,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
  }
}

// Export du service instancié pour utilisation directe
export const magazineService = new MagazineService();
