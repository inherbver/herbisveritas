import { MarketInfo, RecurringMarketInfo } from "@/types/market";
import recurringMarketsData from "@/data/markets.json";

/**
 * Generates a list of single-date market instances from recurring market data.
 * @returns An array of MarketInfo objects, each representing a specific market day.
 */
function generateMarketInstances(): MarketInfo[] {
  const recurringMarkets: RecurringMarketInfo[] = recurringMarketsData;
  const allInstances: MarketInfo[] = [];

  recurringMarkets.forEach((recurringMarket) => {
    const startDate = new Date(recurringMarket.startDate);
    const endDate = new Date(recurringMarket.endDate);
    const dayOfWeek = recurringMarket.dayOfWeek;

    const currentDate = new Date(startDate);
    currentDate.setUTCHours(0, 0, 0, 0); // Use UTC to avoid timezone issues

    while (currentDate <= endDate) {
      if (currentDate.getUTCDay() === dayOfWeek) {
        const isoDate = currentDate.toISOString().split("T")[0];
        allInstances.push({
          id: `${recurringMarket.id}-${isoDate}`,
          name: recurringMarket.name,
          date: isoDate,
          startTime: recurringMarket.startTime,
          endTime: recurringMarket.endTime,
          city: recurringMarket.city,
          address: recurringMarket.address,
          description: recurringMarket.description,
          gpsLink: recurringMarket.gpsLink,
          heroImage: recurringMarket.heroImage,
        });
      }
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
  });

  return allInstances;
}

// Generate all market instances once
const allMarketInstances = generateMarketInstances();

/**
 * Formats a date string (YYYY-MM-DD) into a more readable format.
 */
export function formatDate(dateString: string, locale: string = "fr-FR"): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC", // Ensure consistent date interpretation
  });
}

/**
 * Retrieves the next upcoming market from the generated list.
 */
export async function getNextUpcomingMarket(): Promise<MarketInfo | null> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingMarkets = allMarketInstances
    .filter((market) => new Date(market.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return upcomingMarkets.length > 0 ? upcomingMarkets[0] : null;
}

/**
 * Retrieves all upcoming markets from the generated list, sorted by date.
 */
export async function getAllUpcomingMarkets(): Promise<MarketInfo[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return allMarketInstances
    .filter((market) => new Date(market.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Retrieves all generated market instances, sorted by date (most recent first).
 */
export async function getAllMarketsSorted(): Promise<MarketInfo[]> {
  return [...allMarketInstances].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}
