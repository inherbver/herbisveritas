/**
 * Article Analytics Service
 *
 * Gère les analytics simplifiées des articles (vues uniquement).
 * Adapté au schéma Supabase existant (table articles avec view_count).
 */

import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import { Result } from "@/lib/core/result";
import { DatabaseError, NotFoundError } from "@/lib/core/errors";
import { LogUtils } from "@/lib/core/logger";
import type { Database } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

// Types simplifiés pour le schéma existant
export type Article = Database["public"]["Tables"]["articles"]["Row"];

export interface ArticleStats {
  article_id: string;
  title: string;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface GlobalStats {
  total_articles: number;
  published_articles: number;
  draft_articles: number;
  total_views: number;
  avg_views_per_article: number;
  most_viewed_article: { id: string; title: string; views: number } | null;
  recent_activity: {
    articles_published_last_7_days: number;
    articles_published_last_30_days: number;
  };
}

export class ArticleAnalyticsService {
  private adminClient: SupabaseClient<Database>;
  private serviceName = "ArticleAnalyticsService";

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
   * Enregistre une vue d'article (simplifié)
   */
  async recordView(articleId: string): Promise<Result<void, Error>> {
    const context = LogUtils.createOperationContext("recordView", this.serviceName);
    LogUtils.logOperationStart("recordView", context);

    try {
      // Get current view count and increment
      const { data: article, error: selectError } = await this.adminClient
        .from("articles")
        .select("view_count")
        .eq("id", articleId)
        .single();

      if (selectError) throw selectError;
      if (!article) throw new NotFoundError(`Article ${articleId} not found`);

      const { error } = await this.adminClient
        .from("articles")
        .update({
          view_count: (article.view_count || 0) + 1,
        })
        .eq("id", articleId);

      if (error) throw error;

      LogUtils.logOperationInfo("recordView", `Recorded view for article ${articleId}`, context);
      return Result.success(void 0);
    } catch (error) {
      LogUtils.logOperationError("recordView", error, context);
      return this.handleError(error);
    }
  }

  /**
   * Récupère les analytics simplifiées d'un article
   */
  async getArticleStats(articleId: string): Promise<Result<ArticleStats, Error>> {
    const context = LogUtils.createOperationContext("getArticleStats", this.serviceName);
    LogUtils.logOperationStart("getArticleStats", context);

    try {
      const { data: article, error } = await this.adminClient
        .from("articles")
        .select("id, title, view_count, created_at, updated_at")
        .eq("id", articleId)
        .single();

      if (error) throw error;
      if (!article) throw new NotFoundError(`Article ${articleId} not found`);

      const stats: ArticleStats = {
        article_id: article.id,
        title: article.title,
        view_count: article.view_count || 0,
        created_at: article.created_at || new Date().toISOString(),
        updated_at: article.updated_at || new Date().toISOString(),
      };

      LogUtils.logOperationInfo(
        "getArticleStats",
        `Retrieved stats for article ${articleId}`,
        context
      );
      return Result.success(stats);
    } catch (error) {
      LogUtils.logOperationError("getArticleStats", error, context);
      return this.handleError(error);
    }
  }

  /**
   * Récupère les articles les plus vus
   */
  async getMostViewedArticles(limit: number = 10): Promise<Result<ArticleStats[], Error>> {
    const context = LogUtils.createOperationContext("getMostViewedArticles", this.serviceName);
    LogUtils.logOperationStart("getMostViewedArticles", context);

    try {
      const { data: articles, error } = await this.adminClient
        .from("articles")
        .select("id, title, view_count, created_at, updated_at")
        .not("view_count", "is", null)
        .order("view_count", { ascending: false })
        .limit(limit);

      if (error) throw error;

      const stats: ArticleStats[] = (articles || []).map((article) => ({
        article_id: article.id,
        title: article.title,
        view_count: article.view_count || 0,
        created_at: article.created_at || new Date().toISOString(),
        updated_at: article.updated_at || new Date().toISOString(),
      }));

      LogUtils.logOperationInfo(
        "getMostViewedArticles",
        `Retrieved ${stats.length} most viewed articles`,
        context
      );
      return Result.success(stats);
    } catch (error) {
      LogUtils.logOperationError("getMostViewedArticles", error, context);
      return this.handleError(error);
    }
  }

  /**
   * Récupère les statistiques globales des articles
   */
  async getGlobalStats(): Promise<Result<GlobalStats, Error>> {
    const context = LogUtils.createOperationContext("getGlobalStats", this.serviceName);
    LogUtils.logOperationStart("getGlobalStats", context);

    try {
      const { data: articles, error } = await this.adminClient
        .from("articles")
        .select("id, title, status, view_count, published_at, created_at");

      if (error) throw error;

      const allArticles = articles || [];

      // Calcul des statistiques de base
      const totalArticles = allArticles.length;
      const publishedArticles = allArticles.filter((a) => a.status === "published").length;
      const draftArticles = allArticles.filter((a) => a.status === "draft").length;
      const totalViews = allArticles.reduce((sum, a) => sum + (a.view_count || 0), 0);

      // Article le plus vu
      let mostViewedArticle = null;
      if (allArticles.length > 0) {
        const maxViews = Math.max(...allArticles.map((a) => a.view_count || 0));
        const mostViewed = allArticles.find((a) => (a.view_count || 0) === maxViews);
        if (mostViewed) {
          mostViewedArticle = {
            id: mostViewed.id,
            title: mostViewed.title,
            views: mostViewed.view_count || 0,
          };
        }
      }

      // Activité récente
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const articlesLast7Days = allArticles.filter(
        (a) => a.published_at && new Date(a.published_at) >= sevenDaysAgo
      ).length;

      const articlesLast30Days = allArticles.filter(
        (a) => a.published_at && new Date(a.published_at) >= thirtyDaysAgo
      ).length;

      const stats: GlobalStats = {
        total_articles: totalArticles,
        published_articles: publishedArticles,
        draft_articles: draftArticles,
        total_views: totalViews,
        avg_views_per_article: totalArticles > 0 ? Math.round(totalViews / totalArticles) : 0,
        most_viewed_article: mostViewedArticle,
        recent_activity: {
          articles_published_last_7_days: articlesLast7Days,
          articles_published_last_30_days: articlesLast30Days,
        },
      };

      LogUtils.logOperationInfo(
        "getGlobalStats",
        `Retrieved global stats: ${totalArticles} articles, ${totalViews} total views`,
        context
      );
      return Result.success(stats);
    } catch (error) {
      LogUtils.logOperationError("getGlobalStats", error, context);
      return this.handleError(error);
    }
  }

  /**
   * Réinitialise le compteur de vues d'un article
   */
  async resetViewCount(articleId: string): Promise<Result<Article, Error>> {
    const context = LogUtils.createOperationContext("resetViewCount", this.serviceName);
    LogUtils.logOperationStart("resetViewCount", context);

    try {
      const { data, error } = await this.adminClient
        .from("articles")
        .update({ view_count: 0 })
        .eq("id", articleId)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new NotFoundError(`Article ${articleId} not found`);

      LogUtils.logOperationInfo(
        "resetViewCount",
        `Reset view count for article ${articleId}`,
        context
      );
      return Result.success(data as Article);
    } catch (error) {
      LogUtils.logOperationError("resetViewCount", error, context);
      return this.handleError(error);
    }
  }
}
