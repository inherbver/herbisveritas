"use client";

import React, { useActionState, useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link as NextLink } from "@/i18n/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/cn";
import type {
  CartActionResult,
  GeneralErrorResult as CartHelpersGeneralErrorResult,
} from "@/lib/cart-helpers";
import type { CartData } from "@/types/cart";
import { addItemToCart as addItemToCartAction } from "@/actions/cartActions";
import { toast } from "sonner";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useCartStore } from "@/stores/cartStore";

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

  const [isClamped, setIsClamped] = useState(false);

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
      // Mettre à jour le store avec les données du serveur
      if (state.data?.items) {
        const { _setItems } = useCartStore.getState();
        _setItems(state.data.items);
      }
    } else {
      toast.error(state.message || tGlobal("genericError"));
    }
  }, [state, t, tGlobal]);

  // Utilisation d'une callback ref pour une gestion robuste du DOM
  const descriptionRef = useCallback((node: HTMLParagraphElement | null) => {
    if (node) {
      const observer = new ResizeObserver(() => {
        const isOverflowing = node.scrollHeight > node.clientHeight;
        setIsClamped(isOverflowing);
      });
      observer.observe(node);

      // Nettoyage de l'observer
      return () => observer.disconnect();
    }
  }, []);

  const linkHref = {
    pathname: "/products/[slug]",
    params: { slug },
  } as const;

  if (isLoading) {
    return (
      <Skeleton className="aspect-square w-full rounded-2xl sm:aspect-[4/5] xl:aspect-[4/5]" />
    );
  }

  return (
    <article
      className={cn(
        "focus-within:ring-primary/40 group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm transition-shadow duration-300 focus-within:outline-none focus-within:ring-2 hover:shadow-lg",
        "cursor-pointer touch-manipulation md:cursor-default", // Make card clickable on mobile
        isOutOfStock && "opacity-70",
        className
      )}
      aria-label={`Product: ${title}`}
      itemScope
      itemType="https://schema.org/Product"
      onClick={(e) => {
        // Only handle click on mobile when not clicking on buttons
        if (window.innerWidth < 768 && !(e.target as HTMLElement).closest("button, form")) {
          window.location.href = `/products/${slug}`;
        }
      }}
    >
      {/* Image Container with Link */}
      <NextLink href={linkHref} className="contents" aria-label={`View details for ${title}`}>
        <figure className="relative aspect-square w-full overflow-hidden rounded-t-2xl sm:aspect-[4/5] xl:aspect-[4/5]">
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            sizes="(min-width: 1280px) 300px, (min-width: 1024px) 25vw, (min-width: 640px) 50vw, 90vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            itemProp="image"
            loading="lazy"
          />
        </figure>
      </NextLink>

      {/* Badges */}
      <aside className="pointer-events-none absolute left-2 top-2 z-10 flex flex-col items-start space-y-1">
        {is_on_promotion && (
          <Badge
            variant="secondary"
            className="bg-accent/90 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase text-accent-foreground"
            aria-label={t("promoLabel")}
          >
            {t("promoLabel")}
          </Badge>
        )}
        {is_new && (
          <Badge
            variant="default"
            className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium uppercase text-primary-foreground"
            aria-label={t("newLabel")}
          >
            {t("newLabel")}
          </Badge>
        )}
      </aside>

      {/* Body */}
      <section className="flex flex-1 flex-col space-y-1 p-4">
        <header>
          <NextLink href={linkHref} aria-label={`View details for ${title}`}>
            <h3
              className="line-clamp-1 font-serif text-base font-semibold leading-snug text-foreground"
              itemProp="name"
            >
              {title}
            </h3>
          </NextLink>
        </header>

        <div className="h-[3.75rem]">
          {short_description ? (
            <HoverCard open={isClamped ? undefined : false}>
              <HoverCardTrigger asChild>
                <p
                  ref={descriptionRef}
                  className={cn(
                    "text-foreground/70 line-clamp-3 select-none text-sm",
                    isClamped && "is-clamped"
                  )}
                >
                  {short_description}
                </p>
              </HoverCardTrigger>
              {isClamped && (
                <HoverCardContent className="w-80">
                  <p className="text-sm">{short_description}</p>
                </HoverCardContent>
              )}
            </HoverCard>
          ) : null}
        </div>

        {/* Price & CTA */}
        <div className="mt-auto flex flex-col space-y-2 pt-2">
          <section itemProp="offers" itemScope itemType="https://schema.org/Offer">
            <data
              value={price}
              className="font-sans text-base font-semibold text-primary"
              itemProp="price"
            >
              {price.toFixed(2)} €
            </data>
            <meta itemProp="priceCurrency" content="EUR" />
            <meta
              itemProp="availability"
              content={
                isOutOfStock ? "https://schema.org/OutOfStock" : "https://schema.org/InStock"
              }
            />
          </section>

          <footer>
            <form action={formAction} aria-label={`Add ${title} to cart`}>
              <input type="hidden" name="productId" value={String(id)} />
              <input type="hidden" name="productName" value={title} />
              <input type="hidden" name="productPrice" value={price} />
              <input type="hidden" name="productImage" value={imageSrc} />
              <input type="hidden" name="productSlug" value={slug} />
              <input type="hidden" name="quantity" value={1} />

              <Button
                type="submit"
                size="sm"
                disabled={isPending || isOutOfStock}
                aria-disabled={isPending || isOutOfStock}
                aria-describedby={isOutOfStock ? `${id}-out-of-stock` : undefined}
                variant="secondary"
                className="min-h-[44px] w-full touch-manipulation rounded-xl text-sm font-medium transition-transform duration-200 active:scale-95 md:min-h-[36px]"
                onClick={(e) => e.stopPropagation()} // Prevent card click on mobile
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
        </div>
      </section>
    </article>
  );
}
