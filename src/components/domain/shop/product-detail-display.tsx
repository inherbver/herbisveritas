"use client";

import React, { useState, useEffect, useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { type Locale } from "@/i18n-config";
import { QuantityInput } from "./quantity-input";
import { ProductDetailData } from "@/types/product-types";
import { addItemToCart } from "@/actions/cart.actions";
import {
  type CartActionResult,
  isGeneralErrorResult, // ✅ Corriger les noms d'imports
  isSuccessResult,
  isValidationErrorResult, // ✅ Corriger les noms d'imports
} from "@/lib/cart-helpers";
import type { CartDataFromServer } from "@/types/cart"; // ✅ Import depuis le bon fichier
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCartItems } from "@/stores/cart.store";
import { useCartOperations } from "@/lib/store-sync/cart-sync";
import { Price } from "@/components/ui/price";
import clsx from "clsx";

interface ProductDetailDisplayProps {
  product: ProductDetailData;
  // Add other props if needed, e.g., onAddToCart handler from the page
  // onAddToCart: (productId: string | number, quantity: number) => void;
}

export default function ProductDetailDisplay({ product }: ProductDetailDisplayProps) {
  const locale = useLocale() as Locale;
  const [activeTab, setActiveTab] = useState("description");
  const sectionRefs = {
    description: useRef<HTMLElement>(null),
    properties: useRef<HTMLElement>(null),
    composition: useRef<HTMLElement>(null),
    usage: useRef<HTMLElement>(null),
  };
  const t = useTranslations();
  const [quantity, setQuantity] = useState(1);
  const _cartItems = useCartItems();
  const { syncWithServer: _syncWithServer } = useCartOperations();

  // ✅ Define a clear, initial state for the action avec le bon type
  const initialState: CartActionResult<CartDataFromServer | null> = React.useMemo(
    () => ({
      success: false,
      error: "Initial state", // Use a specific error message to identify the initial state
    }),
    []
  );
  const [state, formAction] = useActionState(addItemToCart, initialState);

  useEffect(() => {
    // ✅ Do not show any toast if the state is still the initial one.
    // This is a robust way to prevent toasts on mount, especially with React 18's Strict Mode double-invoking effects.
    if (isGeneralErrorResult(state) && state.error === "Initial state") {
      return;
    }

    if (isSuccessResult(state)) {
      toast.success(state.message || t("ProductDetailModal.itemAddedSuccess"));
      // Synchronisation avec le serveur après succès
      _syncWithServer();
    } else if (state.success === false) {
      let errorMessage: string | undefined;

      // ✅ Utiliser les bons noms de fonctions
      if (isValidationErrorResult(state) && state.errors) {
        errorMessage = Object.values(state.errors).flat()[0];
      } else if (isGeneralErrorResult(state)) {
        errorMessage = state.error;
      }
      toast.error(state.message || errorMessage || t("Global.errors.generic"));
    }
  }, [state, t]); // Removed syncWithServer from dependencies to prevent infinite loops

  useEffect(() => {
    const observerOptions = {
      rootMargin: "-120px 0px -50% 0px", // Adjust top margin based on sticky header height
      threshold: 0,
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveTab(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    Object.values(sectionRefs).forEach((ref) => {
      if (ref.current) {
        observer.observe(ref.current);
      }
    });

    return () => {
      Object.values(sectionRefs).forEach((ref) => {
        if (ref.current) {
          observer.unobserve(ref.current);
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Refs are stable, no need to re-run

  const tabs = [
    { id: "description", label: t("ProductDetail.tabs.description") },
    { id: "properties", label: t("ProductDetail.tabs.properties") },
    { id: "composition", label: t("ProductDetail.tabs.composition") },
    { id: "usage", label: t("ProductDetail.tabs.usage") },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Top section with image and main info */}
      <div className="flex flex-col md:flex-row md:items-stretch md:gap-12">
        {/* Image Column */}
        <div className="md:w-1/2">
          <div className="relative h-full w-full rounded-lg bg-card p-4 shadow-sm lg:p-6">
            <Image
              alt={product.name}
              src={product.images?.[0]?.src ?? "/images/placeholder.png"}
              fill={true}
              className="rounded-lg object-contain object-center"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>

        {/* Info Column */}
        <div className="mt-6 flex flex-col pt-4 md:mt-0 md:w-1/2 lg:pt-6">
          <header className="flex-grow space-y-3 sm:space-y-4">
            <h1 className="mb-1 font-serif text-3xl font-bold leading-tight text-gray-900 lg:text-4xl dark:text-white">
              {product.name}
            </h1>
            {product.unit && (
              <p className="text-sm italic text-muted-foreground lg:text-base">{product.unit}</p>
            )}
            <p className="text-foreground/90 text-base leading-relaxed">
              {product.shortDescription}
            </p>

            {/* Price & Action Box */}
            <section className="my-4 rounded-xl bg-background p-4 shadow-lg sm:my-6 sm:p-6" aria-labelledby="product-purchase">
              <h2 id="product-purchase" className="sr-only">Achat du produit</h2>
              <form action={formAction}>
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="quantity" value={quantity} />
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Price
                      value={product.price}
                      locale={locale}
                      className="text-olive-600 text-2xl font-bold"
                    />
                    <p className="text-xs text-muted-foreground">{t("Global.TTC")}</p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
                    <QuantityInput
                      id="product-quantity"
                      value={quantity}
                      onChange={setQuantity}
                      min={1}
                      max={10}
                    />
                    <SubmitButton />
                  </div>
                </div>
              </form>
            </section>
          </header>

          {/* Tabs Navigation (at the bottom of the column) */}
          <nav className="mt-auto w-full border-b pt-6" aria-label="Tabs">
            <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-hide sm:space-x-6 lg:space-x-8">
              {tabs.map((tab) => (
                <a
                  key={tab.id}
                  href={`#${tab.id}`}
                  className={clsx(
                    "flex-shrink-0 whitespace-nowrap border-b-2 px-1 pb-2 font-serif text-sm font-medium transition-colors duration-200 sm:text-base lg:text-lg",
                    {
                      "border-primary text-primary": activeTab === tab.id,
                      "hover:border-primary/70 border-transparent text-muted-foreground hover:text-primary":
                        activeTab !== tab.id,
                    }
                  )}
                >
                  {tab.label}
                </a>
              ))}
            </div>
          </nav>
        </div>
      </div>

      {/* Content Sections (full width below) */}
      <div className="mt-12 space-y-16">
        <section
          id="description"
          ref={sectionRefs.description}
          className="mx-auto max-w-4xl scroll-mt-24"
        >
          <h3 className="mb-4 font-serif text-2xl text-gray-900 dark:text-white">
            {t("ProductDetail.tabs.description")}
          </h3>
          <div className="text-foreground/90 prose prose-lg max-w-none leading-relaxed dark:prose-invert">
            {product.description_long || t("ProductDetailModal.noDescription")}
          </div>
        </section>

        <section
          id="properties"
          ref={sectionRefs.properties}
          className="mx-auto max-w-4xl scroll-mt-24"
        >
          <h3 className="mb-4 font-serif text-2xl text-gray-900 dark:text-white">
            {t("ProductDetail.tabs.properties")}
          </h3>
          {product.properties ? (
            <ul className="text-foreground/90 list-inside list-disc space-y-2 text-lg">
              {product.properties.split(/\n|\\n/).map((line, index) => (
                <li key={index}>{line.trim().replace(/^\*\s*/, "")}</li>
              ))}
            </ul>
          ) : (
            <p>{t("ProductDetailModal.noProperties")}</p>
          )}
        </section>

        <section
          id="composition"
          ref={sectionRefs.composition}
          className="mx-auto max-w-4xl scroll-mt-24"
        >
          <h3 className="mb-4 font-serif text-2xl text-gray-900 dark:text-white">
            {t("ProductDetail.tabs.composition")}
          </h3>
          <div className="text-foreground/90 prose prose-lg max-w-none leading-relaxed dark:prose-invert">
            {product.compositionText}
          </div>
          <h4 className="mb-2 mt-6 font-serif text-xl text-gray-800 dark:text-gray-300">
            {t("ProductDetailModal.inciList")}
          </h4>
          {product.inciList && product.inciList.length > 0 ? (
            <ul className="grid grid-cols-1 gap-x-4 gap-y-1 text-base text-muted-foreground md:grid-cols-2 lg:gap-x-6">
              {product.inciList.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="italic">{t("ProductDetailModal.noInci")}</p>
          )}
        </section>

        <section id="usage" ref={sectionRefs.usage} className="mx-auto max-w-4xl scroll-mt-24">
          <h3 className="mb-4 font-serif text-2xl text-gray-900 dark:text-white">
            {t("ProductDetail.tabs.usage")}
          </h3>
          {product.usageInstructions ? (
            <div className="text-foreground/90 prose prose-lg max-w-none leading-relaxed dark:prose-invert">
              {product.usageInstructions.split(/\n|\\n/).map((line, index) => (
                <p key={index}>{line.trim().replace(/^\*\s*/, "")}</p>
              ))}
            </div>
          ) : (
            <p>{t("ProductDetailModal.noUsage")}</p>
          )}
        </section>
      </div>
    </div>
  );
}

// Submit button needs to be adapted for the new design
function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("ProductDetailModal");

  return (
    <Button
      variant="default"
      size="lg"
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="h-12 max-w-xs text-lg font-semibold"
    >
      {pending ? t("addingToCart") : t("addToCart")}
    </Button>
  );
}
