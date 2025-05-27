"use client";

import React, { useEffect, useActionState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link as NextLink } from "@/i18n/navigation";
import useCartStore, {
  selectCartItems,
  selectCartTotalItems,
  selectCartSubtotal,
} from "@/stores/cartStore";
import {
  removeItemFromCart,
  updateCartItemQuantity as updateCartItemQuantityAction,
  clearCartAction,
} from "@/actions/cartActions";
import type { CartActionResult } from "@/lib/cart-helpers";
import { isSuccessResult } from "@/lib/cart-helpers";
import { toast } from "sonner";
import type { CartData, CartItem } from "@/types/cart";
import type { RemoveFromCartInput, UpdateCartItemQuantityInput } from "@/lib/schemas/cartSchemas";
import { Button } from "@/components/ui/button";
import { MinusIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";

/**
 * Affiche le contenu du panier et permet les interactions de base.
 */
export function CartDisplay() {
  const t = useTranslations("CartDisplay");
  const tGlobal = useTranslations("Global");

  const items = useCartStore(selectCartItems);
  const totalItems = useCartStore(selectCartTotalItems);
  const subtotal = useCartStore(selectCartSubtotal);

  const { _removeItem, _updateItemQuantity, _setItems } = useCartStore((state) => ({
    _removeItem: state.removeItem, // Will be replaced by server action call
    _updateItemQuantity: state.updateItemQuantity, // Will be replaced by server action call
    // clearCart is now handled by a server action
    _setItems: state._setItems, // To update store after server action
  }));

  const initialClearCartState: CartActionResult<CartData | null> = {
    success: undefined,
    message: "",
    data: null,
  };

  const [clearCartState, clearCartFormAction, isClearCartPendingFromActionState] = useActionState(
    clearCartAction,
    initialClearCartState
  );

  // Utiliser useTransition pour la gestion de l'état pending de la transition elle-même
  const [_isTransitionPending, startTransition] = useTransition();

  // Vous pouvez combiner les états pending si nécessaire, ou utiliser celui de useActionState directement
  // pour le disabled du bouton, car useActionState est spécifiquement pour cette action.
  // Pour l'instant, nous allons utiliser isClearCartPendingFromActionState pour le disabled.
  // Le principal est d'utiliser startTransition pour l'appel.

  useEffect(() => {
    if (clearCartState.success === true) {
      toast.success(clearCartState.message || t("cartClearedSuccess"));
      _setItems([]); // Clear local cart state
    } else if (clearCartState.success === false) {
      toast.error(clearCartState.message || tGlobal("genericError"));
    }
    // Resetting state or other cleanup could be done here if needed,
    // but useActionState typically handles state updates internally.
  }, [clearCartState, _setItems, t, tGlobal]);

  const handleClearCart = () => {
    // Utiliser isClearCartPendingFromActionState pour vérifier si l'action est déjà en cours
    if (items.length > 0 && !isClearCartPendingFromActionState) {
      startTransition(() => {
        // FormData is not strictly needed by clearCartAction as it doesn't read from it,
        // but useActionState expects a form action signature.
        clearCartFormAction(new FormData());
      });
    }
  };

  const handleRemoveItem = async (cartItemId: string) => {
    if (!cartItemId) {
      toast.error(tGlobal("genericError"));
      return;
    }

    // Consider adding a loading state for the specific item or button
    const actionInput: RemoveFromCartInput = { cartItemId };
    const result: CartActionResult<CartData | null> = await removeItemFromCart(actionInput);

    if (isSuccessResult(result)) {
      toast.success(result.message || t("itemRemovedSuccess"));
      if (result.data && result.data.items) {
        // The items from result.data.items should be CartItem[] as transformed by getCart
        _setItems(result.data.items as CartItem[]);
      } else {
        // If result.data or result.data.items is null/undefined, it means the cart might be empty
        _setItems([]);
      }
    } else {
      toast.error(result.message || tGlobal("genericError"));
    }
    // Reset loading state if implemented
  };

  const handleUpdateItemQuantity = async (cartItemId: string, newQuantity: number) => {
    if (!cartItemId) {
      toast.error(tGlobal("genericError"));
      return;
    }

    // The server action updateCartItemQuantity already handles newQuantity <= 0 by calling removeItemFromCart.
    // So, we can directly call it.
    // Consider adding a loading state for the specific item or quantity input

    const actionInput: UpdateCartItemQuantityInput = { cartItemId, quantity: newQuantity };
    const result: CartActionResult<CartData | null> =
      await updateCartItemQuantityAction(actionInput);

    if (isSuccessResult(result)) {
      toast.success(result.message || t("itemQuantityUpdatedSuccess"));
      if (result.data && result.data.items) {
        _setItems(result.data.items as CartItem[]);
      } else if (result.data === null && newQuantity <= 0) {
        // If quantity was set to 0 or less, and getCart returned null (empty cart)
        _setItems([]);
      } else if (result.data === null) {
        // This case should ideally not happen if an item was updated (not removed) and cart wasn't empty before
        // but if it does, reflect an empty cart or handle as an error from getCart within the action.
        _setItems([]);
        console.warn(
          "Cart data is null after quantity update, but item was not meant to be removed."
        );
      }
    } else {
      toast.error(result.message || tGlobal("genericError"));
    }
    // Reset loading state if implemented
  };

  if (items.length === 0) {
    return (
      <section aria-labelledby="cart-heading" className="p-4 text-center">
        <h2 id="cart-heading" className="mb-2 text-xl font-semibold">
          {t("yourCart")}
        </h2>
        <p>{t("emptyCart")}</p>
        <NextLink href="/products" className="mt-4 inline-block">
          <Button variant="outline">{t("continueShopping")}</Button>
        </NextLink>
      </section>
    );
  }

  return (
    <section aria-labelledby="cart-heading" className="p-4">
      <div className="mb-6 flex items-center justify-between">
        <h2 id="cart-heading" className="text-2xl font-semibold">
          {t("yourCart")} ({totalItems})
        </h2>
      </div>

      <ul role="list" className="divide-y divide-border">
        {items.map((item) => {
          return (
            <li key={item.productId} className="flex py-6">
              <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border border-border sm:h-32 sm:w-32">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name} // TODO: Provide more descriptive alt text if available
                    fill
                    sizes="(max-width: 640px) 96px, 128px"
                    className="object-cover object-center"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                    {tGlobal("noImage")}
                  </div>
                )}
              </div>

              <div className="ml-4 flex flex-1 flex-col sm:ml-6">
                <div>
                  <div className="flex justify-between text-base font-medium">
                    <h3>
                      {item.slug ? (
                        <NextLink
                          href={{ pathname: "/product/[slug]", params: { slug: item.slug } }}
                        >
                          {item.name}
                        </NextLink>
                      ) : (
                        item.name
                      )}
                    </h3>
                    <p className="ml-4">{(item.price * item.quantity).toFixed(2)} €</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {/* TODO: Afficher les variantes du produit si disponibles (couleur, taille, etc.) */}
                    {t("unitPrice")}: {item.price.toFixed(2)} €
                  </p>
                </div>
                <div className="mt-auto flex flex-1 items-end justify-between text-sm">
                  <div className="flex items-center">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        if (item.id) handleUpdateItemQuantity(item.id, item.quantity - 1);
                      }}
                      aria-label={t("decreaseQuantity", { itemName: item.name })}
                    >
                      <MinusIcon className="h-4 w-4" />
                    </Button>
                    <span className="mx-3 w-8 text-center" aria-live="polite">
                      {item.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        if (item.id) handleUpdateItemQuantity(item.id, item.quantity + 1);
                      }}
                      aria-label={t("increaseQuantity", { itemName: item.name })}
                    >
                      <PlusIcon className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (item.id) {
                          handleRemoveItem(item.id);
                        } else {
                          toast.error("Impossible de supprimer l'article : ID manquant.");
                        }
                      }}
                      className="hover:text-destructive/80 font-medium text-destructive"
                      aria-label={t("removeItem", { itemName: item.name })}
                    >
                      <XIcon className="mr-1 h-4 w-4" />
                      {t("remove")}
                    </Button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Log before clear cart button */}
      {/* {console.log("[CartDisplay] Before clear cart button. items.length:", items.length)} */}
      {/* Commenting out the log as it might be too verbose now */}
      {items.length > 0 && (
        <div className="mt-6 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearCart}
            disabled={isClearCartPendingFromActionState || items.length === 0}
            aria-label={t("clearCartButtonLabel")}
          >
            {isClearCartPendingFromActionState ? (
              <>
                <svg
                  className="mr-2 h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                {tGlobal("loading")}
              </>
            ) : (
              <>
                <Trash2Icon className="mr-2 h-4 w-4" />
                {t("clearCartButton")}
              </>
            )}
          </Button>
        </div>
      )}

      <div className="mt-8 border-t border-border pt-6">
        <div className="flex justify-between text-base font-medium">
          <p>{t("subtotal")}</p>
          <p>{subtotal.toFixed(2)} €</p>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("shippingTaxesCalculatedAtCheckout")}
        </p>
        <div className="mt-6">
          <Button size="lg" className="w-full">
            {t("checkout")}
          </Button>
        </div>
        <div className="mt-6 flex justify-center text-center text-sm text-muted-foreground">
          <p>
            {t("or")}{" "}
            <NextLink href="/products" className="hover:text-primary/80 font-medium text-primary">
              {t("continueShopping")}
              <span aria-hidden="true"> &rarr;</span>
            </NextLink>
          </p>
        </div>
      </div>
    </section>
  );
}
