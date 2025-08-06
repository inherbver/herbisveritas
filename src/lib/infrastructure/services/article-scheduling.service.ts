/**
 * Article Scheduling Service - V1 Simplifié
 *
 * Service dédié à la programmation et gestion temporelle des articles.
 * Adapté au schéma monolingue existant, harmonisé avec les autres services.
 *
 * Fonctionnalités V1 :
 * - Publication automatique des articles programmés
 * - Gestion des dates de publication et programmation
 * - Annulation de programmation
 * - Archivage automatique des anciens articles
 * - Validation des dates de programmation
 *
 * Features exclues de la V1 :
 * - Notifications de publication (V1.1)
 * - Planning éditorial avec calendrier (V1.1)
 * - Republication automatique (V1.1)
 * - Gestion des fuseaux horaires complexes (V1.1)
 */

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { Result } from "@/lib/core/result";
import { DatabaseError, ValidationError, NotFoundError } from "@/lib/core/errors";
import { LogUtils } from "@/lib/core/logger";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// Configuration de la programmation centralisée
export const SCHEDULING_CONFIG = {
  // Limites temporelles
  MAX_SCHEDULE_DAYS_AHEAD: 365, // 1 an maximum en avance
  MIN_SCHEDULE_MINUTES_AHEAD: 5, // 5 minutes minimum en avance
  AUTO_ARCHIVE_AFTER_DAYS: 730, // 2 ans par défaut pour archivage auto

  // Performance
  BATCH_SIZE: 50, // Traitement par lots
  MAX_CONCURRENT_OPERATIONS: 10, // Opérations simultanées max

  // Sécurité
  MAX_BULK_OPERATIONS: 100, // Limite opérations en masse
} as const;

// Types pour la programmation V1
export type ArticleStatus = "draft" | "published" | "archived" | "scheduled";

export interface ScheduledArticle {
  id: string;
  title: string;
  slug: string;
  status: ArticleStatus;
  author_id: string;
  scheduled_at: string;
  created_at: string;
  updated_at: string;
}

export interface SchedulingOperation {
  article_id: string;
  scheduled_at: string;
  previous_status: ArticleStatus;
  operation_type: "schedule" | "publish" | "cancel" | "archive";
  executed_at?: string;
  error_message?: string;
}

export interface SchedulingStats {
  total_scheduled: number;
  ready_to_publish: number;
  future_scheduled: number;
  overdue_scheduled: number;
  recently_published: number;
  auto_archived: number;
}

export interface PublishResult {
  published_count: number;
  failed_count: number;
  successful_articles: string[];
  failed_articles: { id: string; error: string }[];
}

export interface ArchiveResult {
  archived_count: number;
  failed_count: number;
  successful_articles: string[];
  failed_articles: { id: string; error: string }[];
}

export class ArticleSchedulingService {
  private adminClient: SupabaseClient<Database>;

  constructor() {
    this.adminClient = createSupabaseAdminClient();
  }

  // === Publication automatique ===

