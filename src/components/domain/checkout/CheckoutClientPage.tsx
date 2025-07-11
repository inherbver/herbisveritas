"use client";

import { useState, useTransition, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Link as NextLink } from '@/i18n/navigation';
import useCartStore, { selectCartItems, selectCartSubtotal } from '@/stores/cartStore';
import { removeItemFromCart, updateCartItemQuantity as updateCartItemQuantityAction } from '@/actions/cartActions';
import { createStripeCheckoutSession } from '@/actions/stripeActions';
import type { Cart, ShippingMethod, Address, CartItem, CartData } from '@/types';
import type { CartActionResult, RemoveFromCartInput, UpdateCartItemQuantityInput } from '@/lib/cart-helpers';
import { isSuccessResult } from '@/lib/cart-helpers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, MinusIcon, PlusIcon, XIcon } from 'lucide-react';
import CheckoutAddressForm from './AddressForm';
import type { AddressFormData } from '@/lib/validators/address.validator';

interface CheckoutClientPageProps {
  cart: Cart;
  shippingAddress: Address | null;
  billingAddress: Address | null;
  shippingMethods: ShippingMethod[];
  isUserAuthenticated: boolean;
}

const DisplayAddress = ({ address }: { address: Address | AddressFormData }) => (
  <div className="text-sm">
    <p className="font-semibold">{address.first_name} {address.last_name}</p>
    <p>{address.address_line1}</p>
    {address.address_line2 && <p>{address.address_line2}</p>}
    <p>{address.postal_code} {address.city}</p>
  </div>
);

