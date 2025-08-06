/**
 * Article SEO Service - V1 Simplifié
 *
 * Service dédié à l'optimisation SEO des articles.
 * Adapté au schéma monolingue existant, harmonisé avec les autres services.
 *
 * Fonctionnalités V1 :
 * - Génération automatique des données SEO de base
 * - Calcul du temps de lecture
 * - Génération et validation de slugs SEO-friendly
 * - Configuration centralisée des paramètres SEO
 *
 * Features exclues de la V1 :
 * - Twitter Cards (V1.1)
 * - Open Graph (V1.1)
 * - Multi-langues (pas nécessaire)
 */

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { Result } from "@/lib/core/result";
import { DatabaseError, ValidationError, NotFoundError } from "@/lib/core/errors";
import { LogUtils } from "@/lib/core/logger";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// Configuration SEO centralisée
export const SEO_CONFIG = {
  // Temps de lecture
  DEFAULT_READING_WPM: 200,

  // Limites SEO (standards Google)
  TITLE_MAX_LENGTH: 60,
  DESCRIPTION_MAX_LENGTH: 160,

  // Contenu
  EXCERPT_MAX_LENGTH: 300,
  KEYWORDS_MAX_COUNT: 10,

  // Slugs
  SLUG_MAX_LENGTH: 100,
} as const;

// Types pour le SEO V1
export interface SEOData {
  title: string;
  description: string;
  keywords: string[];
  canonical_url: string;
  reading_time_minutes?: number;
}

export interface SEOMetadata {
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string[];
}

export interface ReadingTimeData {
  content: string;
  word_count: number;
  reading_time_minutes: number;
  reading_time_text: string; // "5 min de lecture"
}

export interface SlugValidation {
  slug: string;
  is_valid: boolean;
  is_unique: boolean;
  errors: string[];
  suggestions: string[];
}

export class ArticleSEOService {
  private adminClient: SupabaseClient<Database>;

  constructor() {
    this.adminClient = createSupabaseAdminClient();
  }

  // === Génération SEO automatique ===

