import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import ValuesSection from "@/components/domain/about/ValuesSection";
import { Hero } from "@/components/shared/hero"; // Utiliser le Hero partagé avec une importation nommée

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const { locale } = await params;
  const tPage = await getTranslations({ locale, namespace: "AboutPage" });
  console.log(
    "[AboutPage - generateMetadata] Locale:",
    locale,
    "Attempting to get hero.title:",
    tPage("hero.title")
  ); // Correction: hero.heading -> hero.title
  console.log(
    "[AboutPage - generateMetadata] Attempting to get sections.values.title:",
    tPage("sections.values.title")
  );
  return {
    title: tPage("navigation.title"), // Assurez-vous que AboutPage.json a navigation.title
    // description: tPage('hero.description'), // Décommentez et assurez-vous que la clé existe si besoin
  };
}

export default function AboutPage() {
  // Renommer la fonction pour correspondre
  const t = useTranslations("AboutPage");

  const tHero = useTranslations("AboutPage.hero"); // Translations pour la section Hero

  return (
    <>
      <Hero
        heading={tHero("title")}
        description={tHero("subtitle")}
        imageUrl="https://esgirafriwoildqcwtjm.supabase.co/storage/v1/object/public/contact//hero_contact.webp"
        imageAlt={tHero("imageAlt")}
        // ctaLabel={tHero("ctaLabel")} // Décommenter si un CTA est souhaité
        // ctaLink="/products" // Adapter le lien du CTA si besoin
        className="min-h-[50vh] md:min-h-[60vh]" // Ajuster la hauteur minimale pour bien voir l'image
      />
      {/* Le titre principal de la page est maintenant géré par le composant Hero partagé */}

      {/* Conteneur principal pour les sections sous le Hero */}
      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Section Nos Valeurs */}
        <section id="values" className="py-12 md:py-16">
          <h2 className="mb-10 text-center text-3xl font-bold tracking-tight sm:text-4xl md:mb-12">
            {t("sections.values.title")}
          </h2>
          <ValuesSection />
        </section>

        <section id="bestsellers" className="py-12 md:py-16">
          <h2 className="mb-10 text-center text-3xl font-bold tracking-tight sm:text-4xl md:mb-12">
            {t("sections.bestsellers.title")}
          </h2>
          {/* <BestSellersSection /> */}
          <p className="text-center text-muted-foreground">
            Contenu pour la section Nos Best-Sellers à venir.
          </p>
        </section>

        {/* Ajoutez d'autres sections ici au fur et à mesure de leur développement */}
      </main>
    </>
  );
}
