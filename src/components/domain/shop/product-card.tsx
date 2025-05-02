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
  /** Product price */
  price: string;
  /** Optional discount percentage */
  discountPercent?: number;
  /** Slug for dynamic routes */
  slug: string;
  /** Locale */
  locale: string;
  /** Whether the product is loading */
  isLoading?: boolean;
  /** Whether the product is out of stock */
  isOutOfStock?: boolean;
  /** Callback for adding the product to cart */
  onAddToCart: (productId: string | number) => void;
  /** Optional custom class name */
  className?: string;
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
  locale,
  isLoading = false,
  isOutOfStock = false,
  onAddToCart,
  className,
}: ProductCardProps) {
  const t = useTranslations("ProductCard");

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
    if (!isOutOfStock) onAddToCart(id);
  };

  const linkHref = { pathname: '/products/[slug]' as AppPathname, params: { slug: slug } };

  const cardContent = (
    <>
      <div
        className={cn(
          "relative aspect-square w-full overflow-hidden transition-opacity duration-300 group-hover:opacity-90",
        )}
      >
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5">
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
      </div>

      {/* Content Area - V2: Standard padding, flex-grow, WHITE BACKGROUND */}
      <div className="flex flex-grow flex-col bg-background p-4">
        <h2
          id={`product-title-${id}`}
          className="mb-1 line-clamp-2 text-lg font-semibold leading-tight"
          title={title}
        >
          {title}
        </h2>

        {(subtitle || meta) && (
          <div className="mb-2 line-clamp-1 text-sm text-muted-foreground">
            {subtitle}
            {subtitle && meta && " - "}
            {meta}
          </div>
        )}

        <div className="flex-grow" />

        <div className="mt-auto flex items-center justify-between pt-2">
          <p
            className="mr-2 text-xl font-bold text-green-700 dark:text-green-400"
            aria-label={`Price: ${price}`}
          >
            {price}
          </p>

          <Button
            size="sm"
            variant={isOutOfStock ? "outline" : "default"}
            disabled={isOutOfStock}
            onClick={handleAddToCartClick}
            aria-describedby={isOutOfStock ? undefined : `product-title-${id}`}
            aria-label={
              isOutOfStock ? `${title} - ${t("outOfStock")}` : `${t("addToCart")} ${title}`
            }
            className={cn(
              "h-10 px-4 text-sm",
              "transition-all duration-200 ease-in-out",
              !isOutOfStock &&
                "hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isOutOfStock && "bg-muted/50 cursor-not-allowed border opacity-60"
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
    !isOutOfStock ? "hover:shadow-xl hover:border-primary/50" : "",
    className
  );

  const isLinkable = !isLoading && !isOutOfStock && slug;

  return isLinkable ? (
    <NextLink href={linkHref} passHref={false} className="contents">
      <div className={commonCardClasses} aria-labelledby={`product-title-${id}`}>
        {cardContent}
      </div>
    </NextLink>
  ) : (
    <div
      className={cn(commonCardClasses, isOutOfStock ? "opacity-80" : "")}
    >
      {cardContent}
    </div>
  );
}