  /**
   * Génère les données SEO complètes pour un article
   */
  async generateSEOData(articleId: string): Promise<Result<SEOData, Error>> {
    const context = LogUtils.createOperationContext("generateSEOData", "article-seo-service");
    LogUtils.logOperationStart("generateSEOData", { ...context, articleId });

    try {
      // Récupérer l'article depuis la base
      const { data: article, error } = await this.adminClient
        .from("articles")
        .select("*")
        .eq("id", articleId)
        .single();

      if (error && error.code !== "PGRST116") {
        LogUtils.logOperationError("generateSEOData", error, context);
        return Result.failure(new DatabaseError(`Erreur de récupération: ${error.message}`));
      }

      if (!article) {
        return Result.failure(new NotFoundError("Article", articleId));
      }

      // Générer les données SEO avec fallbacks intelligents
      const seoData: SEOData = {
        title: this.generateSEOTitle(article),
        description: this.generateSEODescription(article),
        keywords: this.extractKeywords(article),
        canonical_url: `/articles/${article.slug}`,
        reading_time_minutes: article.reading_time_minutes ?? undefined,
      };

      // Valider les limites SEO
      const validation = this.validateSEOData(seoData);
      if (!validation.isValid) {
        LogUtils.logOperationError("generateSEOData", validation.errors, context);
        return Result.failure(
          new ValidationError(`Données SEO invalides: ${validation.errors.join(", ")}`)
        );
      }

      LogUtils.logOperationInfo("generateSEOData", "Données SEO générées", {
        ...context,
        articleId,
        titleLength: seoData.title.length,
        descriptionLength: seoData.description.length,
        keywordsCount: seoData.keywords.length,
      });

      return Result.success(seoData);
    } catch (error) {
      LogUtils.logOperationError("generateSEOData", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Erreur inconnue"));
    }
  }

  /**
   * Met à jour les métadonnées SEO d'un article
   */
  async updateSEOMetadata(articleId: string, metadata: SEOMetadata): Promise<Result<void, Error>> {
    const context = LogUtils.createOperationContext("updateSEOMetadata", "article-seo-service");
    LogUtils.logOperationStart("updateSEOMetadata", { ...context, articleId });

    try {
      // Valider les métadonnées avant mise à jour
      const validation = this.validateSEOMetadata(metadata);
      if (!validation.isValid) {
        return Result.failure(
          new ValidationError(`Métadonnées SEO invalides: ${validation.errors.join(", ")}`)
        );
      }

      // Construire les données à mettre à jour
      const updateData: Record<string, unknown> = {};

      if (metadata.seo_title !== undefined) updateData.seo_title = metadata.seo_title;
      if (metadata.seo_description !== undefined)
        updateData.seo_description = metadata.seo_description;
      if (metadata.seo_keywords !== undefined) updateData.seo_keywords = metadata.seo_keywords;

      // Mettre à jour en base
      const { error } = await this.adminClient
        .from("articles")
        .update(updateData)
        .eq("id", articleId);

      if (error) {
        if (error.code === "PGRST116") {
          return Result.failure(new NotFoundError("Article", articleId));
        }
        LogUtils.logOperationError("updateSEOMetadata", error, context);
        return Result.failure(new DatabaseError(`Erreur de mise à jour: ${error.message}`));
      }

      LogUtils.logOperationInfo("updateSEOMetadata", "Métadonnées SEO mises à jour", {
        ...context,
        articleId,
        fieldsUpdated: Object.keys(updateData),
      });

      return Result.success(undefined);
    } catch (error) {
      LogUtils.logOperationError("updateSEOMetadata", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Erreur inconnue"));
    }
  }

  // === Calcul du temps de lecture ===

  /**
   * Calcule et met à jour le temps de lecture d'un article
   */
  async updateReadingTime(articleId: string): Promise<Result<ReadingTimeData, Error>> {
    const context = LogUtils.createOperationContext("updateReadingTime", "article-seo-service");
    LogUtils.logOperationStart("updateReadingTime", { ...context, articleId });

    try {
      // Récupérer le contenu de l'article
      const { data: article, error } = await this.adminClient
        .from("articles")
        .select("content")
        .eq("id", articleId)
        .single();

      if (error && error.code !== "PGRST116") {
        LogUtils.logOperationError("updateReadingTime", error, context);
        return Result.failure(new DatabaseError(`Erreur de récupération: ${error.message}`));
      }

      if (!article) {
        return Result.failure(new NotFoundError("Article", articleId));
      }

      // Calculer le temps de lecture
      const content = article.content || "";
      const readingTimeData = this.calculateReadingTime(content);

      // Mettre à jour en base
      const { error: updateError } = await this.adminClient
        .from("articles")
        .update({ reading_time_minutes: readingTimeData.reading_time_minutes })
        .eq("id", articleId);

      if (updateError) {
        LogUtils.logOperationError("updateReadingTime", updateError, context);
        return Result.failure(new DatabaseError(`Erreur de mise à jour: ${updateError.message}`));
      }

      LogUtils.logOperationInfo("updateReadingTime", "Temps de lecture mis à jour", {
        ...context,
        articleId,
        wordCount: readingTimeData.word_count,
        readingTime: readingTimeData.reading_time_minutes,
      });

      return Result.success(readingTimeData);
    } catch (error) {
      LogUtils.logOperationError("updateReadingTime", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Erreur inconnue"));
    }
  }

  /**
   * Calcule le temps de lecture pour un contenu donné
   */
  calculateReadingTime(content: string): ReadingTimeData {
    // Nettoyer le contenu (supprimer HTML, markdown, etc.)
    const cleanContent = this.stripFormatting(content);

    // Compter les mots
    const words = cleanContent
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    const wordCount = words.length;

    // Calculer le temps (minimum 1 minute)
    const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / SEO_CONFIG.DEFAULT_READING_WPM));

    // Générer le texte d'affichage
    const readingTimeText =
      readingTimeMinutes === 1 ? "1 min de lecture" : `${readingTimeMinutes} min de lecture`;

    return {
      content: cleanContent,
      word_count: wordCount,
      reading_time_minutes: readingTimeMinutes,
      reading_time_text: readingTimeText,
    };
  }

  // === Gestion des slugs SEO ===

  /**
   * Valide un slug selon les critères SEO
   */
  async validateSlug(slug: string, excludeId?: string): Promise<Result<SlugValidation, Error>> {
    const context = LogUtils.createOperationContext("validateSlug", "article-seo-service");
    LogUtils.logOperationStart("validateSlug", { ...context, slug, excludeId });

    try {
      const errors: string[] = [];
      const suggestions: string[] = [];

      // Validation du format
      if (!slug || slug.length === 0) {
        errors.push("Le slug ne peut pas être vide");
      } else {
        // Longueur
        if (slug.length > SEO_CONFIG.SLUG_MAX_LENGTH) {
          errors.push(`Le slug ne peut pas dépasser ${SEO_CONFIG.SLUG_MAX_LENGTH} caractères`);
          suggestions.push(`Raccourcir à ${slug.substring(0, SEO_CONFIG.SLUG_MAX_LENGTH - 3)}...`);
        }

        // Format SEO-friendly
        if (!/^[a-z0-9-]+$/.test(slug)) {
          errors.push(
            "Le slug doit contenir uniquement des lettres minuscules, chiffres et traits d'union"
          );
          suggestions.push(this.generateSlug(slug));
        }

        // Pas de traits d'union en début/fin
        if (slug.startsWith("-") || slug.endsWith("-")) {
          errors.push("Le slug ne peut pas commencer ou finir par un trait d'union");
          suggestions.push(slug.replace(/^-+|-+$/g, ""));
        }

        // Pas de traits d'union doubles
        if (slug.includes("--")) {
          errors.push("Le slug ne peut pas contenir de traits d'union doubles");
          suggestions.push(slug.replace(/-+/g, "-"));
        }
      }

      // Vérification de l'unicité
      let isUnique = true;
      if (slug && errors.length === 0) {
        const uniquenessCheck = await this.isSlugUnique(slug, excludeId);
        if (uniquenessCheck.isError()) {
          return Result.failure(uniquenessCheck.getError());
        }
        isUnique = uniquenessCheck.getValue();

        if (!isUnique) {
          errors.push("Ce slug est déjà utilisé par un autre article");
          // Générer des suggestions avec numéros
          for (let i = 2; i <= 5; i++) {
            suggestions.push(`${slug}-${i}`);
          }
        }
      }

      const validation: SlugValidation = {
        slug,
        is_valid: errors.length === 0,
        is_unique: isUnique,
        errors,
        suggestions,
      };

      LogUtils.logOperationInfo("validateSlug", "Validation du slug effectuée", {
        ...context,
        slug,
        isValid: validation.is_valid,
        isUnique: validation.is_unique,
        errorsCount: errors.length,
      });

      return Result.success(validation);
    } catch (error) {
      LogUtils.logOperationError("validateSlug", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Erreur inconnue"));
    }
  }

  /**
   * Génère un slug SEO-friendly à partir d'un texte
   */
  generateSlug(text: string): string {
    return text
      .toLowerCase()
      .normalize("NFD") // Décompose les accents
      .replace(/[\u0300-\u036f]/g, "") // Supprime les diacritiques
      .replace(/[^a-z0-9\s-]/g, "") // Garde seulement alphanumériques, espaces et traits d'union
      .replace(/\s+/g, "-") // Remplace espaces par traits d'union
      .replace(/-+/g, "-") // Évite les traits d'union multiples
      .replace(/^-+|-+$/g, "") // Supprime traits d'union en début/fin
      .substring(0, SEO_CONFIG.SLUG_MAX_LENGTH); // Limite la longueur
  }

  /**
   * Génère un slug unique à partir d'un titre
   */
  async generateUniqueSlug(title: string): Promise<Result<string, Error>> {
    const context = LogUtils.createOperationContext("generateUniqueSlug", "article-seo-service");
    LogUtils.logOperationStart("generateUniqueSlug", { ...context, title });

    try {
      const baseSlug = this.generateSlug(title);

      // Vérifier l'unicité
      let slug = baseSlug;
      let counter = 2;

      while (true) {
        const uniquenessCheck = await this.isSlugUnique(slug);
        if (uniquenessCheck.isError()) {
          return Result.failure(uniquenessCheck.getError());
        }

        if (uniquenessCheck.getValue()) {
          break; // Slug unique trouvé
        }

        slug = `${baseSlug}-${counter}`;
        counter++;

        // Sécurité : éviter les boucles infinies
        if (counter > 100) {
          return Result.failure(new Error("Impossible de générer un slug unique"));
        }
      }

      LogUtils.logOperationInfo("generateUniqueSlug", "Slug unique généré", {
        ...context,
        originalTitle: title,
        baseSlug,
        finalSlug: slug,
        attempts: counter - 1,
      });

      return Result.success(slug);
    } catch (error) {
      LogUtils.logOperationError("generateUniqueSlug", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Erreur inconnue"));
    }
  }

  // === Helpers privés ===

  /**
   * Génère le titre SEO optimisé avec fallbacks
   */
  private generateSEOTitle(article: any): string {
    // Priorité : seo_title > title
    if (article.seo_title && article.seo_title.trim().length > 0) {
      return article.seo_title.trim();
    }

    if (article.title && article.title.trim().length > 0) {
      const title = article.title.trim();
      // Tronquer si trop long
      return title.length > SEO_CONFIG.TITLE_MAX_LENGTH
        ? `${title.substring(0, SEO_CONFIG.TITLE_MAX_LENGTH - 3)}...`
        : title;
    }

    return "Article sans titre";
  }

  /**
   * Génère la description SEO optimisée avec fallbacks
   */
  private generateSEODescription(article: any): string {
    // Priorité : seo_description > excerpt > début du contenu
    if (article.seo_description && article.seo_description.trim().length > 0) {
      return article.seo_description.trim();
    }

    if (article.excerpt && article.excerpt.trim().length > 0) {
      const excerpt = article.excerpt.trim();
      return excerpt.length > SEO_CONFIG.DESCRIPTION_MAX_LENGTH
        ? `${excerpt.substring(0, SEO_CONFIG.DESCRIPTION_MAX_LENGTH - 3)}...`
        : excerpt;
    }

    // Fallback : début du contenu nettoyé
    if (article.content) {
      const cleanContent = this.stripFormatting(article.content);
      const beginning = cleanContent.substring(0, SEO_CONFIG.DESCRIPTION_MAX_LENGTH - 3).trim();
      return beginning ? `${beginning}...` : "Découvrez cet article";
    }

    return "Découvrez cet article";
  }

  /**
   * Extrait les mots-clés depuis l'article
   */
  private extractKeywords(article: any): string[] {
    // Priorité : seo_keywords > tags > extraction automatique
    if (article.seo_keywords && Array.isArray(article.seo_keywords)) {
      return article.seo_keywords.slice(0, SEO_CONFIG.KEYWORDS_MAX_COUNT);
    }

    if (article.tags && Array.isArray(article.tags)) {
      return article.tags.slice(0, SEO_CONFIG.KEYWORDS_MAX_COUNT);
    }

    return [];
  }

  /**
   * Supprime le formatage (HTML, Markdown) du contenu
   */
  private stripFormatting(content: string): string {
    if (!content) return "";

    return (
      content
        // Supprimer les balises HTML
        .replace(/<[^>]*>/g, " ")
        // Supprimer le Markdown de base
        .replace(/[#*_`]/g, " ")
        // Supprimer les liens Markdown
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        // Normaliser les espaces
        .replace(/\s+/g, " ")
        .trim()
    );
  }

  /**
   * Vérifie si un slug est unique
   */
  private async isSlugUnique(slug: string, excludeId?: string): Promise<Result<boolean, Error>> {
    try {
      let query = this.adminClient.from("articles").select("id").eq("slug", slug);

      if (excludeId) {
        query = query.neq("id", excludeId);
      }

      const { data, error } = await query.single();

      if (error && error.code !== "PGRST116") {
        return Result.failure(new DatabaseError(`Erreur vérification unicité: ${error.message}`));
      }

      return Result.success(!data); // Unique si aucun résultat
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error("Erreur inconnue"));
    }
  }

  /**
   * Valide les données SEO générées
   */
  private validateSEOData(seoData: SEOData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!seoData.title || seoData.title.length === 0) {
      errors.push("Le titre SEO ne peut pas être vide");
    } else if (seoData.title.length > SEO_CONFIG.TITLE_MAX_LENGTH) {
      errors.push(`Le titre SEO ne peut pas dépasser ${SEO_CONFIG.TITLE_MAX_LENGTH} caractères`);
    }

    if (!seoData.description || seoData.description.length === 0) {
      errors.push("La description SEO ne peut pas être vide");
    } else if (seoData.description.length > SEO_CONFIG.DESCRIPTION_MAX_LENGTH) {
      errors.push(
        `La description SEO ne peut pas dépasser ${SEO_CONFIG.DESCRIPTION_MAX_LENGTH} caractères`
      );
    }

    if (seoData.keywords.length > SEO_CONFIG.KEYWORDS_MAX_COUNT) {
      errors.push(`Maximum ${SEO_CONFIG.KEYWORDS_MAX_COUNT} mots-clés autorisés`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Valide les métadonnées SEO avant mise à jour
   */
  private validateSEOMetadata(metadata: SEOMetadata): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (metadata.seo_title !== undefined) {
      if (metadata.seo_title.length > SEO_CONFIG.TITLE_MAX_LENGTH) {
        errors.push(`Le titre SEO ne peut pas dépasser ${SEO_CONFIG.TITLE_MAX_LENGTH} caractères`);
      }
    }

    if (metadata.seo_description !== undefined) {
      if (metadata.seo_description.length > SEO_CONFIG.DESCRIPTION_MAX_LENGTH) {
        errors.push(
          `La description SEO ne peut pas dépasser ${SEO_CONFIG.DESCRIPTION_MAX_LENGTH} caractères`
        );
      }
    }

    if (metadata.seo_keywords !== undefined) {
      if (!Array.isArray(metadata.seo_keywords)) {
        errors.push("Les mots-clés doivent être un tableau");
      } else if (metadata.seo_keywords.length > SEO_CONFIG.KEYWORDS_MAX_COUNT) {
        errors.push(`Maximum ${SEO_CONFIG.KEYWORDS_MAX_COUNT} mots-clés autorisés`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
