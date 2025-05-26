"use client";

import React, { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Link as NextLink } from "@/i18n/navigation";
import type { AppPathname } from "@/i18n/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import useCartStore from "@/stores/cartStore";
import type { CartActionResult, CartData } from "@/types/cart";
import { addItemToCart as addItemToCartAction } from "@/actions/cartActions";

import { toast } from "sonner";

export interface ProductCardProps {
  /** Unique identifier for the product */
  id: string | number;
  /** Product title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Optional meta information (e.g., weight, volume) */
  meta?: string;
  /** URL for the product image */
  imageSrc: string;
  /** Alt text for the product image */
  imageAlt: string;
  /** Product price - S'assurer que c'est un nombre pour le store */
  price: number;
  /** Optional discount percentage */
  discountPercent?: number;
  /** Slug for dynamic routes */
  slug: string;
  /** Whether the product is loading */
  isLoading?: boolean;
  /** Whether the product is out of stock */
  isOutOfStock?: boolean;
  /** Optional custom class name */
  className?: string;
  /** Indicates if the product is new (for badge) */
  is_new?: boolean | null;
  /** Indicates if the product is on promotion (for badge) */
  is_on_promotion?: boolean | null;
  /** Short description displayed on the card */
  short_description?: string | null;
  /** Unit of measurement (e.g., ml, g) */
  unit?: string | null;
}

// Internal Submit Button component using useFormStatus
function SubmitButtonForCard() {
  const { pending } = useFormStatus();
  const t = useTranslations("ProductCard");

  return (
    <Button
      type="submit"
      size="sm"
      variant={pending ? "outline" : "default"} // Change variant when pending if desired
      disabled={pending}
      aria-disabled={pending}
      className={cn(
        "h-10 w-full max-w-xs px-4 text-sm shadow-sm transition-all duration-200 ease-in-out active:scale-95",
        !pending &&
          "hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        pending && "cursor-wait opacity-70"
      )}
    >
      {pending ? t("addingToCart") : t("addToCart")}
    </Button>
  );
}

export function ProductCard({
  id,
  title,
  subtitle,
  meta,
  imageSrc,
  imageAlt,
  price,
  discountPercent,
  slug,
  isLoading = false,
  isOutOfStock = false,
  className,
  // New props
  is_new,
  is_on_promotion,
  short_description,
  unit,
}: ProductCardProps) {
  const t = useTranslations("ProductCard");
  const _setItems = useCartStore((state) => state._setItems);
  const tGlobal = useTranslations("Global"); // For generic error messages

  const initialAddItemState: CartActionResult<CartData | null> = {
    success: undefined,
    message: "",
    data: null,
  };

  const [state, formAction, _isPending] = useActionState(addItemToCartAction, initialAddItemState);

  useEffect(() => {
    if (state.message || state.error) {
      // Check if there's any message or error to display
      if (state.success) {
        toast.success(state.message || t("itemAddedSuccess"));
        if (state.data?.items) {
          _setItems(state.data.items);
        }
      } else {
        // Prefer specific field errors if available, otherwise general error or message
        let errorMessage = state.message || state.error || tGlobal("genericError");
        if (state.errors && Object.keys(state.errors).length > 0) {
          const firstFieldError = Object.values(state.errors).flat()[0];
          if (firstFieldError) {
            errorMessage = firstFieldError;
          }
        }
        toast.error(errorMessage);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, t, tGlobal]); // _setItems is stable from Zustand

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex h-full flex-col space-y-3 overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm",
          className
        )}
      >
        <Skeleton className="aspect-square w-full" />
        <div className="flex flex-grow flex-col space-y-2 p-4">
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
          <div className="flex-grow" />
          <div className="mt-auto flex items-center justify-between pt-2">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-10 w-1/3" />
          </div>
        </div>
      </div>
    );
  }

  const linkHref = { pathname: "/products/[slug]" as AppPathname, params: { slug: slug } };

  const cardContent = (
    <>
      <NextLink href={linkHref} passHref={false} className="group contents">
        <div
          className={cn(
            "relative aspect-square w-full overflow-hidden transition-opacity duration-300 group-hover:opacity-90"
          )}
        >
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {/* Badges and overlay remain inside the image div but outside the link for image */}
        </div>
      </NextLink>
      <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5">
        {is_new && (
          <Badge className="border-transparent bg-sky-100 text-xs text-sky-800 shadow-md dark:bg-sky-900 dark:text-sky-200">
            {t("newLabel")}
          </Badge>
        )}
        {is_on_promotion && (
          <Badge className="border-transparent bg-green-600 text-xs text-white shadow-md dark:bg-green-700">
            {t("promoLabel")}
          </Badge>
        )}
        {discountPercent && !isOutOfStock && (
          <Badge variant="destructive" className="text-xs shadow-md">
            -{discountPercent}%
          </Badge>
        )}
        {isOutOfStock && (
          <Badge variant="secondary" className="text-xs uppercase shadow-md">
            {t("outOfStock")}
          </Badge>
        )}
      </div>
      {isOutOfStock && (
        <div
          className="absolute inset-0 bg-white/60 backdrop-blur-[1px] dark:bg-black/50"
          aria-hidden="true"
        />
      )}

      {/* Content Area - V2: Standard padding, flex-grow, WHITE BACKGROUND */}
      <div className="flex flex-grow flex-col bg-background p-4">
        <NextLink href={linkHref} passHref={false} className="contents">
          <h2
            id={`product-title-${id}`}
            className="mb-1 line-clamp-2 text-center text-xl font-semibold leading-tight hover:underline"
            title={title}
          >
            {title}
          </h2>
        </NextLink>

        {short_description && (
          <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">{short_description}</p>
        )}

        {(subtitle || meta) && (
          <div className="mb-2 line-clamp-1 text-sm italic text-muted-foreground">
            {subtitle}
            {subtitle && meta && " - "}
            {meta}
          </div>
        )}

        <div className="flex-grow" />

        {/* Centered Unit, Price, Button Section */}
        <div className="mt-auto flex w-full flex-col items-center space-y-1 pt-2">
          {unit && <p className="text-xs italic text-muted-foreground">{unit}</p>}
          <p
            className="text-xl font-bold text-green-700 dark:text-green-400"
            aria-label={`Price: ${price.toFixed(2)} €`}
          >
            {price.toFixed(2)} €
          </p>

          <form
            action={formAction}
            className={cn("w-full max-w-xs", isOutOfStock && "cursor-not-allowed opacity-70")}
          >
            <input type="hidden" name="productId" value={String(id)} />
            <input type="hidden" name="productName" value={title} />
            <input type="hidden" name="productPrice" value={price} />
            <input type="hidden" name="productImage" value={imageSrc} />
            <input type="hidden" name="productSlug" value={slug} />
            <input type="hidden" name="quantity" value={1} /> {/* Default quantity for card add */}
            <SubmitButtonForCard />
          </form>
        </div>
      </div>
    </>
  );

  const commonCardClasses = cn(
    "relative flex flex-col rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden h-full",
    "transition-all duration-300 ease-in-out group",
    !isOutOfStock ? "hover:shadow-xl hover:border-primary/50 group-hover:-translate-y-1" : "",
    className
  );

  return (
    <article className={cn(commonCardClasses, isOutOfStock ? "opacity-80" : "")}>
      {cardContent}
    </article>
  );
}
