"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Image from "next/image"; // Assuming Next.js Image component for product images
import { useTranslations } from "next-intl";
import { QuantityInput } from "./quantity-input"; // Import the new component
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import Tabs components

// Placeholder for detailed product data - Will need refinement
export interface ProductDetailData {
  id: string | number;
  name: string;
  shortDescription?: string;
  price: string;
  images: { src: string; alt: string }[]; // Assuming multiple images
  // Add other fields later: fullDescription, inci, usage, etc.
  properties?: string;
  inci?: string;
  usageInstructions?: string;
}

interface ProductDetailModalProps {
  product: ProductDetailData | null; // Product data or null if none selected
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddToCart: (productId: string | number, quantity: number) => void; // Add quantity
}

export function ProductDetailModal({
  product,
  isOpen,
  onOpenChange,
  onAddToCart,
}: ProductDetailModalProps) {
  const t = useTranslations("ProductDetailModal"); // Assuming translations needed
  const [quantity, setQuantity] = React.useState(1);

  // Reset quantity when modal opens or product changes
  React.useEffect(() => {
    if (isOpen) {
      setQuantity(1);
    }
  }, [isOpen, product]);

  if (!product) {
    return null; // Don't render anything if no product data
  }

  const handleAddToCart = () => {
    onAddToCart(product.id, quantity);
    onOpenChange(false); // Close modal after adding to cart (optional)
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-[80%] lg:max-w-[60%] xl:max-w-[50%]">
        {/* Using Grid for two main columns */}
        <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
          {/* Left Column: Image Carousel Placeholder */}
          <div className="bg-muted/30 flex min-h-[300px] items-center justify-center p-6 md:min-h-[450px]">
            {product.images && product.images.length > 0 ? (
              // Basic image display for now - Replace with Carousel later
              <Image
                src={product.images[0].src}
                alt={product.images[0].alt}
                width={400}
                height={400}
                className="max-h-[400px] w-auto object-contain"
              />
            ) : (
              <div className="text-muted-foreground">{t("noImage")}</div>
            )}
          </div>

          {/* Right Column: Details, Actions, Tabs Placeholder */}
          <div className="flex flex-col p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="mb-1 font-serif text-2xl">{product.name}</DialogTitle>
              {product.shortDescription && (
                <DialogDescription className="text-base text-muted-foreground">
                  {product.shortDescription}
                </DialogDescription>
              )}
            </DialogHeader>

            <div className="mb-6 text-3xl font-bold text-green-700 dark:text-green-500">
              {product.price} {/* Assuming price is pre-formatted */}
            </div>

            {/* Quantity Selector - Using the new component */}
            <div className="mb-6 flex items-center space-x-3">
              <label htmlFor={`quantity-${product.id}`} className="sr-only text-sm font-medium">
                {/* Screen reader only label, visible label handled by QuantityInput's aria-labels */}
                {t("quantity")}
              </label>
              <QuantityInput
                id={`quantity-${product.id}`}
                value={quantity}
                onChange={setQuantity} // Pass the state setter directly
                // min={1} max={99} // Defaults are likely fine, but can override
              />
            </div>

            {/* Add to Cart Button */}
            <Button size="lg" className="mb-8 w-full" onClick={handleAddToCart}>
              {t("addToCart")}
            </Button>

            {/* Tabs Section Implementation */}
            <Tabs defaultValue="properties" className="mt-auto w-full">
              <TabsList className="mb-4 grid w-full grid-cols-3">
                <TabsTrigger value="properties">{t("propertiesTab")}</TabsTrigger>
                <TabsTrigger value="composition">{t("compositionTab")}</TabsTrigger>
                <TabsTrigger value="usage">{t("usageTab")}</TabsTrigger>
              </TabsList>
              <TabsContent
                value="properties"
                className="max-h-40 overflow-y-auto pr-2 text-sm text-muted-foreground"
              >
                {" "}
                {/* Added scroll */}
                {/* Content for Properties Tab */}
                <p>{product.properties || t("noProperties")}</p>
              </TabsContent>
              <TabsContent
                value="composition"
                className="max-h-40 overflow-y-auto pr-2 text-sm text-muted-foreground"
              >
                {" "}
                {/* Added scroll */}
                {/* Content for Composition Tab */}
                <h4 className="mb-2 font-semibold">{t("inciList")}</h4>
                <p className="break-words text-xs">{product.inci || t("noInci")}</p>
              </TabsContent>
              <TabsContent
                value="usage"
                className="max-h-40 overflow-y-auto pr-2 text-sm text-muted-foreground"
              >
                {" "}
                {/* Added scroll */}
                {/* Content for Usage Tab */}
                <p>{product.usageInstructions || t("noUsage")}</p>
              </TabsContent>
            </Tabs>

            {/* Optional Footer for close button if needed, but usually handled by Dialog overlay/X */}
            {/* <DialogFooter className="sm:justify-start">
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  {t('close')}
                </Button>
              </DialogClose>
            </DialogFooter> */}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
