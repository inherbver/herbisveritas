"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { ProductCard, ProductCardProps } from "./product-card";
import { cn } from "@/lib/utils";

// Define a type for the product data, excluding functions and generated IDs
export type ProductData = Omit<ProductCardProps, "onAddToCart" | "className" | "isLoading"> & {
  id: string | number; // Ensure id is part of the data type expected
  slug: string; // Add slug, anticipating it will be in ProductCardProps
};

export interface ProductGridProps {
  /** Array of product data to display */
  products: ProductData[];
  /** Loading state */
  isLoading?: boolean;
  /** Number of skeleton placeholders to show while loading */
  loadingSkeletons?: number;
  /** Callback function when a product's add to cart button is clicked */
  onAddToCart: (productId: string | number) => void; // Expects the ID
  /** Optional CSS classes for the grid container */
  className?: string;
  /** Optional message when products array is empty */
  noProductsMessage?: string;
  /** Current locale, needed for Link construction */
  locale: string;
}

export function ProductGrid({
  products,
  isLoading = false,
  loadingSkeletons = 8, // Default skeletons adjusted for 4 cols
  onAddToCart,
  className,
  noProductsMessage,
  locale, // Destructure locale
}: ProductGridProps) {
  const t = useTranslations("ProductGrid");

  const gridClasses = cn(
    "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6", // V2: Updated grid cols and gap
    className
  );

  if (isLoading) {
    return (
      <div className={gridClasses}>
        {Array.from({ length: loadingSkeletons }).map((_, index) => (
          // Render the ProductCard in its loading state
          <ProductCard
            key={`skeleton-${index}`}
            isLoading={true}
            id={`skeleton-${index}`}
            title="Loading..."
            imageSrc=""
            imageAlt=""
            price=""
            slug="" // Add dummy slug for skeleton
            locale="" // Add dummy locale for skeleton
            onAddToCart={() => {}}
          />
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="py-10 text-center text-gray-500 dark:text-gray-400">
        <p>{noProductsMessage || t("noProductsFound")}</p>
      </div>
    );
  }

  return (
    <div className={gridClasses}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          {...product} // Spread the product data (now includes id and slug)
          onAddToCart={onAddToCart} // Pass the handler function directly
          locale={locale} // Pass locale down to ProductCard for Link
          // Removed incorrect 'titleId' and 'index' props
        />
      ))}
    </div>
  );
}
