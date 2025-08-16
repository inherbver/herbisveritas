"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Json } from "@/types/supabase";
import { checkUserPermission } from "@/lib/auth/server-auth";
import {
  uploadMagazineImageCore,
  UploadImageResult as CoreUploadImageResult,
} from "@/lib/storage/image-upload";
import {
  ArticleInsert,
  ArticleUpdate,
  ArticleFormData,
  ArticleDisplay,
  CategoryInsert,
  TagInsert,
  TipTapContent,
} from "@/types/magazine";

import {
  convertTipTapToHTML,
  calculateReadingTime as calcReadingTime,
  extractExcerpt,
} from "@/lib/magazine/html-converter";

// New imports for Clean Architecture
import { ActionResult } from "@/lib/core/result";
import { LogUtils } from "@/lib/core/logger";
import { ValidationError, AuthenticationError, ErrorUtils } from "@/lib/core/errors";

function sanitizeTipTapContent(content: unknown): TipTapContent {
  console.log("🧹 [MagazineActions] sanitizeTipTapContent reçu:", JSON.stringify(content, null, 2));

  if (!content || typeof content !== "object") {
    console.log("⚠️ [MagazineActions] Contenu invalide, retour contenu vide");
    return { type: "doc", content: [] };
  }

  // Assurer que le contenu est un objet TipTap valide
  const tipTapContent = content as TipTapContent;

  if (!tipTapContent.type) {
    console.log("⚠️ [MagazineActions] Pas de type TipTap, retour contenu vide");
    return { type: "doc", content: [] };
  }

  // Nettoyer récursivement le contenu pour s'assurer qu'il n'y a pas de références circulaires
  // et supprimer les nœuds image vides
  const cleanContent = (node: TipTapContent): TipTapContent | null => {
    // Si c'est un nœud image sans src, le supprimer
    if (node.type === "image" && (!node.attrs || !node.attrs.src || node.attrs.src === "")) {
      console.log(
        "🗑️ [MagazineActions] Suppression nœud image vide:",
        JSON.stringify(node, null, 2)
      );
      return null;
    }

    // Si le nœud a du contenu, le nettoyer récursivement
    if (node.content && Array.isArray(node.content)) {
      const cleanedContent = node.content
        .map(cleanContent)
        .filter((item): item is TipTapContent => item !== null);

      return {
        ...node,
        content: cleanedContent,
      };
    }

    return node;
  };

  const sanitizedContent = cleanContent(tipTapContent);
  if (!sanitizedContent) {
    console.log("⚠️ [MagazineActions] Contenu entièrement nettoyé, retour contenu vide");
    return { type: "doc", content: [] };
  }

  // Nettoyer les références circulaires
  const finalContent = JSON.parse(JSON.stringify(sanitizedContent));
  console.log("✅ [MagazineActions] Contenu nettoyé:", JSON.stringify(finalContent, null, 2));
  return finalContent;
}

import {
  canPerformPublicationAction,
  validateArticleForPublication,
  getPublicationActionMessage,
} from "@/lib/magazine/publication-utils";

// Fonction utilitaire pour générer un slug
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Supprime les accents
    .replace(/[^\w\s-]/g, "") // Supprime les caractères spéciaux
    .replace(/\s+/g, "-") // Remplace les espaces par des tirets
    .replace(/--+/g, "-") // Supprime les tirets multiples
    .trim();
}

/* ==================== ARTICLES ==================== */

