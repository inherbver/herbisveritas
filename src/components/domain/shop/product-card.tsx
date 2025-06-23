"use client";

import React, { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link as NextLink } from "@/i18n/navigation";
import type { AppPathname } from "@/i18n/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type {
  CartActionResult,
  GeneralErrorResult as CartHelpersGeneralErrorResult,
} from "@/lib/cart-helpers";
import type { CartData } from "@/types/cart";
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

export function ProductCard({
  id,
  title,
  imageSrc,
  imageAlt,
  price,
  slug,
  isLoading = false,
  isOutOfStock = false,
  className,
  is_new,
  is_on_promotion,
  short_description,
}: ProductCardProps) {
  const t = useTranslations("ProductCard");
  const tGlobal = useTranslations("Global");

  const INITIAL_ACTION_STATE_ID = "INITIAL_ACTION_STATE_DO_NOT_PROCESS";
  const initialAddItemState: CartHelpersGeneralErrorResult = {
    success: false,
    error: INITIAL_ACTION_STATE_ID,
    message: undefined,
  };

  const [state, formAction, isPending] = useActionState<
    CartActionResult<CartData | null>,
    FormData
  >(addItemToCartAction, initialAddItemState);

  useEffect(() => {
    if (state.success === false && "error" in state && state.error === INITIAL_ACTION_STATE_ID) {
      return;
    }
    if (state.success) {
      toast.success(state.message || t("itemAddedSuccess"));
    } else {
      toast.error(state.message || tGlobal("genericError"));
    }
  }, [state, t, tGlobal]);

  const linkHref: AppPathname = `/shop/${slug}`;

  if (isLoading) {
    return <Skeleton className="h-[420px] w-full rounded-lg" />;
  }

  return (
    <article
      className={cn(
        "relative flex flex-col rounded-xl bg-card text-card-foreground shadow-sm transition-shadow duration-200 hover:shadow-lg",
        isOutOfStock && "opacity-70",
        className
      )}
      aria-label={`Product: ${title}`}
      itemScope
      itemType="https://schema.org/Product"
    >
      {/* Badges Container */}
      <aside className="pointer-events-none absolute inset-x-4 top-4 z-10 flex items-start justify-between">
        {is_on_promotion && (
          <Badge
            variant="secondary"
            className="rounded-full bg-accent px-3 py-1 text-xs font-medium uppercase text-accent-foreground"
            aria-label={t("promoLabel")}
          >
            {t("promoLabel")}
          </Badge>
        )}
        {is_new && (
          <Badge
            variant="default"
            className="rounded-full bg-primary px-3 py-1 text-xs font-medium uppercase text-primary-foreground"
            aria-label={t("newLabel")}
          >
            {t("newLabel")}
          </Badge>
        )}
      </aside>

      {/* Product Image */}
      <NextLink href={linkHref} className="contents" aria-label={`View details for ${title}`}>
        <figure className="aspect-[4/3] overflow-hidden rounded-t-xl">
          <Image
            src={imageSrc}
            alt={imageAlt}
            width={400}
            height={300}
            className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
            itemProp="image"
            loading="lazy"
          />
        </figure>
      </NextLink>

      {/* Product Information */}
      <section className="flex flex-grow flex-col p-6">
        <header>
          <h3 className="font-serif text-lg font-semibold text-foreground" itemProp="name">
            {title}
          </h3>
          {short_description && (
            <p
              className="mt-1 line-clamp-2 font-sans text-sm text-muted-foreground"
              itemProp="description"
            >
              {short_description}
            </p>
          )}
        </header>

        {/* Price Information */}
        <section className="mt-2" itemProp="offers" itemScope itemType="https://schema.org/Offer">
          <data value={price} className="font-sans text-lg font-bold text-primary" itemProp="price">
            {price.toFixed(2)} €
          </data>
          <meta itemProp="priceCurrency" content="EUR" />
          <meta
            itemProp="availability"
            content={isOutOfStock ? "https://schema.org/OutOfStock" : "https://schema.org/InStock"}
          />
        </section>

        {/* Spacer */}
        <div className="flex-grow" aria-hidden="true" />

        {/* Add to Cart Action */}
        <footer className="mt-4">
          <form action={formAction} aria-label={`Add ${title} to cart`}>
            <input type="hidden" name="productId" value={String(id)} />
            <input type="hidden" name="productName" value={title} />
            <input type="hidden" name="productPrice" value={price} />
            <input type="hidden" name="productImage" value={imageSrc} />
            <input type="hidden" name="productSlug" value={slug} />
            <input type="hidden" name="quantity" value={1} />

            <Button
              type="submit"
              disabled={isPending || isOutOfStock}
              aria-disabled={isPending || isOutOfStock}
              aria-describedby={isOutOfStock ? `${id}-out-of-stock` : undefined}
              className="w-full rounded-md bg-primary py-2 font-sans text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary-foreground hover:text-primary"
            >
              {isPending ? t("addingToCart") : isOutOfStock ? t("outOfStock") : t("addToCart")}
            </Button>

            {isOutOfStock && (
              <span id={`${id}-out-of-stock`} className="sr-only">
                {t("outOfStockDescription")}
              </span>
            )}
          </form>
        </footer>
      </section>
    </article>
  );
}
