/**
 * Article Content Service
 *
 * Gère la logique métier du contenu d'articles (titre, slug, contenu).
 * Extracted from ArticleSupabaseRepository for better maintainability.
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import { Result } from "@/lib/core/result";
import { DatabaseError, ValidationError, NotFoundError } from "@/lib/core/errors";
import { LogUtils } from "@/lib/core/logger";
import type { Database } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

// Types simplifiés pour le schéma monolingue
export type Article = Database["public"]["Tables"]["articles"]["Row"];
export type CreateArticleData = Database["public"]["Tables"]["articles"]["Insert"];
export type UpdateArticleData = Database["public"]["Tables"]["articles"]["Update"];

export class ArticleContentService {
  private adminClient: SupabaseClient<Database>;
  private serviceName = "ArticleContentService";

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
   * Génère un slug unique à partir d'un titre
   */
  async generateSlugFromTitle(title: string, excludeId?: string): Promise<string> {
    const baseSlug = title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const { data } = await this.adminClient
        .from("articles")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (!data || (excludeId && data.id === excludeId)) {
        break;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  /**
   * Génère un slug unique public
   */
  async generateUniqueSlug(title: string): Promise<Result<string, Error>> {
    const context = LogUtils.createOperationContext("generateUniqueSlug", this.serviceName);
    LogUtils.logOperationStart("generateUniqueSlug", context);

    try {
      const slug = await this.generateSlugFromTitle(title);
      LogUtils.logOperationInfo("generateUniqueSlug", `Generated slug: ${slug}`, context);
      return Result.success(slug);
    } catch (error) {
      LogUtils.logOperationError("generateUniqueSlug", error, context);
      return this.handleError(error);
    }
  }

  /**
   * Met à jour le contenu d'un article
   */
  async updateArticleContent(
    articleId: string,
    contentData: Partial<UpdateArticleData>
  ): Promise<Result<Article, Error>> {
    const context = LogUtils.createOperationContext("updateArticleContent", this.serviceName);
    LogUtils.logOperationStart("updateArticleContent", context);

    try {
      const updateData: Partial<UpdateArticleData> = {};

      // Construire l'objet de mise à jour avec seulement les champs définis
      if (contentData.title !== undefined) {
        updateData.title = contentData.title;

        // Si le titre change et pas de slug fourni, régénérer le slug
        if (contentData.slug === undefined) {
          updateData.slug = await this.generateSlugFromTitle(contentData.title, articleId);
        }
      }

      if (contentData.slug !== undefined) updateData.slug = contentData.slug;
      if (contentData.excerpt !== undefined) updateData.excerpt = contentData.excerpt;
      if (contentData.content !== undefined) updateData.content = contentData.content;
      if (contentData.seo_title !== undefined) updateData.seo_title = contentData.seo_title;
      if (contentData.seo_description !== undefined)
        updateData.seo_description = contentData.seo_description;

      const { data, error } = await this.adminClient
        .from("articles")
        .update(updateData)
        .eq("id", articleId)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new NotFoundError(`Article ${articleId} not found`);

      LogUtils.logOperationInfo("updateArticleContent", `Updated article ${articleId}`, context);
      return Result.success(data as Article);
    } catch (error) {
      LogUtils.logOperationError("updateArticleContent", error, context);
      return this.handleError(error);
    }
  }

  /**
   * Vérifie si un slug est disponible
   */
  async isSlugAvailable(slug: string, excludeArticleId?: string): Promise<Result<boolean, Error>> {
    const context = LogUtils.createOperationContext("isSlugAvailable", this.serviceName);
    LogUtils.logOperationStart("isSlugAvailable", context);

    try {
      let query = this.adminClient.from("articles").select("id").eq("slug", slug);

      if (excludeArticleId) {
        query = query.neq("id", excludeArticleId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;

      const isAvailable = !data;
      LogUtils.logOperationInfo(
        "isSlugAvailable",
        `Slug ${slug} available: ${isAvailable}`,
        context
      );
      return Result.success(isAvailable);
    } catch (error) {
      LogUtils.logOperationError("isSlugAvailable", error, context);
      return this.handleError(error);
    }
  }

  /**
   * Valide le contenu d'un article
   */
  async validateArticleContent(
    articleData: CreateArticleData | UpdateArticleData
  ): Promise<Result<void, Error>> {
    const context = LogUtils.createOperationContext("validateArticleContent", this.serviceName);
    LogUtils.logOperationStart("validateArticleContent", context);

    try {
      const errors: string[] = [];

      // Validation des champs requis (pour création uniquement)
      if ("title" in articleData && articleData.title !== undefined) {
        if (!articleData.title.trim()) {
          errors.push("Title is required");
        } else if (articleData.title.length > 200) {
          // Limite raisonnable
          errors.push(`Title too long: ${articleData.title.length}/200`);
        }
      }

      if ("content" in articleData && articleData.content !== undefined) {
        // Le contenu JSON peut être vide mais doit être valide
        try {
          if (typeof articleData.content === "string") {
            JSON.parse(articleData.content);
          }
        } catch {
          errors.push("Content must be valid JSON");
        }
      }

      if (articleData.excerpt && articleData.excerpt.length > 500) {
        errors.push(`Excerpt too long: ${articleData.excerpt.length}/500`);
      }

      if (articleData.seo_title && articleData.seo_title.length > 60) {
        errors.push(`SEO title too long: ${articleData.seo_title.length}/60`);
      }

      if (articleData.seo_description && articleData.seo_description.length > 160) {
        errors.push(`SEO description too long: ${articleData.seo_description.length}/160`);
      }

      if (errors.length > 0) {
        LogUtils.logOperationError(
          "validateArticleContent",
          new ValidationError(errors.join(", ")),
          context
        );
        return Result.failure(
          new ValidationError(`Article validation failed: ${errors.join(", ")}`)
        );
      }

      LogUtils.logOperationInfo(
        "validateArticleContent",
        "Article content validated successfully",
        context
      );
      return Result.success(void 0);
    } catch (error) {
      LogUtils.logOperationError("validateArticleContent", error, context);
      return this.handleError(error);
    }
  }
}
