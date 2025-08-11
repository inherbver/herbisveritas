import { useTranslations } from "next-intl";
import { Leaf, ShieldCheck, HeartHandshake } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/utils/cn";

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
          <Card
            key={value.id}
            className={cn(
              "group transition-all duration-300 hover:shadow-lg",
              "border-border/50 bg-card text-card-foreground"
            )}
          >
            <CardContent className="flex flex-col items-center space-y-4 p-8 text-center">
              <div className="bg-primary/10 group-hover:bg-primary/20 rounded-full p-4 transition-colors duration-300">
                <IconComponent className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">{t(value.titleKey)}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t(value.descriptionKey)}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
