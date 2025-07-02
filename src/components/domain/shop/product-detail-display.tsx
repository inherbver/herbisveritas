"use client";

import React, { useState, useEffect, useActionState } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion"; // Import motion
import { QuantityInput } from "./quantity-input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Removed TabsContent

// Import the data type from the modal file for now
import { ProductDetailData } from "@/types/product-types"; // Import from centralized location
import { addItemToCart } from "@/actions/cartActions";
import type { CartActionResult } from "@/lib/cart-helpers";
import type { CartData } from "@/types/cart";
import { toast } from "sonner"; // Added toast import
import { Button } from "@/components/ui/button"; // Ensure Button is imported
import useCartStore from "@/stores/cartStore"; // Import cart store

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
  const t = useTranslations("ProductDetailModal");

  return (
    <Button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="inline-flex h-12 w-[200px] items-center justify-center rounded-2xl bg-secondary px-6 font-semibold text-secondary-foreground shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-foreground focus:ring-offset-2"
    >
      {pending ? t("addingToCart") : t("addToCart")}
    </Button>
  );
}

export default function ProductDetailDisplay({ product }: ProductDetailDisplayProps) {
  const tModal = useTranslations("ProductDetailModal");
  const tProdDetail = useTranslations("ProductDetail");
  const tQuantity = useTranslations("QuantityInput");
  const tGlobal = useTranslations("Global"); // For generic error messages
  const [activeTab, setActiveTab] = useState("description");
  const [quantity, setQuantity] = useState(1);
  const _setItems = useCartStore((state) => state._setItems); // Get _setItems for store updates

  // Initial state for the form, memoized
  const initialState: CartActionResult<CartData | null> = React.useMemo(
    () => ({
      success: false,
      message: "",
      error: "Initial state", // Requis pour GeneralErrorResult
    }),
    []
  );
  // useActionState hook to manage the action's state
  const [state, formAction] = useActionState(addItemToCart, initialState);

  // Show toast notification based on form state and update cart store
  useEffect(() => {
    // Only process if the state has changed from the initial 'pending' like state.
    // Check if success is explicitly false (an error occurred) or true (a success occurred).
    // The initial state has success: false, but we also check message/error to avoid reacting to it.
    if (
      state.success === true ||
      (state.success === false &&
        (state.message ||
          ("error" in state && state.error !== initialState.error) ||
          "errors" in state))
    ) {
      if (state.success) {
        toast.success(state.message || tModal("itemAddedSuccess"));
        if (state.data?.items) {
          _setItems(state.data.items);
        }
        // Optionally reset quantity displayed on the page
        // setQuantity(1);
      } else {
        // Handle errors
        let errorMessage = state.message; // General message if present
        if (!errorMessage && "error" in state && state.error) {
          errorMessage = state.error; // Specific error string
        }
        if (
          !errorMessage &&
          "errors" in state &&
          state.errors &&
          Object.keys(state.errors).length > 0
        ) {
          // Take the first field error message
          const firstFieldError = Object.values(state.errors).flat()[0];
          if (firstFieldError) {
            errorMessage = firstFieldError;
          }
        }
        toast.error(errorMessage || tGlobal("genericError"));
      }
    }
  }, [state, tModal, _setItems, initialState, tGlobal]); // Ensure all reactive dependencies used in the effect are listed

  if (!product) {
    return <div>{tProdDetail("productNotFound", { defaultMessage: "Produit non trouvé." })}</div>; // Add default message
  }

  return (
    // Use <section> for the main component block
    <motion.section
      className="grid items-start gap-8 bg-card md:grid-cols-2 lg:gap-16"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Left Column: Image wrapped in <figure> */}
      {/* Add shadow and overflow-hidden for rounded corners on figure */}
      <figure className="relative h-full w-full overflow-hidden rounded-2xl shadow-lg">
        {product.images && product.images.length > 0 ? (
          <Image
            src={product.images[0].src}
            alt={product.images[0].alt}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover object-bottom"
            priority
          />
        ) : (
          <div className="bg-muted/30 flex h-full w-full items-center justify-center rounded-2xl">
            {tModal("noImage")}
          </div>
        )}
      </figure>
      {/* Right Column: Details, Actions, Tabs */}
      {/* Use <article> for the main product information and actions */}
      <article className="flex h-full flex-col justify-center p-8">
        {/* Product Title */}
        <h1 className="mb-2 font-serif text-3xl font-semibold text-foreground">{product.name}</h1>
        {/* Unit: Smaller, muted, under title */}
        {product.unit && (
          <p className="mb-4 font-sans text-sm italic text-muted-foreground">({product.unit})</p>
        )}
        {/* Short Description */}
        {product.shortDescription && (
          <p className="text-foreground/90 mb-6 font-sans text-base leading-relaxed">
            {product.shortDescription}
          </p>
        )}
        <div className="my-8 rounded-2xl bg-primary-foreground p-8 shadow-lg">
          <div className="grid grid-cols-2 items-center gap-4">
            {/* Price */}
            <div className="">
              <div className="mb-1 text-3xl font-bold text-secondary">{product.price}</div>
              <div className="text-xs text-muted-foreground">
                {tProdDetail("taxInclusiveLabel")}
              </div>
            </div>

            {/* Quantity Input */}
            <div className="flex items-center justify-end space-x-3">
              <label htmlFor={`quantity-${product.id}`} className="text-sm font-medium">
                {tQuantity("quantity")}
              </label>
              <QuantityInput
                id={`quantity-${product.id}`}
                value={quantity}
                onChange={setQuantity}
              />
            </div>
          </div>

          {/* Form to handle adding to cart */}
          <form action={formAction} className="mt-6 flex justify-center">
            {/* Hidden inputs to pass data to the server action */}
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="quantity" value={quantity} />
            <SubmitButton />
          </form>
        </div>

        {/* Information Tabs */}
        {/* We need to manage the active tab state for AnimatePresence */}
        {/* defaultValue sets initial, onValueChange updates state */}
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="mt-6 w-full">
          {/* Update grid columns to 4 */}
          <TabsList className="mb-4 flex flex-wrap justify-start gap-2">
            {/* Apply active/inactive styles */}
            <TabsTrigger
              value="description"
              className="relative font-serif data-[state=active]:text-foreground"
            >
              {tModal("descriptionTab")}
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
              className="relative font-serif data-[state=active]:text-foreground"
            >
              {tModal("propertiesTab")}
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
              className="relative font-serif data-[state=active]:text-foreground"
            >
              {tModal("compositionTab")}
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
              className="relative font-serif data-[state=active]:text-foreground"
            >
              {tModal("usageTab")}
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
          <div className="relative max-h-60 overflow-y-auto rounded-lg bg-primary-foreground p-8">
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
                  <p>{product.description_long || tModal("noDescription")}</p>
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
                  className="max-w-none overflow-y-auto pr-2"
                >
                  {product.properties ? (
                    <ul className="space-y-2">
                      {product.properties
                        .split(/\n|\\n/)
                        .map((line) => line.trim())
                        .filter((line) => line.length > 0)
                        .map((line, index) => (
                          <li key={index} className="flex items-start text-sm text-foreground">
                            <span className="mr-2 mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary"></span>
                            <span>{line.replace(/^\*\s*/, "")}</span>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p>{tModal("noProperties")}</p>
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
                  <h4 className="mb-1 text-sm font-semibold">{tModal("inciList")}</h4>
                  {product.inciList && product.inciList.length > 0 ? (
                    <ul className="grid grid-cols-1 gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
                      {product.inciList.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs italic">{tModal("noInci")}</p>
                  )}
                  {!product.compositionText &&
                    (!product.inciList || product.inciList.length === 0) && (
                      <p>{tModal("noCompositionText")}</p>
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
                  className="max-w-none overflow-y-auto pr-2"
                >
                  {product.usageInstructions ? (
                    <ul className="space-y-2">
                      {product.usageInstructions
                        .split(/\n|\\n/)
                        .map((line) => line.trim())
                        .filter((line) => line.length > 0)
                        .map((line, index) => (
                          <li key={index} className="flex items-start text-sm text-foreground">
                            <span className="mr-2 mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary"></span>
                            <span>{line.replace(/^\*\s*/, "")}</span>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p className="prose prose-sm dark:prose-invert text-muted-foreground">
                      {tModal("noUsage")}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Tabs>
      </article>
    </motion.section>
  );
}
