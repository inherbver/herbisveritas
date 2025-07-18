import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCart } from "@/lib/cartReader";
import { PostgrestError } from "@supabase/supabase-js";

import { redirect } from 'next/navigation';
import { getMessages, getTranslations } from 'next-intl/server';
import CheckoutClientPage from '@/components/domain/checkout/CheckoutClientPage';
import { Address, ShippingMethod } from '@/types'; // ✅ Supprimer Cart qui n'existe pas
import { CartDataFromServer, ServerCartItem } from '@/types/cart'; // ✅ Importer les bons types
import { Metadata } from 'next';

interface CheckoutPageProps {
  params: Promise<{
    locale: string;
  }>;
}

// ✅ Type pour ShippingMethod avec carrier optionnel
interface ShippingMethodDB {
  id: string;
  name: string;
  description: string | null;
  price: number;
  carrier: string | null; // Peut être null dans la DB
  is_active: boolean;
  created_at: string;
}

// ✅ Type pour Address avec address_type flexible
interface AddressDB {
  id: string;
  user_id: string;
  address_type: string; // Plus flexible que 'shipping' | 'billing'
  is_default: boolean;
  company_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  address_line1: string;
  address_line2?: string | null;
  postal_code: string;
  city: string;
  country_code: string;
  state?: string;
  state_province_region?: string | null;
  phone_number?: string | null;
  email?: string | null;
  created_at: string;
  updated_at: string;
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
  const t = await getTranslations({ locale, namespace: 'CheckoutPage' });
  const supabase = await createSupabaseServerClient();

  const cartResult = await getCart();
  if (!cartResult.success || !cartResult.data || cartResult.data.items.length === 0) {
    redirect(`/${locale}/boutique`);
  }

  const cartData = cartResult.data;
  // ✅ Pas besoin de transformer, passer directement cartData (CartDataFromServer)

  const { data: { user } } = await supabase.auth.getUser();

  const fetchUserAddresses = async (): Promise<{ shippingAddress: Address | null; billingAddress: Address | null; error: PostgrestError | null }> => {
    if (!user) return { shippingAddress: null, billingAddress: null, error: null };
    
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .returns<AddressDB[]>();

    if (error) {
      return { shippingAddress: null, billingAddress: null, error: error as PostgrestError | null };
    }

    // ✅ Transformer AddressDB vers Address avec gestion des null/undefined
    const transformAddress = (addr: AddressDB): Address => ({
      ...addr,
      address_type: addr.address_type as 'shipping' | 'billing', // Cast sécurisé
      email: addr.email || undefined, // ✅ Convertir null vers undefined
    });

    const shippingAddressDB = data?.find(addr => addr.address_type === 'shipping') || null;
    const billingAddressDB = data?.find(addr => addr.address_type === 'billing') || null;

    const shippingAddress = shippingAddressDB ? transformAddress(shippingAddressDB) : null;
    const billingAddress = billingAddressDB ? transformAddress(billingAddressDB) : null;

    return { shippingAddress, billingAddress, error: null };
  };

  const fetchShippingMethods = async (): Promise<{ data: ShippingMethod[]; error: PostgrestError | null }> => {
    const { data, error } = await supabase
      .from('shipping_methods')
      .select('*')
      .returns<ShippingMethodDB[]>();
    
    if (error) {
      console.warn('[CHECKOUT] shipping_methods table does not exist. Using default data.');
      return {
        data: [
          {
            id: 'default-1',
            name: 'Livraison standard',
            description: 'Livraison sous 3-5 jours ouvrés',
            price: '4.95',
            carrier: 'Standard', // ✅ String non null pour le fallback
            is_active: true,
          },
        ],
        error: null,
      };
    }

    // ✅ Transformer ShippingMethodDB vers ShippingMethod
    const transformedMethods: ShippingMethod[] = (data || []).map(method => ({
      id: method.id,
      name: method.name,
      description: method.description || '',
      price: method.price.toString(), // Convertir number vers string
      carrier: method.carrier || 'Standard', // ✅ Fournir une valeur par défaut pour null
      is_active: method.is_active,
    }));

    return { data: transformedMethods, error };
  };

  const [userAddressesResult, shippingMethodsResult] = await Promise.all([
    fetchUserAddresses(),
    fetchShippingMethods(),
  ]);

  if (userAddressesResult.error) {
    console.error('Error fetching addresses:', userAddressesResult.error);
  }
  if (shippingMethodsResult.error) {
    console.error('Error fetching shipping methods:', shippingMethodsResult.error);
  }

  return (
    <main className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8 text-center">{t('title')}</h1>
      <CheckoutClientPage
        // ✅ Passer CartDataFromServer directement
        cart={cartData}
        shippingAddress={userAddressesResult.shippingAddress}
        billingAddress={userAddressesResult.billingAddress}
        shippingMethods={shippingMethodsResult.data}
        isUserAuthenticated={!!user}
      />
    </main>
  );
}