import { MainLayout } from "@/components/layout/main-layout";
import { getTranslations } from "next-intl/server";

type Props = {
  params: { locale: string };
};

export default async function ShopPage({ params: { locale: _locale } }: Props) {
  // Enable static rendering - Handled automatically by next-intl based on [locale] param

  const t = await getTranslations("ShopPage"); // Assuming a namespace for shop page translations

  return (
    <MainLayout>
      <div className="container py-8">
        <h1 className="mb-6 text-3xl font-bold">{t("title")}</h1>
        {/* Shop content will go here */}
        <p>Welcome to the shop!</p>
      </div>
    </MainLayout>
  );
}

// Optional: Add metadata generation if needed
// export async function generateMetadata({ params: { locale } }: Props) {
//   const t = await getTranslations({ locale, namespace: 'ShopPage' });
//   return {
//     title: t('title'),
//   };
// }
