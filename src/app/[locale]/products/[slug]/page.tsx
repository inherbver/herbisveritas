import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MainLayout } from "@/components/layout/main-layout";
import { getProductBySlug } from "@/lib/supabase/queries/products";
import ProductDetailDisplay from "@/components/domain/shop/product-detail-display";
import { ProductDetailData } from "@/components/domain/shop/product-detail-modal";
import { Locale } from "@/i18n-config";
import { formatPrice } from "@/lib/utils";

type Props = {
  params: Promise<{ slug: string; locale: Locale }>;
};

// --- Generate Metadata ---
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const t = await getTranslations({ locale, namespace: "ProductDetailModal" });
  const product = await getProductBySlug(slug, locale);

  // Use optional chaining and check for the first translation element
  const translation = product?.product_translations?.[0];
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
  const { slug, locale } = await params;
  const productData = await getProductBySlug(slug, locale);

  if (!productData) {
    notFound();
  }

  // Access the first translation (if it exists)
  const translation = productData.product_translations?.[0];

  // Although getProductBySlug should return null if no product OR matching translation is found,
  // double-check translation existence for robustness.
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
