import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MainLayout } from "@/components/layout/main-layout";
import { getProductBySlug } from "@/lib/supabase/queries/products";
import ProductDetailDisplay from "@/components/domain/shop/product-detail-display";
import { ProductDetailData } from "@/types/product-types";
import { Locale } from "@/i18n-config";
import { formatPrice } from "@/utils/formatters";

type Props = {
  params: Promise<{ slug: string; locale: Locale }>;
};

// --- Generate Metadata ---
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const t = await getTranslations({ locale, namespace: "ProductDetail" });
  const product = await getProductBySlug(slug, locale);

  if (!product) {
    return {
      title: t("metadata.productNotFound"),
    };
  }

  const translation = product.product_translations?.find((t) => t.locale === locale);

  const pageTitle = `${translation?.name || product.slug} | ${t("metadata.title")}`;
  const pageDescription = translation?.short_description || t("metadata.description");

  return {
    title: pageTitle,
    description: pageDescription,
  };
}

// --- Page Component ---
export default async function ProductDetailPage({ params }: Props) {
  const { slug, locale } = await params;
  const productData = await getProductBySlug(slug, locale);

  if (!productData) {
    notFound();
  }

  const translation = productData.product_translations?.find((t) => t.locale === locale);

  const productForDisplay: ProductDetailData = {
    id: productData.id,
    name: translation?.name ?? productData.slug,
    shortDescription: translation?.short_description,
    description_long: translation?.description_long,
    price: formatPrice(productData.price, locale),
    unit: productData.unit,
    images: productData.image_url
      ? [
          {
            src: productData.image_url,
            alt: `${translation?.name ?? productData.slug} image 1`,
          },
        ]
      : [],
    properties: translation?.properties ?? undefined,
    compositionText: translation?.composition_text ?? undefined,
    usageInstructions: translation?.usage_instructions ?? undefined,
    inciList: productData.inci_list ?? [],
  };

  return (
    <MainLayout>
      <article className="container py-8">
        <ProductDetailDisplay product={productForDisplay} />
      </article>
    </MainLayout>
  );
}