export async function createArticle(formData: ArticleFormData): Promise<ActionResult<unknown>> {
  const context = LogUtils.createUserActionContext("unknown", "create_article", "magazine");
  LogUtils.logOperationStart("create_article", context);

  try {
    const supabase = await createSupabaseServerClient();

    // Vérification des permissions
    const hasPermission = await checkUserPermission("content:create");
    if (!hasPermission) {
      throw new AuthenticationError("Permission refusée");
    }

    // Récupération de l'utilisateur actuel
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new AuthenticationError("Utilisateur non authentifié");
    }
    context.userId = user.id;

    // Génération du slug si non fourni
    const slug = formData.slug || generateSlug(formData.title);

    // Vérification de l'unicité du slug
    const { data: existingArticle } = await supabase
      .from("articles")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existingArticle) {
      throw new ValidationError("Un article avec ce slug existe déjà", "slug");
    }

    // Nettoyage et validation du contenu TipTap
    const cleanedContent = sanitizeTipTapContent(formData.content);

    // Préparation des données
    const articleData: ArticleInsert = {
      title: formData.title,
      slug,
      excerpt: formData.excerpt || extractExcerpt(cleanedContent),
      content: JSON.parse(JSON.stringify(cleanedContent)) as Json,
      content_html: convertTipTapToHTML(cleanedContent),
      featured_image: formData.featured_image || null,
      status: formData.status || "draft",
      author_id: user.id,
      category_id: formData.category_id || null,
      reading_time: calcReadingTime(cleanedContent),
      seo_title: formData.seo_title || null,
      seo_description: formData.seo_description || null,
      published_at:
        (formData.status || "draft") === "published" && !formData.published_at
          ? new Date().toISOString()
          : formData.published_at
            ? typeof formData.published_at === "string"
              ? formData.published_at
              : formData.published_at.toISOString()
            : null,
    };

    // Création de l'article
    const { data: article, error: createError } = await supabase
      .from("articles")
      .insert(articleData)
      .select()
      .single();

    if (createError) {
      throw ErrorUtils.fromSupabaseError(createError);
    }

    // Ajout des tags si fournis
    if (formData.tags && formData.tags.length > 0) {
      const tagRelations = formData.tags.map((tagId: string) => ({
        article_id: article.id,
        tag_id: tagId,
      }));

      const { error: tagError } = await supabase.from("article_tags").insert(tagRelations);

      if (tagError) {
        LogUtils.logOperationError("add_article_tags", tagError, context);
        // Ne pas faire échouer la création si les tags échouent
      }
    }

    revalidatePath("/admin/magazine");
    revalidatePath("/magazine");

    LogUtils.logOperationSuccess("create_article", {
      ...context,
      articleId: article.id,
      title: formData.title,
    });
    return ActionResult.ok(article, "Article créé avec succès");
  } catch (error) {
    LogUtils.logOperationError("create_article", error, context);
    return ActionResult.error(
      ErrorUtils.isAppError(error)
        ? ErrorUtils.formatForUser(error)
        : "Erreur inattendue lors de la création"
    );
  }
}

export async function updateArticle(
  id: string,
  formData: ArticleFormData
): Promise<ActionResult<unknown>> {
  const context = LogUtils.createUserActionContext("unknown", "update_article", "magazine", {
    articleId: id,
  });
  LogUtils.logOperationStart("update_article", context);

  try {
    const supabase = await createSupabaseServerClient();

    // Vérification des permissions
    const hasPermission = await checkUserPermission("content:update");
    if (!hasPermission) {
      throw new AuthenticationError("Permission refusée");
    }

    // Génération du slug si modifié
    const slug = formData.slug || generateSlug(formData.title);

    // Vérification de l'unicité du slug (excluant l'article current)
    const { data: existingArticle } = await supabase
      .from("articles")
      .select("id")
      .eq("slug", slug)
      .neq("id", id)
      .single();

    if (existingArticle) {
      throw new ValidationError("Un autre article avec ce slug existe déjà", "slug");
    }

    // Nettoyage et validation du contenu TipTap
    console.log(
      "📄 [MagazineActions] Contenu TipTap reçu avant nettoyage:",
      JSON.stringify(formData.content, null, 2)
    );
    const cleanedContent = sanitizeTipTapContent(formData.content);

    // Préparation des données de mise à jour
    const updateData: ArticleUpdate = {
      title: formData.title,
      slug,
      excerpt: formData.excerpt || extractExcerpt(cleanedContent),
      content: JSON.parse(JSON.stringify(cleanedContent)) as Json,
      content_html: convertTipTapToHTML(cleanedContent),
      featured_image: formData.featured_image || null,
      status: formData.status || "draft",
      category_id: formData.category_id || null,
      reading_time: calcReadingTime(cleanedContent),
      seo_title: formData.seo_title || null,
      seo_description: formData.seo_description || null,
      published_at:
        (formData.status || "draft") === "published" && !formData.published_at
          ? new Date().toISOString()
          : formData.published_at
            ? typeof formData.published_at === "string"
              ? formData.published_at
              : formData.published_at.toISOString()
            : null,
    };

    // Mise à jour de l'article
    const { data: article, error: updateError } = await supabase
      .from("articles")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      throw ErrorUtils.fromSupabaseError(updateError);
    }

    // Mise à jour des tags
    if (formData.tags !== undefined) {
      // Suppression des anciennes relations
      await supabase.from("article_tags").delete().eq("article_id", id);

      // Ajout des nouvelles relations
      if (formData.tags.length > 0) {
        const tagRelations = formData.tags.map((tagId: string) => ({
          article_id: id,
          tag_id: tagId,
        }));

        const { error: tagError } = await supabase.from("article_tags").insert(tagRelations);

        if (tagError) {
          LogUtils.logOperationError("update_article_tags", tagError, context);
        }
      }
    }

    revalidatePath("/admin/magazine");
    revalidatePath("/magazine");
    revalidatePath(`/magazine/${article.slug}`);

    LogUtils.logOperationSuccess("update_article", { ...context, title: formData.title });
    return ActionResult.ok(article, "Article mis à jour avec succès");
  } catch (error) {
    LogUtils.logOperationError("update_article", error, context);
    return ActionResult.error(
      ErrorUtils.isAppError(error)
        ? ErrorUtils.formatForUser(error)
        : "Erreur inattendue lors de la mise à jour"
    );
  }
}

