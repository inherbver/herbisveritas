"use client";

import { useState, useTransition, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";
import { useCartItemsHydrated, useCartSubtotalHydrated } from "@/hooks/use-cart-hydrated";
import { useCartStore } from "@/stores/cartStore";
import {
  removeItemFromCartFormAction,
  updateCartItemQuantityFormAction,
} from "@/actions/cartActions";
import { createStripeCheckoutSession } from "@/actions/stripeActions";
import type { ShippingMethod, Address } from "@/types";
import type { CartItem, CartData } from "@/types/cart";
import type { CartActionResult } from "@/lib/cart-helpers";
import type { AddressFormData } from "@/lib/validators/address.validator";
import { isSuccessResult } from "@/lib/cart-helpers";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, MinusIcon, PlusIcon, XIcon } from "lucide-react";
import CheckoutAddressForm from "./AddressForm";

interface CheckoutClientPageProps {
  cart: CartData;
  shippingAddress: Address | null;
  billingAddress: Address | null;
  shippingMethods: ShippingMethod[];
  isUserAuthenticated: boolean;
}

const DisplayAddress = ({ address }: { address: Address | AddressFormData }) => (
  <div className="text-sm">
    <p className="font-semibold">
      {address.first_name} {address.last_name}
    </p>
    <p>
      {address.street_number && `${address.street_number} `}
      {address.address_line1}
    </p>
    {address.address_line2 && <p>{address.address_line2}</p>}
    <p>
      {address.postal_code} {address.city}
    </p>
  </div>
);

