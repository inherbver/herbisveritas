import { MetadataRoute } from "next";
import { getArticles, getCategories, getTags } from "@/lib/magazine/queries";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { locales } from "@/i18n-config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://herbisveritas.com";
  const defaultLocale = "fr";

  // Helper to generate URLs for all locales
  const generateLocalizedUrls = (
    path: string,
    lastModified: Date,
    changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never",
    priority: number
  ) => {
    return locales.map((locale) => ({
      url: locale === defaultLocale ? `${baseUrl}${path}` : `${baseUrl}/${locale}${path}`,
      lastModified,
      changeFrequency,
      priority,
      alternates: {
        languages: Object.fromEntries(
          locales.map((l) => [
            l,
            l === defaultLocale ? `${baseUrl}${path}` : `${baseUrl}/${l}${path}`,
          ])
        ),
      },
    }));
  };

  // Pages statiques avec support multilingue
  const staticPages = [
    // Home page
    ...generateLocalizedUrls("/", new Date(), "daily", 1.0),

    // Main sections
    ...generateLocalizedUrls("/shop", new Date(), "daily", 0.9),
    ...generateLocalizedUrls("/magazine", new Date(), "daily", 0.8),
    ...generateLocalizedUrls("/about", new Date(), "monthly", 0.7),
    ...generateLocalizedUrls("/contact", new Date(), "monthly", 0.6),

    // Legal pages
    ...generateLocalizedUrls("/privacy-policy", new Date(), "yearly", 0.3),
    ...generateLocalizedUrls("/terms", new Date(), "yearly", 0.3),
  ];

  try {
    // Fetch dynamic content
    const [{ articles }, categories, tags, productsResult] = await Promise.all([
      getArticles({ status: "published" }, 1, 1000),
      getCategories(),
      getTags(),
      // Fetch products
      (async () => {
        try {
          const supabase = createSupabaseAdminClient();
          const { data } = await supabase
            .from("products")
            .select("slug, updated_at, created_at")
            .eq("active", true)
            .order("created_at", { ascending: false })
            .limit(1000);
          return data || [];
        } catch (error) {
          console.error("Error fetching products for sitemap:", error);
          return [];
        }
      })(),
    ]);

    // Generate product pages for all locales
    const productPages = productsResult.flatMap((product) =>
      generateLocalizedUrls(
        `/products/${product.slug}`,
        new Date(product.updated_at || product.created_at || new Date()),
        "weekly",
        0.8
      )
    );

    // Generate article pages for all locales
    const articlePages = articles.flatMap((article) =>
      generateLocalizedUrls(
        `/magazine/${article.slug}`,
        new Date(article.updated_at || article.created_at || new Date()),
        "weekly",
        0.7
      )
    );

    // Generate category pages for all locales
    const categoryPages = categories.flatMap((category) =>
      generateLocalizedUrls(`/magazine/category/${category.slug}`, new Date(), "weekly", 0.6)
    );

    // Generate tag pages for all locales
    const tagPages = tags.flatMap((tag) =>
      generateLocalizedUrls(`/magazine/tag/${tag.slug}`, new Date(), "monthly", 0.5)
    );

    return [...staticPages, ...productPages, ...articlePages, ...categoryPages, ...tagPages];
  } catch (error) {
    console.error("Error generating sitemap:", error);
    // Return at least static pages on error
    return staticPages;
  }
}

// Optional: Configure revalidation
export const revalidate = 3600; // Revalidate every hour