export async function deleteArticle(id: string): Promise<ActionResult<null>> {
  const context = LogUtils.createUserActionContext("unknown", "delete_article", "magazine", {
    articleId: id,
  });
  LogUtils.logOperationStart("delete_article", context);

  try {
    const supabase = await createSupabaseServerClient();

    // Vérification des permissions
    const hasPermission = await checkUserPermission("content:delete");
    if (!hasPermission) {
      throw new AuthenticationError("Permission refusée");
    }

    const { error } = await supabase.from("articles").delete().eq("id", id);

    if (error) {
      throw ErrorUtils.fromSupabaseError(error);
    }

    revalidatePath("/admin/magazine");
    revalidatePath("/magazine");

    LogUtils.logOperationSuccess("delete_article", context);
    return ActionResult.ok(null, "Article supprimé avec succès");
  } catch (error) {
    LogUtils.logOperationError("delete_article", error, context);
    return ActionResult.error(
      ErrorUtils.isAppError(error)
        ? ErrorUtils.formatForUser(error)
        : "Erreur lors de la suppression"
    );
  }
}

/* ==================== CATÉGORIES ==================== */

export async function createCategory(
  data: Omit<CategoryInsert, "id">
): Promise<ActionResult<unknown>> {
  const context = LogUtils.createUserActionContext("unknown", "create_category", "magazine");
  LogUtils.logOperationStart("create_category", context);

  try {
    const supabase = await createSupabaseServerClient();

    const hasPermission = await checkUserPermission("content:create");
    if (!hasPermission) {
      throw new AuthenticationError("Permission refusée");
    }

    const { data: category, error } = await supabase
      .from("categories")
      .insert(data)
      .select()
      .single();

    if (error) {
      throw ErrorUtils.fromSupabaseError(error);
    }

    revalidatePath("/admin/magazine");
    LogUtils.logOperationSuccess("create_category", { ...context, categoryName: data.name });
    return ActionResult.ok(category, "Catégorie créée avec succès");
  } catch (error) {
    LogUtils.logOperationError("create_category", error, context);
    return ActionResult.error(
      ErrorUtils.isAppError(error)
        ? ErrorUtils.formatForUser(error)
        : "Erreur lors de la création de la catégorie"
    );
  }
}

/* ==================== WORKFLOW DE PUBLICATION ==================== */

