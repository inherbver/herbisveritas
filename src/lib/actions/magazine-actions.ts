"use server";

import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  magazineService,
  type CreateArticleData,
  type UpdateArticleData,
} from "@/lib/services/magazine.service";
import { getUser } from "@/lib/auth/server";

// === VALIDATION SCHEMAS ===

const CreateArticleSchema = z.object({
  title: z
    .string()
    .min(5, "Titre trop court (minimum 5 caractères)")
    .max(200, "Titre trop long (maximum 200 caractères)"),
  content: z.string().min(100, "Contenu trop court (minimum 100 caractères)"),
  excerpt: z.string().max(500, "Extrait trop long (maximum 500 caractères)").optional(),
  type: z.enum(["blog", "news", "guide", "tutorial"]),
  status: z.enum(["draft", "published", "scheduled"]).optional(),
  featured_image_url: z.string().url("URL d'image invalide").optional(),
  featured_image_alt: z.string().max(200, "Texte alternatif trop long").optional(),
  tags: z.string().optional(), // Comma-separated tags from form
  categories: z.string().optional(), // Comma-separated categories from form
  is_featured: z.boolean().optional(),
  scheduled_at: z.string().optional(), // ISO date string
});

const UpdateArticleSchema = CreateArticleSchema.partial().extend({
  id: z.string().uuid("ID d'article invalide"),
});

const DeleteArticleSchema = z.object({
  id: z.string().uuid("ID d'article invalide"),
});

// === ACTION RESULTS ===

export interface ActionResult<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
}

// === HELPER FUNCTIONS ===

function parseTagsAndCategories(tagsStr?: string, categoriesStr?: string) {
  const tags = tagsStr
    ? tagsStr
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];
  const categories = categoriesStr
    ? categoriesStr
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean)
    : [];
  return { tags, categories };
}

// === ARTICLE ACTIONS ===

export async function createArticleAction(
  prevState: any,
  formData: FormData
): Promise<ActionResult> {
  try {
    // 1. Check authentication
    const user = await getUser();
    if (!user) {
      return {
        success: false,
        message: "Vous devez être connecté pour créer un article",
      };
    }

    // 2. Validate form data
    const rawData = {
      title: formData.get("title"),
      content: formData.get("content"),
      excerpt: formData.get("excerpt"),
      type: formData.get("type"),
      status: formData.get("status") || formData.get("action"), // Support both
      featured_image_url: formData.get("featured_image_url"),
      featured_image_alt: formData.get("featured_image_alt"),
      tags: formData.get("tags"),
      categories: formData.get("categories"),
      is_featured: formData.get("is_featured") === "true",
      scheduled_at: formData.get("scheduled_at"),
    };

    const validation = CreateArticleSchema.safeParse(rawData);
    if (!validation.success) {
      return {
        success: false,
        message: "Données invalides",
        errors: validation.error.flatten().fieldErrors,
      };
    }

    // 3. Parse tags and categories
    const { tags, categories } = parseTagsAndCategories(
      validation.data.tags,
      validation.data.categories
    );

    // 4. Prepare article data
    const articleData: CreateArticleData = {
      title: validation.data.title,
      content: validation.data.content,
      excerpt: validation.data.excerpt,
      type: validation.data.type,
      status: validation.data.status as any,
      featured_image_url: validation.data.featured_image_url,
      featured_image_alt: validation.data.featured_image_alt,
      tags,
      categories,
      is_featured: validation.data.is_featured,
      scheduled_at: validation.data.scheduled_at
        ? new Date(validation.data.scheduled_at)
        : undefined,
    };

    // 5. Create article
    const article = await magazineService.createArticle(user.id, articleData);

    // 6. Revalidate cache
    revalidateTag("articles");
    revalidateTag(`article-${article.slug}`);

    return {
      success: true,
      message:
        articleData.status === "published"
          ? "Article publié avec succès"
          : "Article créé avec succès",
      data: article,
    };
  } catch (error) {
    console.error("createArticleAction error:", error);

    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
      };
    }

    return {
      success: false,
      message: "Une erreur inattendue s'est produite",
    };
  }
}

