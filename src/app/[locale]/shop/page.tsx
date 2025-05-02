import { getTranslations } from "next-intl/server";
import { MainLayout } from "@/components/layout/main-layout";
import { createClient } from "@/lib/supabase/server";
import { Metadata } from "next";
import { ShopClientContent } from "@/components/domain/shop/shop-client-content";

type Props = {
  params: { locale: string };
};

// Define the expected shape of the data for product cards on the shop page
export interface ProductListItem {
  id: string;
  slug: string; // Needed for the link
  price: number;
  image_url?: string | null;
  stock: number; // May be needed for 'out of stock' badges etc.
  is_new?: boolean | null;
  is_on_promotion?: boolean | null;
  labels?: string[] | null;
  // Translated fields from the join
  name: string;
  short_description?: string | null;
}

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

export async function generateMetadata(_props: Props): Promise<Metadata> {
  const locale = _props.params.locale;
  const t = await getTranslations({ locale, namespace: "ShopPage" });
  return {
    title: t("title"),
  };
}

export default async function ShopPage(_props: Props) {
  const locale = _props.params.locale; // Get locale from params
  // Fetch translations for the server component (title, errors)
  const t = await getTranslations("ShopPage");

  // Fetch products with join on translations
  const supabase = await createClient();
  // Updated query to fetch slug and join with translations
  const { data: productsData, error } = await supabase
    .from("products")
    .select(
      `
      id,
      slug, 
      price,
      image_url,
      stock,
      is_new,
      is_on_promotion,
      labels,
      product_translations!inner (
        name,
        short_description
      )
    `
    )
    .eq("is_active", true) // Only fetch active products
    .eq("product_translations.locale", locale); // Filter translations by locale

  if (error) {
    console.error("Error fetching products:", error);
    return (
      <MainLayout>
        <div className="container py-8">
          <h1 className="mb-6 text-3xl font-bold">{t("title")}</h1>
          <p className="mt-10 text-center text-red-500">{t("errorFetchingData")}</p>
        </div>
      </MainLayout>
    );
  }

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

  // Map the raw Supabase data to our ProductListItem structure
  // We use 'any' temporarily for the input type, Supabase might provide better types
  const productListItems: ProductListItem[] = productsData.map((p: any) => ({
    id: p.id,
    slug: p.slug,
    price: p.price,
    image_url: p.image_url,
    stock: p.stock,
    is_new: p.is_new,
    is_on_promotion: p.is_on_promotion,
    labels: p.labels,
    name: p.product_translations.name, // Access joined data
    short_description: p.product_translations.short_description, // Access joined data
  }));

  return (
    <MainLayout>
      <div className="container py-8">
        <h1 className="mb-6 text-3xl font-bold">{t("title")}</h1>
        <ShopClientContent initialProducts={productListItems} />
      </div>
    </MainLayout>
  );
}