export async function changeArticleStatus(
  articleId: string,
  newStatus: "draft" | "published" | "archived"
): Promise<ActionResult<null>> {
  const context = LogUtils.createUserActionContext("unknown", "change_article_status", "magazine", {
    articleId,
    newStatus,
  });
  LogUtils.logOperationStart("change_article_status", context);

  try {
    const supabase = await createSupabaseServerClient();

    // Vérification des permissions
    const action =
      newStatus === "published" ? "publish" : newStatus === "archived" ? "archive" : "unpublish";

    const canPerform = await canPerformPublicationAction(action);
    if (!canPerform) {
      return {
        success: false,
        error: "Vous n'avez pas les permissions nécessaires pour cette action.",
      };
    }

    // Récupération de l'article actuel
    const { data: currentArticle, error: fetchError } = await supabase
      .from("articles")
      .select("*")
      .eq("id", articleId)
      .single();

    if (fetchError) {
      return { success: false, error: "Article non trouvé." };
    }

    // Validation pour la publication
    if (newStatus === "published") {
      // Convertir en ArticleDisplay avec le content parsé correctement
      const articleDisplay: Partial<ArticleDisplay> = {
        ...currentArticle,
        content: currentArticle.content as TipTapContent,
      };
      const validation = validateArticleForPublication(articleDisplay);
      if (!validation.isValid) {
        return ActionResult.error(
          `L'article ne peut pas être publié: ${validation.errors.join(", ")}`
        );
      }
    }

    // Mise à jour du statut
    const updateData: Partial<ArticleUpdate> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    // Si on publie, on met la date de publication
    if (newStatus === "published" && !currentArticle.published_at) {
      updateData.published_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from("articles")
      .update(updateData)
      .eq("id", articleId);

    if (updateError) {
      return { success: false, error: "Erreur lors de la mise à jour du statut." };
    }

    revalidatePath("/admin/magazine");
    revalidatePath("/magazine");
    revalidatePath(`/magazine/${currentArticle.slug}`);

    const message = getPublicationActionMessage(action, currentArticle.title);
    LogUtils.logOperationSuccess("change_article_status", {
      ...context,
      articleTitle: currentArticle.title,
    });
    return ActionResult.ok(null, message);
  } catch (error) {
    LogUtils.logOperationError("change_article_status", error, context);
    return ActionResult.error(
      ErrorUtils.isAppError(error) ? ErrorUtils.formatForUser(error) : "Erreur interne du serveur"
    );
  }
}

export async function bulkChangeArticleStatus(
  articleIds: string[],
  newStatus: "draft" | "published" | "archived"
) {
  try {
    const supabase = await createSupabaseServerClient();

    // Vérification des permissions
    const action =
      newStatus === "published" ? "publish" : newStatus === "archived" ? "archive" : "unpublish";

    const canPerform = await canPerformPublicationAction(action);
    if (!canPerform) {
      return {
        success: false,
        error: "Vous n'avez pas les permissions nécessaires pour cette action.",
      };
    }

    // Mise à jour en lot
    const updateData: Partial<ArticleUpdate> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === "published") {
      updateData.published_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from("articles")
      .update(updateData)
      .in("id", articleIds);

    if (updateError) {
      return { success: false, error: "Erreur lors de la mise à jour en lot." };
    }

    revalidatePath("/admin/magazine");
    revalidatePath("/magazine");

    return {
      success: true,
      message: `${articleIds.length} article(s) mis à jour avec le statut "${newStatus}".`,
    };
  } catch (error) {
    console.error("Erreur lors du changement de statut en lot:", error);
    return { success: false, error: "Erreur interne du serveur." };
  }
}

/* ==================== TAGS ==================== */

export async function createTag(data: Omit<TagInsert, "id">): Promise<ActionResult<unknown>> {
  const context = LogUtils.createUserActionContext("unknown", "create_tag", "magazine");
  LogUtils.logOperationStart("create_tag", context);

  try {
    const supabase = await createSupabaseServerClient();

    const hasPermission = await checkUserPermission("content:create");
    if (!hasPermission) {
      throw new AuthenticationError("Permission refusée");
    }

    const { data: tag, error } = await supabase.from("tags").insert(data).select().single();

    if (error) {
      throw ErrorUtils.fromSupabaseError(error);
    }

    revalidatePath("/admin/magazine");
    LogUtils.logOperationSuccess("create_tag", { ...context, tagName: data.name });
    return ActionResult.ok(tag, "Tag créé avec succès");
  } catch (error) {
    LogUtils.logOperationError("create_tag", error, context);
    return ActionResult.error(
      ErrorUtils.isAppError(error)
        ? ErrorUtils.formatForUser(error)
        : "Erreur lors de la création du tag"
    );
  }
}

/* ==================== UPLOAD D'IMAGES ==================== */

// Type pour le résultat de l'upload (rétrocompatibilité)
export type UploadImageResult = CoreUploadImageResult;

// Server action wrapper for uploadMagazineImageCore that returns ActionResult
export async function uploadMagazineImageAction(
  formData: FormData
): Promise<ActionResult<UploadImageResult>> {
  try {
    const result = await uploadMagazineImageCore(formData);
    return ActionResult.ok(result, "Image uploaded successfully");
  } catch (error) {
    return ActionResult.error(error instanceof Error ? error.message : "Failed to upload image");
  }
}

// Migration vers la fonction centralisée
export const uploadMagazineImage = uploadMagazineImageCore;