export async function updateArticleAction(
  prevState: any,
  formData: FormData
): Promise<ActionResult> {
  try {
    // 1. Check authentication
    const user = await getUser();
    if (!user) {
      return {
        success: false,
        message: "Vous devez être connecté pour modifier un article",
      };
    }

    // 2. Validate form data
    const rawData = {
      id: formData.get("id"),
      title: formData.get("title"),
      content: formData.get("content"),
      excerpt: formData.get("excerpt"),
      type: formData.get("type"),
      status: formData.get("status") || formData.get("action"),
      featured_image_url: formData.get("featured_image_url"),
      featured_image_alt: formData.get("featured_image_alt"),
      tags: formData.get("tags"),
      categories: formData.get("categories"),
      is_featured: formData.get("is_featured") === "true",
      scheduled_at: formData.get("scheduled_at"),
    };

    const validation = UpdateArticleSchema.safeParse(rawData);
    if (!validation.success) {
      return {
        success: false,
        message: "Données invalides",
        errors: validation.error.flatten().fieldErrors,
      };
    }

    // 3. Check article ownership (basic security)
    const existingArticle = await magazineService.getArticleById(validation.data.id);
    if (!existingArticle) {
      return {
        success: false,
        message: "Article non trouvé",
      };
    }

    if (existingArticle.author_id !== user.id) {
      return {
        success: false,
        message: "Vous n'avez pas l'autorisation de modifier cet article",
      };
    }

    // 4. Parse tags and categories
    const { tags, categories } = parseTagsAndCategories(
      validation.data.tags,
      validation.data.categories
    );

    // 5. Prepare update data (remove undefined values)
    const updateData: UpdateArticleData = Object.fromEntries(
      Object.entries({
        title: validation.data.title,
        content: validation.data.content,
        excerpt: validation.data.excerpt,
        type: validation.data.type,
        status: validation.data.status as any,
        featured_image_url: validation.data.featured_image_url,
        featured_image_alt: validation.data.featured_image_alt,
        tags,
        categories,
        is_featured: validation.data.is_featured,
        scheduled_at: validation.data.scheduled_at
          ? new Date(validation.data.scheduled_at)
          : undefined,
      }).filter(([_, value]) => value !== undefined)
    );

    // 6. Update article
    const article = await magazineService.updateArticle(validation.data.id, updateData);

    // 7. Revalidate cache
    revalidateTag("articles");
    revalidateTag(`article-${article.slug}`);
    revalidateTag(`article-${article.id}`);

    return {
      success: true,
      message: "Article mis à jour avec succès",
      data: article,
    };
  } catch (error) {
    console.error("updateArticleAction error:", error);

    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
      };
    }

    return {
      success: false,
      message: "Une erreur inattendue s'est produite",
    };
  }
}

export async function deleteArticleAction(
  prevState: any,
  formData: FormData
): Promise<ActionResult> {
  try {
    // 1. Check authentication
    const user = await getUser();
    if (!user) {
      return {
        success: false,
        message: "Vous devez être connecté pour supprimer un article",
      };
    }

    // 2. Validate form data
    const validation = DeleteArticleSchema.safeParse({
      id: formData.get("id"),
    });

    if (!validation.success) {
      return {
        success: false,
        message: "ID d'article invalide",
        errors: validation.error.flatten().fieldErrors,
      };
    }

    // 3. Check article ownership
    const article = await magazineService.getArticleById(validation.data.id);
    if (!article) {
      return {
        success: false,
        message: "Article non trouvé",
      };
    }

    if (article.author_id !== user.id) {
      return {
        success: false,
        message: "Vous n'avez pas l'autorisation de supprimer cet article",
      };
    }

    // 4. Delete (archive) article
    await magazineService.deleteArticle(validation.data.id);

    // 5. Revalidate cache
    revalidateTag("articles");
    revalidateTag(`article-${article.slug}`);

    return {
      success: true,
      message: "Article supprimé avec succès",
    };
  } catch (error) {
    console.error("deleteArticleAction error:", error);

    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
      };
    }

    return {
      success: false,
      message: "Une erreur inattendue s'est produite",
    };
  }
}