export default function CheckoutClientPage({ cart, shippingAddress: initialShippingAddress, billingAddress: initialBillingAddress, shippingMethods, isUserAuthenticated }: CheckoutClientPageProps) {
  const t = useTranslations('CheckoutPage');
  const tCart = useTranslations('CartDisplay');
  const tGlobal = useTranslations('Global');
  const [isPending, startTransition] = useTransition();

  // Cart state from Zustand store
  const items = useCartStore(selectCartItems);
  const subtotal = useCartStore(selectCartSubtotal);
  const { _setItems } = useCartStore((state) => ({ _setItems: state._setItems }));

  // Local UI state
  const [shippingAddress, setShippingAddress] = useState<Address | AddressFormData | null>(initialShippingAddress);
  const [billingAddress, setBillingAddress] = useState<Address | AddressFormData | null>(initialBillingAddress);
  const [useDifferentBilling, setUseDifferentBilling] = useState(false);
  const [editingAddressType, setEditingAddressType] = useState<'shipping' | 'billing' | null>(null);
  const [selectedShippingMethodId, setSelectedShippingMethodId] = useState<string | undefined>(shippingMethods[0]?.id);

  useEffect(() => {
    // Sync server-side cart data with client-side Zustand store on initial mount
    if (cart) {
      useCartStore.getState()._setItems(cart.items);
    }

    if (isUserAuthenticated && !initialShippingAddress) {
      setEditingAddressType('shipping');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  const selectedShippingMethod = shippingMethods.find(method => method.id === selectedShippingMethodId);
  const shippingCost = selectedShippingMethod?.price ? Number(selectedShippingMethod.price) : 0;
  const totalAmount = subtotal + shippingCost;

  const handleAddressFormSubmit = (data: AddressFormData) => {
    if (editingAddressType === 'shipping') {
      setShippingAddress(data);
    } else if (editingAddressType === 'billing') {
      setBillingAddress(data);
    }
    setEditingAddressType(null);
    toast.success(t('toast.addressSaved'));
  };

  const handleRemoveItem = async (cartItemId: string) => {
    const actionInput: RemoveFromCartInput = { cartItemId };
    const result: CartActionResult<CartData | null> = await removeItemFromCart(actionInput);

    if (isSuccessResult(result)) {
      toast.success(result.message || tCart('itemRemovedSuccess'));
      if (result.data?.items) {
        _setItems(result.data.items);
      }
    } else {
      toast.error(result.message || tGlobal('genericError'));
    }
  };

  const handleUpdateItemQuantity = async (cartItemId: string, newQuantity: number) => {
    if (newQuantity < 0) return;

    const currentItems = useCartStore.getState().items;
    const previousState = [...currentItems];

    const optimisticItems = currentItems
      .map((item) => (item.id === cartItemId ? { ...item, quantity: newQuantity } : item))
      .filter((item) => item.quantity > 0);

    _setItems(optimisticItems);

    const actionInput: UpdateCartItemQuantityInput = { cartItemId, quantity: newQuantity };
    const result: CartActionResult<CartData | null> = await updateCartItemQuantityAction(actionInput);

    if (isSuccessResult(result) && result.data?.items) {
       _setItems(result.data.items);
    } else {
      toast.error(result.message || tGlobal('genericError'));
      _setItems(previousState); // Rollback on error
    }
  };

  const handlePayment = () => {
    if (!shippingAddress) {
      toast.error(t('toast.selectAddressError'));
      return;
    }
    if (useDifferentBilling && !billingAddress) {
      toast.error(t('toast.selectBillingAddressError'));
      return;
    }

    startTransition(async () => {
      const buildAddress = (addr: Address | AddressFormData): Address => {
        if ('id' in addr) {
          return addr; // Already a full Address object
        }
        // It's AddressFormData, so we build a temporary Address object
        return {
          ...addr,
          id: `temp-${Date.now()}`,
          user_id: '', // Not relevant for this action
          is_default: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      };

      const finalShippingAddress = buildAddress(shippingAddress);
      const finalBillingAddress = useDifferentBilling && billingAddress ? buildAddress(billingAddress) : finalShippingAddress;

      const result = await createStripeCheckoutSession(finalShippingAddress, finalBillingAddress, selectedShippingMethodId!);

      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        toast.error(t('toast.paymentErrorTitle'), { description: result.error });
      }
    });
  };

  const renderAddressSection = (type: 'shipping' | 'billing') => {
    const address = type === 'shipping' ? shippingAddress : billingAddress;
    const title = type === 'shipping' ? t('address.shippingTitle') : t('address.billingTitle');

    if (editingAddressType === type) {
      return (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-4">{title}</h3>
          <CheckoutAddressForm
            addressType={type}
            onSubmit={handleAddressFormSubmit}
            isSubmitting={isPending}
            onCancel={() => setEditingAddressType(null)}
            existingAddress={address && 'id' in address ? address : undefined}
          />
        </div>
      );
    }

    if (address) {
      return (
        <div className="mt-4 p-4 border rounded-md flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <DisplayAddress address={address} />
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditingAddressType(type)}>{t('address.editButton')}</Button>
        </div>
      );
    }

    return (
      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <Button variant="secondary" onClick={() => setEditingAddressType(type)}>{t('address.addButton')}</Button>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      <div className="lg:col-span-2 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>{t('address.shippingTitle')}</CardTitle>
            {!isUserAuthenticated && <CardDescription>{t('address.guestDescription')}</CardDescription>}
          </CardHeader>
          <CardContent>
            {renderAddressSection('shipping')}
            {shippingAddress && (
              <div className="mt-6">
                <div className="flex items-center space-x-2">
                  <Checkbox id="different-billing" checked={useDifferentBilling} onCheckedChange={(checked) => setUseDifferentBilling(Boolean(checked))} />
                  <Label htmlFor="different-billing">{t('address.useDifferentBilling')}</Label>
                </div>
                {useDifferentBilling && renderAddressSection('billing')}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('shipping.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={selectedShippingMethodId} onValueChange={setSelectedShippingMethodId} className="space-y-4">
              {shippingMethods.map((method) => (
                 <Label key={method.id} htmlFor={`shipping-${method.id}`} className="flex items-center justify-between p-4 border rounded-md cursor-pointer hover:bg-accent has-[:checked]:bg-accent has-[:checked]:border-primary">
                  <div className="flex items-center space-x-4">
                    <RadioGroupItem value={method.id} id={`shipping-${method.id}`} />
                    <div>
                      <p className="font-semibold">{method.carrier} - {method.name}</p>
                      <p className="text-sm text-muted-foreground">{method.description}</p>
                    </div>
                  </div>
                  <p className="font-semibold">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(method.price))}</p>
                </Label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle>{t('summary.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="divide-y divide-gray-200">
              {items.map((item: CartItem) => (
                <li key={item.id} className="flex py-4">
                  <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                    <Image
                      src={item.imageUrl || '/placeholder.svg'}
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
                          <NextLink href={`/product/${item.productSlug}`}>{item.name}</NextLink>
                        </h3>
                        <p className="ml-4">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(item.price * item.quantity)}</p>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{tCart('unitPrice')}: {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(item.price)}</p>
                    </div>
                    <div className="flex flex-1 items-end justify-between text-sm">
                      <div className="flex items-center">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleUpdateItemQuantity(item.id, item.quantity - 1)} aria-label={tCart('decreaseQuantity', { itemName: item.name })}>
                          <MinusIcon className="h-4 w-4" />
                        </Button>
                        <span className="mx-3 w-8 text-center" aria-live="polite">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleUpdateItemQuantity(item.id, item.quantity + 1)} aria-label={tCart('increaseQuantity', { itemName: item.name })}>
                          <PlusIcon className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex">
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(item.id)} className="hover:text-destructive/80 font-medium text-destructive" aria-label={tCart('removeItem', { itemName: item.name })}>
                          <XIcon className="mr-1 h-4 w-4" />
                          {tCart('remove')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <hr/>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('summary.subtotal')}</span>
              <span>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('summary.shipping')}</span>
              <span>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(shippingCost)}</span>
            </div>
            <hr />
            <div className="flex justify-between font-bold text-lg">
              <span>{t('summary.total')}</span>
              <span>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(totalAmount)}</span>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handlePayment} disabled={isPending || !shippingAddress || (useDifferentBilling && !billingAddress) || !selectedShippingMethodId} className="w-full">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('payment.button')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
