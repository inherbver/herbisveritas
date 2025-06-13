// src/components/domain/about/story-section.tsx
import { useTranslations } from "next-intl";
import Image from "next/image";
import { cn } from "@/lib/utils"; // Pour combiner les classes Tailwind

export const StorySection = () => {
  const t = useTranslations("AboutPage.Story");

  return (
    <section className="bg-background py-16 md:py-24">
      {" "}
      {/* Espacement vertical généreux */}
      <div className="container mx-auto px-4">
        <div className="grid items-center md:grid-cols-12 md:gap-x-12 lg:gap-x-16">
          {/* Colonne Texte */}
          <article className="prose prose-lg dark:prose-invert max-w-none md:col-span-7 lg:col-span-6">
            {" "}
            {/* Utilisation de Tailwind Typography pour un style de texte agréable */}
            <h2 className="mb-6 text-3xl font-bold !leading-tight text-primary md:text-4xl">
              {" "}
              {/* Retrait du !leading-tight si non nécessaire */}
              {t("title")}
            </h2>
            <p className="lead mb-6">
              {" "}
              {/* Classe 'lead' pour l'intro si définie dans votre prose config */}
              {t("intro")}
            </p>
            <p>
              <strong className="font-semibold">{t("paragraph1_lead")}</strong>{" "}
              {t("paragraph1_text")}
            </p>
            <p>
              <strong className="font-semibold">{t("paragraph2_lead")}</strong>{" "}
              {t("paragraph2_text")}
            </p>
            <p>
              <strong className="font-semibold">{t("paragraph3_lead")}</strong>{" "}
              {t("paragraph3_text")}
            </p>
          </article>

          {/* Colonne Image */}
          <div className="mt-10 md:col-span-5 md:mt-0 lg:col-span-6">
            <figure
              className={cn(
                "relative aspect-[4/3] overflow-hidden rounded-lg shadow-xl", // Aspect ratio, coins arrondis, ombre
                "transition-all duration-300 hover:shadow-2xl" // Effet de survol
              )}
            >
              <Image
                src="https://esgirafriwoildqcwtjm.supabase.co/storage/v1/object/public/about/about_001.webp"
                alt={t("imageAlt")}
                fill // 'fill' pour remplir le conteneur parent
                className="object-cover" // Assure que l'image couvre bien sans se déformer
              />
              {/* Optionnel: Légende pour l'image */}
              {/* <figcaption className="mt-2 text-sm text-muted-foreground text-center">{t("imageCaption")}</figcaption> */}
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
};
