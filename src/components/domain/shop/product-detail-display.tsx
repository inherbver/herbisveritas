"use client";

import React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { QuantityInput } from "./quantity-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Import the data type from the modal file for now
import { ProductDetailData } from "./product-detail-modal";

interface ProductDetailDisplayProps {
  product: ProductDetailData;
  // Add other props if needed, e.g., onAddToCart handler from the page
  // onAddToCart: (productId: string | number, quantity: number) => void;
}

export default function ProductDetailDisplay({
  product,
}: ProductDetailDisplayProps) {
  // Use a relevant namespace, assuming "ProductDetail" exists or reusing "ProductDetailModal"
  const t = useTranslations("ProductDetailModal"); // Or "ProductDetail"
  const [quantity, setQuantity] = React.useState(1);

  // Simplified Add to Cart Handler for the page context
  const handleAddToCart = () => {
    // TODO: Implement actual add to cart logic for the page
    // This might involve calling a server action, updating context/store, etc.
    console.log(`Adding ${quantity} of product ${product.id} to cart.`);
    // Example: onAddToCart(product.id, quantity); // If passed as prop
  };

  // No need for the !product check if page.tsx handles notFound()
  // But good as a fallback if props could be null/undefined
  if (!product) {
    return <div>{t("productNotFound", { defaultMessage: "Produit non trouvé." })}</div>; // Add default message
  }

  return (
    // This div replaces the DialogContent
    // Consider adding padding or margins if needed, or handle in page.tsx container
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-12">
      {/* Left Column: Image */}
      <div className="bg-muted/30 flex min-h-[300px] items-center justify-center rounded-lg p-6 md:min-h-[450px] lg:min-h-[500px]">
        {product.images && product.images.length > 0 ? (
          <Image
            src={product.images[0].src}
            alt={product.images[0].alt}
            width={500} // Increased size for page view
            height={500} // Increased size for page view
            className="max-h-[500px] w-auto object-contain"
            priority // Prioritize loading the main product image
          />
        ) : (
          <div className="text-muted-foreground">{t("noImage")}</div>
        )}
        {/* TODO: Consider adding an image gallery/carousel if multiple images exist */}
      </div>

      {/* Right Column: Details, Actions, Tabs */}
      <div className="flex flex-col pt-6 md:pt-0">
        {/* Product Title */}
        <h1 className="mb-2 font-serif text-3xl lg:text-4xl">{product.name}</h1>
        {/* Short Description */}
        {product.shortDescription && (
          <p className="mb-4 text-lg text-muted-foreground">{product.shortDescription}</p>
        )}

        {/* Price */}
        <div className="mb-6 text-3xl font-semibold text-green-700 dark:text-green-500">
          {product.price}
          {/* TODO: Add logic for discounts/original price if needed */}
        </div>

        {/* Quantity Input */}
        <div className="mb-6 flex items-center space-x-3">
          <label htmlFor={`quantity-${product.id}`} className="text-sm font-medium">
            {t("quantity")}
          </label>
          <QuantityInput
            id={`quantity-${product.id}`}
            value={quantity}
            onChange={setQuantity}
          />
        </div>

        {/* Add to Cart Button */}
        <Button size="lg" className="mb-8 w-full md:w-auto" onClick={handleAddToCart}>
          {t("addToCart")}
        </Button>

        {/* Information Tabs */}
        <Tabs defaultValue="properties" className="w-full">
          <TabsList className="mb-4 grid w-full grid-cols-3">
            <TabsTrigger value="properties">{t("propertiesTab")}</TabsTrigger>
            <TabsTrigger value="composition">{t("compositionTab")}</TabsTrigger>
            <TabsTrigger value="usage">{t("usageTab")}</TabsTrigger>
          </TabsList>
          <TabsContent
            value="properties"
            className="prose prose-sm dark:prose-invert max-w-none overflow-y-auto pr-2 text-muted-foreground" // Added prose classes
          >
            {/* Use dangerouslySetInnerHTML if properties contain HTML, otherwise render directly */}
             <p>{product.properties || t("noProperties")}</p>
          </TabsContent>
          <TabsContent
            value="composition"
            className="prose prose-sm dark:prose-invert max-w-none overflow-y-auto pr-2 text-muted-foreground"
          >
            <h4 className="mb-2 font-semibold">{t("inciList")}</h4>
            <p className="break-words text-xs">{product.inci || t("noInci")}</p>
          </TabsContent>
          <TabsContent
            value="usage"
            className="prose prose-sm dark:prose-invert max-w-none overflow-y-auto pr-2 text-muted-foreground"
          >
             <p>{product.usageInstructions || t("noUsage")}</p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