  /**
   * Publie tous les articles programmés dont la date est arrivée
   */
  async publishScheduledArticles(): Promise<Result<PublishResult, Error>> {
    const context = LogUtils.createOperationContext(
      "publishScheduledArticles",
      "article-scheduling-service"
    );
    LogUtils.logOperationStart("publishScheduledArticles", context);

    try {
      const now = new Date().toISOString();

      // Récupérer les articles programmés prêts à être publiés
      const { data: scheduledArticles, error } = await this.adminClient
        .from("articles")
        .select("id, title, slug, scheduled_at")
        .eq("status", "scheduled")
        .lte("scheduled_at", now)
        .order("scheduled_at", { ascending: true })
        .limit(SCHEDULING_CONFIG.BATCH_SIZE);

      if (error) {
        LogUtils.logOperationError("publishScheduledArticles", error, context);
        return Result.failure(new DatabaseError(`Erreur récupération articles: ${error.message}`));
      }

      if (!scheduledArticles || scheduledArticles.length === 0) {
        LogUtils.logOperationInfo("publishScheduledArticles", "Aucun article à publier", {
          ...context,
          articlesFound: 0,
        });

        return Result.success({
          published_count: 0,
          failed_count: 0,
          successful_articles: [],
          failed_articles: [],
        });
      }

      const result: PublishResult = {
        published_count: 0,
        failed_count: 0,
        successful_articles: [],
        failed_articles: [],
      };

      // Publier chaque article
      for (const article of scheduledArticles) {
        try {
          const { error: updateError } = await this.adminClient
            .from("articles")
            .update({
              status: "published" as const,
              published_at: now,
              scheduled_at: null, // Nettoyer la date de programmation
            })
            .eq("id", article.id);

          if (updateError) {
            result.failed_count++;
            result.failed_articles.push({
              id: article.id,
              error: updateError.message,
            });
            LogUtils.logOperationError("publishScheduledArticles", updateError, {
              ...context,
              articleId: article.id,
            });
          } else {
            result.published_count++;
            result.successful_articles.push(article.id);
          }
        } catch (articleError) {
          result.failed_count++;
          result.failed_articles.push({
            id: article.id,
            error: articleError instanceof Error ? articleError.message : "Erreur inconnue",
          });
        }
      }

      LogUtils.logOperationInfo("publishScheduledArticles", "Publication automatique terminée", {
        ...context,
        totalProcessed: scheduledArticles.length,
        published: result.published_count,
        failed: result.failed_count,
      });

      return Result.success(result);
    } catch (error) {
      LogUtils.logOperationError("publishScheduledArticles", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Erreur inconnue"));
    }
  }

  /**
   * Programme la publication d'un article à une date donnée
   */
  async scheduleArticle(
    articleId: string,
    scheduledAt: string
  ): Promise<Result<ScheduledArticle, Error>> {
    const context = LogUtils.createOperationContext(
      "scheduleArticle",
      "article-scheduling-service"
    );
    LogUtils.logOperationStart("scheduleArticle", { ...context, articleId, scheduledAt });

    try {
      // Validation de la date
      const validationResult = this.validateScheduleDate(scheduledAt);
      if (validationResult.isError()) {
        return Result.failure(validationResult.getError());
      }

      // Vérifier que l'article existe
      const { data: existingArticle, error: fetchError } = await this.adminClient
        .from("articles")
        .select("id, title, slug, status")
        .eq("id", articleId)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        LogUtils.logOperationError("scheduleArticle", fetchError, context);
        return Result.failure(
          new DatabaseError(`Erreur récupération article: ${fetchError.message}`)
        );
      }

      if (!existingArticle) {
        return Result.failure(new NotFoundError("Article", articleId));
      }

      // Vérifier que l'article peut être programmé
      if (existingArticle.status === "published") {
        return Result.failure(
          new ValidationError("Un article publié ne peut pas être reprogrammé")
        );
      }

      // Mettre à jour l'article
      const { data: updatedArticle, error: updateError } = await this.adminClient
        .from("articles")
        .update({
          status: "scheduled" as const,
          scheduled_at: scheduledAt,
          published_at: null, // Réinitialiser la date de publication
        })
        .eq("id", articleId)
        .select("id, title, slug, status, author_id, scheduled_at, created_at, updated_at")
        .single();

      if (updateError) {
        LogUtils.logOperationError("scheduleArticle", updateError, context);
        return Result.failure(new DatabaseError(`Erreur programmation: ${updateError.message}`));
      }

      LogUtils.logOperationInfo("scheduleArticle", "Article programmé", {
        ...context,
        articleId: updatedArticle.id,
        scheduledAt: updatedArticle.scheduled_at,
      });

      return Result.success({
        id: updatedArticle.id,
        title: updatedArticle.title,
        slug: updatedArticle.slug,
        status: updatedArticle.status as ArticleStatus,
        author_id: updatedArticle.author_id,
        scheduled_at: updatedArticle.scheduled_at!,
        created_at: updatedArticle.created_at!,
        updated_at: updatedArticle.updated_at!,
      });
    } catch (error) {
      LogUtils.logOperationError("scheduleArticle", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Erreur inconnue"));
    }
  }

  /**
   * Annule la programmation d'un article (remet en draft)
   */
  async cancelSchedule(articleId: string): Promise<Result<void, Error>> {
    const context = LogUtils.createOperationContext("cancelSchedule", "article-scheduling-service");
    LogUtils.logOperationStart("cancelSchedule", { ...context, articleId });

    try {
      // Vérifier que l'article est bien programmé
      const { data: article, error: fetchError } = await this.adminClient
        .from("articles")
        .select("id, status")
        .eq("id", articleId)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        LogUtils.logOperationError("cancelSchedule", fetchError, context);
        return Result.failure(new DatabaseError(`Erreur récupération: ${fetchError.message}`));
      }

      if (!article) {
        return Result.failure(new NotFoundError("Article", articleId));
      }

      if (article.status !== "scheduled") {
        return Result.failure(
          new ValidationError(
            "Seuls les articles programmés peuvent voir leur programmation annulée"
          )
        );
      }

      // Annuler la programmation
      const { error: updateError } = await this.adminClient
        .from("articles")
        .update({
          status: "draft" as const,
          scheduled_at: null,
        })
        .eq("id", articleId);

      if (updateError) {
        LogUtils.logOperationError("cancelSchedule", updateError, context);
        return Result.failure(new DatabaseError(`Erreur annulation: ${updateError.message}`));
      }

      LogUtils.logOperationInfo("cancelSchedule", "Programmation annulée", {
        ...context,
        articleId,
      });

      return Result.success(undefined);
    } catch (error) {
      LogUtils.logOperationError("cancelSchedule", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Erreur inconnue"));
    }
  }

  // === Récupération des articles programmés ===

  /**
   * Récupère tous les articles programmés
   */
  async getScheduledArticles(): Promise<Result<ScheduledArticle[], Error>> {
    const context = LogUtils.createOperationContext(
      "getScheduledArticles",
      "article-scheduling-service"
    );
    LogUtils.logOperationStart("getScheduledArticles", context);

    try {
      const { data: articles, error } = await this.adminClient
        .from("articles")
        .select("id, title, slug, status, author_id, scheduled_at, created_at, updated_at")
        .eq("status", "scheduled")
        .not("scheduled_at", "is", null)
        .order("scheduled_at", { ascending: true });

      if (error) {
        LogUtils.logOperationError("getScheduledArticles", error, context);
        return Result.failure(new DatabaseError(`Erreur récupération: ${error.message}`));
      }

      const scheduledArticles: ScheduledArticle[] = (articles || []).map((article) => ({
        id: article.id,
        title: article.title,
        slug: article.slug,
        status: article.status as ArticleStatus,
        author_id: article.author_id,
        scheduled_at: article.scheduled_at!,
        created_at: article.created_at!,
        updated_at: article.updated_at!,
      }));

      LogUtils.logOperationInfo("getScheduledArticles", "Articles programmés récupérés", {
        ...context,
        articlesCount: scheduledArticles.length,
      });

      return Result.success(scheduledArticles);
    } catch (error) {
      LogUtils.logOperationError("getScheduledArticles", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Erreur inconnue"));
    }
  }

  /**
   * Récupère les statistiques de programmation
   */
  async getSchedulingStats(): Promise<Result<SchedulingStats, Error>> {
    const context = LogUtils.createOperationContext(
      "getSchedulingStats",
      "article-scheduling-service"
    );
    LogUtils.logOperationStart("getSchedulingStats", context);

    try {
      const now = new Date().toISOString();
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Récupérer les statistiques en parallèle
      const [
        { count: totalScheduled },
        { count: readyToPublish },
        { count: futureScheduled },
        { count: recentlyPublished },
      ] = await Promise.all([
        // Total programmé
        this.adminClient
          .from("articles")
          .select("*", { count: "exact", head: true })
          .eq("status", "scheduled"),

        // Prêts à publier (scheduled_at <= now)
        this.adminClient
          .from("articles")
          .select("*", { count: "exact", head: true })
          .eq("status", "scheduled")
          .lte("scheduled_at", now),

        // Programmés pour le futur (scheduled_at > now)
        this.adminClient
          .from("articles")
          .select("*", { count: "exact", head: true })
          .eq("status", "scheduled")
          .gt("scheduled_at", now),

        // Récemment publiés (dernières 24h)
        this.adminClient
          .from("articles")
          .select("*", { count: "exact", head: true })
          .eq("status", "published")
          .gte("published_at", oneDayAgo),
      ]);

      const stats: SchedulingStats = {
        total_scheduled: totalScheduled || 0,
        ready_to_publish: readyToPublish || 0,
        future_scheduled: futureScheduled || 0,
        overdue_scheduled: Math.max(0, (readyToPublish || 0) - (futureScheduled || 0)),
        recently_published: recentlyPublished || 0,
        auto_archived: 0, // Calculé séparément si nécessaire
      };

      LogUtils.logOperationInfo("getSchedulingStats", "Statistiques générées", {
        ...context,
        totalScheduled: stats.total_scheduled,
        readyToPublish: stats.ready_to_publish,
        futureScheduled: stats.future_scheduled,
      });

      return Result.success(stats);
    } catch (error) {
      LogUtils.logOperationError("getSchedulingStats", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Erreur inconnue"));
    }
  }

  // === Archivage automatique ===

  /**
   * Archive automatiquement les articles anciens
   */
  async archiveOldArticles(
    olderThanDays: number = SCHEDULING_CONFIG.AUTO_ARCHIVE_AFTER_DAYS
  ): Promise<Result<ArchiveResult, Error>> {
    const context = LogUtils.createOperationContext(
      "archiveOldArticles",
      "article-scheduling-service"
    );
    LogUtils.logOperationStart("archiveOldArticles", { ...context, olderThanDays });

    try {
      // Validation
      if (olderThanDays < 30) {
        return Result.failure(
          new ValidationError("L'archivage automatique nécessite un minimum de 30 jours")
        );
      }

      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();

      // Récupérer les articles éligibles à l'archivage
      const { data: oldArticles, error } = await this.adminClient
        .from("articles")
        .select("id, title, published_at")
        .eq("status", "published")
        .lt("published_at", cutoffDate)
        .limit(SCHEDULING_CONFIG.BATCH_SIZE);

      if (error) {
        LogUtils.logOperationError("archiveOldArticles", error, context);
        return Result.failure(new DatabaseError(`Erreur récupération: ${error.message}`));
      }

      if (!oldArticles || oldArticles.length === 0) {
        LogUtils.logOperationInfo("archiveOldArticles", "Aucun article à archiver", {
          ...context,
          articlesFound: 0,
        });

        return Result.success({
          archived_count: 0,
          failed_count: 0,
          successful_articles: [],
          failed_articles: [],
        });
      }

      const result: ArchiveResult = {
        archived_count: 0,
        failed_count: 0,
        successful_articles: [],
        failed_articles: [],
      };

      // Archiver chaque article
      for (const article of oldArticles) {
        try {
          const { error: updateError } = await this.adminClient
            .from("articles")
            .update({
              status: "archived" as const,
            })
            .eq("id", article.id);

          if (updateError) {
            result.failed_count++;
            result.failed_articles.push({
              id: article.id,
              error: updateError.message,
            });
          } else {
            result.archived_count++;
            result.successful_articles.push(article.id);
          }
        } catch (articleError) {
          result.failed_count++;
          result.failed_articles.push({
            id: article.id,
            error: articleError instanceof Error ? articleError.message : "Erreur inconnue",
          });
        }
      }

      LogUtils.logOperationInfo("archiveOldArticles", "Archivage automatique terminé", {
        ...context,
        totalProcessed: oldArticles.length,
        archived: result.archived_count,
        failed: result.failed_count,
        olderThanDays,
      });

      return Result.success(result);
    } catch (error) {
      LogUtils.logOperationError("archiveOldArticles", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Erreur inconnue"));
    }
  }

  // === Helpers privés ===

  /**
   * Valide une date de programmation
   */
  private validateScheduleDate(scheduledAt: string): Result<void, Error> {
    try {
      const scheduledDate = new Date(scheduledAt);
      const now = new Date();

      // Vérifier que la date est valide
      if (isNaN(scheduledDate.getTime())) {
        return Result.failure(new ValidationError("Date de programmation invalide"));
      }

      // Vérifier que la date est dans le futur (avec marge de sécurité)
      const minFutureDate = new Date(
        now.getTime() + SCHEDULING_CONFIG.MIN_SCHEDULE_MINUTES_AHEAD * 60 * 1000
      );
      if (scheduledDate <= minFutureDate) {
        return Result.failure(
          new ValidationError(
            `La date de programmation doit être au moins ${SCHEDULING_CONFIG.MIN_SCHEDULE_MINUTES_AHEAD} minutes dans le futur`
          )
        );
      }

      // Vérifier que la date n'est pas trop lointaine
      const maxFutureDate = new Date(
        now.getTime() + SCHEDULING_CONFIG.MAX_SCHEDULE_DAYS_AHEAD * 24 * 60 * 60 * 1000
      );
      if (scheduledDate > maxFutureDate) {
        return Result.failure(
          new ValidationError(
            `La date de programmation ne peut pas dépasser ${SCHEDULING_CONFIG.MAX_SCHEDULE_DAYS_AHEAD} jours`
          )
        );
      }

      return Result.success(undefined);
    } catch (error) {
      return Result.failure(new ValidationError("Erreur de validation de la date"));
    }
  }
}
