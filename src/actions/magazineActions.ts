"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkUserPermission } from "@/lib/auth/server-auth";
import { slugify } from "@/utils/slugify";
import {
  ArticleInsert,
  ArticleUpdate,
  ArticleFormData,
  CategoryInsert,
  TagInsert,
  TipTapContent,
} from "@/types/magazine";

import {
  convertTipTapToHTML,
  calculateReadingTime as calcReadingTime,
  extractExcerpt,
} from "@/lib/magazine/html-converter";

// Fonction utilitaire pour nettoyer le contenu TipTap avant sauvegarde
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

export async function createArticle(formData: ArticleFormData) {
  try {
    const supabase = await createSupabaseServerClient();

    // Vérification des permissions
    const hasPermission = await checkUserPermission("content:create");
    if (!hasPermission) {
      return { success: false, error: "Permission refusée" };
    }

    // Récupération de l'utilisateur actuel
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "Utilisateur non authentifié" };
    }

    // Génération du slug si non fourni
    const slug = formData.slug || generateSlug(formData.title);

    // Vérification de l'unicité du slug
    const { data: existingArticle } = await supabase
      .from("articles")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existingArticle) {
      return { success: false, error: "Un article avec ce slug existe déjà" };
    }

    // Nettoyage et validation du contenu TipTap
    const cleanedContent = sanitizeTipTapContent(formData.content);

    // Préparation des données
    const articleData: ArticleInsert = {
      title: formData.title,
      slug,
      excerpt: formData.excerpt || extractExcerpt(cleanedContent),
      content: cleanedContent,
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
      return { success: false, error: createError.message };
    }

    // Ajout des tags si fournis
    if (formData.tags && formData.tags.length > 0) {
      const tagRelations = formData.tags.map((tagId: string) => ({
        article_id: article.id,
        tag_id: tagId,
      }));

      const { error: tagError } = await supabase.from("article_tags").insert(tagRelations);

      if (tagError) {
        console.error("Erreur lors de l'ajout des tags:", tagError);
      }
    }

    revalidatePath("/admin/magazine");
    revalidatePath("/magazine");

    return { success: true, data: article };
  } catch (_error) {
    return { success: false, error: "Erreur inattendue lors de la création" };
  }
}

export async function updateArticle(id: string, formData: ArticleFormData) {
  try {
    console.log("📝 [MagazineActions] updateArticle appelé pour ID:", id);
    console.log("📄 [MagazineActions] formData reçu:", JSON.stringify(formData, null, 2));

    const supabase = await createSupabaseServerClient();

    // Vérification des permissions
    const hasPermission = await checkUserPermission("content:update");
    if (!hasPermission) {
      return { success: false, error: "Permission refusée" };
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
      return { success: false, error: "Un autre article avec ce slug existe déjà" };
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
      content: cleanedContent,
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
      return { success: false, error: updateError.message };
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
          console.error("Erreur lors de la mise à jour des tags:", tagError);
        }
      }
    }

    revalidatePath("/admin/magazine");
    revalidatePath("/magazine");
    revalidatePath(`/magazine/${article.slug}`);

    return { success: true, data: article };
  } catch (_error) {
    return { success: false, error: "Erreur inattendue lors de la mise à jour" };
  }
}

export async function deleteArticle(id: string) {
  try {
    const supabase = await createSupabaseServerClient();

    // Vérification des permissions
    const hasPermission = await checkUserPermission("content:delete");
    if (!hasPermission) {
      return { success: false, error: "Permission refusée" };
    }

    const { error } = await supabase.from("articles").delete().eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/magazine");
    revalidatePath("/magazine");

    return { success: true };
  } catch (_error) {
    return { success: false, error: "Erreur lors de la suppression" };
  }
}

/* ==================== CATÉGORIES ==================== */

