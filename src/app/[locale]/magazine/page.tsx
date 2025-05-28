// src/app/[locale]/magazine/page.tsx
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function MagazinePage({ params }: Props) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;

  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "MagazinePage" });

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      {/* Contenu de la page Magazine à venir */}
    </main>
  );
}
