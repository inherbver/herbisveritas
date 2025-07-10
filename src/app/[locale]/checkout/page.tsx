import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCart } from '@/lib/cartReader';
import { pick } from 'lodash';
import { NextIntlClientProvider } from 'next-intl';
import { redirect } from 'next/navigation';
import { getMessages, getTranslations } from 'next-intl/server';
import CheckoutClientPage from '@/components/domain/checkout/CheckoutClientPage';
import { Address, ShippingMethod, Cart } from '@/types';
import { Metadata } from 'next';

interface CheckoutPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export async function generateMetadata({ params }: CheckoutPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'CheckoutPage' });
  return {
    title: t('title'),
  };
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { locale } = await params;
  const t = await getTranslations('CheckoutPage');
  const messages = await getMessages();
  const supabase = await createSupabaseServerClient();

  const cartResult = await getCart();
  if (!cartResult.success || !cartResult.data || cartResult.data.items.length === 0) {
    redirect(`/${locale}/boutique`);
  }

  const cartData = cartResult.data;
  const cart: Cart = {
    id: cartData.id,
    items: cartData.items,
    totalPrice: cartData.items.reduce((acc, item) => acc + item.price * item.quantity, 0),
    totalItems: cartData.items.reduce((acc, item) => acc + item.quantity, 0),
  };

  const { data: { session } } = await supabase.auth.getSession();

  const fetchAddresses = async (): Promise<{ data: Address[]; error: any }> => {
    if (!session) return { data: [], error: null };
    const { data, error } = await supabase.from('addresses').select('*').eq('user_id', session.user.id);
    return { data: data || [], error };
  };

  const fetchShippingMethods = async (): Promise<{ data: ShippingMethod[]; error: any }> => {
    const { data, error } = await supabase.from('shipping_methods').select('*');
    if (error) {
      console.warn('[CHECKOUT] shipping_methods table does not exist. Using default data.');
      return {
        data: [
          {
            id: 'default-1',
            name: 'Livraison standard',
            description: 'Livraison sous 3-5 jours ouvrés',
            price: '4.95',
            carrier: 'Standard',
            is_active: true,
          },
        ],
        error: null,
      };
    }
    return { data: data || [], error };
  };

  const [addressesResult, shippingMethodsResult] = await Promise.all([
    fetchAddresses(),
    fetchShippingMethods(),
  ]);

  if (addressesResult.error) {
    console.error('Error fetching addresses:', addressesResult.error);
  }
  if (shippingMethodsResult.error) {
    console.error('Error fetching shipping methods:', shippingMethodsResult.error);
  }

  return (
    <main className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8 text-center">{t('title')}</h1>
      <NextIntlClientProvider messages={pick(messages, 'AddressForm', 'CheckoutPage')}>
        <CheckoutClientPage
          cart={cart}
          addresses={addressesResult.data}
          shippingMethods={shippingMethodsResult.data}
          isUserAuthenticated={!!session}
        />
      </NextIntlClientProvider>
    </main>
  );
}