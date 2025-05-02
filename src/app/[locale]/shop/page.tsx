import { getTranslations } from "next-intl/server";
import { MainLayout } from "@/components/layout/main-layout";
import { createClient } from "@/lib/supabase/server";
import { Metadata } from "next";
import { ShopClientContent } from "@/components/domain/shop/shop-client-content";

type Props = {
  params: { locale: string };
};

export interface Product {
  id: string;
  name: string;
  description_short?: string | null;
  description_long?: string | null;
  price: number;
  currency?: string | null;
  image_url?: string | null;
  stock: number;
  unit?: string | null;
  category?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  is_new?: boolean | null;
  is_on_promotion?: boolean | null;
  labels?: string[] | null;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const locale = props.params.locale;
  const t = await getTranslations({ locale, namespace: 'ShopPage' });
  return {
    title: t('title'),
  };
}

export default async function ShopPage(props: Props) {
  // Fetch translations for the server component (title, errors)
  const t = await getTranslations("ShopPage");

  // Fetch raw products from Supabase
  const supabase = await createClient();
  const { data: products, error } = await supabase.from('products').select('*');

  if (error) {
    console.error('Error fetching products:', error);
    return (
      <MainLayout>
        <div className="container py-8">
          <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>
          <p className="text-red-500 text-center mt-10">{t('errorFetchingData')}</p>
        </div>
      </MainLayout>
    );
  }

  if (!products || products.length === 0) {
    return (
      <MainLayout>
        <div className="container py-8">
          <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>
          <p className="text-center mt-10">{t('noProductsFound')}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>
        <ShopClientContent initialProducts={products as Product[]} />
      </div>
    </MainLayout>
  );
}
