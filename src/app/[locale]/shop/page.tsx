import { getTranslations } from "next-intl/server";
import { MainLayout } from "@/components/layout/main-layout";
import { type Metadata } from "next";
import { ShopClientContent } from "@/components/domain/shop/shop-client-content";
import { getAllProducts, ProductForShopQuery } from "@/lib/supabase/queries/products";
import { getCart } from "@/lib/cartReader";
import { isSuccessResult } from "@/lib/cart-helpers";
import type { CartData } from "@/types/cart";
import { Locale } from "@/i18n-config";
import { Hero } from "@/components/shared/hero";
import { getActiveFeaturedHeroItem, type FeaturedHeroItem } from "@/lib/supabase/queries/hero";
import { Link } from "@/i18n/navigation"; // Import Link to use for React.ComponentProps<typeof Link>

// Type for route parameters
type PageParams = {
  locale: Locale;
};

// Props for ShopPage component, params is now a Promise
type ShopPageProps = {
  params: Promise<PageParams>;
};

// Define the type for the data mapped for the grid
export type ProductListItem = {
  id: string;
  slug: string;
  price: number;
  image_url?: string | null;
  stock: number;
  is_new?: boolean | null;
  is_on_promotion?: boolean | null;
  labels?: string[] | null;
  name: string;
  short_description?: string | null;
  unit?: string | null; // Ajout du champ unit
};

/*
export interface Product {
  id: string;
  name: string;
  description_short?: string | null;
  description_long?: string | null;
  price: number;
  currency?: string | null;
  image_url?: string | null;
  stock: number;
  unit?: string | null;
  category?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  is_new?: boolean | null;
  is_on_promotion?: boolean | null;
  labels?: string[] | null;
}
*/

// Make the function async
export async function generateMetadata({
  params: paramsPromise,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale } = await paramsPromise;
  const t = await getTranslations({ locale, namespace: "ShopPage" });
  return {
    title: t("title"),
  };
}

export default async function ShopPage({ params: paramsPromise }: ShopPageProps) {
  const { locale } = await paramsPromise;

  const t = await getTranslations("ShopPage");
  const tHero = await getTranslations("HeroComponent");

  // --- Fetch Data ---
  // Use Promise.all to fetch hero item and products in parallel for slight performance improvement
  const [heroResult, productsResult, cartResult] = await Promise.allSettled([
    getActiveFeaturedHeroItem(),
    getAllProducts(locale),
    getCart(),
  ]);

  let featuredHeroItem: FeaturedHeroItem | null = null;
  if (heroResult.status === "fulfilled") {
    featuredHeroItem = heroResult.value;
  } else {
    console.error("Error fetching featured hero item for ShopPage:", heroResult.reason);
  }

  let productsData: ProductForShopQuery[] = [];
  let fetchError: Error | null = null;
  let initialCartData: CartData | null = null;
  if (productsResult.status === "fulfilled") {
    productsData = productsResult.value;
  } else {
    fetchError =
      productsResult.reason instanceof Error
        ? productsResult.reason
        : new Error("Unknown error fetching products");
    console.error("Error fetching products for ShopPage:", productsResult.reason);
    productsData = []; // Ensure productsData is an empty array on error
  }

  // --- Handle Cart Fetch --- (Non-critical for page load, but good to log)
  if (cartResult.status === "fulfilled" && isSuccessResult(cartResult.value)) {
    initialCartData = cartResult.value.data;
  } else if (cartResult.status === "fulfilled" && !isSuccessResult(cartResult.value)) {
    // Optionally, you might still want to log this as a warning if it's unexpected
    // console.warn("[ShopPage] Fetching initial cart data returned an error result:", cartResult.value);
  } else if (cartResult.status === "rejected") {
    console.error("[ShopPage] Error fetching initial cart data:", cartResult.reason);
  }

  // --- Handle Product Fetch Error --- (Hero error is non-critical for page load)
  if (fetchError && productsResult.status === "rejected") {
    // Only block page if products fetch fails
    return (
      <MainLayout>
        <div className="container py-8 text-center">
          <h1 className="mb-6 text-3xl font-bold text-red-600">{t("errorFetchingData")}</h1>
          <p>{t("tryAgainLater", { defaultMessage: "Veuillez réessayer plus tard." })}</p>
          {process.env.NODE_ENV === "development" && fetchError && (
            <pre className="mt-4 text-left text-xs text-muted-foreground">{fetchError.message}</pre>
          )}
        </div>
      </MainLayout>
    );
  }

  // --- Prepare Hero Props ---
  let heroPropsForComponent = null;
  if (featuredHeroItem) {
    heroPropsForComponent = {
      heading: featuredHeroItem.productName,
      description: (
        <>
          {featuredHeroItem.customSubtitle
            ? featuredHeroItem.customSubtitle
            : tHero("fallbackDescription")}
        </>
      ),
      imageUrl: featuredHeroItem.heroImageUrl || featuredHeroItem.productImageUrl || undefined,
      imageAlt: featuredHeroItem.productName
        ? `Image de ${featuredHeroItem.productName}`
        : tHero("defaultImageAlt"),
      ctaLabel:
        tHero("ctaLabel", { productName: featuredHeroItem.productName }) ||
        tHero("defaultCtaLabel"),
      ctaLink: {
        pathname: "/product/[slug]" as const,
        params: { slug: featuredHeroItem.productSlug },
      } satisfies React.ComponentProps<typeof Link>["href"],
    };
  } else {
    heroPropsForComponent = {
      heading: tHero("fallbackHeading"),
      description: tHero("fallbackDescription"),
      imageUrl: undefined,
      imageAlt: tHero("fallbackImageAlt"),
      ctaLabel: tHero("fallbackCtaLabel"),
      ctaLink: { pathname: "/products" as const } satisfies React.ComponentProps<
        typeof Link
      >["href"],
    };
  }

  // --- Prepare Product List Items for ShopClientContent ---
  const productListItems: ProductListItem[] = productsData
    .filter((p) => p.price !== null) // Filter out products with null price
    .map((p: ProductForShopQuery) => ({
      id: p.id,
      slug: p.slug,
      name:
        p.product_translations?.[0]?.name ??
        t("defaultProductName", { ns: "translationFallbacks" }),
      short_description: p.product_translations?.[0]?.short_description ?? undefined,
      price: p.price as number, // Cast to number after filtering nulls
      image_url: p.image_url,
      stock: p.stock ?? 0, // Provide default for null stock
      is_new: p.is_new,
      is_on_promotion: p.is_on_promotion,
      labels: p.labels,
      unit: p.unit, // Ajout du mappage pour unit
    }));

  // --- Render Page ---
  return (
    <MainLayout>
      {/* Hero Section, using heroPropsForComponent prepared earlier */}
      <Hero
        heading={heroPropsForComponent.heading}
        description={heroPropsForComponent.description}
        imageUrl={heroPropsForComponent.imageUrl}
        imageAlt={heroPropsForComponent.imageAlt}
        ctaLabel={heroPropsForComponent.ctaLabel}
        ctaLink={heroPropsForComponent.ctaLink}
      />

      <div className="container py-8">
        <h1 className="mb-6 text-3xl font-bold">{t("title")}</h1>
        <ShopClientContent initialProducts={productListItems} initialCart={initialCartData} />
      </div>
    </MainLayout>
  );
}
