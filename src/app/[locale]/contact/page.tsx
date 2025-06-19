// src/app/[locale]/contact/page.tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/shared/hero";
import { getNextUpcomingMarket, getAllMarketsSorted } from "@/lib/market-utils";
// import { MarketInfo } from "@/types/market"; // MarketInfo sera utilisé dans MarketAgenda

import { Mail, Phone, MapPin } from "lucide-react"; // Icônes pour les coordonnées
import { MarketCalendarView } from "@/components/domain/market/MarketCalendarView"; // Import du nouveau composant calendrier
import { SocialFollow } from "@/components/domain/social/SocialFollow"; // Import du composant pour les réseaux sociaux
import { PartnerShopCard, PartnerShop } from "@/components/domain/partner/PartnerShopCard";
import partnersData from "@/data/partners.json"; // Import du composant pour les réseaux sociaux

type Props = {
  params: Promise<{ locale: string }>; // Changement ici : Promise
};

export default async function ContactPage({ params }: Props) {
  const { locale } = await params; // Ajout d'await ici
  setRequestLocale(locale);
  const t = await getTranslations("ContactPage");

  const nextMarket = await getNextUpcomingMarket();
  const allSortedMarkets = await getAllMarketsSorted(); // Récupération de tous les marchés triés

  const heroProps: {
    heading: string;
    description: string;
    imageUrl: string;
    imageAlt: string;
    ctaLabel?: string;
    ctaLink?: string;
  } = {
    heading: t("defaultHeroHeading"),
    description: t("defaultHeroSubheading"),
    imageUrl: "/images/hero/contact-default.jpg",
    imageAlt: t("defaultHeroImageAlt"),
  };

  if (nextMarket) {
    const { formatDate: formatDateForHero } = await import("@/lib/market-utils");
    const formattedDate = formatDateForHero(nextMarket.date, locale);

    heroProps.heading = t("nextMarketHeroHeading", { marketName: nextMarket.name });
    heroProps.description = t("nextMarketHeroSubheading", {
      date: formattedDate,
      city: nextMarket.city,
      startTime: nextMarket.startTime,
      endTime: nextMarket.endTime,
    });
    heroProps.imageUrl = nextMarket.heroImage || "/images/hero/default-market-night.jpg";
    heroProps.imageAlt = t("nextMarketHeroImageAlt", { marketName: nextMarket.name });
    heroProps.ctaLabel = t("seeAllMarketsButton");
    heroProps.ctaLink = "#marches";
  }

  const partners: PartnerShop[] = partnersData;

  return (
    <>
      <Hero
        heading={heroProps.heading}
        description={heroProps.description}
        imageUrl={heroProps.imageUrl}
        imageAlt={heroProps.imageAlt}
        ctaLabel={heroProps.ctaLabel}
        ctaLink={heroProps.ctaLink}
      />

      <main className="container mx-auto px-4 py-12 sm:py-16 md:py-20">
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

        {/* Section 2: Agenda des marchés */}
        <section id="marches" className="mb-12 flex flex-col items-center md:mb-16">
          <h2 className="mb-8 text-center text-3xl font-semibold tracking-tight">
            {t("marketsAgendaTitle")}
          </h2>
          <MarketCalendarView initialMarkets={allSortedMarkets} locale={locale} />
        </section>

        {/* Section 3: Partner Shops */}
        <section id="partner-shops" className="mb-12 md:mb-16">
          <h2 className="mb-6 text-center text-3xl font-semibold tracking-tight">
            Nos points de vente partenaires
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-center text-lg text-muted-foreground">
            Retrouvez nos créations chez nos partenaires en boutiques, des lieux que nous avons
            sélectionnés pour leur authenticité et leur engagement.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {partners.map((partner) => (
              <PartnerShopCard key={partner.name} partner={partner} />
            ))}
          </div>
        </section>

        {/* Section 4: Social Media */}
        <section id="social-media" className="py-12 text-center">
          <h2 className="mb-6 text-3xl font-semibold tracking-tight">{t("socialMediaTitle")}</h2>
          <p className="mb-6 text-lg text-muted-foreground">{t("socialMediaSubtitle")}</p>
          <SocialFollow />
        </section>
      </main>
    </>
  );
}
