import { DashboardShell } from '@/components/admin/dashboard-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ProductForm } from '../../new/product-form';
import { getTranslations } from 'next-intl/server';
import { getProductByIdForAdmin } from '@/lib/supabase/queries/products';
import { notFound } from 'next/navigation';
import { type ProductWithTranslations } from '@/lib/supabase/queries/products';

interface EditProductPageProps {
  params: {
    id: string;
    locale: string;
  };
}

export default async function EditProductPage({
  params,
}: EditProductPageProps) {
  const { id } = params;
  const t = await getTranslations('AdminProducts');
  const product = await getProductByIdForAdmin(id);

  if (!product) {
    notFound();
  }

  return (
    <DashboardShell title={t('editProductTitle')}>
      <Card>
        <CardHeader>
          <CardTitle>{t('productDetailsTitle')}</CardTitle>
          <CardDescription>
            {t('editProductDetailsDescription', { productName: product.name || 'produit' })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Le formulaire sera adapté à l'étape suivante pour accepter initialData */}
          <ProductForm initialData={product as ProductWithTranslations} />
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
