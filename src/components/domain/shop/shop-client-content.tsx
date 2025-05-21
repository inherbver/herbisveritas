"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { ProductGrid, ProductData } from "@/components/domain/shop/product-grid";
import type { ProductListItem } from "@/app/[locale]/shop/page";

interface ShopClientContentProps {
  initialProducts: ProductListItem[];
}

export const ShopClientContent: React.FC<ShopClientContentProps> = ({ initialProducts }) => {
  const t = useTranslations("ShopPage");

  const productGridData: ProductData[] = initialProducts
    .filter((product) => product.price !== null)
    .map((product) => {
      const priceAsNumber: number = product.price as number;

      return {
        id: product.id,
        title: product.name,
        price: priceAsNumber,
        imageSrc: product.image_url || "/placeholder-image.png",
        imageAlt: product.name || "Product image",
        slug: product.slug,
        // Ajout des nouveaux champs
        is_new: product.is_new,
        is_on_promotion: product.is_on_promotion,
        short_description: product.short_description,
        unit: product.unit,
      };
    });

  if (!productGridData || productGridData.length === 0) {
    return <p className="mt-10 text-center">{t("noProductsFound")}</p>;
  }

  return <ProductGrid products={productGridData} />;
};
