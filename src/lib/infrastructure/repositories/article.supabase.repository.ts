/**
 * Article Repository - Implémentation Supabase
 * 
 * Implémente IArticleRepository en utilisant Supabase comme source de données.
 * Gère les articles de contenu éditorial avec support i18n, SEO et analytics.
 * Phase 3.3 selon Context7 - Repository de contenu avec cache et validation.
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server-admin';
import { Result } from '@/lib/core/result';
import { DatabaseError, ValidationError, NotFoundError } from '@/lib/core/errors';
import { LogUtils } from '@/lib/core/logger';
import type { 
  IArticleRepository,
  Article,
  ArticleTranslation,
  ArticleWithTranslations,
  ArticleWithCurrentTranslation,
  CreateArticleData,
  UpdateArticleData,
  CreateArticleTranslationData,
  UpdateArticleTranslationData,
  ArticleFilters,
  ArticleSearchParams,
  PaginatedArticles,
  ArticleSEOData,
  ArticleAnalytics,
  ArticleStatus,
  ArticleType,
  ARTICLE_CONFIG
} from '@/lib/domain/interfaces/article.repository.interface';
import type { SupabaseClient } from '@supabase/supabase-js';

export class ArticleSupabaseRepository implements IArticleRepository {
  private client: SupabaseClient;
  private adminClient: SupabaseClient;
  private repositoryName = 'ArticleRepository';

  constructor() {
    this.client = createSupabaseServerClient();
    this.adminClient = createSupabaseAdminClient();
  }

  /**
   * Helper pour gérer les erreurs
   */
  private handleError(error: unknown): Result<never, Error> {
    if (error instanceof Error) {
      return Result.failure(new DatabaseError(error.message));
    }
    return Result.failure(new DatabaseError('Unknown error occurred'));
  }

  /**
   * Helper pour calculer le temps de lecture basé sur le contenu
   */
  private calculateReadingTime(content: string): number {
    const words = content.trim().split(/\s+/).length;
    return Math.ceil(words / ARTICLE_CONFIG.DEFAULT_READING_WPM);
  }

  /**
   * Helper pour générer un slug unique
   */
  private async generateSlugFromTitle(title: string, locale: string, excludeId?: string): Promise<string> {
    const baseSlug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    let slug = baseSlug;
    let counter = 1;
    
    while (true) {
      const { data } = await this.adminClient
        .from('article_translations')
        .select('id, article_id')
        .eq('locale', locale)
        .eq('slug', slug)
        .maybeSingle();

      if (!data || (excludeId && data.article_id === excludeId)) {
        break;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  // === Opérations de base ===

  async findBySlug(slug: string, locale = 'fr'): Promise<Result<ArticleWithCurrentTranslation | null, Error>> {
    const context = LogUtils.createOperationContext('findBySlug', this.repositoryName);
    LogUtils.logOperationStart('findBySlug', context, { slug, locale });

    try {
      const { data, error } = await this.client
        .from('articles')
        .select(`
          *,
          translations:article_translations(*)
        `)
        .eq('article_translations.slug', slug)
        .eq('article_translations.locale', locale)
        .eq('status', 'published')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          LogUtils.logOperationEnd('findBySlug', context, { found: false });
          return Result.success(null);
        }
        throw error;
      }

      const translation = data.translations.find((t: any) => t.locale === locale);
      if (!translation) {
        LogUtils.logOperationEnd('findBySlug', context, { found: false });
        return Result.success(null);
      }

      const articleWithTranslation: ArticleWithCurrentTranslation = {
        ...data,
        title: translation.title,
        slug: translation.slug,
        excerpt: translation.excerpt,
        content: translation.content,
        meta_title: translation.meta_title,
        meta_description: translation.meta_description,
        keywords: translation.keywords
      };

      LogUtils.logOperationEnd('findBySlug', context, { found: true });
      return Result.success(articleWithTranslation);

    } catch (error) {
      LogUtils.logOperationError('findBySlug', context, error);
      return this.handleError(error);
    }
  }

  async findByIdWithTranslations(id: string): Promise<Result<ArticleWithTranslations | null, Error>> {
    const context = LogUtils.createOperationContext('findByIdWithTranslations', this.repositoryName);
    LogUtils.logOperationStart('findByIdWithTranslations', context, { id });

    try {
      const { data, error } = await this.client
        .from('articles')
        .select(`
          *,
          translations:article_translations(*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          LogUtils.logOperationEnd('findByIdWithTranslations', context, { found: false });
          return Result.success(null);
        }
        throw error;
      }

      LogUtils.logOperationEnd('findByIdWithTranslations', context, { found: true });
      return Result.success(data as ArticleWithTranslations);

    } catch (error) {
      LogUtils.logOperationError('findByIdWithTranslations', context, error);
      return this.handleError(error);
    }
  }

  async findPublishedArticles(params: ArticleSearchParams): Promise<Result<PaginatedArticles, Error>> {
    const context = LogUtils.createOperationContext('findPublishedArticles', this.repositoryName);
    LogUtils.logOperationStart('findPublishedArticles', context, params);

    try {
      const { 
        filters = {}, 
        locale = 'fr', 
        sort_by = 'published_at', 
        sort_order = 'desc',
        page = 1,
        limit = 10
      } = params;

      let query = this.client
        .from('articles')
        .select(`
          *,
          translations:article_translations!inner(*)
        `)
        .eq('status', 'published')
        .eq('article_translations.locale', locale);

      // Apply filters
      if (filters.type) query = query.eq('type', filters.type);
      if (filters.author_id) query = query.eq('author_id', filters.author_id);
      if (filters.is_featured !== undefined) query = query.eq('is_featured', filters.is_featured);
      if (filters.is_pinned !== undefined) query = query.eq('is_pinned', filters.is_pinned);
      if (filters.published_from) query = query.gte('published_at', filters.published_from);
      if (filters.published_to) query = query.lte('published_at', filters.published_to);
      if (filters.tags?.length) query = query.overlaps('tags', filters.tags);
      if (filters.categories?.length) query = query.overlaps('categories', filters.categories);

      // Text search
      if (filters.search) {
        query = query.or(`article_translations.title.ilike.%${filters.search}%,article_translations.content.ilike.%${filters.search}%,article_translations.excerpt.ilike.%${filters.search}%`);
      }

      // Count total
      const { count } = await query.select('*', { count: 'exact', head: true });

      // Apply sorting and pagination
      const offset = (page - 1) * limit;
      query = query.order(sort_by, { ascending: sort_order === 'asc' })
                  .range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) throw error;

      const articles: ArticleWithCurrentTranslation[] = data.map((article: any) => {
        const translation = article.translations[0];
        return {
          ...article,
          title: translation.title,
          slug: translation.slug,
          excerpt: translation.excerpt,
          content: translation.content,
          meta_title: translation.meta_title,
          meta_description: translation.meta_description,
          keywords: translation.keywords
        };
      });

      const result: PaginatedArticles = {
        articles,
        total: count || 0,
        page,
        limit,
        total_pages: Math.ceil((count || 0) / limit)
      };

      LogUtils.logOperationEnd('findPublishedArticles', context, { count: articles.length });
      return Result.success(result);

    } catch (error) {
      LogUtils.logOperationError('findPublishedArticles', context, error);
      return this.handleError(error);
    }
  }

  async findAllArticles(params: ArticleSearchParams): Promise<Result<PaginatedArticles, Error>> {
    const context = LogUtils.createOperationContext('findAllArticles', this.repositoryName);
    LogUtils.logOperationStart('findAllArticles', context, params);

    try {
      const { 
        filters = {}, 
        locale = 'fr', 
        sort_by = 'created_at', 
        sort_order = 'desc',
        page = 1,
        limit = 10
      } = params;

      let query = this.adminClient
        .from('articles')
        .select(`
          *,
          translations:article_translations!inner(*)
        `)
        .eq('article_translations.locale', locale);

      // Apply all filters (including non-published articles)
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.type) query = query.eq('type', filters.type);
      if (filters.author_id) query = query.eq('author_id', filters.author_id);
      if (filters.is_featured !== undefined) query = query.eq('is_featured', filters.is_featured);
      if (filters.is_pinned !== undefined) query = query.eq('is_pinned', filters.is_pinned);
      if (filters.published_from) query = query.gte('published_at', filters.published_from);
      if (filters.published_to) query = query.lte('published_at', filters.published_to);
      if (filters.tags?.length) query = query.overlaps('tags', filters.tags);
      if (filters.categories?.length) query = query.overlaps('categories', filters.categories);

      // Text search
      if (filters.search) {
        query = query.or(`article_translations.title.ilike.%${filters.search}%,article_translations.content.ilike.%${filters.search}%,article_translations.excerpt.ilike.%${filters.search}%`);
      }

      // Count total
      const { count } = await query.select('*', { count: 'exact', head: true });

      // Apply sorting and pagination
      const offset = (page - 1) * limit;
      query = query.order(sort_by, { ascending: sort_order === 'asc' })
                  .range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) throw error;

      const articles: ArticleWithCurrentTranslation[] = data.map((article: any) => {
        const translation = article.translations[0];
        return {
          ...article,
          title: translation.title,
          slug: translation.slug,
          excerpt: translation.excerpt,
          content: translation.content,
          meta_title: translation.meta_title,
          meta_description: translation.meta_description,
          keywords: translation.keywords
        };
      });

      const result: PaginatedArticles = {
        articles,
        total: count || 0,
        page,
        limit,
        total_pages: Math.ceil((count || 0) / limit)
      };

      LogUtils.logOperationEnd('findAllArticles', context, { count: articles.length });
      return Result.success(result);

    } catch (error) {
      LogUtils.logOperationError('findAllArticles', context, error);
      return this.handleError(error);
    }
  }

  // === Opérations CRUD ===

  async createArticle(articleData: CreateArticleData): Promise<Result<Article, Error>> {
    const context = LogUtils.createOperationContext('createArticle', this.repositoryName);
    LogUtils.logOperationStart('createArticle', context, { type: articleData.type });

    try {
      const { data, error } = await this.adminClient
        .from('articles')
        .insert({
          ...articleData,
          view_count: 0,
          like_count: 0,
          comment_count: 0,
          is_featured: articleData.is_featured || false,
          is_pinned: articleData.is_pinned || false,
          sort_order: articleData.sort_order || 0
        })
        .select()
        .single();

      if (error) throw error;

      LogUtils.logOperationEnd('createArticle', context, { id: data.id });
      return Result.success(data as Article);

    } catch (error) {
      LogUtils.logOperationError('createArticle', context, error);
      return this.handleError(error);
    }
  }

  async updateArticle(articleId: string, articleData: UpdateArticleData): Promise<Result<Article, Error>> {
    const context = LogUtils.createOperationContext('updateArticle', this.repositoryName);
    LogUtils.logOperationStart('updateArticle', context, { articleId });

    try {
      const { data, error } = await this.adminClient
        .from('articles')
        .update(articleData)
        .eq('id', articleId)
        .select()
        .single();

      if (error) throw error;

      LogUtils.logOperationEnd('updateArticle', context, { updated: true });
      return Result.success(data as Article);

    } catch (error) {
      LogUtils.logOperationError('updateArticle', context, error);
      return this.handleError(error);
    }
  }

  async deleteArticle(articleId: string): Promise<Result<void, Error>> {
    const context = LogUtils.createOperationContext('deleteArticle', this.repositoryName);
    LogUtils.logOperationStart('deleteArticle', context, { articleId });

    try {
      // Soft delete - update status to archived
      const { error } = await this.adminClient
        .from('articles')
        .update({ status: 'archived' as ArticleStatus })
        .eq('id', articleId);

      if (error) throw error;

      LogUtils.logOperationEnd('deleteArticle', context, { deleted: true });
      return Result.success(void 0);

    } catch (error) {
      LogUtils.logOperationError('deleteArticle', context, error);
      return this.handleError(error);
    }
  }

  async updateArticleStatus(articleId: string, status: ArticleStatus): Promise<Result<Article, Error>> {
    const context = LogUtils.createOperationContext('updateArticleStatus', this.repositoryName);
    LogUtils.logOperationStart('updateArticleStatus', context, { articleId, status });

    try {
      const updateData: any = { status };

      // Set published_at when publishing
      if (status === 'published') {
        updateData.published_at = new Date().toISOString();
      }

      const { data, error } = await this.adminClient
        .from('articles')
        .update(updateData)
        .eq('id', articleId)
        .select()
        .single();

      if (error) throw error;

      LogUtils.logOperationEnd('updateArticleStatus', context, { updated: true });
      return Result.success(data as Article);

    } catch (error) {
      LogUtils.logOperationError('updateArticleStatus', context, error);
      return this.handleError(error);
    }
  }

  // === Opérations de traduction ===

  async createTranslation(articleId: string, translationData: CreateArticleTranslationData): Promise<Result<ArticleTranslation, Error>> {
    const context = LogUtils.createOperationContext('createTranslation', this.repositoryName);
    LogUtils.logOperationStart('createTranslation', context, { articleId, locale: translationData.locale });

    try {
      // Generate unique slug
      const slug = await this.generateSlugFromTitle(translationData.title, translationData.locale);

      const { data, error } = await this.adminClient
        .from('article_translations')
        .insert({
          ...translationData,
          article_id: articleId,
          slug
        })
        .select()
        .single();

      if (error) throw error;

      LogUtils.logOperationEnd('createTranslation', context, { created: true });
      return Result.success(data as ArticleTranslation);

    } catch (error) {
      LogUtils.logOperationError('createTranslation', context, error);
      return this.handleError(error);
    }
  }

  async updateTranslation(articleId: string, locale: string, translationData: UpdateArticleTranslationData): Promise<Result<ArticleTranslation, Error>> {
    const context = LogUtils.createOperationContext('updateTranslation', this.repositoryName);
    LogUtils.logOperationStart('updateTranslation', context, { articleId, locale });

    try {
      const updateData = { ...translationData };

      // Regenerate slug if title changed
      if (translationData.title) {
        updateData.slug = await this.generateSlugFromTitle(translationData.title, locale, articleId);
      }

      const { data, error } = await this.adminClient
        .from('article_translations')
        .update(updateData)
        .eq('article_id', articleId)
        .eq('locale', locale)
        .select()
        .single();

      if (error) throw error;

      LogUtils.logOperationEnd('updateTranslation', context, { updated: true });
      return Result.success(data as ArticleTranslation);

    } catch (error) {
      LogUtils.logOperationError('updateTranslation', context, error);
      return this.handleError(error);
    }
  }

  async deleteTranslation(articleId: string, locale: string): Promise<Result<void, Error>> {
    const context = LogUtils.createOperationContext('deleteTranslation', this.repositoryName);
    LogUtils.logOperationStart('deleteTranslation', context, { articleId, locale });

    try {
      const { error } = await this.adminClient
        .from('article_translations')
        .delete()
        .eq('article_id', articleId)
        .eq('locale', locale);

      if (error) throw error;

      LogUtils.logOperationEnd('deleteTranslation', context, { deleted: true });
      return Result.success(void 0);

    } catch (error) {
      LogUtils.logOperationError('deleteTranslation', context, error);
      return this.handleError(error);
    }
  }

  async findTranslation(articleId: string, locale: string): Promise<Result<ArticleTranslation | null, Error>> {
    const context = LogUtils.createOperationContext('findTranslation', this.repositoryName);
    LogUtils.logOperationStart('findTranslation', context, { articleId, locale });

    try {
      const { data, error } = await this.client
        .from('article_translations')
        .select('*')
        .eq('article_id', articleId)
        .eq('locale', locale)
        .maybeSingle();

      if (error) throw error;

      LogUtils.logOperationEnd('findTranslation', context, { found: !!data });
      return Result.success(data as ArticleTranslation | null);

    } catch (error) {
      LogUtils.logOperationError('findTranslation', context, error);
      return this.handleError(error);
    }
  }

  // === Opérations de recherche ===

  async searchArticles(query: string, filters?: ArticleFilters, locale = 'fr'): Promise<Result<ArticleWithCurrentTranslation[], Error>> {
    const searchParams: ArticleSearchParams = {
      filters: { ...filters, search: query },
      locale,
      sort_by: 'published_at',
      sort_order: 'desc',
      limit: 50
    };

    const result = await this.findPublishedArticles(searchParams);
    if (result.isFailure()) return result;

    return Result.success(result.data.articles);
  }

  async getFeaturedArticles(limit = ARTICLE_CONFIG.FEATURED_ARTICLES_LIMIT, locale = 'fr'): Promise<Result<ArticleWithCurrentTranslation[], Error>> {
    const searchParams: ArticleSearchParams = {
      filters: { is_featured: true },
      locale,
      sort_by: 'sort_order',
      sort_order: 'asc',
      limit
    };

    const result = await this.findPublishedArticles(searchParams);
    if (result.isFailure()) return result;

    return Result.success(result.data.articles);
  }

  async getRecentArticles(limit = 10, locale = 'fr'): Promise<Result<ArticleWithCurrentTranslation[], Error>> {
    const searchParams: ArticleSearchParams = {
      locale,
      sort_by: 'published_at',
      sort_order: 'desc',
      limit
    };

    const result = await this.findPublishedArticles(searchParams);
    if (result.isFailure()) return result;

    return Result.success(result.data.articles);
  }

  async getPopularArticles(limit = 10, locale = 'fr'): Promise<Result<ArticleWithCurrentTranslation[], Error>> {
    const searchParams: ArticleSearchParams = {
      locale,
      sort_by: 'view_count',
      sort_order: 'desc',
      limit
    };

    const result = await this.findPublishedArticles(searchParams);
    if (result.isFailure()) return result;

    return Result.success(result.data.articles);
  }

  async findByCategory(category: string, locale = 'fr'): Promise<Result<ArticleWithCurrentTranslation[], Error>> {
    const searchParams: ArticleSearchParams = {
      filters: { categories: [category] },
      locale,
      sort_by: 'published_at',
      sort_order: 'desc',
      limit: 50
    };

    const result = await this.findPublishedArticles(searchParams);
    if (result.isFailure()) return result;

    return Result.success(result.data.articles);
  }

  async findByTag(tag: string, locale = 'fr'): Promise<Result<ArticleWithCurrentTranslation[], Error>> {
    const searchParams: ArticleSearchParams = {
      filters: { tags: [tag] },
      locale,
      sort_by: 'published_at',
      sort_order: 'desc',
      limit: 50
    };

    const result = await this.findPublishedArticles(searchParams);
    if (result.isFailure()) return result;

    return Result.success(result.data.articles);
  }

  async findRelatedArticles(articleId: string, limit = ARTICLE_CONFIG.RELATED_ARTICLES_LIMIT, locale = 'fr'): Promise<Result<ArticleWithCurrentTranslation[], Error>> {
    const context = LogUtils.createOperationContext('findRelatedArticles', this.repositoryName);
    LogUtils.logOperationStart('findRelatedArticles', context, { articleId, limit });

    try {
      // Get the source article to find common tags/categories
      const sourceResult = await this.findById(articleId);
      if (sourceResult.isFailure()) return sourceResult;

      const sourceArticle = sourceResult.data;
      if (!sourceArticle) {
        return Result.success([]);
      }

      // Find articles with similar tags or categories
      const { data, error } = await this.client
        .from('articles')
        .select(`
          *,
          translations:article_translations!inner(*)
        `)
        .eq('status', 'published')
        .eq('article_translations.locale', locale)
        .neq('id', articleId)
        .or(`tags.ov.{${sourceArticle.tags.join(',')}},categories.ov.{${sourceArticle.categories.join(',')}}`)
        .order('published_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const articles: ArticleWithCurrentTranslation[] = data.map((article: any) => {
        const translation = article.translations[0];
        return {
          ...article,
          title: translation.title,
          slug: translation.slug,
          excerpt: translation.excerpt,
          content: translation.content,
          meta_title: translation.meta_title,
          meta_description: translation.meta_description,
          keywords: translation.keywords
        };
      });

      LogUtils.logOperationEnd('findRelatedArticles', context, { count: articles.length });
      return Result.success(articles);

    } catch (error) {
      LogUtils.logOperationError('findRelatedArticles', context, error);
      return this.handleError(error);
    }
  }

  // === Opérations de validation ===

  async validateArticleData(articleData: CreateArticleData | UpdateArticleData): Promise<Result<void, Error>> {
    const context = LogUtils.createOperationContext('validateArticleData', this.repositoryName);
    LogUtils.logOperationStart('validateArticleData', context);

    try {
      // Validate basic fields
      if ('status' in articleData && articleData.status === 'scheduled' && !articleData.scheduled_at) {
        return Result.failure(new ValidationError('scheduled_at is required when status is scheduled'));
      }

      if ('published_at' in articleData && articleData.published_at && new Date(articleData.published_at) > new Date()) {
        return Result.failure(new ValidationError('published_at cannot be in the future unless status is scheduled'));
      }

      LogUtils.logOperationEnd('validateArticleData', context, { valid: true });
      return Result.success(void 0);

    } catch (error) {
      LogUtils.logOperationError('validateArticleData', context, error);
      return this.handleError(error);
    }
  }

  async isSlugAvailable(slug: string, locale: string, excludeArticleId?: string): Promise<Result<boolean, Error>> {
    const context = LogUtils.createOperationContext('isSlugAvailable', this.repositoryName);
    LogUtils.logOperationStart('isSlugAvailable', context, { slug, locale });

    try {
      let query = this.client
        .from('article_translations')
        .select('article_id')
        .eq('slug', slug)
        .eq('locale', locale);

      if (excludeArticleId) {
        query = query.neq('article_id', excludeArticleId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;

      const available = !data;
      LogUtils.logOperationEnd('isSlugAvailable', context, { available });
      return Result.success(available);

    } catch (error) {
      LogUtils.logOperationError('isSlugAvailable', context, error);
      return this.handleError(error);
    }
  }

  async validateTranslations(translations: CreateArticleTranslationData[]): Promise<Result<void, Error>> {
    const context = LogUtils.createOperationContext('validateTranslations', this.repositoryName);
    LogUtils.logOperationStart('validateTranslations', context, { count: translations.length });

    try {
      const locales = translations.map(t => t.locale);
      const uniqueLocales = new Set(locales);

      if (locales.length !== uniqueLocales.size) {
        return Result.failure(new ValidationError('Duplicate locales in translations'));
      }

      for (const translation of translations) {
        if (!translation.title?.trim()) {
          return Result.failure(new ValidationError(`Title is required for locale ${translation.locale}`));
        }
        if (!translation.content?.trim()) {
          return Result.failure(new ValidationError(`Content is required for locale ${translation.locale}`));
        }
      }

      LogUtils.logOperationEnd('validateTranslations', context, { valid: true });
      return Result.success(void 0);

    } catch (error) {
      LogUtils.logOperationError('validateTranslations', context, error);
      return this.handleError(error);
    }
  }

  // === Opérations SEO ===

  async generateSEOData(articleId: string, locale: string): Promise<Result<ArticleSEOData, Error>> {
    const context = LogUtils.createOperationContext('generateSEOData', this.repositoryName);
    LogUtils.logOperationStart('generateSEOData', context, { articleId, locale });

    try {
      const translationResult = await this.findTranslation(articleId, locale);
      if (translationResult.isFailure()) return translationResult;

      const translation = translationResult.data;
      if (!translation) {
        return Result.failure(new NotFoundError(`Translation not found for article ${articleId} in locale ${locale}`));
      }

      const seoData: ArticleSEOData = {
        title: translation.meta_title || translation.title,
        description: translation.meta_description || translation.excerpt || '',
        keywords: translation.keywords || [],
        canonical_url: `/articles/${translation.slug}`,
        og_title: translation.meta_title || translation.title,
        og_description: translation.meta_description || translation.excerpt || '',
        twitter_title: translation.meta_title || translation.title,
        twitter_description: translation.meta_description || translation.excerpt || ''
      };

      LogUtils.logOperationEnd('generateSEOData', context, { generated: true });
      return Result.success(seoData);

    } catch (error) {
      LogUtils.logOperationError('generateSEOData', context, error);
      return this.handleError(error);
    }
  }

  async updateSEOMetadata(articleId: string, locale: string, seoData: Partial<ArticleSEOData>): Promise<Result<ArticleTranslation, Error>> {
    const context = LogUtils.createOperationContext('updateSEOMetadata', this.repositoryName);
    LogUtils.logOperationStart('updateSEOMetadata', context, { articleId, locale });

    try {
      const updateData: UpdateArticleTranslationData = {};

      if (seoData.title) updateData.meta_title = seoData.title;
      if (seoData.description) updateData.meta_description = seoData.description;
      if (seoData.keywords) updateData.keywords = seoData.keywords;

      return this.updateTranslation(articleId, locale, updateData);

    } catch (error) {
      LogUtils.logOperationError('updateSEOMetadata', context, error);
      return this.handleError(error);
    }
  }

  async generateUniqueSlug(title: string, locale: string): Promise<Result<string, Error>> {
    const context = LogUtils.createOperationContext('generateUniqueSlug', this.repositoryName);
    LogUtils.logOperationStart('generateUniqueSlug', context, { title, locale });

    try {
      const slug = await this.generateSlugFromTitle(title, locale);
      LogUtils.logOperationEnd('generateUniqueSlug', context, { slug });
      return Result.success(slug);

    } catch (error) {
      LogUtils.logOperationError('generateUniqueSlug', context, error);
      return this.handleError(error);
    }
  }

  // === Opérations d'analytics ===

  async recordView(articleId: string, visitorData?: { ip: string; userAgent: string; referrer?: string }): Promise<Result<void, Error>> {
    const context = LogUtils.createOperationContext('recordView', this.repositoryName);
    LogUtils.logOperationStart('recordView', context, { articleId });

    try {
      // Increment view count
      const { error: updateError } = await this.adminClient
        .from('articles')
        .update({ view_count: this.adminClient.sql`view_count + 1` } as any)
        .eq('id', articleId);

      if (updateError) throw updateError;

      // Record detailed analytics if visitor data provided
      if (visitorData) {
        const { error: analyticsError } = await this.adminClient
          .from('article_views')
          .insert({
            article_id: articleId,
            visitor_ip: visitorData.ip,
            user_agent: visitorData.userAgent,
            referrer: visitorData.referrer,
            viewed_at: new Date().toISOString()
          });

        // Don't fail if analytics insert fails
        if (analyticsError) {
          LogUtils.logOperationError('recordView', context, analyticsError);
        }
      }

      LogUtils.logOperationEnd('recordView', context, { recorded: true });
      return Result.success(void 0);

    } catch (error) {
      LogUtils.logOperationError('recordView', context, error);
      return this.handleError(error);
    }
  }

  async getArticleAnalytics(articleId: string, _dateFrom?: string, _dateTo?: string): Promise<Result<ArticleAnalytics, Error>> {
    const context = LogUtils.createOperationContext('getArticleAnalytics', this.repositoryName);
    LogUtils.logOperationStart('getArticleAnalytics', context, { articleId });

    try {
      // Basic article data
      const articleResult = await this.findById(articleId);
      if (articleResult.isFailure()) return articleResult;

      const article = articleResult.data;
      if (!article) {
        return Result.failure(new NotFoundError(`Article ${articleId} not found`));
      }

      // Calculate date ranges
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get view analytics (if views table exists)
      let viewsToday = 0, viewsWeek = 0, viewsMonth = 0, uniqueVisitors = 0;
      let topReferrers: { source: string; count: number }[] = [];

      try {
        const { data: todayViews } = await this.adminClient
          .from('article_views')
          .select('*')
          .eq('article_id', articleId)
          .gte('viewed_at', today.toISOString());

        viewsToday = todayViews?.length || 0;

        const { data: weekViews } = await this.adminClient
          .from('article_views')
          .select('*')
          .eq('article_id', articleId)
          .gte('viewed_at', weekAgo.toISOString());

        viewsWeek = weekViews?.length || 0;

        const { data: monthViews } = await this.adminClient
          .from('article_views')
          .select('*')
          .eq('article_id', articleId)
          .gte('viewed_at', monthAgo.toISOString());

        viewsMonth = monthViews?.length || 0;
        uniqueVisitors = new Set(monthViews?.map(v => v.visitor_ip)).size;

        // Calculate top referrers
        const referrerCounts: { [key: string]: number } = {};
        monthViews?.forEach(view => {
          if (view.referrer) {
            const domain = new URL(view.referrer).hostname;
            referrerCounts[domain] = (referrerCounts[domain] || 0) + 1;
          }
        });

        topReferrers = Object.entries(referrerCounts)
          .map(([source, count]) => ({ source, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

      } catch (error) {
        // Views table might not exist, continue with basic data
        LogUtils.logOperationError('getArticleAnalytics', context, error);
      }

      const analytics: ArticleAnalytics = {
        article_id: articleId,
        views_today: viewsToday,
        views_week: viewsWeek,
        views_month: viewsMonth,
        views_total: article.view_count,
        unique_visitors: uniqueVisitors,
        avg_time_on_page: 0, // Would need session tracking
        bounce_rate: 0, // Would need session tracking
        top_referrers: topReferrers,
        top_keywords: [] // Would need search analytics
      };

      LogUtils.logOperationEnd('getArticleAnalytics', context, { calculated: true });
      return Result.success(analytics);

    } catch (error) {
      LogUtils.logOperationError('getArticleAnalytics', context, error);
      return this.handleError(error);
    }
  }

  async getMostViewedArticles(limit = 10, locale = 'fr', _period: 'day' | 'week' | 'month' | 'all' = 'all'): Promise<Result<ArticleWithCurrentTranslation[], Error>> {
    // For simplicity, return popular articles (same as getPopularArticles)
    return this.getPopularArticles(limit, locale);
  }

  // === Opérations de gestion ===

  async publishScheduledArticle(articleId: string): Promise<Result<Article, Error>> {
    const context = LogUtils.createOperationContext('publishScheduledArticle', this.repositoryName);
    LogUtils.logOperationStart('publishScheduledArticle', context, { articleId });

    try {
      const { data, error } = await this.adminClient
        .from('articles')
        .update({
          status: 'published' as ArticleStatus,
          published_at: new Date().toISOString()
        })
        .eq('id', articleId)
        .eq('status', 'scheduled')
        .select()
        .single();

      if (error) throw error;

      LogUtils.logOperationEnd('publishScheduledArticle', context, { published: true });
      return Result.success(data as Article);

    } catch (error) {
      LogUtils.logOperationError('publishScheduledArticle', context, error);
      return this.handleError(error);
    }
  }

  async archiveOldArticles(olderThanDays: number): Promise<Result<number, Error>> {
    const context = LogUtils.createOperationContext('archiveOldArticles', this.repositoryName);
    LogUtils.logOperationStart('archiveOldArticles', context, { olderThanDays });

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const { data, error } = await this.adminClient
        .from('articles')
        .update({ status: 'archived' as ArticleStatus })
        .lt('published_at', cutoffDate.toISOString())
        .eq('status', 'published')
        .select('id');

      if (error) throw error;

      const archivedCount = data?.length || 0;
      LogUtils.logOperationEnd('archiveOldArticles', context, { archived: archivedCount });
      return Result.success(archivedCount);

    } catch (error) {
      LogUtils.logOperationError('archiveOldArticles', context, error);
      return this.handleError(error);
    }
  }

  async updateReadingTime(articleId: string): Promise<Result<Article, Error>> {
    const context = LogUtils.createOperationContext('updateReadingTime', this.repositoryName);
    LogUtils.logOperationStart('updateReadingTime', context, { articleId });

    try {
      // Get article content from translations
      const { data: translations, error: translationError } = await this.client
        .from('article_translations')
        .select('content')
        .eq('article_id', articleId);

      if (translationError) throw translationError;

      // Calculate reading time from longest content
      let maxReadingTime = 0;
      if (translations) {
        for (const translation of translations) {
          const readingTime = this.calculateReadingTime(translation.content);
          maxReadingTime = Math.max(maxReadingTime, readingTime);
        }
      }

      const { data, error } = await this.adminClient
        .from('articles')
        .update({ reading_time_minutes: maxReadingTime })
        .eq('id', articleId)
        .select()
        .single();

      if (error) throw error;

      LogUtils.logOperationEnd('updateReadingTime', context, { updated: true });
      return Result.success(data as Article);

    } catch (error) {
      LogUtils.logOperationError('updateReadingTime', context, error);
      return this.handleError(error);
    }
  }

  async getArticleStats(): Promise<Result<{
    total: number;
    published: number;
    draft: number;
    archived: number;
    scheduled: number;
    total_views: number;
    avg_reading_time: number;
  }, Error>> {
    const context = LogUtils.createOperationContext('getArticleStats', this.repositoryName);
    LogUtils.logOperationStart('getArticleStats', context);

    try {
      const { data, error } = await this.adminClient
        .from('articles')
        .select('status, view_count, reading_time_minutes');

      if (error) throw error;

      const stats = {
        total: 0,
        published: 0,
        draft: 0,
        archived: 0,
        scheduled: 0,
        total_views: 0,
        avg_reading_time: 0
      };

      let totalReadingTime = 0;
      let articlesWithReadingTime = 0;

      if (data) {
        stats.total = data.length;
        
        for (const article of data) {
          stats[article.status as keyof typeof stats] = (stats[article.status as keyof typeof stats] as number) + 1;
          stats.total_views += article.view_count || 0;
          
          if (article.reading_time_minutes) {
            totalReadingTime += article.reading_time_minutes;
            articlesWithReadingTime++;
          }
        }

        if (articlesWithReadingTime > 0) {
          stats.avg_reading_time = Math.round(totalReadingTime / articlesWithReadingTime);
        }
      }

      LogUtils.logOperationEnd('getArticleStats', context, stats);
      return Result.success(stats);

    } catch (error) {
      LogUtils.logOperationError('getArticleStats', context, error);
      return this.handleError(error);
    }
  }

  // === Opérations utilitaires ===

  async getAllCategories(): Promise<Result<string[], Error>> {
    const context = LogUtils.createOperationContext('getAllCategories', this.repositoryName);
    LogUtils.logOperationStart('getAllCategories', context);

    try {
      const { data, error } = await this.client
        .from('articles')
        .select('categories')
        .eq('status', 'published');

      if (error) throw error;

      const categoriesSet = new Set<string>();
      if (data) {
        for (const article of data) {
          if (article.categories) {
            article.categories.forEach((cat: string) => categoriesSet.add(cat));
          }
        }
      }

      const categories = Array.from(categoriesSet).sort();
      LogUtils.logOperationEnd('getAllCategories', context, { count: categories.length });
      return Result.success(categories);

    } catch (error) {
      LogUtils.logOperationError('getAllCategories', context, error);
      return this.handleError(error);
    }
  }

  async getAllTags(): Promise<Result<string[], Error>> {
    const context = LogUtils.createOperationContext('getAllTags', this.repositoryName);
    LogUtils.logOperationStart('getAllTags', context);

    try {
      const { data, error } = await this.client
        .from('articles')
        .select('tags')
        .eq('status', 'published');

      if (error) throw error;

      const tagsSet = new Set<string>();
      if (data) {
        for (const article of data) {
          if (article.tags) {
            article.tags.forEach((tag: string) => tagsSet.add(tag));
          }
        }
      }

      const tags = Array.from(tagsSet).sort();
      LogUtils.logOperationEnd('getAllTags', context, { count: tags.length });
      return Result.success(tags);

    } catch (error) {
      LogUtils.logOperationError('getAllTags', context, error);
      return this.handleError(error);
    }
  }

  async cleanupUnusedTaxonomies(): Promise<Result<{ removedTags: number; removedCategories: number }, Error>> {
    const context = LogUtils.createOperationContext('cleanupUnusedTaxonomies', this.repositoryName);
    LogUtils.logOperationStart('cleanupUnusedTaxonomies', context);

    try {
      // This would require a more complex implementation to identify and remove unused taxonomies
      // For now, return a placeholder result
      const result = { removedTags: 0, removedCategories: 0 };
      
      LogUtils.logOperationEnd('cleanupUnusedTaxonomies', context, result);
      return Result.success(result);

    } catch (error) {
      LogUtils.logOperationError('cleanupUnusedTaxonomies', context, error);
      return this.handleError(error);
    }
  }

  async exportArticles(filters?: ArticleFilters): Promise<Result<string, Error>> {
    const context = LogUtils.createOperationContext('exportArticles', this.repositoryName);
    LogUtils.logOperationStart('exportArticles', context, filters);

    try {
      const searchParams: ArticleSearchParams = {
        filters,
        limit: 1000 // Large limit for export
      };

      const result = await this.findAllArticles(searchParams);
      if (result.isFailure()) return result;

      const exportData = JSON.stringify(result.data.articles, null, 2);
      
      LogUtils.logOperationEnd('exportArticles', context, { exported: result.data.articles.length });
      return Result.success(exportData);

    } catch (error) {
      LogUtils.logOperationError('exportArticles', context, error);
      return this.handleError(error);
    }
  }

  // === Base Repository Implementation ===

  async findById(id: string): Promise<Result<Article | null, Error>> {
    const context = LogUtils.createOperationContext('findById', this.repositoryName);
    LogUtils.logOperationStart('findById', context, { id });

    try {
      const { data, error } = await this.client
        .from('articles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;

      LogUtils.logOperationEnd('findById', context, { found: !!data });
      return Result.success(data as Article | null);

    } catch (error) {
      LogUtils.logOperationError('findById', context, error);
      return this.handleError(error);
    }
  }

  async findMany(options?: { where?: any; orderBy?: { field: string; direction: 'asc' | 'desc' }; limit?: number }): Promise<Result<Article[], Error>> {
    const context = LogUtils.createOperationContext('findMany', this.repositoryName);
    LogUtils.logOperationStart('findMany', context, options);

    try {
      let query = this.client.from('articles').select('*');

      if (options?.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      if (options?.orderBy) {
        query = query.order(options.orderBy.field, { ascending: options.orderBy.direction === 'asc' });
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;

      LogUtils.logOperationEnd('findMany', context, { count: data?.length || 0 });
      return Result.success((data || []) as Article[]);

    } catch (error) {
      LogUtils.logOperationError('findMany', context, error);
      return this.handleError(error);
    }
  }

  async findFirst(criteria: Partial<Article>): Promise<Result<Article | null, Error>> {
    const context = LogUtils.createOperationContext('findFirst', this.repositoryName);
    LogUtils.logOperationStart('findFirst', context, criteria);

    try {
      let query = this.client.from('articles').select('*');

      Object.entries(criteria).forEach(([key, value]) => {
        if (value !== undefined) {
          query = query.eq(key, value);
        }
      });

      const { data, error } = await query.limit(1).maybeSingle();
      if (error) throw error;

      LogUtils.logOperationEnd('findFirst', context, { found: !!data });
      return Result.success(data as Article | null);

    } catch (error) {
      LogUtils.logOperationError('findFirst', context, error);
      return this.handleError(error);
    }
  }

  async create(data: CreateArticleData): Promise<Result<Article, Error>> {
    return this.createArticle(data);
  }

  async update(id: string, data: UpdateArticleData): Promise<Result<Article, Error>> {
    return this.updateArticle(id, data);
  }

  async delete(id: string): Promise<Result<boolean, Error>> {
    const result = await this.deleteArticle(id);
    if (result.isFailure()) return Result.failure(result.error);
    return Result.success(true);
  }

  async count(criteria?: Partial<Article>): Promise<Result<number, Error>> {
    const context = LogUtils.createOperationContext('count', this.repositoryName);
    LogUtils.logOperationStart('count', context, criteria);

    try {
      let query = this.client.from('articles').select('*', { count: 'exact', head: true });

      if (criteria) {
        Object.entries(criteria).forEach(([key, value]) => {
          if (value !== undefined) {
            query = query.eq(key, value);
          }
        });
      }

      const { count, error } = await query;
      if (error) throw error;

      LogUtils.logOperationEnd('count', context, { count: count || 0 });
      return Result.success(count || 0);

    } catch (error) {
      LogUtils.logOperationError('count', context, error);
      return this.handleError(error);
    }
  }

  async exists(criteria: Partial<Article>): Promise<Result<boolean, Error>> {
    const result = await this.findFirst(criteria);
    if (result.isFailure()) return Result.failure(result.error);
    return Result.success(!!result.data);
  }
}