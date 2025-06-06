import { useTranslations } from "next-intl";
import { Leaf, ShieldCheck, HeartHandshake } from "lucide-react";

interface ValueItem {
  id: string;
  icon: React.ElementType;
  titleKey: string;
  descriptionKey: string;
}

const valuesData: ValueItem[] = [
  {
    id: "authenticity",
    icon: Leaf,
    titleKey: "sections.items.authenticity.title",
    descriptionKey: "sections.items.authenticity.description",
  },
  {
    id: "quality",
    icon: ShieldCheck,
    titleKey: "sections.items.quality.title",
    descriptionKey: "sections.items.quality.description",
  },
  {
    id: "respect",
    icon: HeartHandshake,
    titleKey: "sections.items.respect.title",
    descriptionKey: "sections.items.respect.description",
  },
];

export default function ValuesSection() {
  const t = useTranslations("AboutPage");
  // Le console.log ci-dessous va maintenant chercher AboutPage.sections.items.authenticity.title
  // ce qui est correct si valuesData[0].titleKey est utilisé.
  // Pour un test direct : t('sections.items.authenticity.title')
  console.log(
    "[ValuesSection - Client] Attempting to get authenticity.title defined in valuesData[0]:",
    t(valuesData[0].titleKey)
  );

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3 xl:gap-12">
      {valuesData.map((value) => {
        const IconComponent = value.icon;
        return (
          <div
            key={value.id}
            className="flex flex-col items-center space-y-3 rounded-xl bg-gray-100 p-6 text-center dark:bg-gray-800"
          >
            <span className="inline-block rounded-full bg-blue-100 p-3 text-blue-500 dark:bg-blue-500 dark:text-white">
              <IconComponent className="h-6 w-6" />
            </span>
            <h3 className="text-xl font-semibold capitalize text-gray-700 dark:text-white">
              {t(value.titleKey)}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-300">{t(value.descriptionKey)}</p>
            {/* Lien 'read more' omis pour l'instant */}
          </div>
        );
      })}
    </div>
  );
}
