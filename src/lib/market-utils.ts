import { MarketInfo, RecurringMarketInfo } from "@/types/market";
import recurringMarketsData from "@/data/markets.json";

/**
 * Generates a list of single-date market instances from recurring market data.
 * This function is not exported and is used internally to build the `allMarketInstances` constant.
 * It iterates through the date range specified in each recurring market entry and creates
 * an instance for each matching day of the week. All date calculations are done in UTC
 * to ensure timezone consistency.
 * @returns An array of MarketInfo objects, each representing a specific market day.
 */
function generateMarketInstances(): MarketInfo[] {
  const recurringMarkets: RecurringMarketInfo[] = recurringMarketsData;
  const allInstances: MarketInfo[] = [];

  recurringMarkets.forEach((recurringMarket) => {
    // Dates from JSON are strings like 'YYYY-MM-DD'. new Date('YYYY-MM-DD') creates a date at UTC midnight.
    const startDate = new Date(recurringMarket.startDate);
    const endDate = new Date(recurringMarket.endDate);
    const dayOfWeek = recurringMarket.dayOfWeek;

    const currentDate = new Date(startDate);
    // No need to set hours, it's already at midnight UTC.

    while (currentDate <= endDate) {
      if (currentDate.getUTCDay() === dayOfWeek) {
        const isoDate = currentDate.toISOString().split("T")[0];
        allInstances.push({
          id: `${recurringMarket.id}-${isoDate}`,
          name: recurringMarket.name,
          date: isoDate, // YYYY-MM-DD string
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
 * All date comparisons are done in UTC to ensure consistency.
 */
export async function getNextUpcomingMarket(): Promise<MarketInfo | null> {
  const now = new Date();

  const upcomingMarkets = allMarketInstances
    .filter((market) => {
      const marketDateString = market.date;
      let marketEndDateTime;

      if (market.endTime === "00:00") {
        // Market ends at midnight, which is the start of the next day.
        const tempDate = new Date(marketDateString + "T00:00:00Z"); // Midnight UTC on market day
        tempDate.setUTCDate(tempDate.getUTCDate() + 1); // Advance to next day in UTC
        marketEndDateTime = tempDate;
      } else {
        marketEndDateTime = new Date(`${marketDateString}T${market.endTime}:00Z`); // Create as UTC
      }
      return marketEndDateTime > now;
    })
    .sort((a, b) => {
      const aStartDateTime = new Date(`${a.date}T${a.startTime}:00Z`);
      const bStartDateTime = new Date(`${b.date}T${b.startTime}:00Z`);
      return aStartDateTime.getTime() - bStartDateTime.getTime();
    });

  return upcomingMarkets.length > 0 ? upcomingMarkets[0] : null;
}

/**
 * Retrieves all upcoming markets from the generated list, sorted by date.
 * All date comparisons are done in UTC to ensure consistency.
 */
export async function getAllUpcomingMarkets(): Promise<MarketInfo[]> {
  const now = new Date();

  return allMarketInstances
    .filter((market) => {
      const marketDateString = market.date;
      let marketEndDateTime;

      if (market.endTime === "00:00") {
        // Market ends at midnight, which is the start of the next day.
        const tempDate = new Date(marketDateString + "T00:00:00Z"); // Midnight UTC on market day
        tempDate.setUTCDate(tempDate.getUTCDate() + 1); // Advance to next day in UTC
        marketEndDateTime = tempDate;
      } else {
        marketEndDateTime = new Date(`${marketDateString}T${market.endTime}:00Z`); // Create as UTC
      }
      return marketEndDateTime > now;
    })
    .sort((a, b) => {
      const aStartDateTime = new Date(`${a.date}T${a.startTime}:00Z`);
      const bStartDateTime = new Date(`${b.date}T${b.startTime}:00Z`);
      return aStartDateTime.getTime() - bStartDateTime.getTime();
    });
}

/**
 * Retrieves all generated market instances, sorted by date (most recent first).
 */
export async function getAllMarketsSorted(): Promise<MarketInfo[]> {
  return [...allMarketInstances].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}
