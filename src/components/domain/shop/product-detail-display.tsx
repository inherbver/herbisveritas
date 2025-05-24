"use client";

import React, { useState, useEffect, useActionState } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion"; // Import motion
import { QuantityInput } from "./quantity-input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Removed TabsContent
import { AspectRatio } from "@/components/ui/aspect-ratio";
// Import the data type from the modal file for now
import { ProductDetailData } from "@/types/product-types"; // Import from centralized location
import { addItemToCart } from "@/actions/cartActions";
import type { CartActionResult } from "@/lib/cart-helpers";
import type { CartData } from "@/types/cart";
import { toast } from "sonner"; // Added toast import
import { Button } from "@/components/ui/button"; // Ensure Button is imported
import useCartStore from "@/stores/cartStore"; // Import cart store
import type { CartItem } from "@/types/cart"; // Import CartItem type

// Define animation variants for the main container if needed, or apply directly
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

interface ProductDetailDisplayProps {
  product: ProductDetailData;
  // Add other props if needed, e.g., onAddToCart handler from the page
  // onAddToCart: (productId: string | number, quantity: number) => void;
}

// Internal Submit Button component using useFormStatus
function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("ProductDetailModal"); // Changed namespace

  return (
    // Use Button component with asChild
    <Button
      type="submit"
      size="lg"
      className="w-full" // Button handles sizing and base styles
      disabled={pending}
      aria-disabled={pending}
      asChild // Pass the underlying component via children
    >
      {/* Apply motion to the underlying button element */}
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        {/* Use correct keys from the JSON */}
        {pending ? t("addingToCart") : t("addToCart")}
      </motion.button>
    </Button>
  );
}