// === PUBLISHING ACTIONS ===

export async function publishArticleAction(
  prevState: any,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await getUser();
    if (!user) {
      return {
        success: false,
        message: "Vous devez être connecté pour publier un article",
      };
    }

    const articleId = formData.get("id") as string;
    if (!articleId) {
      return {
        success: false,
        message: "ID d'article manquant",
      };
    }

    // Check ownership
    const article = await magazineService.getArticleById(articleId);
    if (!article) {
      return { success: false, message: "Article non trouvé" };
    }

    if (article.author_id !== user.id) {
      return {
        success: false,
        message: "Vous n'avez pas l'autorisation de publier cet article",
      };
    }

    // Publish article
    const publishedArticle = await magazineService.publishArticle(articleId);

    // Revalidate cache
    revalidateTag("articles");
    revalidateTag(`article-${publishedArticle.slug}`);

    return {
      success: true,
      message: "Article publié avec succès",
      data: publishedArticle,
    };
  } catch (error) {
    console.error("publishArticleAction error:", error);

    return {
      success: false,
      message: error instanceof Error ? error.message : "Erreur lors de la publication",
    };
  }
}

export async function unpublishArticleAction(
  prevState: any,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await getUser();
    if (!user) {
      return {
        success: false,
        message: "Vous devez être connecté",
      };
    }

    const articleId = formData.get("id") as string;
    if (!articleId) {
      return {
        success: false,
        message: "ID d'article manquant",
      };
    }

    // Check ownership
    const article = await magazineService.getArticleById(articleId);
    if (!article || article.author_id !== user.id) {
      return {
        success: false,
        message: "Article non trouvé ou non autorisé",
      };
    }

    // Unpublish article
    const unpublishedArticle = await magazineService.unpublishArticle(articleId);

    // Revalidate cache
    revalidateTag("articles");
    revalidateTag(`article-${unpublishedArticle.slug}`);

    return {
      success: true,
      message: "Article dépublié avec succès",
      data: unpublishedArticle,
    };
  } catch (error) {
    console.error("unpublishArticleAction error:", error);

    return {
      success: false,
      message: error instanceof Error ? error.message : "Erreur lors de la dépublication",
    };
  }
}

// === INTERACTION ACTIONS ===

export async function likeArticleAction(prevState: any, formData: FormData): Promise<ActionResult> {
  try {
    const articleId = formData.get("id") as string;
    if (!articleId) {
      return {
        success: false,
        message: "ID d'article manquant",
      };
    }

    await magazineService.incrementLikeCount(articleId);

    // Get updated article for stats
    const article = await magazineService.getArticleById(articleId);

    // Revalidate cache
    revalidateTag(`article-${articleId}`);
    if (article) {
      revalidateTag(`article-${article.slug}`);
    }

    return {
      success: true,
      message: "Article liké avec succès",
      data: { likes: article?.like_count || 0 },
    };
  } catch (error) {
    console.error("likeArticleAction error:", error);

    return {
      success: false,
      message: "Erreur lors du like",
    };
  }
}

// === REDIRECT ACTIONS ===

export async function createAndRedirectArticleAction(
  prevState: any,
  formData: FormData
): Promise<never> {
  const result = await createArticleAction(prevState, formData);

  if (result.success && result.data) {
    redirect(`/admin/magazine/${result.data.id}/edit`);
  } else {
    // En cas d'erreur, rediriger vers la liste avec le message d'erreur
    const errorMessage = encodeURIComponent(result.message);
    redirect(`/admin/magazine?error=${errorMessage}`);
  }
}

export async function updateAndRedirectArticleAction(
  prevState: any,
  formData: FormData
): Promise<never> {
  const result = await updateArticleAction(prevState, formData);

  if (result.success && result.data) {
    redirect(`/admin/magazine/${result.data.id}/edit?success=updated`);
  } else {
    const articleId = formData.get("id") as string;
    const errorMessage = encodeURIComponent(result.message);
    redirect(`/admin/magazine/${articleId}/edit?error=${errorMessage}`);
  }
}
