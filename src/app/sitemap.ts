import { MetadataRoute } from 'next'
import { getArticles, getCategories, getTags } from "@/lib/magazine/queries"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://herbisveritas.com'

  // Pages statiques
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/magazine`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
  ]

  // Articles du magazine
  try {
    const [
      { articles },
      categories,
      tags
    ] = await Promise.all([
      getArticles({ status: 'published' }, 1, 1000),
      getCategories(),
      getTags()
    ])
    
    const articlePages = articles.map((article) => ({
      url: `${baseUrl}/magazine/${article.slug}`,
      lastModified: new Date(article.updated_at || article.created_at || new Date()),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

    // Pages de catégories
    const categoryPages = categories.map((category) => ({
      url: `${baseUrl}/magazine/category/${category.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))

    // Pages de tags
    const tagPages = tags.map((tag) => ({
      url: `${baseUrl}/magazine/tag/${tag.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }))

    return [...staticPages, ...articlePages, ...categoryPages, ...tagPages]
  } catch (error) {
    console.error('Erreur lors de la génération du sitemap:', error)
    return staticPages
  }
}