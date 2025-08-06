/**
 * Article Taxonomy Service - V1 Simplifié
 *
 * Service dédié à la gestion des taxonomies (tags et catégories) des articles.
 * Adapté au schéma monolingue existant, harmonisé avec les autres services.
 *
 * Fonctionnalités V1 :
 * - Récupération des tags et catégories utilisés
 * - Nettoyage des taxonomies orphelines
 * - Validation des taxonomies avant CRUD
 * - Normalisation et suggestions de taxonomies
 *
 * Features exclues de la V1 :
 * - Hiérarchie de catégories (V1.1)
 * - Auto-suggestion intelligente (V1.1)
 * - Taxonomies multilingues (pas nécessaire)
 */

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { Result } from "@/lib/core/result";
import { DatabaseError, ValidationError } from "@/lib/core/errors";
import { LogUtils } from "@/lib/core/logger";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// Configuration des taxonomies centralisée
export const TAXONOMY_CONFIG = {
  // Limites
  MAX_TAGS_PER_ARTICLE: 10,
  MAX_CATEGORIES_PER_ARTICLE: 3,
  MIN_TAG_LENGTH: 2,
  MAX_TAG_LENGTH: 50,
  MIN_CATEGORY_LENGTH: 3,
  MAX_CATEGORY_LENGTH: 100,

  // Caractères autorisés
  TAG_ALLOWED_CHARS: /^[a-zA-Z0-9\s\-àáâäèéêëìíîïòóôöùúûüÿñç]+$/,
  CATEGORY_ALLOWED_CHARS: /^[a-zA-Z0-9\s\-àáâäèéêëìíîïòóôöùúûüÿñç\/]+$/,
} as const;

// Types pour les taxonomies V1
export interface TaxonomyItem {
  name: string;
  slug: string;
  count: number;
  created_at?: string;
}

export interface TaxonomyStats {
  total_tags: number;
  total_categories: number;
  most_used_tags: TaxonomyItem[];
  most_used_categories: TaxonomyItem[];
  unused_tags: string[];
  unused_categories: string[];
}

export interface TaxonomyValidation {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  normalized_tags: string[];
  normalized_categories: string[];
  suggestions: {
    tags: string[];
    categories: string[];
  };
}

export interface CleanupResult {
  removed_tags: number;
  removed_categories: number;
  articles_affected: number;
  cleanup_details: {
    empty_tags_removed: number;
    duplicate_tags_merged: number;
    empty_categories_removed: number;
    duplicate_categories_merged: number;
  };
}

export class ArticleTaxonomyService {
  private adminClient: SupabaseClient<Database>;

  constructor() {
    this.adminClient = createSupabaseAdminClient();
  }

  // === Récupération des taxonomies ===

