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
import type { CartData } from "@/types/cart";
import type { RemoveFromCartInput, UpdateCartItemQuantityInput } from "@/lib/schemas/cartSchemas";
import { Button } from "@/components/ui/button";
import { MinusIcon, PlusIcon, XIcon } from "lucide-react";

/**
 * Affiche le contenu du panier et permet les interactions de base.
 */
export function CartDisplay() {
  const t = useTranslations("CartDisplay");
  const tGlobal = useTranslations("Global");

  const items = useCartStore(selectCartItems);
  const totalItems = useCartStore(selectCartTotalItems);
  const subtotal = useCartStore(selectCartSubtotal);

  const { _setItems } = useCartStore((state) => ({
    _setItems: state._setItems, // To update store after server action
  }));

  const handleRemoveItem = async (cartItemId: string) => {
    if (!cartItemId) {
      toast.error(tGlobal("genericError"));
      return;
    }

    const actionInput: RemoveFromCartInput = { cartItemId };
    const result: CartActionResult<CartData | null> = await removeItemFromCart(actionInput);

    if (isSuccessResult(result)) {
      toast.success(result.message || t("itemRemovedSuccess"));
      if (result.data?.items) {
        _setItems(result.data.items);
      }
    } else {
      toast.error(result.message || tGlobal("genericError"));
    }
    // Reset loading state if implemented
  };

  // Dans cart-display.tsx - Version améliorée de handleUpdateItemQuantity

  const handleUpdateItemQuantity = async (cartItemId: string, newQuantity: number) => {
    const logPrefix = `[CartDisplay handleUpdateItemQuantity ${new Date().toISOString()}]`;
    console.log(`${logPrefix} CALLED with cartItemId: ${cartItemId}, newQuantity: ${newQuantity}`);

    if (!cartItemId) {
      console.error(`${logPrefix} cartItemId is MISSING.`);
      toast.error(tGlobal("genericError"));
      return;
    }

    // Validation côté client
    if (newQuantity < 0) {
      console.warn(`${logPrefix} Invalid quantity: ${newQuantity}. Must be >= 0.`);
      toast.error("La quantité doit être positive ou nulle.");
      return;
    }

    // 1. SAUVEGARDER L'ÉTAT ACTUEL pour rollback
    const currentItems = useCartStore.getState().items;
    const previousState = [...currentItems]; // Deep copy pour éviter les mutations

    console.log(`${logPrefix} Current state saved (${previousState.length} items)`);

    // 2. OPTIMISTIC UPDATE - Mettre à jour l'UI immédiatement
    const optimisticItems = currentItems
      .map((item) => (item.id === cartItemId ? { ...item, quantity: newQuantity } : item))
      .filter((item) => item.quantity > 0); // Retirer si quantity <= 0

    _setItems(optimisticItems);
    console.log(
      `${logPrefix} Applied optimistic update (${optimisticItems.length} items after update)`
    );

    // 3. APPELER L'ACTION SERVEUR
    const actionInput: UpdateCartItemQuantityInput = { cartItemId, quantity: newQuantity };
    console.log(
      `${logPrefix} Calling server action with input:`,
      JSON.stringify(actionInput, null, 2)
    );

    try {
      const result: CartActionResult<CartData | null> =
        await updateCartItemQuantityAction(actionInput);
      console.log(`${logPrefix} Received response from server action. Success: ${result.success}`);

      if (isSuccessResult(result)) {
        // 3a. SUCCÈS - Synchroniser avec les données serveur
        if (result.data?.items) {
          console.log(
            `${logPrefix} Server action SUCCESS. Syncing with server data (${result.data.items.length} items)`
          );
          _setItems(result.data.items);
        } else {
          console.log(`${logPrefix} Server action SUCCESS but no data - keeping optimistic update`);
        }
        toast.success(result.message || t("itemQuantityUpdatedSuccess"));
      } else {
        // 3b. ERREUR SERVEUR - Rollback à l'état précédent
        console.error(
          `${logPrefix} Server action FAILED. Error: ${result.message}. Rolling back to previous state.`
        );
        _setItems(previousState);

        // Log des détails d'erreur pour debugging
        if ("fieldErrors" in result && result.fieldErrors) {
          console.error(`${logPrefix} Field validation errors:`, result.fieldErrors);
        } else if ("internalError" in result && result.internalError) {
          console.error(`${logPrefix} Internal server error:`, result.internalError);
        }

        toast.error(result.message || tGlobal("genericError"));
      }
    } catch (error: unknown) {
      // 3c. ERREUR RÉSEAU/INATTENDUE - Rollback
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
      console.error(
        `${logPrefix} Network/unexpected error during server action. Error: ${errorMessage}. Rolling back to previous state.`
      );
      console.error(
        `${logPrefix} Previous state being restored (first 3 items):`,
        JSON.stringify(previousState.slice(0, 3), null, 2)
      );

      // Log séparé pour l'objet error complet (pour debugging)
      if (!(error instanceof Error)) {
        console.error(`${logPrefix} Additional error details (non-Error object):`, error);
      }

      _setItems(previousState);
      toast.error(tGlobal("genericError"));
    }
  };

  if (items.length === 0) {
    return (
      <section aria-labelledby="cart-heading" className="p-4 text-center">
        <h2 id="cart-heading" className="mb-2 text-xl font-semibold">
          {t("yourCart") as string}
        </h2>
        <p>{t("emptyCart")}</p>
        <NextLink href="/products" className="mt-4 inline-block">
          <Button variant="outline">{t("continueShopping")}</Button>
        </NextLink>
      </section>
    );
  }

  return (
    <section aria-labelledby="cart-heading" className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
        <h2 id="cart-heading" className="text-2xl font-semibold">
          {t("yourCart")} ({totalItems})
        </h2>
      </header>

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

      <footer className="mt-8 border-t border-border px-4 py-6 sm:px-6">
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
      </footer>
    </section>
  );
}
