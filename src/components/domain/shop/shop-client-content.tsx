"use client";

import React, { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ProductGrid, ProductData } from "@/components/domain/shop/product-grid";
import type { ProductListItem } from "@/app/[locale]/shop/page";
import type { CartData } from "@/types/cart";
import useCartStore from "@/stores/cartStore";

interface ShopClientContentProps {
  initialProducts: ProductListItem[];
  initialCart: CartData | null; // Optional, as cart might be empty or not fetched
}

export const ShopClientContent: React.FC<ShopClientContentProps> = ({
  initialProducts,
  initialCart,
}) => {
  const t = useTranslations("ShopPage");
  const { _setItems, _setIsLoading, _setError } = useCartStore();

  useEffect(() => {
    if (initialCart) {
      _setItems(initialCart.items || []);
      _setIsLoading(false); // Assuming loading is finished
      _setError(null); // Clear any previous errors
    } else {
      // If there's no initial cart (e.g., guest user, first visit, or fetch error server-side),
      // ensure the store reflects a non-loading, non-error, empty state for items.
      // This might already be the default, but explicit can be good.
      // _setItems([]); // Only if you want to force empty if not provided. Current store default is empty.
      _setIsLoading(false);
      _setError(null);
    }
  }, [initialCart, _setItems, _setIsLoading, _setError]);

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
