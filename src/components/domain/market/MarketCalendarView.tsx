"use client";

import { cn } from "@/utils/cn";

import React, { useState, useEffect } from "react";
import { MarketInfo } from "@/types/market";
import { Calendar } from "@/components/ui/calendar";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

  const handleDateSelect = (newDate: Date | undefined) => {
    // Prevent unselecting a date by clicking it again.
    // Only update if a new date is actually selected.
    if (newDate) {
      setDate(newDate);
    }
  };

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
    <section aria-labelledby="market-calendar-heading" className="mx-auto w-full max-w-6xl">
      <h2 id="market-calendar-heading" className="sr-only">
        Calendrier des marchés et détails
      </h2>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
        {/* Colonne de gauche : Calendrier */}
        <div
          aria-labelledby="calendar-section-heading"
          className="rounded-lg border bg-card p-1 shadow-sm print:hidden"
        >
          <h3 id="calendar-section-heading" className="sr-only">
            Calendrier de sélection des dates
          </h3>
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            locale={dateFnsLocale}
            className="w-full rounded-md"
            modifiers={{ marketDay: marketDays }}
            modifiersClassNames={{
              marketDay:
                "bg-primary/10 text-primary font-medium border border-primary/20 rounded-md transition-colors hover:border-2 hover:border-secondary",
            }}
            fixedWeeks={true}
          />
        </div>

        {/* Colonne de droite : Carte de détail */}
        <article
          aria-live="polite"
          className="flex flex-col overflow-hidden rounded-lg border bg-card shadow-lg"
        >
          {/* Zone Image (60%) */}
          <figure className="relative block h-64 w-full">
            <Image
              src={
                selectedMarket?.image ||
                "https://esgirafriwoildqcwtjm.supabase.co/storage/v1/object/public/contact//hero_next_market.webp"
              }
              alt={
                selectedMarket ? `Image du ${selectedMarket.name}` : "Image d'ambiance d'un marché"
              }
              fill
              className={cn("object-cover", !selectedMarket && "blur-sm")}
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </figure>

          {/* Zone Contenu (40%) - Scrollable */}
          <div className="flex flex-col p-6">
            {selectedMarket ? (
              <>
                <CardHeader className="p-0 pb-3">
                  <CardTitle
                    id={`market-details-heading-${selectedMarket.id}`}
                    className="text-2xl"
                  >
                    {selectedMarket.name}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {selectedMarket.description ||
                      "Découvrez ce marché authentique et ses produits locaux."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow p-0">
                  <address className="flex flex-col gap-y-3 not-italic sm:flex-row sm:items-center sm:gap-x-6">
                    <span className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 flex-shrink-0 text-primary" aria-hidden="true" />
                      <span className="font-medium">
                        {selectedMarket.address || selectedMarket.city}
                      </span>
                    </span>
                    <time className="flex items-center gap-3">
                      <Clock className="h-5 w-5 flex-shrink-0 text-primary" aria-hidden="true" />
                      <span className="font-medium">
                        {selectedMarket.startTime} - {selectedMarket.endTime}
                      </span>
                    </time>
                  </address>
                </CardContent>
                {selectedMarket.gpsLink && (
                  <nav className="mt-auto flex justify-start pt-4">
                    <Button asChild variant="outline" size="sm">
                      <a
                        href={selectedMarket.gpsLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        Voir sur la carte
                      </a>
                    </Button>
                  </nav>
                )}
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                <MapPin className="mb-2 h-10 w-10" />
                <p className="font-semibold">Sélectionnez une date de marché</p>
                <small className="text-sm">pour afficher les détails ici.</small>
              </div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
