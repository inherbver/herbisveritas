"use client";

import React from "react";
import { ProductGrid, ProductData } from "@/components/domain/shop/product-grid";
// Assuming the Product interface is exported from the page or a types file
// Adjust the import path if Product interface is defined elsewhere
import { ProductListItem } from "@/app/[locale]/shop/page";
import { useParams } from "next/navigation"; // Needed to get locale for Link href
import { toast } from "sonner"; // Correct import for toast
import { useTranslations } from "next-intl"; // Correct hook name

type ShopClientContentProps = {
  initialProducts: ProductListItem[]; // Receive mapped products with slug and translations
};

export const ShopClientContent: React.FC<ShopClientContentProps> = ({ initialProducts }) => {
  const params = useParams(); // Hook to get URL params
  const locale = params.locale as string; // Extract locale
  const t = useTranslations("shop"); // Correct usage: assign directly

  // --- Data Transformation ---
  // Ensure ProductData type in product-grid.ts includes 'slug'
  const productGridData: ProductData[] = initialProducts.map((product) => {
    // Ensure imageSrc points to the existing .webp files
    const imageBaseUrl = product.image_url?.replace(/\.[^/.]+$/, "") ?? ""; // Remove original extension
    const imageSrc = imageBaseUrl ? `${imageBaseUrl}.webp` : ""; // Add .webp extension

    return {
      id: product.id,
      slug: product.slug, // Pass slug down
      locale: locale, // Pass locale down
      title: product.name,
      imageSrc: imageSrc, // Use the corrected .webp path
      imageAlt: product.name ?? "Product image",
      price: `${product.price.toFixed(2)} EUR`, // Assume EUR if currency isn't passed (it's not in ProductListItem)
    };
  });

  // --- Handlers defined in the Client Component ---
  const handleAddToCart = (productId: string | number) => {
    // console.log(`Adding product ${productId} to cart (Client Handler).`);
    toast.success(t("addedToCartFeedback", { productName: productId })); // Example feedback
  };

  // You might want to handle loading/empty states here as well,
  // or pass them down from the server component if preferred.
  if (!productGridData || productGridData.length === 0) {
    // You might want a shared translation hook/provider for client components
    return <p className="mt-10 text-center">No products found.</p>;
  }

  return (
    <ProductGrid
      products={productGridData}
      onAddToCart={handleAddToCart}
      locale={locale} // Pass locale for Link construction
      // Pass other necessary props like isLoading if managed here
    />
  );
};