export default function CheckoutClientPage({
  cart,
  shippingAddress: initialShippingAddress,
  billingAddress: initialBillingAddress,
  shippingMethods,
  isUserAuthenticated,
}: CheckoutClientPageProps) {
  const t = useTranslations("CheckoutPage");
  const tCart = useTranslations("CartDisplay");
  const tGlobal = useTranslations("Global");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  // Cart state from refactored store
  const items = useCartItemsHydrated();
  const subtotal = useCartSubtotalHydrated();

  // Local UI state
  const [shippingAddress, setShippingAddress] = useState<Address | AddressFormData | null>(
    initialShippingAddress
  );
  const [billingAddress, setBillingAddress] = useState<Address | AddressFormData | null>(
    initialBillingAddress
  );
  const [useDifferentBilling, setUseDifferentBilling] = useState(false);
  const [editingAddressType, setEditingAddressType] = useState<"shipping" | "billing" | null>(null);
  const [selectedShippingMethodId, setSelectedShippingMethodId] = useState<string | undefined>(
    shippingMethods[0]?.id
  );

  useEffect(() => {
    if (isUserAuthenticated && !initialShippingAddress) {
      setEditingAddressType("shipping");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  const selectedShippingMethod = shippingMethods.find(
    (method) => method.id === selectedShippingMethodId
  );
  const shippingCost = selectedShippingMethod?.price ? Number(selectedShippingMethod.price) : 0;
  const totalAmount = subtotal + shippingCost;

  const handleAddressFormSubmit = async (data: AddressFormData) => {
    // Import des Server Actions pour persister en base
    const { addAddress, updateAddress } = await import("@/actions/addressActions");

    try {
      // 1. Persister l'adresse en base de données d'abord
      const existingAddressId =
        editingAddressType === "shipping"
          ? shippingAddress && "id" in shippingAddress
            ? shippingAddress.id
            : undefined
          : billingAddress && "id" in billingAddress
            ? billingAddress.id
            : undefined;

      const result = existingAddressId
        ? await updateAddress(existingAddressId, data, locale)
        : await addAddress(data, locale);

      if (result.success) {
        // 2. Mettre à jour l'état local après succès de la persistence
        if (editingAddressType === "shipping") {
          setShippingAddress(data);
        } else if (editingAddressType === "billing") {
          setBillingAddress(data);
        }
        toast.success(t("toast.addressSaved"));
      } else {
        toast.error(result.error?.message || "Erreur lors de la sauvegarde");
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de l'adresse:", error);
      toast.error("Erreur lors de la sauvegarde");
    }

    setEditingAddressType(null);
  };

  const handleRemoveItem = async (cartItemId: string) => {
    const formData = new FormData();
    formData.append("cartItemId", cartItemId);

    const result: CartActionResult<CartData | null> = await removeItemFromCartFormAction(
      undefined,
      formData
    );

    if (isSuccessResult(result)) {
      toast.success(result.message || tCart("itemRemovedSuccess"));
      if (result.data?.items && result.data.id) {
        useCartStore.getState()._setItems(result.data.items);
      }
    } else {
      toast.error(result.message || tGlobal("genericError"));
    }
  };

  const handleUpdateItemQuantity = async (cartItemId: string, newQuantity: number) => {
    if (newQuantity < 0) return;

    // Save current state for rollback
    const previousState = [...useCartStore.getState().items];

    // Utilisation des opérations du nouveau système
    // La mise à jour optimiste est gérée automatiquement par useCartOperations

    const formData = new FormData();
    formData.append("cartItemId", cartItemId);
    formData.append("quantity", newQuantity.toString());

    const result: CartActionResult<CartData | null> = await updateCartItemQuantityFormAction(
      undefined,
      formData
    );

    if (isSuccessResult(result) && result.data?.items && result.data.id) {
      // Les données result.data.items sont déjà transformées
      useCartStore.getState()._setItems(result.data.items);
    } else {
      toast.error(result.message || tGlobal("genericError"));
      useCartStore.getState()._setItems(previousState); // Rollback on error
    }
  };

  const handlePayment = () => {
    if (!shippingAddress) {
      toast.error(t("toast.selectAddressError"));
      return;
    }
    if (useDifferentBilling && !billingAddress) {
      toast.error(t("toast.selectBillingAddressError"));
      return;
    }

    startTransition(async () => {
      const buildAddress = (addr: Address | AddressFormData): Address => {
        if ("id" in addr) {
          return addr; // Already a full Address object
        }
        // It's AddressFormData, so we build a temporary Address object
        return {
          ...addr,
          id: `temp-${Date.now()}`,
          user_id: "", // Not relevant for this action
          is_default: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      };

      const finalShippingAddress = buildAddress(shippingAddress);
      const finalBillingAddress =
        useDifferentBilling && billingAddress ? buildAddress(billingAddress) : finalShippingAddress;

      const result = await createStripeCheckoutSession(
        finalShippingAddress,
        finalBillingAddress,
        selectedShippingMethodId!
      );

      if (result.success && result.data?.sessionUrl) {
        window.location.href = result.data.sessionUrl;
      } else {
        toast.error(t("toast.paymentErrorTitle"), { description: result.error });
      }
    });
  };

  const renderAddressSection = (type: "shipping" | "billing") => {
    const address = type === "shipping" ? shippingAddress : billingAddress;
    const title = type === "shipping" ? t("address.shippingTitle") : t("address.billingTitle");

    if (editingAddressType === type) {
      return (
        <section className="mt-4">
          <h3 className="mb-4 text-lg font-semibold">{title}</h3>
          <CheckoutAddressForm
            addressType={type}
            onSubmit={handleAddressFormSubmit}
            isSubmitting={isPending}
            onCancel={() => setEditingAddressType(null)}
            existingAddress={address && "id" in address ? address : undefined}
          />
        </section>
      );
    }

    if (address) {
      return (
        <section className="mt-4 flex items-start justify-between rounded-md border p-4">
          <div>
            <h3 className="mb-2 text-lg font-semibold">{title}</h3>
            <DisplayAddress address={address} />
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditingAddressType(type)}>
            {t("address.editButton")}
          </Button>
        </section>
      );
    }

    return (
      <section className="mt-4">
        <h3 className="mb-2 text-lg font-semibold">{title}</h3>
        <Button variant="secondary" onClick={() => setEditingAddressType(type)}>
          {t("address.addNewButton")}
        </Button>
      </section>
    );
  };

  return (
    <main className="grid grid-cols-1 items-start gap-8 lg:grid-cols-3">
      <section className="space-y-8 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("address.shippingTitle")}</CardTitle>
            {!isUserAuthenticated && (
              <CardDescription>{t("address.guestDescription")}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {renderAddressSection("shipping")}
            {shippingAddress && (
              <div className="mt-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="different-billing"
                    checked={useDifferentBilling}
                    onCheckedChange={(checked) => setUseDifferentBilling(Boolean(checked))}
                  />
                  <Label htmlFor="different-billing">{t("address.useDifferentBilling")}</Label>
                </div>
                {useDifferentBilling && renderAddressSection("billing")}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("shipping.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={selectedShippingMethodId}
              onValueChange={setSelectedShippingMethodId}
              className="space-y-4"
            >
              {shippingMethods.map((method) => (
                <Label
                  key={method.id}
                  htmlFor={`shipping-${method.id}`}
                  className="flex cursor-pointer items-center justify-between rounded-md border p-4 has-[:checked]:border-primary has-[:checked]:bg-accent hover:bg-accent"
                >
                  <div className="flex items-center space-x-4">
                    <RadioGroupItem value={method.id} id={`shipping-${method.id}`} />
                    <div>
                      <p className="font-semibold">
                        {method.carrier} - {method.name}
                      </p>
                      <p className="text-sm text-muted-foreground">{method.description}</p>
                    </div>
                  </div>
                  <p className="font-semibold">
                    {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
                      Number(method.price)
                    )}
                  </p>
                </Label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      </section>

      <aside className="lg:col-span-1">
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle>{t("summary.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="divide-y divide-gray-200">
              {items.map((item: CartItem) => (
                <li key={item.id} className="flex py-4">
                  <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                    <Image
                      src={item.image || "/placeholder.svg"}
                      alt={item.name}
                      width={96}
                      height={96}
                      className="h-full w-full object-cover object-center"
                    />
                  </div>
                  <div className="ml-4 flex flex-1 flex-col">
                    <div>
                      <div className="flex justify-between text-base font-medium text-gray-900">
                        <h3>
                          {item.slug ? (
                            <a href={`/products/${item.slug}`} className="hover:underline">
                              {item.name}
                            </a>
                          ) : (
                            <span>{item.name}</span>
                          )}
                        </h3>
                        <p className="ml-4">
                          {new Intl.NumberFormat("fr-FR", {
                            style: "currency",
                            currency: "EUR",
                          }).format(item.price * item.quantity)}
                        </p>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {tCart("unitPrice")}:{" "}
                        {new Intl.NumberFormat("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                        }).format(item.price)}
                      </p>
                    </div>
                    <div className="flex flex-1 items-end justify-between text-sm">
                      <div className="flex items-center">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            item.id && handleUpdateItemQuantity(item.id, item.quantity - 1)
                          }
                          disabled={!item.id}
                          aria-label={tCart("decreaseQuantity", { itemName: item.name })}
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
                          onClick={() =>
                            item.id && handleUpdateItemQuantity(item.id, item.quantity + 1)
                          }
                          disabled={!item.id}
                          aria-label={tCart("increaseQuantity", { itemName: item.name })}
                        >
                          <PlusIcon className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => item.id && handleRemoveItem(item.id)}
                          disabled={!item.id}
                          className="hover:text-destructive/80 font-medium text-destructive"
                          aria-label={tCart("removeItem", { itemName: item.name })}
                        >
                          <XIcon className="mr-1 h-4 w-4" />
                          {tCart("remove")}
                        </Button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <hr />
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("summary.subtotal")}</span>
              <span>
                {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
                  subtotal
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("summary.shipping")}</span>
              <span>
                {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
                  shippingCost
                )}
              </span>
            </div>
            <hr />
            <div className="flex justify-between text-lg font-bold">
              <span>{t("summary.total")}</span>
              <span>
                {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
                  totalAmount
                )}
              </span>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={handlePayment}
              disabled={
                isPending ||
                !shippingAddress ||
                (useDifferentBilling && !billingAddress) ||
                !selectedShippingMethodId
              }
              className="w-full"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("payment.button")}
            </Button>
          </CardFooter>
        </Card>
      </aside>
    </main>
  );
}
