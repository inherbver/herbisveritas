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
// import type { CartActionState, CartData } from "@/types/cart"; // Remplacé
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

// Internal Submit Button component using useFormStatus
interface SubmitButtonForCardProps {
  t: (key: "addingToCart" | "addToCart") => string;
}

function SubmitButtonForCard({ t }: SubmitButtonForCardProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="sm"
      variant={pending ? "outline" : "secondary"} // Use secondary (olive) variant
      disabled={pending}
      aria-disabled={pending}
      className={cn(
        "h-10 w-full max-w-xs px-4 text-sm shadow-md transition-all duration-200 ease-in-out active:scale-95", // Adjusted shadow
        !pending &&
          "hover:scale-105 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", // Enhanced hover
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

  const INITIAL_ACTION_STATE_ID = "INITIAL_ACTION_STATE_DO_NOT_PROCESS";

  const initialAddItemState: CartHelpersGeneralErrorResult = {
    success: false,
    error: INITIAL_ACTION_STATE_ID,
    message: undefined,
    // data: null, // GeneralErrorResult does not have a 'data' property
  };

  const [state, formAction, _isPending] = useActionState<
    CartActionResult<CartData | null>,
    FormData
  >(addItemToCartAction, initialAddItemState);

  useEffect(() => {
    // Ne pas traiter si c'est l'état initial (identifié par son champ 'error' spécifique)
    if (state.success === false && "error" in state && state.error === INITIAL_ACTION_STATE_ID) {
      return;
    }

    if (state.success === true) {
      // state is SuccessResult<CartData | null>
      toast.success(state.message || t("itemAddedSuccess"));
      if (state.data?.items) {
        _setItems(state.data.items);
      }
    } else if (state.success === false) {
      // state is ValidationErrorResult | GeneralErrorResult
      let uiMessage: string | undefined = state.message;

      if (!uiMessage) {
        // Si state est ValidationErrorResult (il aura la propriété 'errors')
        if ("errors" in state && state.errors) {
          const firstFieldError = Object.values(state.errors).flat()[0];
          if (firstFieldError) {
            uiMessage = firstFieldError;
          }
          // Si state est GeneralErrorResult (il aura la propriété 'error')
        } else if ("error" in state && state.error) {
          // S'assurer de ne pas afficher notre identifiant d'état initial comme un message d'erreur
          if (state.error !== INITIAL_ACTION_STATE_ID) {
            uiMessage = state.error;
          }
        }
      }

      // Afficher le toast d'erreur seulement si un message pertinent a été trouvé ou construit,
      // ou si c'est un état d'échec sans message spécifique (fallback générique).
      if (uiMessage) {
        toast.error(uiMessage);
      } else {
        // Fallback pour les cas où state.success est false mais aucun message spécifique n'a été dérivé.
        // Cela couvre les cas où state.message, state.errors, et state.error (pertinent) sont tous vides.
        toast.error(tGlobal("genericError"));
      }
    }
  }, [state, _setItems, t, tGlobal]);

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
      {/* Image Area - V2 */}
      <figure className="relative">
        <NextLink href={linkHref} passHref={false} className="group/image block overflow-hidden">
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
          </div>
        </NextLink>
        <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-1.5">
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
      </figure>

      {/* Content Area - V2: Standard padding, flex-grow, WHITE BACKGROUND */}
      <div className="flex flex-grow flex-col bg-background p-4">
        <NextLink href={linkHref} passHref={false} className="contents">
          <h2
            id={`product-title-${id}`}
            className="mb-1 line-clamp-2 text-center text-lg font-semibold leading-tight hover:underline"
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
            <SubmitButtonForCard t={t} />
          </form>
        </div>
      </div>
    </>
  );

  const commonCardClasses = cn(
    "relative flex flex-col rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden h-full min-h-[420px]",
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
