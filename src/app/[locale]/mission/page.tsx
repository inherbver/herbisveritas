import { useTranslations } from "next-intl";

export default function MissionPage() {
  const t = useTranslations("MissionPage");

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-4 text-3xl font-bold">{t("title")}</h1>
      {/* Le contenu de la page "Notre mission" viendra ici */}
    </div>
  );
}
