import { DashboardShell } from '@/components/admin/dashboard-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ProductForm } from './product-form';
import { getTranslations } from 'next-intl/server';

export default async function NewProductPage() {
  const t = await getTranslations('AdminProducts');

  return (
    <DashboardShell title={t('addNewProductTitle')}>
      <Card>
        <CardHeader>
          <CardTitle>{t('productDetailsTitle')}</CardTitle>
          <CardDescription>
            {t('productDetailsDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductForm />
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
