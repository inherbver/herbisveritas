import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://herbisveritas.com";
  const isProduction = process.env.NODE_ENV === "production";

  return {
    rules: [
      // Rule for good bots
      {
        userAgent: [
          "Googlebot",
          "Bingbot",
          "Slurp", // Yahoo
          "DuckDuckBot",
          "Baiduspider",
          "YandexBot",
          "facebookexternalhit",
          "LinkedInBot",
          "WhatsApp",
          "Twitterbot",
        ],
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/auth/",
          "/_next/",
          "/private/",
          "/profile/",
          "/checkout/",
          "/update-password",
          "/forgot-password",
          "/*.json$",
          "/*?*", // URLs with query parameters
          "/*#*", // URLs with fragments
        ],
        crawlDelay: 1, // 1 second delay between requests
      },
      // Rule for aggressive bots
      {
        userAgent: ["AhrefsBot", "SemrushBot", "DotBot", "MJ12bot", "BlexBot"],
        allow: [
          "/$", // Only home page
          "/shop$",
          "/magazine$",
        ],
        disallow: "/",
        crawlDelay: 10, // 10 seconds delay
      },
      // Default rule for all other bots
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/auth/",
          "/_next/",
          "/private/",
          "/profile/",
          "/checkout/",
          "/login",
          "/register",
          "/update-password",
          "/forgot-password",
          "/unauthorized",
          "/*.json$",
        ],
        crawlDelay: 2,
      },
    ],
    sitemap: [
      `${baseUrl}/sitemap.xml`,
      // If you have multiple sitemaps in the future:
      // `${baseUrl}/sitemap-products.xml`,
      // `${baseUrl}/sitemap-articles.xml`,
    ],
    host: baseUrl,
  };
}

// Optional: Add custom headers for robots
export const metadata = {
  // Robots meta tags will be handled by individual pages
  // This is just for the robots.txt file itself
};
