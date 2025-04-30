import React from "react";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/mocks/products";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils/formatters";

interface ProductDetailPageProps {
  params: {
    slug: string;
    locale: string;
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const awaitedParams = await params;
  const { slug, locale } = awaitedParams;

  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const t = await getTranslations({ locale });

  const localizedLongDescription =
    product.longDescription[locale as keyof typeof product.longDescription] ||
    product.longDescription.en;

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="overflow-hidden">
        {product.imageUrl && (
          <div className="relative h-64 w-full bg-muted sm:h-96">
            <Image
              src={product.imageUrl}
              alt={product.title}
              layout="fill"
              objectFit="cover"
              priority
            />
          </div>
        )}
        <CardHeader>
          <CardTitle className="text-3xl font-bold">{product.title}</CardTitle>
          <p className="mt-2 text-2xl font-semibold text-primary">
            {formatPrice(product.price, locale)}
          </p>
        </CardHeader>
        <CardContent>
          <CardDescription className="mt-4 text-lg">{localizedLongDescription}</CardDescription>
          <div className="mt-6">
            <p>
              <span className="font-semibold">{t("ProductDetail.categoryLabel")}:</span>{" "}
              {product.category.name}
            </p>
            {product.isOutOfStock && (
              <p className="mt-2 font-semibold text-destructive">
                {t("ProductDetail.outOfStockLabel")}
              </p>
            )}
            {/* TODO: Add 'Add to Cart' button */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
