/**
 * Article Repository Interface
 * 
 * Gère les articles de contenu éditorial (blog, actualités, guides).
 * Phase 3.3 selon Context7 - Repository de contenu avec gestion i18n et SEO.
 */

import { Result } from '@/lib/core/result';
import { Repository } from './repository.interface';

// Types pour les entités Article
export type ArticleStatus = 'draft' | 'published' | 'archived' | 'scheduled';
export type ArticleType = 'blog' | 'news' | 'guide' | 'tutorial' | 'announcement';

export interface ArticleTranslation {
  id: string;
  article_id: string;
  locale: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  meta_title?: string | null;
  meta_description?: string | null;
  keywords?: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Article {
  id: string;
  type: ArticleType;
  status: ArticleStatus;
  author_id: string;
  featured_image_url?: string | null;
  featured_image_alt?: string | null;
  published_at?: string | null;
  scheduled_at?: string | null;
  reading_time_minutes?: number | null;
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

export interface ArticleWithTranslations extends Article {
  translations?: ArticleTranslation[];
}

export interface ArticleWithCurrentTranslation extends Article {
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  meta_title?: string | null;
  meta_description?: string | null;
  keywords?: string[] | null;
}

// Types pour les opérations CRUD
export interface CreateArticleData {
  type: ArticleType;
  status: ArticleStatus;
  author_id: string;
  featured_image_url?: string | null;
  featured_image_alt?: string | null;
  published_at?: string | null;
  scheduled_at?: string | null;
  reading_time_minutes?: number | null;
  tags?: string[];
  categories?: string[];
  is_featured?: boolean;
  is_pinned?: boolean;
  sort_order?: number;
}

export interface UpdateArticleData {
  type?: ArticleType;
  status?: ArticleStatus;
  author_id?: string;
  featured_image_url?: string | null;
  featured_image_alt?: string | null;
  published_at?: string | null;
  scheduled_at?: string | null;
  reading_time_minutes?: number | null;
  tags?: string[];
  categories?: string[];
  is_featured?: boolean;
  is_pinned?: boolean;
  sort_order?: number;
}

export interface CreateArticleTranslationData {
  locale: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  meta_title?: string | null;
  meta_description?: string | null;
  keywords?: string[] | null;
}

export interface UpdateArticleTranslationData {
  title?: string;
  slug?: string;
  excerpt?: string | null;
  content?: string;
  meta_title?: string | null;
  meta_description?: string | null;
  keywords?: string[] | null;
}

// Types pour les filtres et recherches
export interface ArticleFilters {
  status?: ArticleStatus;
  type?: ArticleType;
  author_id?: string;
  tags?: string[];
  categories?: string[];
  is_featured?: boolean;
  is_pinned?: boolean;
  published_from?: string;
  published_to?: string;
  search?: string;
}

export interface ArticleSearchParams {
  filters?: ArticleFilters;
  locale?: string;
  sort_by?: 'title' | 'published_at' | 'created_at' | 'view_count' | 'sort_order';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface PaginatedArticles {
  articles: ArticleWithCurrentTranslation[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Types pour SEO et analytics
export interface ArticleSEOData {
  title: string;
  description: string;
  keywords: string[];
  canonical_url: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  twitter_title?: string;
  twitter_description?: string;
  twitter_image?: string;
}

export interface ArticleAnalytics {
  article_id: string;
  views_today: number;
  views_week: number;
  views_month: number;
  views_total: number;
  unique_visitors: number;
  avg_time_on_page: number;
  bounce_rate: number;
  top_referrers: { source: string; count: number }[];
  top_keywords: { keyword: string; count: number }[];
}

/**
 * Interface du Repository Article
 * 
 * Gère le contenu éditorial avec support i18n, SEO et analytics.
 */
export interface IArticleRepository extends Repository<Article> {
  // === Opérations de base ===
  
  /**
   * Trouve un article par slug avec traduction
   */
  findBySlug(slug: string, locale?: string): Promise<Result<ArticleWithCurrentTranslation | null, Error>>;
  
  /**
   * Trouve un article avec toutes ses traductions
   */
  findByIdWithTranslations(id: string): Promise<Result<ArticleWithTranslations | null, Error>>;
  
  /**
   * Trouve les articles publiés avec pagination
   */
  findPublishedArticles(params: ArticleSearchParams): Promise<Result<PaginatedArticles, Error>>;
  
  /**
   * Trouve tous les articles (admin) avec pagination
   */
  findAllArticles(params: ArticleSearchParams): Promise<Result<PaginatedArticles, Error>>;
  
  // === Opérations CRUD ===
  
  /**
   * Crée un nouvel article
   */
  createArticle(articleData: CreateArticleData): Promise<Result<Article, Error>>;
  
  /**
   * Met à jour un article existant
   */
  updateArticle(articleId: string, articleData: UpdateArticleData): Promise<Result<Article, Error>>;
  
  /**
   * Supprime un article (soft delete)
   */
  deleteArticle(articleId: string): Promise<Result<void, Error>>;
  
  /**
   * Met à jour le statut d'un article
   */
  updateArticleStatus(articleId: string, status: ArticleStatus): Promise<Result<Article, Error>>;
  
  // === Opérations de traduction ===
  
  /**
   * Crée une traduction pour un article
   */
  createTranslation(articleId: string, translationData: CreateArticleTranslationData): Promise<Result<ArticleTranslation, Error>>;
  
  /**
   * Met à jour une traduction existante
   */
  updateTranslation(articleId: string, locale: string, translationData: UpdateArticleTranslationData): Promise<Result<ArticleTranslation, Error>>;
  
  /**
   * Supprime une traduction
   */
  deleteTranslation(articleId: string, locale: string): Promise<Result<void, Error>>;
  
  /**
   * Trouve la traduction d'un article pour une locale
   */
  findTranslation(articleId: string, locale: string): Promise<Result<ArticleTranslation | null, Error>>;
  
  // === Opérations de recherche ===
  
  /**
   * Recherche d'articles par terme
   */
  searchArticles(query: string, filters?: ArticleFilters, locale?: string): Promise<Result<ArticleWithCurrentTranslation[], Error>>;
  
  /**
   * Trouve les articles en vedette
   */
  getFeaturedArticles(limit?: number, locale?: string): Promise<Result<ArticleWithCurrentTranslation[], Error>>;
  
  /**
   * Trouve les articles récents
   */
  getRecentArticles(limit?: number, locale?: string): Promise<Result<ArticleWithCurrentTranslation[], Error>>;
  
  /**
   * Trouve les articles populaires
   */
  getPopularArticles(limit?: number, locale?: string): Promise<Result<ArticleWithCurrentTranslation[], Error>>;
  
  /**
   * Trouve les articles par catégorie
   */
  findByCategory(category: string, locale?: string): Promise<Result<ArticleWithCurrentTranslation[], Error>>;
  
  /**
   * Trouve les articles par tag
   */
  findByTag(tag: string, locale?: string): Promise<Result<ArticleWithCurrentTranslation[], Error>>;
  
  /**
   * Trouve les articles liés
   */
  findRelatedArticles(articleId: string, limit?: number, locale?: string): Promise<Result<ArticleWithCurrentTranslation[], Error>>;
  
  // === Opérations de validation ===
  
  /**
   * Valide les données d'un article avant création/mise à jour
   */
  validateArticleData(articleData: CreateArticleData | UpdateArticleData): Promise<Result<void, Error>>;
  
  /**
   * Vérifie si un slug est disponible
   */
  isSlugAvailable(slug: string, locale: string, excludeArticleId?: string): Promise<Result<boolean, Error>>;
  
  /**
   * Valide la cohérence des traductions
   */
  validateTranslations(translations: CreateArticleTranslationData[]): Promise<Result<void, Error>>;
  
  // === Opérations SEO ===
  
  /**
   * Génère les données SEO pour un article
   */
  generateSEOData(articleId: string, locale: string): Promise<Result<ArticleSEOData, Error>>;
  
  /**
   * Met à jour les métadonnées SEO
   */
  updateSEOMetadata(articleId: string, locale: string, seoData: Partial<ArticleSEOData>): Promise<Result<ArticleTranslation, Error>>;
  
  /**
   * Génère un slug unique à partir d'un titre
   */
  generateUniqueSlug(title: string, locale: string): Promise<Result<string, Error>>;
  
  // === Opérations d'analytics ===
  
  /**
   * Enregistre une vue d'article
   */
  recordView(articleId: string, visitorData?: { ip: string; userAgent: string; referrer?: string }): Promise<Result<void, Error>>;
  
  /**
   * Obtient les analytics d'un article
   */
  getArticleAnalytics(articleId: string, dateFrom?: string, dateTo?: string): Promise<Result<ArticleAnalytics, Error>>;
  
  /**
   * Obtient les articles les plus vus
   */
  getMostViewedArticles(limit?: number, locale?: string, period?: 'day' | 'week' | 'month' | 'all'): Promise<Result<ArticleWithCurrentTranslation[], Error>>;
  
  // === Opérations de gestion ===
  
  /**
   * Publie un article programmé
   */
  publishScheduledArticle(articleId: string): Promise<Result<Article, Error>>;
  
  /**
   * Archive les anciens articles
   */
  archiveOldArticles(olderThanDays: number): Promise<Result<number, Error>>;
  
  /**
   * Met à jour le temps de lecture automatiquement
   */
  updateReadingTime(articleId: string): Promise<Result<Article, Error>>;
  
  /**
   * Obtient les statistiques générales
   */
  getArticleStats(): Promise<Result<{
    total: number;
    published: number;
    draft: number;
    archived: number;
    scheduled: number;
    total_views: number;
    avg_reading_time: number;
  }, Error>>;
  
  // === Opérations utilitaires ===
  
  /**
   * Obtient toutes les catégories utilisées
   */
  getAllCategories(): Promise<Result<string[], Error>>;
  
  /**
   * Obtient tous les tags utilisés
   */
  getAllTags(): Promise<Result<string[], Error>>;
  
  /**
   * Nettoie les tags et catégories non utilisés
   */
  cleanupUnusedTaxonomies(): Promise<Result<{ removedTags: number; removedCategories: number }, Error>>;
  
  /**
   * Exporte les articles au format JSON
   */
  exportArticles(filters?: ArticleFilters): Promise<Result<string, Error>>;
}

/**
 * Repository Service Token pour le Container DI
 */
export const ARTICLE_REPOSITORY_TOKEN = 'ArticleRepository' as const;

/**
 * Configuration pour les articles 
 */
export const ARTICLE_CONFIG = {
  DEFAULT_READING_WPM: 200, // Mots par minute pour calcul temps de lecture
  MAX_EXCERPT_LENGTH: 300,
  FEATURED_ARTICLES_LIMIT: 6,
  RELATED_ARTICLES_LIMIT: 4,
  POPULAR_ARTICLES_CACHE_TTL: 3600, // 1 heure en secondes
  SEO_TITLE_MAX_LENGTH: 60,
  SEO_DESCRIPTION_MAX_LENGTH: 160,
} as const;