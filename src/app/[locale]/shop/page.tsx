import { getTranslations } from "next-intl/server";
import { MainLayout } from "@/components/layout/main-layout";
import { type Metadata } from "next";
import { ShopClientContent } from "@/components/domain/shop/shop-client-content";
import { getAllProducts, ProductForShopQuery } from "@/lib/supabase/queries/products";
import { Locale } from "@/i18n-config";
import { ProductListItem } from "@/types/product-types";

// Define Props type if not already defined globally
type Props = {
  params: { locale: string };
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
export async function generateMetadata(_props: Props): Promise<Metadata> {
  // Explicitly await params before accessing properties
  const { locale } = await Promise.resolve(_props.params);
  const t = await getTranslations({ locale, namespace: "ShopPage" });
  return {
    title: t("title"),
  };
}

export default async function ShopPage(_props: Props) {
  // Await the params promise before accessing its properties
  // Assert the type to Locale
  const { locale } = (await _props.params) as { locale: Locale };

  // Fetch translations for the server component (title, errors)
  const t = await getTranslations("ShopPage");

  // --- Data Fetching ---
  let productsData: ProductForShopQuery[];
  let fetchError: Error | null = null; // Initialize fetchError explicitly as Error | null

  try {
    // Use the new function to fetch products with translations
    // Pass the correctly typed locale
    productsData = await getAllProducts(locale);
  } catch (error) {
    // Comment out error log for production
    // console.error("ShopPage: Failed to fetch products:", error);
    fetchError = error instanceof Error ? error : new Error("Unknown fetch error"); // Assign caught error
    // Assign empty array to avoid further errors down the line if fetchError is handled
    productsData = [];
  }

  // --- Handle Fetch Error ---
  // Render error message if fetching failed
  if (fetchError) {
    return (
      <MainLayout>
        <div className="container py-8 text-center">
          <h1 className="mb-6 text-3xl font-bold text-red-600">{t("errorFetchingData")}</h1>
          <p>{t("tryAgainLater", { defaultMessage: "Veuillez réessayer plus tard." })}</p>
          {/* Optional: Log error details for debugging in development? */}
          {process.env.NODE_ENV === "development" && (
            <pre className="mt-4 text-left text-xs text-muted-foreground">{fetchError.message}</pre>
          )}
        </div>
      </MainLayout>
    );
  }

  // --- Handle No Products Found (after successful fetch) ---
  // Check if productsData is empty *after* handling fetch error
  if (!productsData || productsData.length === 0) {
    return (
      <MainLayout>
        <div className="container py-8">
          <h1 className="mb-6 text-3xl font-bold">{t("title")}</h1>
          <p className="mt-10 text-center">{t("noProductsFound")}</p>
        </div>
      </MainLayout>
    );
  }

  // Map the raw Supabase data (now typed with ProductForShopQuery) to ProductListItem
  const productListItems: ProductListItem[] = productsData.map((p: ProductForShopQuery) => {
    // Extract translation safely
    const translation =
      p.product_translations && p.product_translations.length > 0
        ? p.product_translations[0]
        : null;

    return {
      id: p.id,
      slug: p.slug,
      price: p.price, // Price directly from product
      image_url: p.image_url, // Image URL directly from product
      stock: p.stock, // Stock directly from product
      is_new: p.is_new,
      is_on_promotion: p.is_on_promotion,
      labels: p.labels,
      // Use translated name and description, provide fallbacks
      name: translation?.name || "Nom Indisponible",
      short_description: translation?.short_description || undefined,
    };
  });

  return (
    <MainLayout>
      <div className="container py-8">
        <h1 className="mb-6 text-3xl font-bold">{t("title")}</h1>
        <ShopClientContent initialProducts={productListItems} />
      </div>
    </MainLayout>
  );
}