  /**
   * Récupère tous les tags utilisés avec leur nombre d'occurrences
   */
  async getAllTags(): Promise<Result<TaxonomyItem[], Error>> {
    const context = LogUtils.createOperationContext("getAllTags", "article-taxonomy-service");
    LogUtils.logOperationStart("getAllTags", context);

    try {
      // Récupérer tous les tags avec leur nombre d'utilisation via les relations
      const { data: tagCounts, error } = await this.adminClient.from("tags").select(`
          id,
          name,
          slug,
          created_at,
          article_tags(count)
        `);

      if (error) {
        LogUtils.logOperationError("getAllTags", error, context);
        return Result.failure(new DatabaseError(`Erreur de récupération: ${error.message}`));
      }

      // Convertir en TaxonomyItem[] et trier par nombre d'occurrences
      const tags: TaxonomyItem[] = (tagCounts || [])
        .map((tag) => ({
          name: tag.name,
          slug: tag.slug,
          count: Array.isArray(tag.article_tags) ? tag.article_tags.length : 0,
          created_at: tag.created_at,
        }))
        .sort((a, b) => b.count - a.count);

      LogUtils.logOperationInfo("getAllTags", "Tags récupérés", {
        ...context,
        totalTags: tags.length,
        totalOccurrences: tags.reduce((sum, tag) => sum + tag.count, 0),
      });

      return Result.success(tags);
    } catch (error) {
      LogUtils.logOperationError("getAllTags", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Erreur inconnue"));
    }
  }

  /**
   * Récupère toutes les catégories utilisées avec leur nombre d'occurrences
   */
  async getAllCategories(): Promise<Result<TaxonomyItem[], Error>> {
    const context = LogUtils.createOperationContext("getAllCategories", "article-taxonomy-service");
    LogUtils.logOperationStart("getAllCategories", context);

    try {
      // Récupérer toutes les catégories avec leur nombre d'utilisation
      const { data: categories, error } = await this.adminClient.from("categories").select(`
          id,
          name,
          slug,
          created_at
        `);

      if (error) {
        LogUtils.logOperationError("getAllCategories", error, context);
        return Result.failure(new DatabaseError(`Erreur de récupération: ${error.message}`));
      }

      // Pour chaque catégorie, compter les articles associés
      const categoryItems: TaxonomyItem[] = [];

      for (const category of categories || []) {
        const { count, error: countError } = await this.adminClient
          .from("articles")
          .select("*", { count: "exact", head: true })
          .eq("category_id", category.id);

        if (countError) {
          LogUtils.logOperationError("getAllCategories", countError, context);
          continue;
        }

        categoryItems.push({
          name: category.name,
          slug: category.slug,
          count: count || 0,
          created_at: category.created_at,
        });
      }

      // Trier par nombre d'occurrences
      categoryItems.sort((a, b) => b.count - a.count);

      LogUtils.logOperationInfo("getAllCategories", "Catégories récupérées", {
        ...context,
        totalCategories: categoryItems.length,
        totalOccurrences: categoryItems.reduce((sum, cat) => sum + cat.count, 0),
      });

      return Result.success(categoryItems);
    } catch (error) {
      LogUtils.logOperationError("getAllCategories", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Erreur inconnue"));
    }
  }

  /**
   * Récupère les statistiques complètes des taxonomies
   */
  async getTaxonomyStats(): Promise<Result<TaxonomyStats, Error>> {
    const context = LogUtils.createOperationContext("getTaxonomyStats", "article-taxonomy-service");
    LogUtils.logOperationStart("getTaxonomyStats", context);

    try {
      // Récupérer tags et catégories en parallèle
      const [tagsResult, categoriesResult] = await Promise.all([
        this.getAllTags(),
        this.getAllCategories(),
      ]);

      if (tagsResult.isError()) {
        return Result.failure(tagsResult.getError());
      }
      if (categoriesResult.isError()) {
        return Result.failure(categoriesResult.getError());
      }

      const tags = tagsResult.getValue();
      const categories = categoriesResult.getValue();

      // Identifier les taxonomies inutilisées (count = 0)
      const unusedTags = tags.filter((tag) => tag.count === 0).map((tag) => tag.name);
      const unusedCategories = categories.filter((cat) => cat.count === 0).map((cat) => cat.name);

      const stats: TaxonomyStats = {
        total_tags: tags.length,
        total_categories: categories.length,
        most_used_tags: tags.slice(0, 10), // Top 10
        most_used_categories: categories.slice(0, 10), // Top 10
        unused_tags: unusedTags,
        unused_categories: unusedCategories,
      };

      LogUtils.logOperationInfo("getTaxonomyStats", "Statistiques générées", {
        ...context,
        totalTags: stats.total_tags,
        totalCategories: stats.total_categories,
        unusedTags: unusedTags.length,
        unusedCategories: unusedCategories.length,
      });

      return Result.success(stats);
    } catch (error) {
      LogUtils.logOperationError("getTaxonomyStats", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Erreur inconnue"));
    }
  }

  // === Validation des taxonomies ===

  /**
   * Valide et normalise des IDs de tags et catégories (adaptée au schéma relationnel)
   */
  async validateTaxonomyIds(
    tagIds: string[] = [],
    categoryId?: string
  ): Promise<Result<TaxonomyValidation, Error>> {
    const context = LogUtils.createOperationContext(
      "validateTaxonomyIds",
      "article-taxonomy-service"
    );
    LogUtils.logOperationStart("validateTaxonomyIds", {
      ...context,
      tagIdsCount: tagIds.length,
      categoryId,
    });

    try {
      const errors: string[] = [];
      const warnings: string[] = [];
      const validTagIds: string[] = [];
      let validCategoryId: string | undefined = categoryId;

      // Validation du nombre de tags
      if (tagIds.length > TAXONOMY_CONFIG.MAX_TAGS_PER_ARTICLE) {
        errors.push(`Maximum ${TAXONOMY_CONFIG.MAX_TAGS_PER_ARTICLE} tags autorisés`);
      }

      // Validation des IDs de tags
      for (const tagId of tagIds) {
        if (!tagId || tagId.trim().length === 0) {
          warnings.push("ID de tag vide ignoré");
          continue;
        }

        // Vérifier que le tag existe
        const { data: tag, error: tagError } = await this.adminClient
          .from("tags")
          .select("id, name")
          .eq("id", tagId.trim())
          .single();

        if (tagError && tagError.code !== "PGRST116") {
          errors.push(`Erreur lors de la vérification du tag ${tagId}: ${tagError.message}`);
          continue;
        }

        if (!tag) {
          errors.push(`Le tag avec l'ID "${tagId}" n'existe pas`);
          continue;
        }

        // Éviter les doublons
        if (!validTagIds.includes(tagId)) {
          validTagIds.push(tagId);
        } else {
          warnings.push(`Tag dupliqué ignoré: "${tag.name}"`);
        }
      }

      // Validation de l'ID de catégorie
      if (categoryId) {
        const { data: category, error: categoryError } = await this.adminClient
          .from("categories")
          .select("id, name")
          .eq("id", categoryId)
          .single();

        if (categoryError && categoryError.code !== "PGRST116") {
          errors.push(
            `Erreur lors de la vérification de la catégorie ${categoryId}: ${categoryError.message}`
          );
          validCategoryId = undefined;
        } else if (!category) {
          errors.push(`La catégorie avec l'ID "${categoryId}" n'existe pas`);
          validCategoryId = undefined;
        }
      }

      // Générer des suggestions (pour V1, suggestions simples)
      const suggestions = {
        tags: await this.getSuggestedTags([]), // Suggestions basées sur la popularité
        categories: await this.getSuggestedCategories([]), // Suggestions basées sur la popularité
      };

      const validation: TaxonomyValidation = {
        is_valid: errors.length === 0,
        errors,
        warnings,
        normalized_tags: validTagIds, // IDs des tags valides
        normalized_categories: validCategoryId ? [validCategoryId] : [], // ID de la catégorie valide
        suggestions,
      };

      LogUtils.logOperationInfo("validateTaxonomyIds", "Validation effectuée", {
        ...context,
        isValid: validation.is_valid,
        errorsCount: errors.length,
        warningsCount: warnings.length,
        validTagIdsCount: validTagIds.length,
        validCategoryId,
      });

      return Result.success(validation);
    } catch (error) {
      LogUtils.logOperationError("validateTaxonomyIds", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Erreur inconnue"));
    }
  }

  // === Nettoyage des taxonomies ===

  /**
   * Nettoie les taxonomies non utilisées (supprime les tags et catégories sans articles associés)
   */
  async cleanupUnusedTaxonomies(): Promise<Result<CleanupResult, Error>> {
    const context = LogUtils.createOperationContext(
      "cleanupUnusedTaxonomies",
      "article-taxonomy-service"
    );
    LogUtils.logOperationStart("cleanupUnusedTaxonomies", context);

    try {
      let removedTags = 0;
      let removedCategories = 0;

      // Nettoyer les tags inutilisés
      const { data: unusedTags, error: tagsError } = await this.adminClient.from("tags").select(`
          id, 
          name,
          article_tags!left(article_id)
        `);

      if (tagsError) {
        LogUtils.logOperationError("cleanupUnusedTaxonomies", tagsError, context);
        return Result.failure(new DatabaseError(`Erreur récupération tags: ${tagsError.message}`));
      }

      // Supprimer les tags sans articles associés
      for (const tag of unusedTags || []) {
        if (!tag.article_tags || tag.article_tags.length === 0) {
          const { error: deleteError } = await this.adminClient
            .from("tags")
            .delete()
            .eq("id", tag.id);

          if (!deleteError) {
            removedTags++;
          }
        }
      }

      // Nettoyer les catégories inutilisées
      const { data: categories, error: categoriesError } = await this.adminClient
        .from("categories")
        .select("id, name");

      if (categoriesError) {
        LogUtils.logOperationError("cleanupUnusedTaxonomies", categoriesError, context);
        return Result.failure(
          new DatabaseError(`Erreur récupération catégories: ${categoriesError.message}`)
        );
      }

      // Supprimer les catégories sans articles associés
      for (const category of categories || []) {
        const { count, error: countError } = await this.adminClient
          .from("articles")
          .select("*", { count: "exact", head: true })
          .eq("category_id", category.id);

        if (countError) {
          continue;
        }

        if (!count || count === 0) {
          const { error: deleteError } = await this.adminClient
            .from("categories")
            .delete()
            .eq("id", category.id);

          if (!deleteError) {
            removedCategories++;
          }
        }
      }

      const result: CleanupResult = {
        removed_tags: removedTags,
        removed_categories: removedCategories,
        articles_affected: 0, // Pas d'articles modifiés dans ce nettoyage
        cleanup_details: {
          empty_tags_removed: removedTags,
          duplicate_tags_merged: 0, // Non applicable avec schéma relationnel
          empty_categories_removed: removedCategories,
          duplicate_categories_merged: 0, // Non applicable avec schéma relationnel
        },
      };

      LogUtils.logOperationInfo("cleanupUnusedTaxonomies", "Nettoyage effectué", {
        ...context,
        removedTags,
        removedCategories,
        totalRemoved: removedTags + removedCategories,
      });

      return Result.success(result);
    } catch (error) {
      LogUtils.logOperationError("cleanupUnusedTaxonomies", error, context);
      return Result.failure(error instanceof Error ? error : new Error("Erreur inconnue"));
    }
  }

  // === Helpers privés ===

  /**
   * Normalise un tag
   */
  private normalizeTag(tag: string): string {
    return tag
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ") // Normaliser les espaces multiples
      .replace(/[^\w\s\-àáâäèéêëìíîïòóôöùúûüÿñç]/g, "") // Supprimer caractères spéciaux
      .trim();
  }

  /**
   * Normalise une catégorie
   */
  private normalizeCategory(category: string): string {
    return category
      .trim()
      .replace(/\s+/g, " ") // Normaliser les espaces multiples
      .replace(/\/+/g, "/") // Normaliser les slashes multiples
      .replace(/[^\w\s\-\/àáâäèéêëìíîïòóôöùúûüÿñç]/g, "") // Supprimer caractères spéciaux
      .replace(/^\/|\/$/g, "") // Supprimer slashes en début/fin
      .trim();
  }

  /**
   * Génère un slug à partir d'un nom
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize("NFD") // Décompose les accents
      .replace(/[\u0300-\u036f]/g, "") // Supprime les diacritiques
      .replace(/[^a-z0-9\s-]/g, "") // Garde seulement alphanumériques, espaces et traits d'union
      .replace(/\s+/g, "-") // Remplace espaces par traits d'union
      .replace(/-+/g, "-") // Évite les traits d'union multiples
      .replace(/^-+|-+$/g, ""); // Supprime traits d'union en début/fin
  }

  /**
   * Suggère des tags populaires (V1 simple)
   */
  private async getSuggestedTags(excludeTagIds: string[]): Promise<string[]> {
    try {
      const allTagsResult = await this.getAllTags();
      if (allTagsResult.isError()) {
        return [];
      }

      const allTags = allTagsResult.getValue();

      // V1 : Suggestions simples basées sur la popularité
      // Prendre les tags les plus populaires, sauf ceux déjà sélectionnés
      const availableTags = allTags
        .filter((tag) => tag.count > 0) // Uniquement les tags utilisés
        .slice(0, 5); // Top 5 suggestions

      return availableTags.map((tag) => tag.name);
    } catch {
      return [];
    }
  }

  /**
   * Suggère des catégories populaires (V1 simple)
   */
  private async getSuggestedCategories(excludeCategoryIds: string[]): Promise<string[]> {
    try {
      const allCategoriesResult = await this.getAllCategories();
      if (allCategoriesResult.isError()) {
        return [];
      }

      const allCategories = allCategoriesResult.getValue();

      // V1 : Suggestions simples basées sur la popularité
      // Prendre les catégories les plus populaires
      const availableCategories = allCategories
        .filter((cat) => cat.count > 0) // Uniquement les catégories utilisées
        .slice(0, 3); // Top 3 suggestions

      return availableCategories.map((cat) => cat.name);
    } catch {
      return [];
    }
  }
}
