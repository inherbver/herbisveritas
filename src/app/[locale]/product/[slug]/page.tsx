import React from "react";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/supabase/queries/products";
import { Locale } from "@/i18n-config";
import { formatPrice } from "@/lib/utils/formatters";
import ProductDetailDisplay from "@/components/domain/shop/product-detail-display";
import { ProductDetailData } from "@/types/product-types";

interface ProductDetailPageProps {
  params: {
    slug: string;
    locale: string;
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug, locale } = params;

  const productData = await getProductBySlug(slug, locale as Locale);

  if (!productData) {
    notFound();
  }

  const translation = productData.product_translations.find((t) => t.locale === locale);

  if (!translation) {
    console.error(`Missing translation for locale ${locale} and product ${slug}`);
    notFound();
  }

  const productForDisplay: ProductDetailData = {
    id: productData.id,
    name: translation.name ?? "Nom indisponible",
    shortDescription: translation.short_description,
    description_long: translation.description_long,
    unit: productData.unit,
    price: formatPrice(productData.price, locale),
    // Map image_url to the images array expected by ProductDetailData
    images: productData.image_url
      ? [{ src: productData.image_url, alt: translation.name ?? productData.slug }]
      : undefined, // Assign undefined if no image URL
    // Map properties, converting null to undefined
    properties: translation.properties ?? undefined,
    // Map compositionText, converting null to undefined
    compositionText: translation.composition_text ?? undefined,
    inciList: productData.inci_list ?? [], // Ensure inciList is always an array
    // Map usageInstructions, converting null to undefined
    usageInstructions: translation.usage_instructions ?? undefined,
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Pass the transformed data without locale */}
      <ProductDetailDisplay product={productForDisplay} />
    </div>
  );
}
