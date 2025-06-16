"use client";

import React, { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { type MarketInfo } from "@/types/market";
import { formatDate } from "@/lib/market-utils"; // Assurez-vous que ce chemin est correct
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface MarketAgendaProps {
  initialMarkets: MarketInfo[];
  locale: string;
}

export function MarketAgenda({ initialMarkets, locale }: MarketAgendaProps) {
  const t = useTranslations("ContactPage"); // Pour les labels comme Date, Ville, etc.
  const tFilters = useTranslations("Filters"); // Pour un futur namespace de filtres

  const [selectedCities, setSelectedCities] = useState<string[]>([]);

  const uniqueCities = useMemo(() => {
    const cities = new Set(initialMarkets.map((market) => market.city));
    return Array.from(cities).sort();
  }, [initialMarkets]);

  const handleCityChange = (city: string) => {
    setSelectedCities((prevSelectedCities) =>
      prevSelectedCities.includes(city)
        ? prevSelectedCities.filter((c) => c !== city)
        : [...prevSelectedCities, city]
    );
  };

  const filteredMarkets = useMemo(() => {
    if (selectedCities.length === 0) {
      return initialMarkets;
    }
    return initialMarkets.filter((market) => selectedCities.includes(market.city));
  }, [initialMarkets, selectedCities]);

  return (
    <div>
      {uniqueCities.length > 0 && (
        <Accordion type="single" collapsible className="mb-8 w-full md:w-1/2 lg:w-1/3">
          <AccordionItem value="city-filter">
            <AccordionTrigger className="items-center justify-start gap-2 text-lg font-medium text-primary">
              {tFilters("filterByCity", { defaultMessage: "Filtrer par ville" })}
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 p-1">
                {uniqueCities.map((city) => (
                  <div key={city} className="flex items-center space-x-2">
                    <Checkbox
                      id={`city-${city}`}
                      checked={selectedCities.includes(city)}
                      onCheckedChange={() => handleCityChange(city)}
                    />
                    <Label htmlFor={`city-${city}`} className="font-normal">
                      {city}
                    </Label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {filteredMarkets.length > 0 ? (
        <div className="space-y-8">
          {filteredMarkets.map((market: MarketInfo) => (
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
              {market.gpsLink && (
                <Button asChild variant="outline" className="mt-4">
                  <a href={market.gpsLink} target="_blank" rel="noopener noreferrer">
                    {t("seeOnMapButton")}
                  </a>
                </Button>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="text-center text-lg text-muted-foreground">
          {t("noUpcomingMarketsForFilter", {
            defaultMessage: "Aucun marché à venir ne correspond à vos filtres.",
          })}
        </p>
      )}
    </div>
  );
}
