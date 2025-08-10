import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ArticleDisplay,
  ArticleFilters,
  ArticlePagination,
  ArticleListResponse,
  Category,
  Tag,
  TipTapContent,
} from "@/types/magazine";
import { checkUserPermission } from "@/lib/auth/server-auth";

// Fonction utilitaire pour assurer que le contenu est un objet JSON valide
function ensureContentIsObject(content: unknown): TipTapContent {
  if (!content) {
    return { type: "doc", content: [] };
  }

  // Si c'est déjà un objet, le retourner tel quel
  if (typeof content === "object") {
    return content as TipTapContent;
  }

  // Si c'est une chaîne, essayer de la parser
  if (typeof content === "string") {
    try {
      return JSON.parse(content) as TipTapContent;
    } catch (error) {
      console.error("Erreur lors du parsing du contenu JSON:", error);
      return { type: "doc", content: [] };
    }
  }

  return { type: "doc", content: [] };
}

/* ==================== ARTICLES ==================== */

export async function getArticles(
  filters: ArticleFilters = {},
  page: number = 1,
  limit: number = 10
): Promise<ArticleListResponse> {
  try {
    const supabase = await createSupabaseServerClient();

    // Construction de la requête avec les relations
    let query = supabase.from("articles").select(`
        *,
        author:profiles!articles_author_id_fkey(id, first_name, last_name),
        category:categories(id, name, slug, color),
        article_tags(
          tag:tags(id, name, slug)
        )
      `);

    // Application des filtres
    if (filters.status) {
      query = query.eq("status", filters.status);
    } else {
      // Par défaut, ne montrer que les articles publiés pour les non-éditeurs
      const canViewDrafts = await checkUserPermission("content:update");
      if (!canViewDrafts) {
        query = query.eq("status", "published");
      }
    }

    if (filters.category_id) {
      query = query.eq("category_id", filters.category_id);
    }

    if (filters.author_id) {
      query = query.eq("author_id", filters.author_id);
    }

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,excerpt.ilike.%${filters.search}%`);
    }

    // Count total pour la pagination - déclaration avant utilisation
    let countQuery = supabase.from("articles").select("*", { count: "exact", head: true });

    // Support pour tag_id (single) et tag_ids (multiple)
    if (filters.tag_id) {
      // Pour la requête principale avec join
      query = query.eq("article_tags.tag_id", filters.tag_id);
      // Pour le count, récupérer les IDs d'articles avec ce tag
      const { data: articleIds } = await supabase
        .from("article_tags")
        .select("article_id")
        .eq("tag_id", filters.tag_id);

      if (articleIds && articleIds.length > 0) {
        const ids = articleIds.map((item) => item.article_id);
        countQuery = countQuery.in("id", ids);
      } else {
        // Aucun article avec ce tag, forcer résultat vide
        countQuery = countQuery.eq("id", "00000000-0000-0000-0000-000000000000");
      }
    } else if (filters.tag_ids && filters.tag_ids.length > 0) {
      // Pour la requête principale avec join
      query = query.in("article_tags.tag_id", filters.tag_ids);
      // Pour le count, récupérer les IDs d'articles avec ces tags
      const { data: articleIds } = await supabase
        .from("article_tags")
        .select("article_id")
        .in("tag_id", filters.tag_ids);

      if (articleIds && articleIds.length > 0) {
        const ids = articleIds.map((item) => item.article_id);
        countQuery = countQuery.in("id", ids);
      } else {
        // Aucun article avec ces tags, forcer résultat vide
        countQuery = countQuery.eq("id", "00000000-0000-0000-0000-000000000000");
      }
    }

    // Application des mêmes filtres pour le count
    if (filters.status) {
      countQuery = countQuery.eq("status", filters.status);
    } else {
      const canViewDrafts = await checkUserPermission("content:update");
      if (!canViewDrafts) {
        countQuery = countQuery.eq("status", "published");
      }
    }

    if (filters.category_id) {
      countQuery = countQuery.eq("category_id", filters.category_id);
    }

    if (filters.author_id) {
      countQuery = countQuery.eq("author_id", filters.author_id);
    }

    if (filters.search) {
      countQuery = countQuery.or(
        `title.ilike.%${filters.search}%,excerpt.ilike.%${filters.search}%`
      );
    }

    const { count } = await countQuery;

    // Application de la pagination et tri
    const { data: articles, error } = await query
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      console.error("Erreur lors de la récupération des articles:", error);
      throw error;
    }

    // Debug: log du nombre d'articles récupérés
    console.log(`Articles récupérés: ${articles?.length || 0}, Total en base: ${count || 0}`);
    if (articles?.length) {
      console.log(
        "IDs des articles:",
        articles.map((a) => a.id)
      );
    }

    // Traitement des données pour inclure les tags et nettoyer le contenu
    const articlesWithTags =
      articles?.map((article) => ({
        ...article,
        content: ensureContentIsObject(article.content),
        tags: article.article_tags?.map((at) => at.tag) || [],
        category: article.category || undefined,
      })) || [];

    const pagination: ArticlePagination = {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    };

    return {
      articles: articlesWithTags,
      pagination,
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des articles:", error);
    return {
      articles: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    };
  }
}

export async function getArticleBySlug(slug: string): Promise<ArticleDisplay | null> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: article, error } = await supabase
      .from("articles")
      .select(
        `
        *,
        author:profiles!articles_author_id_fkey(id, first_name, last_name),
        category:categories(id, name, slug, color),
        article_tags(
          tag:tags(id, name, slug)
        )
      `
      )
      .eq("slug", slug)
      .single();

    if (error || !article) {
      return null;
    }

    // Vérifier les permissions pour les articles non publiés
    if (article.status !== "published") {
      const canView = await checkUserPermission("content:update");
      if (!canView) {
        return null;
      }
    }

    // Incrémenter le compteur de vues
    if (article.status === "published") {
      await supabase
        .from("articles")
        .update({ view_count: (article.view_count || 0) + 1 })
        .eq("id", article.id);
    }

    return {
      ...article,
      content: ensureContentIsObject(article.content),
      tags: article.article_tags?.map((at: { tag: Tag }) => at.tag) || [],
    } as ArticleDisplay;
  } catch (error) {
    console.error("Erreur lors de la récupération de l'article:", error);
    return null;
  }
}

export async function getArticleById(id: string): Promise<ArticleDisplay | null> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: article, error } = await supabase
      .from("articles")
      .select(
        `
        *,
        author:profiles!articles_author_id_fkey(id, first_name, last_name),
        category:categories(id, name, slug, color),
        article_tags(
          tag:tags(id, name, slug)
        )
      `
      )
      .eq("id", id)
      .single();

    if (error || !article) {
      return null;
    }

    return {
      ...article,
      content: ensureContentIsObject(article.content),
      tags: article.article_tags?.map((at: { tag: Tag }) => at.tag) || [],
    } as ArticleDisplay;
  } catch (error) {
    console.error("Erreur lors de la récupération de l'article par ID:", error);
    return null;
  }
}

export async function getPublishedArticles(limit: number = 5): Promise<ArticleDisplay[]> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: articles, error } = await supabase
      .from("articles")
      .select(
        `
        *,
        author:profiles!articles_author_id_fkey(id, first_name, last_name),
        category:categories(id, name, slug, color)
      `
      )
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return (articles as ArticleDisplay[]) || [];
  } catch (error) {
    console.error("Erreur lors de la récupération des articles publiés:", error);
    return [];
  }
}

/* ==================== CATÉGORIES ==================== */

export async function getCategories(): Promise<Category[]> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: categories, error } = await supabase.from("categories").select("*").order("name");

    if (error) {
      throw error;
    }

    return categories || [];
  } catch (error) {
    console.error("Erreur lors de la récupération des catégories:", error);
    return [];
  }
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: category, error } = await supabase
      .from("categories")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error || !category) {
      return null;
    }

    return category;
  } catch (error) {
    console.error("Erreur lors de la récupération de la catégorie:", error);
    return null;
  }
}

/* ==================== TAGS ==================== */

export async function getTags(): Promise<Tag[]> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: tags, error } = await supabase.from("tags").select("*").order("name");

    if (error) {
      throw error;
    }

    return tags || [];
  } catch (error) {
    console.error("Erreur lors de la récupération des tags:", error);
    return [];
  }
}

export async function getTagBySlug(slug: string): Promise<Tag | null> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: tag, error } = await supabase.from("tags").select("*").eq("slug", slug).single();

    if (error || !tag) {
      return null;
    }

    return tag;
  } catch (error) {
    console.error("Erreur lors de la récupération du tag:", error);
    return null;
  }
}

/* ==================== STATISTIQUES ==================== */

export async function getArticleStats() {
  try {
    const supabase = await createSupabaseServerClient();

    const [{ count: total }, { count: published }, { count: draft }, { count: archived }] =
      await Promise.all([
        supabase.from("articles").select("*", { count: "exact", head: true }),
        supabase
          .from("articles")
          .select("*", { count: "exact", head: true })
          .eq("status", "published"),
        supabase.from("articles").select("*", { count: "exact", head: true }).eq("status", "draft"),
        supabase
          .from("articles")
          .select("*", { count: "exact", head: true })
          .eq("status", "archived"),
      ]);

    return {
      total: total || 0,
      published: published || 0,
      draft: draft || 0,
      archived: archived || 0,
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error);
    return {
      total: 0,
      published: 0,
      draft: 0,
      archived: 0,
    };
  }
}