export default function ProductDetailDisplay({ product }: ProductDetailDisplayProps) {
  // Use a relevant namespace, assuming "ProductDetail" exists or reusing "ProductDetailModal"
  const t = useTranslations("ProductDetailModal"); // Or "ProductDetail"
  const tDisplay = useTranslations("ProductDetailDisplay"); // For labels specific to this component
  const [activeTab, setActiveTab] = useState("description");
  const [quantity, setQuantity] = useState(1);
  const addItemToCartStore = useCartStore((state) => state.addItem); // Get addItem from store

  // Initial state for the form
  const initialState: CartActionResult<CartData | null> = {
    success: false,
    message: "",
    error: "Initial state", // Requis pour GeneralErrorResult
  };
  // useActionState hook to manage the action's state
  const [state, formAction] = useActionState(addItemToCart, initialState);

  // Show toast notification based on form state and update cart store
  useEffect(() => {
    if (state.message) {
      if (state.success) {
        toast.success(state.message);

        // Accéder aux données seulement si c'est un succès
        if (product && "data" in state) {
          const itemToAdd: Omit<CartItem, "quantity"> = {
            productId: String(product.id),
            name: product.name,
            price: parseFloat(product.price.replace(/[^0-9.,]/g, "").replace(",", ".")),
            image:
              product.images && product.images.length > 0
                ? product.images[0].src
                : "/placeholder.png",
          };
          addItemToCartStore(itemToAdd, quantity);
        }
        // Optionally reset quantity displayed on the page
        // setQuantity(1);
      } else {
        toast.error(state.message);
      }
    }
  }, [state, product, quantity, addItemToCartStore]);

  if (!product) {
    return <div>{t("productNotFound", { defaultMessage: "Produit non trouvé." })}</div>; // Add default message
  }

  return (
    // Use <section> for the main component block
    <motion.section
      className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-12"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Left Column: Image wrapped in <figure> */}
      {/* Add shadow and overflow-hidden for rounded corners on figure */}
      <figure className="overflow-hidden rounded-lg shadow-md">
        {/* Enforce 1:1 ratio using AspectRatio */}
        <AspectRatio ratio={1 / 1} className="bg-muted/30">
          {product.images && product.images.length > 0 ? (
            <Image
              src={product.images[0].src}
              alt={product.images[0].alt}
              fill // Make image fill the AspectRatio container
              sizes="(max-width: 768px) 100vw, 50vw" // Ajout de la propriété sizes
              className="object-cover" // Cover the area, cropping if needed
              priority // Prioritize loading the main product image
            />
          ) : (
            // Center the placeholder text within the AspectRatio
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              {t("noImage")}
            </div>
          )}
        </AspectRatio>
        {/* TODO: Consider adding an image gallery/carousel if multiple images exist */}
      </figure>
      {/* Right Column: Details, Actions, Tabs */}
      {/* Use <article> for the main product information and actions */}
      <article className="flex flex-col pt-6 md:pt-0">
        {/* Product Title */}
        <h1 className="mb-1 font-serif text-3xl font-semibold text-foreground lg:text-4xl">
          {product.name}
        </h1>
        {/* Unit: Smaller, muted, under title */}
        {product.unit && <p className="mb-4 text-sm text-muted-foreground">({product.unit})</p>}
        {/* Short Description */}
        {product.shortDescription && (
          <p className="mb-4 text-base text-muted-foreground">{product.shortDescription}</p>
        )}
        {/* Price */}
        <div className="mb-1 text-2xl font-bold text-primary">{product.price}</div>
        {/* Tax Label: Smaller, muted, under price */}
        <div className="mb-6 text-xs text-muted-foreground">{tDisplay("taxInclusiveLabel")}</div>

        {/* Quantity Input */}
        <div className="mb-6 flex items-center space-x-3">
          <label htmlFor={`quantity-${product.id}`} className="text-sm font-medium">
            {t("quantity")}
          </label>
          <QuantityInput id={`quantity-${product.id}`} value={quantity} onChange={setQuantity} />
        </div>

        {/* Form to handle adding to cart */}
        <form action={formAction} className="w-full">
          {/* Hidden inputs to pass data to the server action */}
          <input type="hidden" name="productId" value={product.id} />
          <input type="hidden" name="quantity" value={quantity} />
          <SubmitButton />
        </form>

        {/* Information Tabs */}
        {/* We need to manage the active tab state for AnimatePresence */}
        {/* defaultValue sets initial, onValueChange updates state */}
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Update grid columns to 4 */}
          <TabsList className="mb-4 grid w-full grid-cols-4">
            {/* Apply active/inactive styles */}
            <TabsTrigger
              value="description"
              className="relative data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              {t("descriptionTab")}
              {activeTab === "description" && (
                <motion.div
                  layoutId="active-tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </TabsTrigger>
            <TabsTrigger
              value="properties"
              className="relative data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              {t("propertiesTab")}
              {activeTab === "properties" && (
                <motion.div
                  layoutId="active-tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </TabsTrigger>
            <TabsTrigger
              value="composition"
              className="relative data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              {t("compositionTab")}
              {activeTab === "composition" && (
                <motion.div
                  layoutId="active-tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </TabsTrigger>
            <TabsTrigger
              value="usage"
              className="relative data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              {t("usageTab")}
              {activeTab === "usage" && (
                <motion.div
                  layoutId="active-tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </TabsTrigger>
          </TabsList>
          {/* Animation container - Use relative for absolute positioning of motion divs */}
          <div className="relative overflow-hidden">
            <AnimatePresence initial={false} mode="wait">
              {/* Description Tab */}
              {activeTab === "description" && (
                <motion.div
                  key="description"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="prose prose-sm dark:prose-invert max-w-none overflow-y-auto pr-2 text-muted-foreground"
                >
                  <p>{product.description_long || t("noDescription")}</p>
                </motion.div>
              )}

              {/* Properties Tab */}
              {activeTab === "properties" && (
                <motion.div
                  key="properties"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="max-w-none space-y-2 overflow-y-auto pr-2"
                >
                  {product.properties ? (
                    <>
                      {product.properties
                        .split(/\n|\\n/)
                        .map((line) => line.trim())
                        .filter((line) => line.length > 0)
                        .map((line, index) => (
                          <div
                            key={index}
                            className="bg-muted/50 rounded-md p-3 text-sm text-foreground"
                          >
                            {line.replace(/^\*\s*/, "")}
                          </div>
                        ))}
                    </>
                  ) : (
                    <p>{t("noProperties")}</p>
                  )}
                </motion.div>
              )}

              {/* Composition Tab */}
              {activeTab === "composition" && (
                <motion.div
                  key="composition"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="max-w-none space-y-4 overflow-y-auto pr-2"
                >
                  {product.compositionText && (
                    <div className="mb-4">
                      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-muted-foreground">
                        {product.compositionText}
                      </div>
                    </div>
                  )}
                  <h4 className="mb-1 text-sm font-semibold">{t("inciList")}</h4>
                  {product.inciList && product.inciList.length > 0 ? (
                    <div className="grid grid-cols-1 gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
                      {product.inciList.map((item, index) => (
                        <span key={index}>{item}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs italic">{t("noInci")}</p>
                  )}
                  {!product.compositionText &&
                    (!product.inciList || product.inciList.length === 0) && (
                      <p>{t("noCompositionText")}</p>
                    )}
                </motion.div>
              )}

              {/* Usage Tab */}
              {activeTab === "usage" && (
                <motion.div
                  key="usage"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="prose prose-sm dark:prose-invert max-w-none overflow-y-auto pr-2 text-muted-foreground"
                >
                  <p>{product.usageInstructions || t("noUsage")}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Tabs>
      </article>
    </motion.section>
  );
}
