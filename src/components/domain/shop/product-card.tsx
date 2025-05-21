"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Link as NextLink } from "@/i18n/navigation";
import type { AppPathname } from "@/i18n/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import useCartStore from "@/stores/cartStore";
import type { CartItem } from "@/types/cart";

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
  const addItemToCart = useCartStore((state) => state.addItem);

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

  const handleAddToCartClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!isOutOfStock) {
      const itemToAdd: Omit<CartItem, "quantity"> = {
        productId: String(id), // S'assurer que productId est une string pour CartItem
        name: title,
        price: price, // price est déjà un nombre
        image: imageSrc, // Corrigé de imageUrl à image
        slug: slug,
        // Pas besoin de variantId, stockKeepingUnit, weight, dimensions pour l'instant
        // ou les ajouter si CartItem les requiert et qu'ils sont disponibles
      };
      addItemToCart(itemToAdd);
    }
  };

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

          <Button
            size="sm" // h-8 from button.tsx, use default (h-9) or lg (h-10) if more height is needed
            variant={isOutOfStock ? "outline" : "default"}
            disabled={isOutOfStock}
            onClick={handleAddToCartClick}
            aria-describedby={isOutOfStock ? undefined : `product-title-${id}`}
            aria-label={
              isOutOfStock ? `${title} - ${t("outOfStock")}` : `${t("addToCart")} ${title}`
            }
            className={cn(
              "w-full max-w-xs px-4 text-sm shadow-sm", // Added w-full, max-w-xs for better centering control within card padding
              // Kept h-10 for consistency with previous, but Button's size="sm" is h-8. Adjust if needed.
              // Default variant provides rounded-md. Shadow-sm is kept.
              "h-10", // Explicit height to override button's size prop if needed.
              "transition-all duration-200 ease-in-out active:scale-95",
              !isOutOfStock &&
                "hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              // For isOutOfStock, 'outline' variant already handles styling.
              // Add specific classes here if 'outline' is not sufficient for 'disabled' state visual
              isOutOfStock && "cursor-not-allowed opacity-70" // Ensure good disabled visual
            )}
          >
            {t("addToCart")}
          </Button>
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
