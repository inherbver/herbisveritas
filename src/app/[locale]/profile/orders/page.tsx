import { getTranslations } from "next-intl/server";
import { Metadata } from "next";

interface OrdersPageProps {
  params: { locale: string };
}

export async function generateMetadata(props: OrdersPageProps): Promise<Metadata> {
  const { locale: currentLocale } = await props.params;
  const t = await getTranslations({ locale: currentLocale, namespace: "OrdersPage" });
  return {
    title: t("metadata.title"),
    description: t("metadata.description"),
  };
}

export default async function OrdersPage(props: OrdersPageProps) {
  const { locale: currentLocale } = await props.params;
  const t = await getTranslations({ locale: currentLocale, namespace: "OrdersPage" });

  return (
    <section className="space-y-8 rounded-lg bg-card p-6 shadow-lg md:p-8">
      <header>
        <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
      </header>
      <p className="text-lg text-muted-foreground">{t("underConstruction")}</p>
    </section>
  );
}
