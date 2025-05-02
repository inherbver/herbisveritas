import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MainLayout } from "@/components/layout/main-layout";
// Assume this function exists and fetches a product by its slug for a given locale
import { getProductBySlug } from "@/lib/supabase/queries/products"; // Needs implementation
import ProductDetailDisplay from "@/components/domain/shop/product-detail-display"; // To be created
import { Locale } from "@/i18n-config";

type Props = {
  params: Promise<{ slug: string; locale: Locale }>;
};

// --- Generate Metadata ---
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const t = await getTranslations({ locale, namespace: "ProductDetail" }); // Assuming this namespace exists
  const product = await getProductBySlug(slug, locale); // Fetch product for title

  if (!product) {
    return {
      title: t("productNotFound"), // Add a translation for this
    };
  }

  return {
    title: product.name, // Use product name as title
    description: product.shortDescription || t("defaultDescription"), // Use correct camelCase property
  };
}

// --- Page Component ---
export default async function ProductDetailPage({ params }: Props) {
  const { slug, locale } = await params;
  const product = await getProductBySlug(slug, locale);

  if (!product) {
    notFound(); // Show 404 if product doesn't exist
  }

  // We'll need to adapt the product data structure if necessary
  // for the ProductDetailDisplay component.
  // Let's assume getProductBySlug returns the full product details needed.

  return (
    <MainLayout>
      {/* Container might be needed here or within ProductDetailDisplay */}
      <div className="container py-8">
        {/* Pass the fetched product data to the display component */}
        <ProductDetailDisplay product={product} />
      </div>
    </MainLayout>
  );
}
