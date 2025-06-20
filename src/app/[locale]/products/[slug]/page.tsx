import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MainLayout } from "@/components/layout/main-layout";
import { getProductBySlug } from "@/lib/supabase/queries/products";
import ProductDetailDisplay from "@/components/domain/shop/product-detail-display";
import { ProductDetailData } from "@/types/product-types";
import { Locale } from "@/i18n-config";
import { formatPrice } from "@/lib/utils";

// Define Props type with correct params structure
// Props type for the page component
type Props = {
  params: Promise<{ slug: string; locale: Locale }>; // Ensure params is a Promise
  // searchParams?: { [key: string]: string | string[] | undefined }; // Optional: if you need search params
};

// --- Generate Metadata ---
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params; // This is now correct as params is a Promise
  const t = await getTranslations({ locale, namespace: "ProductDetailModal" });
  const product = await getProductBySlug(slug, locale);

  // Use optional chaining and check for the first translation element
  const translation = product?.product_translations?.find((t) => t.locale === locale);
  if (!product || !translation) {
    return {
      title: t("productNotFound"),
    };
  }

  return {
    title: translation.name,
    description: translation.short_description || t("defaultDescription"),
  };
}

// --- Page Component ---
export default async function ProductDetailPage({ params }: Props) {
  const { slug, locale } = await params; // This is now correct as params is a Promise
  const productData = await getProductBySlug(slug, locale);

  if (!productData) {
    notFound();
  }

  // Find the translation for the current locale
  const translation = productData.product_translations?.find((t) => t.locale === locale);

  // If no specific translation is found for the locale (should ideally be handled by getProductBySlug)
  if (!translation) {
    console.error(`Missing translation data in response for product ${slug} in locale ${locale}`);
    notFound(); // Treat missing translation within the response as an error
  }

  // Map the data for display
  const productForDisplay: ProductDetailData = {
    id: productData.id,
    name: translation.name,
    shortDescription: translation.short_description ?? undefined,
    description_long: translation.description_long ?? undefined,
    price: formatPrice(productData.price, locale),
    unit: productData.unit ?? undefined,
    images: productData.image_url
      ? [
          {
            src: productData.image_url,
            alt: `${translation.name} image 1`, // Use name from translation
          },
        ]
      : [],
    properties: translation.properties ?? undefined,
    compositionText: translation.composition_text ?? undefined,
    usageInstructions: translation.usage_instructions ?? undefined,
    inciList: productData.inci_list ?? [],
  };

  return (
    <MainLayout>
      <div className="container py-8">
        <ProductDetailDisplay product={productForDisplay} />
      </div>
    </MainLayout>
  );
}
