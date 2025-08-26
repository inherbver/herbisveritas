"use client";

import React from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link as NextLink } from "@/i18n/navigation";
import {
  useCartItemsHydrated,
  useCartTotalItemsHydrated,
  useCartSubtotalHydrated,
} from "@/hooks/use-cart-hydrated";
import { useCartStore } from "@/stores/cartStore";
import {
  removeItemFromCart,
  updateCartItemQuantity as updateCartItemQuantityAction,
} from "@/actions/cartActions";
import type { CartActionResult } from "@/lib/cart-helpers";
import { isSuccessResult } from "@/lib/cart-helpers";
import { toast } from "sonner";
import type { CartData } from "@/types/cart";
import type {
  RemoveFromCartInput,
  UpdateCartItemQuantityInput,
} from "@/lib/validators/cart.validator";
import { Button } from "@/components/ui/button";
import { CheckoutButton } from "./checkout-button";
import { MinusIcon, PlusIcon, XIcon } from "lucide-react";
import { useDebouncedCallback } from "@/hooks/use-debounce";

interface CartDisplayProps {
  onClose: () => void;
}

/**
 * Affiche le contenu du panier et permet les interactions de base.
 * @param {CartDisplayProps} props - Les propriétés du composant, incluant la fonction onClose pour fermer le panier.
 */
