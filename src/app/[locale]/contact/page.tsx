// src/app/[locale]/contact/page.tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Hero, type HeroProps } from "@/components/shared/hero";
import { getNextUpcomingMarket, getAllMarketsSorted } from "@/lib/market-utils";
import type { AppPathname } from "@/i18n/navigation";

// import { MarketInfo } from "@/types/market"; // MarketInfo sera utilisé dans MarketAgenda

import { Mail, Phone, MapPin } from "lucide-react"; // Icônes pour les coordonnées
import { MarketCalendarView } from "@/components/domain/market/MarketCalendarView"; // Import du nouveau composant calendrier
import { SocialFollow } from "@/components/domain/social/SocialFollow"; // Import du composant pour les réseaux sociaux
import { PartnerShopCard, PartnerShop } from "@/components/domain/partner/PartnerShopCard";
import partnersData from "@/data/partners.json"; // Import du composant pour les réseaux sociaux

type Props = {
  params: Promise<{ locale: string }>; // ✅ Changement pour Next.js 15
};

export default async function ContactPage({ params }: Props) {
  // ✅ Correction : Await params avant utilisation
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ContactPage");

  const nextMarket = await getNextUpcomingMarket();
  const allSortedMarkets = await getAllMarketsSorted(); // Récupération de tous les marchés triés

  const heroProps: HeroProps = {
    heading: t("defaultHeroHeading"),
    description: t("defaultHeroSubheading"),
    imageUrl:
      "https://esgirafriwoildqcwtjm.supabase.co/storage/v1/object/public/contact//hero_next_market.webp",
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

    heroProps.imageAlt = t("nextMarketHeroImageAlt", { marketName: nextMarket.name });
    heroProps.ctaLabel = t("seeAllMarketsButton");
    const targetPath: AppPathname = "/contact";
    heroProps.ctaLink = { pathname: targetPath, hash: "marches" };
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
        {/* ✅ Section 1: Coordonnées - Amélioration sémantique */}
        <section id="coordinates" className="mb-12 md:mb-16">
          <header className="mb-6">
            <h2 className="text-center text-3xl font-semibold tracking-tight">
              {t("coordinatesTitle")}
            </h2>
          </header>
          <address className="grid grid-cols-1 gap-8 not-italic md:grid-cols-3 md:gap-12">
            <article className="flex flex-col items-center text-center">
              <Mail className="mb-3 h-10 w-10 text-primary" aria-hidden="true" />
              <h3 className="mb-1 text-xl font-medium">{t("emailTitle")}</h3>
              <a
                href="mailto:inherbisveritas@gmail.com"
                className="hover:text-primary"
                aria-label="Envoyer un email à inherbisveritas@gmail.com"
              >
                inherbisveritas@gmail.com
              </a>
            </article>
            <article className="flex flex-col items-center text-center">
              <Phone className="mb-3 h-10 w-10 text-primary" aria-hidden="true" />
              <h3 className="mb-1 text-xl font-medium">{t("phoneTitle")}</h3>
              <a
                href="tel:+33638895324"
                className="hover:text-primary"
                aria-label="Appeler le 06 38 89 53 24"
              >
                06 38 89 53 24
              </a>
            </article>
            <article className="flex flex-col items-center text-center">
              <MapPin className="mb-3 h-10 w-10 text-primary" aria-hidden="true" />
              <h3 className="mb-1 text-xl font-medium">{t("headquartersTitle")}</h3>
              <address className="not-italic">
                2105 Route du Thérondel
                <br />
                34700 Fozières
              </address>
            </article>
          </address>
        </section>

        {/* ✅ Section 2: Agenda des marchés - Amélioration sémantique */}
        <section id="marches" className="mb-12 flex flex-col items-center md:mb-16">
          <header className="mb-8">
            <h2 className="text-center text-3xl font-semibold tracking-tight">
              {t("marketsAgendaTitle")}
            </h2>
          </header>
          <MarketCalendarView initialMarkets={allSortedMarkets} locale={locale} />
        </section>

        {/* ✅ Section 3: Partner Shops - Amélioration sémantique */}
        <section id="partner-shops" className="mb-12 md:mb-16">
          <header className="mb-6">
            <h2 className="text-center text-3xl font-semibold tracking-tight">
              {t("partnerShopsTitle")}
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-center text-lg text-muted-foreground">
              {t("partnerShopsSubtitle")}
            </p>
          </header>
          <section className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2" role="list">
            {partners.map((partner) => (
              <article key={partner.name} role="listitem">
                <PartnerShopCard partner={partner} />
              </article>
            ))}
          </section>
        </section>

        {/* ✅ Section 4: Social Media - Amélioration sémantique */}
        <section id="social-media" className="py-12 text-center">
          <header className="mb-6">
            <h2 className="text-3xl font-semibold tracking-tight">{t("socialMediaTitle")}</h2>
            <p className="mb-6 text-lg text-muted-foreground">{t("socialMediaSubtitle")}</p>
          </header>
          <SocialFollow />
        </section>
      </main>
    </>
  );
}
