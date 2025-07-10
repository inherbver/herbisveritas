"use client";

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { createStripeCheckoutSession } from '@/actions/stripeActions';
import type { Cart, ShippingMethod, Address, CartItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import CheckoutAddressForm from './AddressForm';
import type { AddressFormData } from '@/lib/validators/address.validator';

interface CheckoutClientPageProps {
  cart: Cart;
  addresses: Address[];
  shippingMethods: ShippingMethod[];
  isUserAuthenticated: boolean;
}

export default function CheckoutClientPage({ cart, addresses, shippingMethods, isUserAuthenticated }: CheckoutClientPageProps) {
  const t = useTranslations('CheckoutPage');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // --- State Management ---
  const [selectedAddress, setSelectedAddress] = useState<Address | AddressFormData | undefined>(addresses.length > 0 ? addresses[0] : undefined);
  const [selectedShippingMethodId, setSelectedShippingMethodId] = useState<string | undefined>(shippingMethods[0]?.id);
  const [isAddingAddress, setIsAddingAddress] = useState(addresses.length === 0 && isUserAuthenticated);

  // --- Derived State ---
  const selectedShippingMethod = shippingMethods.find(method => method.id === selectedShippingMethodId);
  const shippingCost = selectedShippingMethod?.price ? Number(selectedShippingMethod.price) : 0;
  const totalAmount = cart.totalPrice + shippingCost;

  // --- Handlers ---
    const handleNewAddressSubmit = (data: AddressFormData) => {
    setSelectedAddress(data);
    setIsAddingAddress(false);
    toast.success(t('toast.addressSaved'));
  };

    const handlePayment = () => {
    if (!selectedAddress) {
      toast.error(t('toast.selectAddressError'));
      return;
    }
    if (!selectedShippingMethodId) {
      toast.error(t('toast.selectShippingError'));
      return;
    }

    startTransition(async () => {
      let addressToSend: Address;

      // If the selected address is from the form (doesn't have an 'id'),
      // we need to format it into a full Address object.
      if ('address_line1' in selectedAddress && !('id' in selectedAddress)) {
        addressToSend = {
          ...selectedAddress,
          id: `temp-${Date.now()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: '', // Not relevant for guest checkout session
        };
      } else {
        addressToSend = selectedAddress as Address;
      }

      const result = await createStripeCheckoutSession(addressToSend, selectedShippingMethodId);

      if (result.success && result.url) {
        // Redirect to Stripe Checkout
        window.location.href = result.url;
      } else {
        toast.error(t('toast.paymentErrorTitle'), {
          description: result.error,
        });
      }
    });
  };

  const renderAddressContent = () => {
    const displayAddress = (addr: any) => (
      <div>
        <p className="font-semibold">{addr.first_name} {addr.last_name}</p>
        <p>{addr.address_line1}</p>
        {addr.address_line2 && <p>{addr.address_line2}</p>}
        <p>{addr.postal_code} {addr.city}</p>
      </div>
    );

    // --- GUEST USER LOGIC ---
    if (!isUserAuthenticated) {
      if (!selectedAddress || isAddingAddress) {
        return (
          <CheckoutAddressForm
            addressType="shipping"
            onSubmit={handleNewAddressSubmit}
            isSubmitting={isPending}
            onCancel={selectedAddress ? () => setIsAddingAddress(false) : undefined}
          />
        );
      }
      return (
        <div className="space-y-4">
          <div className="p-4 border rounded-md bg-accent border-primary">
            {displayAddress(selectedAddress)}
          </div>
          <Button variant="outline" onClick={() => setIsAddingAddress(true)}>
            {t('address.editButton')}
          </Button>
        </div>
      );
    }

    // --- AUTHENTICATED USER LOGIC ---
    if (isAddingAddress || addresses.length === 0) {
      const addressToEdit = selectedAddress && 'id' in selectedAddress ? selectedAddress : null;
      return (
        <CheckoutAddressForm
          addressType="shipping"
          onSubmit={handleNewAddressSubmit}
          onCancel={() => setIsAddingAddress(false)}
          isSubmitting={isPending}
          existingAddress={addressToEdit}
        />
      );
    }

    return (
      <div className="space-y-4">
        <RadioGroup 
          value={selectedAddress && 'id' in selectedAddress ? selectedAddress.id : undefined} 
          onValueChange={(id) => setSelectedAddress(addresses.find(a => a.id === id))}
        >
          {addresses.map((address) => (
            <Label key={address.id} htmlFor={`address-${address.id}`} className="flex items-start p-4 border rounded-md cursor-pointer hover:bg-accent has-[:checked]:bg-accent has-[:checked]:border-primary">
              <RadioGroupItem value={address.id} id={`address-${address.id}`} className="mt-1" />
              <div className="ml-4">
                {displayAddress(address)}
              </div>
            </Label>
          ))}
        </RadioGroup>

        <Button variant="outline" onClick={() => setIsAddingAddress(true)}>
          {t('address.addNewButton')}
        </Button>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      <div className="lg:col-span-2 space-y-8">
        {/* --- Address Card --- */}
        <Card>
          <CardHeader>
            <CardTitle>{t('address.title')}</CardTitle>
            <CardDescription>{t('address.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            {renderAddressContent()}
          </CardContent>
        </Card>

        {/* --- Shipping Card --- */}
        <Card>
          <CardHeader>
            <CardTitle>{t('shipping.title')}</CardTitle>
            <CardDescription>{t('shipping.description')}</CardDescription>
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

      {/* --- Summary Card --- */}
      <div className="lg:col-span-1">
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle>{t('summary.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cart.items.map((item: CartItem) => (
              <div key={item.id} className="flex justify-between items-center text-sm">
                <p>{item.name} <span className="text-muted-foreground">x{item.quantity}</span></p>
                <p>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(item.price * item.quantity)}</p>
              </div>
            ))}
            <hr/>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('summary.subtotal')}</span>
              <span>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cart.totalPrice)}</span>
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
            <Button onClick={handlePayment} disabled={isPending || !selectedAddress || !selectedShippingMethodId} className="w-full">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('summary.payButton')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