export function CartDisplay({ onClose }: CartDisplayProps) {
  const t = useTranslations("CartDisplay");
  const tGlobal = useTranslations("Global");

  const items = useCartItemsHydrated();
  const totalItems = useCartTotalItemsHydrated();
  const subtotal = useCartSubtotalHydrated();

  // Référence pour stocker l'état précédent pour rollback
  const previousStateRef = React.useRef<typeof items>([]);

  // Fonction pour synchroniser avec le serveur (sera debouncée)
  const syncQuantityWithServer = React.useCallback(
    async (cartItemId: string, newQuantity: number) => {
      const logPrefix = `[CartDisplay syncWithServer ${new Date().toISOString()}]`;
      console.log(
        `${logPrefix} Syncing quantity for ${cartItemId}: ${newQuantity}`,
      );

      try {
        const actionInput: UpdateCartItemQuantityInput = {
          cartItemId,
          quantity: newQuantity,
        };

        const result = (await updateCartItemQuantityAction(actionInput)) as CartActionResult<CartData | null>;

        if (isSuccessResult(result)) {
          if (result.data?.items) {
            console.log(`${logPrefix} Server sync SUCCESS`);
            // Mise à jour avec les données serveur confirmées
            useCartStore
              .getState()
              ._setItems(
                result.data.items,
                true,
                "cart-display-quantity-server-confirmed",
              );
          }
        } else {
          // En cas d'erreur, rollback à l'état précédent
          console.error(`${logPrefix} Server sync FAILED:`, result.message);

          const isAuthError =
            result.message?.includes("identifier l'utilisateur") ||
            result.message?.includes("not authenticated");

          if (isAuthError) {
            useCartStore.getState().clearCart();
            toast.info(tGlobal("Cart.sessionExpired") || "Session expirée");
          } else {
            // Rollback
            useCartStore
              .getState()
              ._setItems(
                previousStateRef.current,
                true,
                "cart-display-quantity-rollback",
              );
            toast.error(result.message || tGlobal("genericError"));
          }
        }
      } catch (error) {
        console.error(`${logPrefix} Network error:`, error);
        // Rollback en cas d'erreur réseau
        useCartStore
          .getState()
          ._setItems(
            previousStateRef.current,
            true,
            "cart-display-quantity-network-error-rollback",
          );
        toast.error(tGlobal("genericError"));
      }
    },
    [tGlobal],
  );

  // Version debouncée de la synchronisation serveur (500ms)
  const debouncedSyncWithServer = useDebouncedCallback(
    syncQuantityWithServer,
    500,
  );

  const handleRemoveItem = async (cartItemId: string) => {
    if (!cartItemId) {
      toast.error(tGlobal("genericError"));
      return;
    }

    // Optimistic update - retirer l'item immédiatement
    const currentItems = useCartStore.getState().items;
    const currentVersion = useCartStore.getState().updateVersion;
    const optimisticItems = currentItems.filter(
      (item) => item.id !== cartItemId,
    );
    useCartStore
      .getState()
      ._setItems(optimisticItems, true, "cart-display-remove-optimistic");

    const actionInput: RemoveFromCartInput = { cartItemId };
    const result = (await removeItemFromCart(actionInput)) as CartActionResult<CartData | null>;

    if (isSuccessResult(result)) {
      toast.success(result.message || t("itemRemovedSuccess"));
      if (result.data?.items) {
        // Force la mise à jour avec les données du serveur
        const serverVersion = useCartStore.getState().updateVersion;
        // Ne mettre à jour que si la version n'a pas changé depuis notre update optimiste
        if (serverVersion === currentVersion + 1) {
          useCartStore
            .getState()
            ._setItems(result.data.items, true, "cart-display-remove-server");
        } else {
          // Une autre mise à jour a eu lieu, forcer le rechargement
          useCartStore.getState().forceReloadFromServer();
        }
      }
    } else {
      // Gestion spéciale pour les erreurs d'authentification
      const isAuthError =
        result.message?.includes("identifier l'utilisateur") ||
        result.message?.includes("not authenticated") ||
        result.message?.includes("User identification failed");

      if (isAuthError) {
        console.warn(
          "User not authenticated during remove operation. Clearing cart.",
        );
        useCartStore.getState().clearCart();
        toast.info(
          tGlobal("Cart.sessionExpired") ||
            "Votre session a expiré. Le panier a été vidé.",
        );
      } else {
        // Rollback en cas d'erreur non-auth
        useCartStore
          .getState()
          ._setItems(currentItems, true, "cart-display-remove-rollback");
        toast.error(result.message || tGlobal("genericError"));
      }
    }
    // Reset loading state if implemented
  };

  const handleUpdateItemQuantity = (
    cartItemId: string,
    newQuantity: number,
  ) => {
    const logPrefix = `[CartDisplay handleUpdateItemQuantity ${new Date().toISOString()}]`;

    if (!cartItemId) {
      toast.error(tGlobal("genericError"));
      return;
    }

    // Validation côté client
    if (newQuantity < 0) {
      toast.error("La quantité doit être positive ou nulle.");
      return;
    }

    // Ajouter une limite maximale par produit (10)
    if (newQuantity > 10) {
      toast.error("Maximum 10 articles par produit");
      return;
    }

    // Sauvegarder l'état actuel pour rollback potentiel
    const currentItems = useCartStore.getState().items;
    previousStateRef.current = [...currentItems];

    // OPTIMISTIC UPDATE - Instantané pour l'UX
    const optimisticItems = currentItems
      .map((item) =>
        item.id === cartItemId ? { ...item, quantity: newQuantity } : item,
      )
      .filter((item) => item.quantity > 0);

    useCartStore
      .getState()
      ._setItems(optimisticItems, true, "cart-display-quantity-optimistic");

    console.log(
      `${logPrefix} Optimistic update applied, debounced sync scheduled`,
    );

    // SYNC SERVEUR - Debouncé pour éviter le spam
    debouncedSyncWithServer(cartItemId, newQuantity);
  };

  if (items.length === 0) {
    return (
      <section aria-labelledby="cart-heading" className="p-4 text-center">
        <header>
          <h2 id="cart-heading" className="mb-2 text-xl font-semibold">
            {t("yourCart") as string}
          </h2>
        </header>
        <main>
          <p>{t("emptyCart")}</p>
          <nav className="mt-4">
            <NextLink href="/" className="inline-block">
              <Button variant="outline">{t("continueShopping")}</Button>
            </NextLink>
          </nav>
        </main>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="cart-heading"
      className="flex h-full max-h-[80vh] flex-col md:max-h-full"
    >
      <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
        <h2 id="cart-heading" className="text-lg font-semibold md:text-2xl">
          {t("yourCart")} ({totalItems})
        </h2>
      </header>

      <main className="flex-1 overflow-y-auto">
        <ul role="list" className="divide-y divide-border">
          {items.map((item) => {
            return (
              <li key={item.productId} className="flex py-6">
                <figure className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border border-border sm:h-32 sm:w-32">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name} // TODO: Provide more descriptive alt text if available
                      fill
                      sizes="(max-width: 640px) 96px, 128px"
                      className="object-cover object-center"
                    />
                  ) : (
                    <aside className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                      {tGlobal("noImage")}
                    </aside>
                  )}
                </figure>

                <article className="ml-4 flex flex-1 flex-col sm:ml-6">
                  <header>
                    <section className="flex justify-between text-base font-medium">
                      <h3>
                        {item.slug ? (
                          <NextLink href={`/products/${item.slug}` as "/products"}>
                            {item.name}
                          </NextLink>
                        ) : (
                          item.name
                        )}
                      </h3>
                      <p className="ml-4">
                        {(item.price * item.quantity).toFixed(2)} €
                      </p>
                    </section>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {/* TODO: Afficher les variantes du produit si disponibles (couleur, taille, etc.) */}
                      {t("unitPrice")}: {item.price.toFixed(2)} €
                    </p>
                  </header>

                  <footer className="mt-auto flex flex-1 items-end justify-between text-sm">
                    <section
                      className="flex items-center"
                      role="group"
                      aria-label={t("quantityControls", {
                        itemName: item.name,
                      })}
                    >
                      <Button
                        variant="outline"
                        size="mobile-icon"
                        className="md:h-8 md:w-8"
                        onClick={() => {
                          if (item.id)
                            handleUpdateItemQuantity(
                              item.id,
                              item.quantity - 1,
                            );
                        }}
                        aria-label={t("decreaseQuantity", {
                          itemName: item.name,
                        })}
                      >
                        <MinusIcon className="h-4 w-4" />
                      </Button>
                      <output
                        className="mx-3 w-8 text-center"
                        aria-live="polite"
                      >
                        {item.quantity}
                      </output>
                      <Button
                        variant="outline"
                        size="mobile-icon"
                        className="md:h-8 md:w-8"
                        onClick={() => {
                          if (item.id)
                            handleUpdateItemQuantity(
                              item.id,
                              item.quantity + 1,
                            );
                        }}
                        aria-label={t("increaseQuantity", {
                          itemName: item.name,
                        })}
                      >
                        <PlusIcon className="h-4 w-4" />
                      </Button>
                    </section>

                    <section className="flex">
                      <Button
                        variant="ghost"
                        size="mobile-touch"
                        onClick={() => {
                          if (item.id) {
                            handleRemoveItem(item.id);
                          } else {
                            toast.error(
                              "Impossible de supprimer l'article : ID manquant.",
                            );
                          }
                        }}
                        className="hover:text-destructive/80 font-medium text-destructive md:h-9"
                        aria-label={t("removeItem", { itemName: item.name })}
                      >
                        <XIcon className="mr-1 h-4 w-4" />
                        {t("remove")}
                      </Button>
                    </section>
                  </footer>
                </article>
              </li>
            );
          })}
        </ul>
      </main>

      <footer className="mt-8 border-t border-border px-4 py-6 sm:px-6">
        <section className="flex justify-between text-base font-medium">
          <p>{t("subtotal")}</p>
          <p>{subtotal.toFixed(2)} €</p>
        </section>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("shippingTaxesCalculatedAtCheckout")}
        </p>
        <nav className="mt-6">
          <CheckoutButton onClose={onClose} />
        </nav>
        <nav className="mt-6 flex justify-center text-center text-sm text-muted-foreground">
          <p>
            {t("or")}{" "}
            <NextLink
              href="/"
              className="hover:text-primary/80 font-medium text-primary"
              onClick={onClose}
            >
              {t("continueShopping")}
              <span aria-hidden="true"> &rarr;</span>
            </NextLink>
          </p>
        </nav>
      </footer>
    </section>
  );
}
