"use client";

import React from "react";
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
} from "@/actions/cartActions";
import type { CartActionResult } from "@/lib/cart-helpers";
import { isSuccessResult } from "@/lib/cart-helpers";
import { toast } from "sonner";
import type { CartData, CartItem } from "@/types/cart";
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

  const { _removeItem, _updateItemQuantity, clearCart, _setItems } = useCartStore((state) => ({
    _removeItem: state.removeItem, // Will be replaced by server action call
    _updateItemQuantity: state.updateItemQuantity, // Will be replaced by server action call
    clearCart: state.clearCart, // This likely calls a server action or should
    _setItems: state._setItems, // To update store after server action
  }));

  const handleRemoveItem = async (cartItemId: string) => {
    if (!cartItemId) {
      toast.error(tGlobal("genericError"));
      return;
    }

    // Consider adding a loading state for the specific item or button
    const result: CartActionResult<CartData | null> = await removeItemFromCart({ cartItemId });

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

    const result: CartActionResult<CartData | null> = await updateCartItemQuantityAction({
      cartItemId,
      quantity: newQuantity,
    });

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
        {items.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearCart} className="text-xs">
            <Trash2Icon className="mr-1.5 h-3.5 w-3.5" />
            {t("clearCart")}
          </Button>
        )}
      </div>

      <ul role="list" className="divide-y divide-border">
        {items.map((item) => (
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
                      <NextLink href={{ pathname: "/product/[slug]", params: { slug: item.slug } }}>
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
                    onClick={() => item.id && handleUpdateItemQuantity(item.id, item.quantity - 1)}
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
                    onClick={() => item.id && handleUpdateItemQuantity(item.id, item.quantity + 1)}
                    aria-label={t("increaseQuantity", { itemName: item.name })}
                  >
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => item.id && handleRemoveItem(item.id)}
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
        ))}
      </ul>

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
