"use client";

import React, { useState, useEffect, useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { QuantityInput } from "./quantity-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductDetailData } from "@/types/product-types";
import { addItemToCartAction } from "@/actions/cartActions";
import type { CartActionResult } from "@/lib/cart-helpers";
import type { CartData } from "@/types/cart";
import { toast } from "sonner";

interface ProductDetailModalProps {
  product: ProductDetailData | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

// Internal Submit Button for the modal
function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("ProductDetailModal");

  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending} aria-disabled={pending}>
      {/* Use correct keys from the JSON */}
      {pending ? t("addingToCart") : t("addToCart")}
    </Button>
  );
}

export function ProductDetailModal({ product, isOpen, onOpenChange }: ProductDetailModalProps) {
  const t = useTranslations("ProductDetailModal");
  const [quantity, setQuantity] = useState(1);

  // Form state management
  const initialState: CartActionResult<CartData | null> = {
    success: true,
    data: null,
    message: "",
  };
  const [state, formAction] = useActionState(addItemToCartAction, initialState);

  // Reset quantity and potentially form state when modal opens/changes product
  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      // Reset form state if needed, though useFormState might handle this
    }
  }, [isOpen, product]);

  // Toast notifications based on form state
  useEffect(() => {
    if (state.message) {
      if (state.success) {
        toast.success(state.message);
        // Optionally close the modal on success?
        // onOpenChange(false);
      } else {
        toast.error(state.message);
      }
    }
  }, [state]);

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-[80%] lg:max-w-[60%] xl:max-w-[50%]">
        {product ? (
          <>
            <DialogHeader className="sr-only">
              {" "}
              {/* Caché visuellement mais lu par les lecteurs d'écran */}
              <DialogTitle>{product.name}</DialogTitle>
              <DialogDescription>
                {t("productDetailDescription", { productName: product.name })}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
              {/* Left Column: Image */}
              <div className="bg-muted/30 flex min-h-[300px] items-center justify-center p-6 md:min-h-[450px]">
                {product.images && product.images.length > 0 ? (
                  <Image
                    src={product.images[0].src}
                    alt={product.images[0].alt}
                    width={400}
                    height={400}
                    className="h-auto max-h-[400px] w-auto object-contain"
                  />
                ) : (
                  <div className="text-muted-foreground">{t("noImage")}</div>
                )}
              </div>

              {/* Right Column: Details, Actions, Tabs */}
              <div className="flex flex-col p-6">
                {/* Display Title Visually */}
                <h2 className="mb-1 font-serif text-2xl">{product.name}</h2>
                {/* Display Description Visually */}
                {product.shortDescription && (
                  <p className="mb-4 text-base text-muted-foreground">{product.shortDescription}</p>
                )}

                <div className="mb-6 text-3xl font-bold text-green-700 dark:text-green-500">
                  {product.price}
                </div>

                <div className="mb-6 flex items-center space-x-3">
                  <label htmlFor={`quantity-${product.id}`} className="sr-only text-sm font-medium">
                    {t("quantity")}
                  </label>
                  <QuantityInput
                    id={`modal-quantity-${product.id}`}
                    value={quantity}
                    onChange={setQuantity}
                  />
                  {/* Add to Cart Form */}
                  <form action={formAction} className="w-full">
                    <input type="hidden" name="productId" value={product.id} />
                    <input type="hidden" name="quantity" value={quantity} />
                    <SubmitButton />
                  </form>
                </div>

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
                    {product.properties && product.properties.trim().length > 0 ? (
                      <ul className="space-y-1">
                        {product.properties
                          .split(/\n|\\n/) // Sépare par newline ou \n littéral
                          .map((line) => line.trim())
                          .filter((line) => line.length > 0)
                          .map((line, index) => (
                            <li key={index} className="text-xs">
                              {line.replace(/^\*\s*/, "")}
                            </li>
                          ))}
                      </ul>
                    ) : (
                      <p>{t("noProperties")}</p>
                    )}
                  </TabsContent>
                  <TabsContent
                    value="composition"
                    className="max-h-40 overflow-y-auto pr-2 text-sm text-muted-foreground"
                  >
                    <h4 className="mb-2 font-semibold">{t("inciList")}</h4>
                    {product.inciList && product.inciList.length > 0 ? (
                      <ul className="space-y-1 break-words text-xs">
                        {product.inciList.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs italic">{t("noInci")}</p>
                    )}
                  </TabsContent>
                  <TabsContent
                    value="usage"
                    className="max-h-40 overflow-y-auto pr-2 text-sm text-muted-foreground"
                  >
                    <p>{product.usageInstructions || t("noUsage")}</p>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
