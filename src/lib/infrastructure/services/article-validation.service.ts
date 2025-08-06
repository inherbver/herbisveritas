/**
 * Article Validation Service - V1 Simplifié
 *
 * Service dédié à la validation des données d'articles.
 * Adapté au schéma monolingue existant, harmonisé avec les autres services.
 *
 * Fonctionnalités V1 :
 * - Validation des données d'article (titre, contenu, slug)
 * - Validation des limites et formats
 * - Validation d'unicité (slug, titre si nécessaire)
 * - Règles métier de base pour la cohérence des données
 * - Intégration avec ArticleTaxonomyService pour les taxonomies
 *
 * Features exclues de la V1 :
 * - Validation contenu HTML/Markdown avancée (V1.1)
 * - Validation SEO sophistiquée (V1.1)
 * - Validation des médias/images (V1.1)
 * - Règles de workflow complexes (V1.1)
 */

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { Result } from "@/lib/core/result";
import { DatabaseError, ValidationError } from "@/lib/core/errors";
import { LogUtils } from "@/lib/core/logger";
import { ArticleTaxonomyService } from "./article-taxonomy.service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// Configuration de validation centralisée
export const VALIDATION_CONFIG = {
  // Limites de contenu
  TITLE_MIN_LENGTH: 5,
  TITLE_MAX_LENGTH: 200,
  CONTENT_MIN_LENGTH: 50,
  CONTENT_MAX_LENGTH: 50000,
  EXCERPT_MAX_LENGTH: 500,
  SLUG_MIN_LENGTH: 3,
  SLUG_MAX_LENGTH: 100,

  // Formats autorisés
  SLUG_PATTERN: /^[a-z0-9-]+$/,
  TITLE_FORBIDDEN_CHARS: /<|>|{|}|\[|\]|`/,

  // Règles métier
  MAX_FUTURE_SCHEDULE_DAYS: 365,
  MIN_FUTURE_SCHEDULE_MINUTES: 5,

  // Performance
  MAX_VALIDATION_TIME_MS: 5000,
} as const;

// Types pour la validation V1
export type ArticleStatus = "draft" | "published" | "archived" | "scheduled";
export type ArticleType = "blog" | "news" | "guide" | "tutorial" | "announcement";

export interface ArticleValidationData {
  title: string;
  slug?: string;
  content: string;
  excerpt?: string;
  type?: ArticleType;
  status?: ArticleStatus;
  author_id: string;
  published_at?: string;
  scheduled_at?: string;
  tags?: string[];
  categories?: string[];
  featured_image_url?: string;
}

export interface ValidationResult {
  is_valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  normalized_data: Partial<ArticleValidationData>;
  suggestions: ValidationSuggestion[];
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
  suggestion?: string;
}

export interface ValidationSuggestion {
  field: string;
  type: "format" | "content" | "seo" | "taxonomy";
  suggestion: string;
  reason: string;
}

export interface UniquenessCheck {
  field: string;
  value: string;
  is_unique: boolean;
  conflicting_id?: string;
  suggestions: string[];
}

export class ArticleValidationService {
  private adminClient: SupabaseClient<Database>;
  private taxonomyService: ArticleTaxonomyService;

  constructor() {
    this.adminClient = createSupabaseAdminClient();
    this.taxonomyService = new ArticleTaxonomyService();
  }

  // === Validation complète d'article ===

  /**
   * Valide complètement les données d'un article
   */
  async validateArticleData(
    data: ArticleValidationData,
    excludeId?: string
  ): Promise<Result<ValidationResult, Error>> {
    const context = LogUtils.createOperationContext(
      "validateArticleData",
      "article-validation-service"
    );
    LogUtils.logOperationStart("validateArticleData", { ...context, excludeId });

    try {
      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];
      const suggestions: ValidationSuggestion[] = [];
      const normalizedData: Partial<ArticleValidationData> = {};

      // Validation des champs obligatoires
      await this.validateRequiredFields(data, errors);

      // Validation des formats et limites
      await this.validateFormatsAndLimits(data, errors, warnings, suggestions);

      // Validation des règles métier
      await this.validateBusinessRules(data, errors, warnings);

      // Validation des taxonomies si présentes
      if (data.tags || data.categories) {
        const taxonomyResult = await this.taxonomyService.validateTaxonomies(
          data.tags || [],
          data.categories || []
        );

        if (taxonomyResult.isSuccess()) {
          const taxonomyValidation = taxonomyResult.getValue();
          if (!taxonomyValidation.is_valid) {
            taxonomyValidation.errors.forEach((error) => {
              errors.push({
                field: "taxonomies",
                code: "TAXONOMY_INVALID",
                message: error,
                severity: "error",
              });
            });
          }

          // Utiliser les taxonomies normalisées
          normalizedData.tags = taxonomyValidation.normalized_tags;
          normalizedData.categories = taxonomyValidation.normalized_categories;
        }
      }

      // Validation d'unicité (slug, titre si nécessaire)
      if (data.slug) {
        const uniquenessResult = await this.validateUniqueness("slug", data.slug, excludeId);

        if (uniquenessResult.isSuccess()) {
          const uniqueness = uniquenessResult.getValue();
          if (!uniqueness.is_unique) {
            errors.push({
              field: "slug",
              code: "SLUG_NOT_UNIQUE",
              message: `Le slug '${data.slug}' est déjà utilisé`,
              severity: "error",
            });

            suggestions.push({
              field: "slug",
              type: "format",
              suggestion: uniqueness.suggestions[0] || `${data.slug}-2`,
              reason: "Slug déjà utilisé",
            });
          }
        }
      }

      // Normaliser les données
      this.normalizeData(data, normalizedData);

      const result: ValidationResult = {
        is_valid: errors.length === 0,
        errors,
        warnings,
        normalized_data: normalizedData,
        suggestions,
      };

      LogUtils.logOperationInfo("validateArticleData", "Validation terminée", {
        ...context,
        isValid: result.is_valid,
        errorsCount: errors.length,
        warningsCount: warnings.length,
        suggestionsCount: suggestions.length,
      });

      return Result.success(result);
    } catch (error) {
      LogUtils.logOperationError("validateArticleData", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Erreur inconnue"));
    }
  }

  /**
   * Validation rapide pour savoir si les données de base sont valides
   */
  async quickValidate(
    data: Pick<ArticleValidationData, "title" | "content" | "slug">
  ): Promise<Result<boolean, Error>> {
    const context = LogUtils.createOperationContext("quickValidate", "article-validation-service");
    LogUtils.logOperationStart("quickValidate", context);

    try {
      const errors: ValidationError[] = [];

      // Validation basique uniquement
      if (!data.title || data.title.trim().length < VALIDATION_CONFIG.TITLE_MIN_LENGTH) {
        errors.push({
          field: "title",
          code: "TITLE_TOO_SHORT",
          message: `Le titre doit faire au moins ${VALIDATION_CONFIG.TITLE_MIN_LENGTH} caractères`,
          severity: "error",
        });
      }

      if (!data.content || data.content.trim().length < VALIDATION_CONFIG.CONTENT_MIN_LENGTH) {
        errors.push({
          field: "content",
          code: "CONTENT_TOO_SHORT",
          message: `Le contenu doit faire au moins ${VALIDATION_CONFIG.CONTENT_MIN_LENGTH} caractères`,
          severity: "error",
        });
      }

      if (data.slug && !VALIDATION_CONFIG.SLUG_PATTERN.test(data.slug)) {
        errors.push({
          field: "slug",
          code: "SLUG_INVALID_FORMAT",
          message:
            "Le slug ne doit contenir que des lettres minuscules, chiffres et traits d'union",
          severity: "error",
        });
      }

      const isValid = errors.length === 0;

      LogUtils.logOperationInfo("quickValidate", "Validation rapide terminée", {
        ...context,
        isValid,
        errorsCount: errors.length,
      });

      return Result.success(isValid);
    } catch (error) {
      LogUtils.logOperationError("quickValidate", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Erreur inconnue"));
    }
  }

  // === Validation d'unicité ===

  /**
   * Vérifie l'unicité d'une valeur pour un champ donné
   */
  async validateUniqueness(
    field: "slug" | "title",
    value: string,
    excludeId?: string
  ): Promise<Result<UniquenessCheck, Error>> {
    const context = LogUtils.createOperationContext(
      "validateUniqueness",
      "article-validation-service"
    );
    LogUtils.logOperationStart("validateUniqueness", { ...context, field, value, excludeId });

    try {
      let query = this.adminClient.from("articles").select("id").eq(field, value);

      if (excludeId) {
        query = query.neq("id", excludeId);
      }

      const { data, error } = await query.single();

      if (error && error.code !== "PGRST116") {
        LogUtils.logOperationError("validateUniqueness", error, context);
        return Result.failure(new DatabaseError(`Erreur vérification unicité: ${error.message}`));
      }

      const isUnique = !data;
      const suggestions: string[] = [];

      if (!isUnique && field === "slug") {
        // Générer des suggestions pour les slugs
        for (let i = 2; i <= 5; i++) {
          suggestions.push(`${value}-${i}`);
        }
      }

      const result: UniquenessCheck = {
        field,
        value,
        is_unique: isUnique,
        conflicting_id: data?.id,
        suggestions,
      };

      LogUtils.logOperationInfo("validateUniqueness", "Vérification unicité terminée", {
        ...context,
        field,
        isUnique,
        conflictingId: data?.id,
      });

      return Result.success(result);
    } catch (error) {
      LogUtils.logOperationError("validateUniqueness", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Erreur inconnue"));
    }
  }

  // === Helpers privés ===

  /**
   * Valide les champs obligatoires
   */
  private async validateRequiredFields(
    data: ArticleValidationData,
    errors: ValidationError[]
  ): Promise<void> {
    if (!data.title || data.title.trim().length === 0) {
      errors.push({
        field: "title",
        code: "TITLE_REQUIRED",
        message: "Le titre est obligatoire",
        severity: "error",
      });
    }

    if (!data.content || data.content.trim().length === 0) {
      errors.push({
        field: "content",
        code: "CONTENT_REQUIRED",
        message: "Le contenu est obligatoire",
        severity: "error",
      });
    }

    if (!data.author_id || data.author_id.trim().length === 0) {
      errors.push({
        field: "author_id",
        code: "AUTHOR_REQUIRED",
        message: "L'auteur est obligatoire",
        severity: "error",
      });
    }
  }

  /**
   * Valide les formats et limites
   */
  private async validateFormatsAndLimits(
    data: ArticleValidationData,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    suggestions: ValidationSuggestion[]
  ): Promise<void> {
    // Validation du titre
    if (data.title) {
      if (data.title.length < VALIDATION_CONFIG.TITLE_MIN_LENGTH) {
        errors.push({
          field: "title",
          code: "TITLE_TOO_SHORT",
          message: `Le titre doit faire au moins ${VALIDATION_CONFIG.TITLE_MIN_LENGTH} caractères`,
          severity: "error",
        });
      }

      if (data.title.length > VALIDATION_CONFIG.TITLE_MAX_LENGTH) {
        errors.push({
          field: "title",
          code: "TITLE_TOO_LONG",
          message: `Le titre ne peut pas dépasser ${VALIDATION_CONFIG.TITLE_MAX_LENGTH} caractères`,
          severity: "error",
        });
      }

      if (VALIDATION_CONFIG.TITLE_FORBIDDEN_CHARS.test(data.title)) {
        errors.push({
          field: "title",
          code: "TITLE_INVALID_CHARS",
          message: "Le titre contient des caractères interdits",
          severity: "error",
        });
      }

      // Warning pour titre très long
      if (data.title.length > 100) {
        warnings.push({
          field: "title",
          code: "TITLE_LONG",
          message: "Titre long, considérez de le raccourcir pour le SEO",
          suggestion: data.title.substring(0, 60) + "...",
        });
      }
    }

    // Validation du contenu
    if (data.content) {
      if (data.content.length < VALIDATION_CONFIG.CONTENT_MIN_LENGTH) {
        errors.push({
          field: "content",
          code: "CONTENT_TOO_SHORT",
          message: `Le contenu doit faire au moins ${VALIDATION_CONFIG.CONTENT_MIN_LENGTH} caractères`,
          severity: "error",
        });
      }

      if (data.content.length > VALIDATION_CONFIG.CONTENT_MAX_LENGTH) {
        errors.push({
          field: "content",
          code: "CONTENT_TOO_LONG",
          message: `Le contenu ne peut pas dépasser ${VALIDATION_CONFIG.CONTENT_MAX_LENGTH} caractères`,
          severity: "error",
        });
      }
    }

    // Validation du slug
    if (data.slug) {
      if (data.slug.length < VALIDATION_CONFIG.SLUG_MIN_LENGTH) {
        errors.push({
          field: "slug",
          code: "SLUG_TOO_SHORT",
          message: `Le slug doit faire au moins ${VALIDATION_CONFIG.SLUG_MIN_LENGTH} caractères`,
          severity: "error",
        });
      }

      if (data.slug.length > VALIDATION_CONFIG.SLUG_MAX_LENGTH) {
        errors.push({
          field: "slug",
          code: "SLUG_TOO_LONG",
          message: `Le slug ne peut pas dépasser ${VALIDATION_CONFIG.SLUG_MAX_LENGTH} caractères`,
          severity: "error",
        });
      }

      if (!VALIDATION_CONFIG.SLUG_PATTERN.test(data.slug)) {
        errors.push({
          field: "slug",
          code: "SLUG_INVALID_FORMAT",
          message:
            "Le slug ne doit contenir que des lettres minuscules, chiffres et traits d'union",
          severity: "error",
        });

        suggestions.push({
          field: "slug",
          type: "format",
          suggestion: this.normalizeSlug(data.slug),
          reason: "Format de slug invalide",
        });
      }
    }

    // Validation de l'excerpt
    if (data.excerpt && data.excerpt.length > VALIDATION_CONFIG.EXCERPT_MAX_LENGTH) {
      errors.push({
        field: "excerpt",
        code: "EXCERPT_TOO_LONG",
        message: `L'extrait ne peut pas dépasser ${VALIDATION_CONFIG.EXCERPT_MAX_LENGTH} caractères`,
        severity: "error",
      });
    }
  }

  /**
   * Valide les règles métier
   */
  private async validateBusinessRules(
    data: ArticleValidationData,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    const now = new Date();

    // Validation des dates
    if (data.published_at) {
      const publishedDate = new Date(data.published_at);
      if (isNaN(publishedDate.getTime())) {
        errors.push({
          field: "published_at",
          code: "PUBLISHED_DATE_INVALID",
          message: "Date de publication invalide",
          severity: "error",
        });
      }
    }

    if (data.scheduled_at) {
      const scheduledDate = new Date(data.scheduled_at);
      if (isNaN(scheduledDate.getTime())) {
        errors.push({
          field: "scheduled_at",
          code: "SCHEDULED_DATE_INVALID",
          message: "Date de programmation invalide",
          severity: "error",
        });
      } else {
        // Vérifier que la date est dans le futur
        const minFutureDate = new Date(
          now.getTime() + VALIDATION_CONFIG.MIN_FUTURE_SCHEDULE_MINUTES * 60 * 1000
        );
        if (scheduledDate <= minFutureDate) {
          errors.push({
            field: "scheduled_at",
            code: "SCHEDULED_DATE_TOO_EARLY",
            message: `La date de programmation doit être au moins ${VALIDATION_CONFIG.MIN_FUTURE_SCHEDULE_MINUTES} minutes dans le futur`,
            severity: "error",
          });
        }

        // Vérifier que la date n'est pas trop lointaine
        const maxFutureDate = new Date(
          now.getTime() + VALIDATION_CONFIG.MAX_FUTURE_SCHEDULE_DAYS * 24 * 60 * 60 * 1000
        );
        if (scheduledDate > maxFutureDate) {
          warnings.push({
            field: "scheduled_at",
            code: "SCHEDULED_DATE_FAR",
            message: `Programmation très éloignée (${VALIDATION_CONFIG.MAX_FUTURE_SCHEDULE_DAYS} jours maximum recommandés)`,
          });
        }
      }
    }

    // Validation de cohérence des statuts
    if (data.status === "published" && !data.published_at) {
      warnings.push({
        field: "published_at",
        code: "MISSING_PUBLISHED_DATE",
        message: "Un article publié devrait avoir une date de publication",
      });
    }

    if (data.status === "scheduled" && !data.scheduled_at) {
      errors.push({
        field: "scheduled_at",
        code: "MISSING_SCHEDULED_DATE",
        message: "Un article programmé doit avoir une date de programmation",
        severity: "error",
      });
    }

    if (data.status === "scheduled" && data.published_at) {
      warnings.push({
        field: "published_at",
        code: "PUBLISHED_DATE_ON_SCHEDULED",
        message: "Un article programmé ne devrait pas avoir de date de publication",
      });
    }
  }

  /**
   * Normalise les données
   */
  private normalizeData(
    data: ArticleValidationData,
    normalizedData: Partial<ArticleValidationData>
  ): void {
    if (data.title) {
      normalizedData.title = data.title.trim();
    }

    if (data.content) {
      normalizedData.content = data.content.trim();
    }

    if (data.excerpt) {
      normalizedData.excerpt = data.excerpt.trim();
    }

    if (data.slug) {
      normalizedData.slug = this.normalizeSlug(data.slug);
    }
  }

  /**
   * Normalise un slug
   */
  private normalizeSlug(slug: string): string {
    return slug
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, VALIDATION_CONFIG.SLUG_MAX_LENGTH);
  }
}
