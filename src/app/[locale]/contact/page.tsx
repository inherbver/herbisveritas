// src/app/[locale]/contact/page.tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/shared/hero";
import { getNextUpcomingMarket, getAllUpcomingMarkets, formatDate } from "@/lib/market-utils";
import { MarketInfo } from "@/types/market";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin } from "lucide-react"; // Icônes pour les coordonnées

type Props = {
  params: { locale: string };
};

export default async function ContactPage({ params }: Props) {
  // Attendre les paramètres comme recommandé par Next.js pour les composants asynchrones
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ContactPage");

  const nextMarket = await getNextUpcomingMarket();
  const allUpcomingMarkets = await getAllUpcomingMarkets();

  const heroProps = {
    heading: t("defaultHeroHeading"),
    description: t("defaultHeroSubheading"), // Utilisera la prop 'description' de Hero
    imageUrl: "/images/hero/contact-default.jpg", // Prévoyez une image par défaut
    imageAlt: t("defaultHeroImageAlt"),
  };

  let nextMarketCtaButton = null;

  if (nextMarket) {
    heroProps.heading = t("nextMarketHeroHeading", { marketName: nextMarket.name });
    const formattedDate = formatDate(nextMarket.date, locale);
    heroProps.description = t("nextMarketHeroSubheading", {
      date: formattedDate,
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
        description={heroProps.description} // Passez le contenu à la prop 'description'
        imageUrl={heroProps.imageUrl}
        imageAlt={heroProps.imageAlt}
        // Pas de 'children' passés ici pour le subheading ou le CTA d'ancrage
      />

      <main className="container mx-auto px-4 py-12 sm:py-16 md:py-20">
        {nextMarketCtaButton} {/* Affiche le bouton CTA ici s'il existe */}
        {/* Section 2: Nos coordonnées */}
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
        {/* Section 3: Réseaux sociaux - Placeholder */}
        <section id="social-media" className="mb-12 bg-muted py-12 text-center md:mb-16 md:py-16">
          <h2 className="mb-6 text-3xl font-semibold tracking-tight">{t("socialMediaTitle")}</h2>
          <p className="mb-6 text-lg text-muted-foreground">{t("socialMediaSubtitle")}</p>
          {/* Icônes réseaux sociaux à ajouter ici */}
          <div className="flex justify-center space-x-4">
            {/* Exemple: <a href="#" aria-label="Facebook"><FacebookIcon /></a> */}
          </div>
        </section>
        {/* Section 4: Agenda des marchés */}
        <section id="marches" className="mb-12 md:mb-16">
          <h2 className="mb-8 text-center text-3xl font-semibold tracking-tight">
            {t("marketsAgendaTitle")}
          </h2>
          {allUpcomingMarkets.length > 0 ? (
            <div className="space-y-8">
              {allUpcomingMarkets.map((market: MarketInfo) => (
                <article key={market.id} className="rounded-lg border bg-card p-6 shadow-sm">
                  <h3 className="mb-2 text-2xl font-semibold text-primary">{market.name}</h3>
                  <p className="mb-1 text-lg">
                    <strong>{t("dateLabel")}:</strong> {formatDate(market.date, locale)}
                  </p>
                  <p className="mb-1 text-lg">
                    <strong>{t("cityLabel")}:</strong> {market.city}
                  </p>
                  <p className="mb-1 text-lg">
                    <strong>{t("hoursLabel")}:</strong> {market.startTime} - {market.endTime}
                  </p>
                  {market.address && (
                    <p className="mb-1 text-lg">
                      <strong>{t("addressLabel")}:</strong> {market.address}
                    </p>
                  )}
                  {market.description && (
                    <p className="mt-3 text-muted-foreground">{market.description}</p>
                  )}
                  <Button asChild variant="outline" className="mt-4">
                    <a href={market.gpsLink} target="_blank" rel="noopener noreferrer">
                      {t("seeOnMapButton")}
                    </a>
                  </Button>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-center text-lg text-muted-foreground">{t("noUpcomingMarkets")}</p>
          )}
        </section>
        {/* Section 5: Points de vente partenaires - Placeholder */}
        <section id="partner-shops" className="bg-muted py-12 md:py-16">
          <div className="container mx-auto px-4">
            <h2 className="mb-8 text-center text-3xl font-semibold tracking-tight">
              {t("partnerShopsTitle")}
            </h2>
            <p className="text-center text-lg text-muted-foreground">
              {t("partnerShopsComingSoon")}
            </p>
            {/* Cartes des boutiques partenaires à ajouter ici */}
          </div>
        </section>
      </main>
    </>
  );
}
