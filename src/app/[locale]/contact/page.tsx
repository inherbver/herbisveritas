// src/app/[locale]/contact/page.tsx
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ContactPage({ params }: Props) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;

  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "ContactPage" });

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      {/* Contenu de la page Contact à venir */}
    </main>
  );
}
