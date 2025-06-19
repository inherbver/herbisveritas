"use client";

import React, { useState, useEffect } from "react";
import { MarketInfo } from "@/types/market";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Image from "next/image";
import { MapPin, Clock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Locale } from "date-fns";
import { format } from "date-fns";

interface MarketCalendarViewProps {
  initialMarkets: MarketInfo[];
  locale: string;
}

export function MarketCalendarView({
  initialMarkets,
  locale: localeString,
}: MarketCalendarViewProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedMarket, setSelectedMarket] = useState<MarketInfo | null>(null);
  const [dateFnsLocale, setDateFnsLocale] = useState<Locale | undefined>(undefined);

  // Load date-fns locale dynamically
  useEffect(() => {
    const loadLocale = async () => {
      try {
        if (localeString === "fr") {
          const { fr } = await import("date-fns/locale/fr");
          setDateFnsLocale(fr);
        } else {
          const { enUS } = await import("date-fns/locale/en-US");
          setDateFnsLocale(enUS);
        }
      } catch (error) {
        console.error(
          `Failed to load date-fns locale for "${localeString}", defaulting to en-US.`,
          error
        );
        const { enUS } = await import("date-fns/locale/en-US");
        setDateFnsLocale(enUS);
      }
    };
    loadLocale();
  }, [localeString]);

  // Find market for selected date
  useEffect(() => {
    if (date) {
      const marketForSelectedDate = initialMarkets.find(
        (market) => format(new Date(market.date), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
      );
      setSelectedMarket(marketForSelectedDate || null);
    } else {
      setSelectedMarket(null);
    }
  }, [date, initialMarkets]);

  const marketDays = initialMarkets.map((market) => new Date(market.date));

  if (!dateFnsLocale) {
    return (
      <section className="flex h-64 items-center justify-center">
        <p>Loading calendar...</p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="market-calendar-heading"
      className="mx-auto w-full max-w-5xl space-y-6"
    >
      <h2 id="market-calendar-heading" className="sr-only">
        Calendrier des marchés et détails
      </h2>

      {/* Section supérieure : Calendrier à gauche, Image à droite */}
      <header className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Calendrier */}
        <section
          aria-labelledby="calendar-section-heading"
          className="rounded-lg border bg-card p-1 shadow-sm print:hidden"
        >
          <h3 id="calendar-section-heading" className="sr-only">
            Calendrier de sélection des dates
          </h3>
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            locale={dateFnsLocale}
            className="w-full rounded-md border"
            modifiers={{ marketDay: marketDays }}
            modifiersClassNames={{
              marketDay: "bg-primary/10 text-primary font-medium border border-primary/20",
            }}
            fixedWeeks={true}
          />
        </section>

        {/* Image du marché */}
        <figure
          aria-labelledby="market-image-heading"
          className="overflow-hidden rounded-lg border bg-card shadow-sm lg:self-stretch"
        >
          {selectedMarket?.image ? (
            <>
              <figcaption id="market-image-heading" className="sr-only">
                Image du marché: {selectedMarket.name}
              </figcaption>
              <picture className="relative block h-full min-h-[350px] w-full">
                <Image
                  src={selectedMarket.image}
                  alt={`Image du ${selectedMarket.name}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </picture>
            </>
          ) : (
            <>
              <figcaption id="market-image-heading" className="sr-only">
                Image non disponible
              </figcaption>
              <aside className="flex h-full min-h-[350px] w-full items-center justify-center bg-muted">
                <address className="text-center not-italic text-muted-foreground">
                  <MapPin className="mx-auto mb-2 h-12 w-12" />
                  <p>Sélectionnez une date avec un marché</p>
                  <small className="text-sm">pour voir l'image</small>
                </address>
              </aside>
            </>
          )}
        </figure>
      </header>

      {/* Section détails du marché en dessous */}
      {selectedMarket && (
        <main>
          <article
            aria-labelledby={`market-details-heading-${selectedMarket.id}`}
            className="w-full"
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle id={`market-details-heading-${selectedMarket.id}`} className="text-xl">
                  {selectedMarket.name}
                </CardTitle>
                <CardDescription className="text-sm">
                  {selectedMarket.description ||
                    "Découvrez ce marché authentique et ses produits locaux."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <address className="grid grid-cols-1 gap-3 not-italic md:grid-cols-2">
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 flex-shrink-0 text-primary" aria-hidden="true" />
                    <span className="text-sm font-medium">{selectedMarket.city}</span>
                  </span>
                  <time className="flex items-center gap-2">
                    <Clock className="h-4 w-4 flex-shrink-0 text-primary" aria-hidden="true" />
                    <span className="text-sm font-medium">
                      {selectedMarket.startTime} - {selectedMarket.endTime}
                    </span>
                  </time>
                </address>

                {selectedMarket.gpsLink && (
                  <nav className="flex justify-start">
                    <Button asChild variant="outline" size="sm">
                      <a
                        href={selectedMarket.gpsLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        Voir sur la carte {/* TODO: i18n */}
                      </a>
                    </Button>
                  </nav>
                )}
              </CardContent>
            </Card>
          </article>
        </main>
      )}

      {/* Message quand aucun marché n'est sélectionné */}
      {!selectedMarket && (
        <aside role="status" className="w-full">
          <Card>
            <CardContent className="flex h-24 items-center justify-center">
              <p className="text-center text-muted-foreground">
                Sélectionnez une date sur le calendrier pour voir les détails du marché.
              </p>
            </CardContent>
          </Card>
        </aside>
      )}
    </section>
  );
}
