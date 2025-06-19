// src/app/[locale]/contact/page.tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/shared/hero";
import { getNextUpcomingMarket, getAllMarketsSorted } from "@/lib/market-utils";
// import { MarketInfo } from "@/types/market"; // MarketInfo sera utilisé dans MarketAgenda
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin } from "lucide-react"; // Icônes pour les coordonnées
import { MarketCalendarView } from "@/components/domain/market/MarketCalendarView"; // Import du nouveau composant calendrier
import { SocialFollow } from "@/components/domain/social/SocialFollow"; // Import du composant pour les réseaux sociaux

type Props = {
  params: { locale: string };
};

export default async function ContactPage({ params }: Props) {
  const { locale } = await params; // Pas besoin d'attendre ici, Next.js gère cela pour les props de page
  setRequestLocale(locale);
  const t = await getTranslations("ContactPage");

  const nextMarket = await getNextUpcomingMarket();
  const allSortedMarkets = await getAllMarketsSorted(); // Récupération de tous les marchés triés

  const heroProps = {
    heading: t("defaultHeroHeading"),
    description: t("defaultHeroSubheading"),
    imageUrl: "/images/hero/contact-default.jpg",
    imageAlt: t("defaultHeroImageAlt"),
  };

  let nextMarketCtaButton = null;

  if (nextMarket) {
    // La fonction formatDate sera appelée dans le composant Hero ou ici si besoin spécifique
    // Pour l'instant, on suppose que Hero gère le formatage ou que les traductions l'incluent.
    // Si formatDate est spécifique à la construction de la description ici, il faut l'importer.
    // Pour simplifier, on assume que les traductions peuvent gérer le formatage ou que Hero le fait.
    const { formatDate: formatDateForHero } = await import("@/lib/market-utils"); // Import local si besoin
    const formattedDate = formatDateForHero(nextMarket.date, locale);

    heroProps.heading = t("nextMarketHeroHeading", { marketName: nextMarket.name });
    heroProps.description = t("nextMarketHeroSubheading", {
      date: formattedDate, // Date formatée passée à la traduction
      city: nextMarket.city,
      startTime: nextMarket.startTime,
      endTime: nextMarket.endTime,
    });
    heroProps.imageUrl = nextMarket.heroImage || "/images/hero/default-market-night.jpg";
    heroProps.imageAlt = t("nextMarketHeroImageAlt", { marketName: nextMarket.name });

    nextMarketCtaButton = (
      <div className="my-8 text-center">
        <a href="#marches">
          <Button size="lg" variant="default">
            {t("seeAllMarketsButton")}
          </Button>
        </a>
      </div>
    );
  }

  return (
    <>
      <Hero
        heading={heroProps.heading}
        description={heroProps.description}
        imageUrl={heroProps.imageUrl}
        imageAlt={heroProps.imageAlt}
      />

      <main className="container mx-auto px-4 py-12 sm:py-16 md:py-20">
        {nextMarketCtaButton}
        <section id="coordinates" className="mb-12 md:mb-16">
          <h2 className="mb-6 text-center text-3xl font-semibold tracking-tight">
            {t("coordinatesTitle")}
          </h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-12">
            <div className="flex flex-col items-center text-center">
              <Mail className="mb-3 h-10 w-10 text-primary" />
              <h3 className="mb-1 text-xl font-medium">{t("emailTitle")}</h3>
              <a href="mailto:inherbisveritas@gmail.com" className="hover:text-primary">
                inherbisveritas@gmail.com
              </a>
            </div>
            <div className="flex flex-col items-center text-center">
              <Phone className="mb-3 h-10 w-10 text-primary" />
              <h3 className="mb-1 text-xl font-medium">{t("phoneTitle")}</h3>
              <p>06 38 89 53 24</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <MapPin className="mb-3 h-10 w-10 text-primary" />
              <h3 className="mb-1 text-xl font-medium">{t("headquartersTitle")}</h3>
              <p>2105 Route du Thérondel, 34700 Fozières</p>
            </div>
          </div>
        </section>
        <section id="social-media" className="mb-12 py-12 text-center md:mb-16">
          <h2 className="mb-6 text-3xl font-semibold tracking-tight">{t("socialMediaTitle")}</h2>
          <p className="mb-6 text-lg text-muted-foreground">{t("socialMediaSubtitle")}</p>
          <SocialFollow />
        </section>

        {/* Section 4: Agenda des marchés - Utilisation du nouveau composant client */}
        <section id="marches" className="mb-12 flex flex-col items-center md:mb-16">
          <h2 className="mb-8 text-center text-3xl font-semibold tracking-tight">
            {t("marketsAgendaTitle")}
          </h2>
          <MarketCalendarView initialMarkets={allSortedMarkets} locale={locale} />
        </section>

        <section id="partner-shops" className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            <h2 className="mb-8 text-center text-3xl font-semibold tracking-tight">
              {t("partnerShopsTitle")}
            </h2>
            <p className="text-center text-lg text-muted-foreground">
              {t("partnerShopsComingSoon")}
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