export async function createCategory(data: Omit<CategoryInsert, "id">) {
  try {
    const supabase = await createSupabaseServerClient();

    const hasPermission = await checkUserPermission("content:create");
    if (!hasPermission) {
      return { success: false, error: "Permission refusée" };
    }

    const { data: category, error } = await supabase
      .from("categories")
      .insert(data)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/magazine");
    return { success: true, data: category };
  } catch (_error) {
    return { success: false, error: "Erreur lors de la création de la catégorie" };
  }
}

/* ==================== WORKFLOW DE PUBLICATION ==================== */

export async function changeArticleStatus(
  articleId: string,
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
      const validation = validateArticleForPublication(currentArticle);
      if (!validation.isValid) {
        return {
          success: false,
          error: "L'article ne peut pas être publié",
          details: validation.errors,
        };
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

    return {
      success: true,
      message: getPublicationActionMessage(action, currentArticle.title),
    };
  } catch (error) {
    console.error("Erreur lors du changement de statut:", error);
    return { success: false, error: "Erreur interne du serveur." };
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

export async function createTag(data: Omit<TagInsert, "id">) {
  try {
    const supabase = await createSupabaseServerClient();

    const hasPermission = await checkUserPermission("content:create");
    if (!hasPermission) {
      return { success: false, error: "Permission refusée" };
    }

    const { data: tag, error } = await supabase.from("tags").insert(data).select().single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/magazine");
    return { success: true, data: tag };
  } catch (_error) {
    return { success: false, error: "Erreur lors de la création du tag" };
  }
}

/* ==================== UPLOAD D'IMAGES ==================== */

// Schema de validation pour l'upload d'images
const imageUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size > 0, "Le fichier ne peut pas être vide.")
    .refine(
      (file) => file.size < 4 * 1024 * 1024, // 4MB max
      "Le fichier ne doit pas dépasser 4Mo."
    )
    .refine(
      (file) => ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type),
      "Le format du fichier doit être JPEG, PNG, WEBP ou GIF."
    ),
  fileName: z.string().min(3, "Le nom du fichier doit contenir au moins 3 caractères."),
});

// Type pour le résultat de l'upload
type UploadImageResult =
  | { success: true; message: string; data: { url: string } }
  | { success: false; message: string; errors?: { file?: string[]; fileName?: string[] } };

export async function uploadMagazineImage(formData: FormData): Promise<UploadImageResult> {
  try {
    const supabase = await createSupabaseServerClient();

    // Vérifier les permissions
    const permissionResult = await checkUserPermission("content:create");
    if (!permissionResult.isAuthorized) {
      return {
        success: false,
        message: "Permission refusée pour l'upload d'images.",
      };
    }

    const file = formData.get("file") as File;
    const fileName = formData.get("fileName") as string;

    const validationResult = imageUploadSchema.safeParse({ file, fileName });

    if (!validationResult.success) {
      return {
        success: false,
        message: "Validation échouée",
        errors: validationResult.error.flatten().fieldErrors,
      };
    }

    const { file: validatedFile, fileName: validatedFileName } = validationResult.data;

    const fileExtension = validatedFile.name.split(".").pop();
    const sanitizedFileName = slugify(validatedFileName);
    const filePath = `${sanitizedFileName}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
      .from("magazine")
      .upload(filePath, validatedFile, {
        upsert: true, // Overwrite file if it exists
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return {
        success: false,
        message: `Erreur lors de l'upload: ${uploadError.message}`,
      };
    }

    const { data: publicUrlData } = supabase.storage.from("magazine").getPublicUrl(filePath);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      return {
        success: false,
        message: "Impossible de récupérer l'URL publique après l'upload.",
      };
    }

    return {
      success: true,
      message: "Image téléversée avec succès !",
      data: { url: publicUrlData.publicUrl },
    };
  } catch (error) {
    console.error("Erreur lors de l'upload d'image:", error);
    return {
      success: false,
      message: "Erreur interne du serveur.",
    };
  }
}
