// Types de base pour le magazine

import { Json } from "./supabase";

// Type pour le contenu TipTap JSON
export interface TipTapContent {
  type: string;
  content?: TipTapContent[];
  attrs?: Record<string, unknown>;
  text?: string;
  marks?: Array<{
    type: string;
    attrs?: Record<string, unknown>;
  }>;
  // Index signature to make it Json-compatible
  [key: string]: unknown;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: TipTapContent; // JSON TipTap avec type spécifique
  content_html: string | null;
  featured_image: string | null;
  status: string | null;
  published_at: string | null;
  author_id: string;
  category_id: string | null;
  view_count: number | null;
  reading_time: number | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  created_at: string | null;
}

export interface Author {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

// Types pour l'affichage avec relations
export interface ArticleDisplay extends Article {
  author?: Author;
  category?: Category;
  tags?: Tag[];
}

// Types pour les filtres
export interface ArticleFilters {
  status?: string;
  category_id?: string;
  author_id?: string;
  tag_id?: string;
  tag_ids?: string[]; // Support pour filtres multiples de tags
  search?: string;
  published_after?: string;
  published_before?: string;
}

// Types pour la pagination
export interface ArticlePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Type pour la réponse de liste d'articles
export interface ArticleListResponse {
  articles: ArticleDisplay[];
  pagination: ArticlePagination;
}

// Types pour les formulaires
export interface ArticleFormData {
  title: string;
  slug?: string; // Optionnel car peut être généré automatiquement depuis le titre
  excerpt?: string;
  content: TipTapContent;
  featured_image?: string;
  category_id?: string;
  tags?: string[]; // IDs des tags
  tag_ids?: string[]; // Alias pour compatibilité
  status: "draft" | "published" | "archived";
  published_at?: string | Date;
  seo_title?: string;
  seo_description?: string;
}

export interface CategoryFormData {
  name: string;
  slug: string;
  description?: string;
  color?: string;
}

export interface TagFormData {
  name: string;
  slug: string;
}

// Types pour les actions
export interface PublishArticleData {
  id: string;
  published_at?: string;
}

export interface ArticleStats {
  total: number;
  published: number;
  draft: number;
  archived: number;
  categories: number;
  tags: number;
}

// Types pour les relations de base de données
export interface ArticleTagRelation {
  article_id: string;
  tag_id: string;
}

// Props pour les composants UI
export interface ArticleCardProps {
  article: ArticleDisplay;
  variant?: "default" | "compact" | "featured";
}

export interface ArticleMetadataProps {
  author?: Author;
  publishedDate: string;
  readingTime?: number | null;
  viewCount?: number | null;
  className?: string;
  variant?: "default" | "compact";
}

export interface TagListProps {
  tags: Tag[];
  maxVisible?: number;
  variant?: "default" | "compact" | "badges";
  onTagClick?: (tag: Tag) => void;
  className?: string;
}

export interface CategoryFiltersProps {
  categories: Category[];
  currentCategory?: string;
  className?: string;
}

export interface MagazinePaginationProps {
  pagination: ArticlePagination;
  baseUrl: string;
  className?: string;
}

export interface MagazineHeroProps {
  title: string;
  description: string;
  categories?: Category[];
  currentCategory?: string;
  backgroundImage?: string;
}

// Types pour les paramètres de recherche
export interface MagazineSearchParams {
  page?: string;
  category?: string;
  search?: string;
  tag?: string;
}

// Type pour les props des pages magazine
export interface MagazinePageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<MagazineSearchParams>;
}

export interface MagazineArticlePageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export interface MagazineCategoryPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export interface MagazineTagPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

// Type pour les données brutes de Supabase avec relations
export interface ArticleWithRelations {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: TipTapContent;
  content_html: string | null;
  featured_image: string | null;
  status: string | null;
  published_at: string | null;
  author_id: string;
  category_id: string | null;
  view_count: number | null;
  reading_time: number | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string | null;
  updated_at: string | null;
  author?: Author;
  category?: Category;
  article_tags?: Array<{
    tag: Tag;
  }>;
}

// Types pour les composants
export interface ArticleCardProps {
  article: ArticleDisplay;
  showCategory?: boolean;
  showAuthor?: boolean;
  showTags?: boolean;
}

export interface CategoryBadgeProps {
  category: Category;
  size?: "sm" | "md" | "lg";
}

export interface TagBadgeProps {
  tag: Tag;
  size?: "sm" | "md" | "lg";
}

// Types pour l'insertion et la mise à jour
export interface ArticleInsert {
  id?: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: Json;
  content_html?: string | null;
  featured_image?: string | null;
  status?: string | null;
  published_at?: string | null;
  author_id: string;
  category_id?: string | null;
  view_count?: number | null;
  reading_time?: number | null;
  seo_title?: string | null;
  seo_description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ArticleUpdate {
  title?: string;
  slug?: string;
  excerpt?: string | null;
  content?: Json;
  content_html?: string | null;
  featured_image?: string | null;
  status?: string | null;
  published_at?: string | null;
  author_id?: string;
  category_id?: string | null;
  view_count?: number | null;
  reading_time?: number | null;
  seo_title?: string | null;
  seo_description?: string | null;
  updated_at?: string | null;
}

export interface CategoryInsert {
  id?: string;
  name: string;
  slug: string;
  description?: string | null;
  color?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CategoryUpdate {
  name?: string;
  slug?: string;
  description?: string | null;
  color?: string | null;
  updated_at?: string | null;
}

export interface TagInsert {
  id?: string;
  name: string;
  slug: string;
  created_at?: string | null;
}

export interface TagUpdate {
  name?: string;
  slug?: string;
}
