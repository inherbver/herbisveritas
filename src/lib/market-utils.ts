/**
 * Market Utilities
 *
 * Utilities for working with market data. This file has been updated to use
 * database data instead of JSON files, while maintaining backward compatibility
 * with the existing API.
 */

import { MarketInfo } from "@/types/market";
import {
  getAllMarketInstances as _getAllMarketInstances,
  getUpcomingMarkets,
  getNextUpcomingMarket as getNextUpcomingMarketFromDb,
  getAllMarketsSorted as getAllMarketsSortedFromDb,
} from "@/lib/markets/queries";

// Legacy imports for backward compatibility (will be removed after migration)
import recurringMarketsData from "@/data/markets.json";
import { RecurringMarketInfo } from "@/types/market";

/**
 * Legacy function for generating market instances from JSON data
 * @deprecated Use database queries instead
 */
function generateMarketInstancesLegacy(): MarketInfo[] {
  const recurringMarkets: RecurringMarketInfo[] = recurringMarketsData;
  const allInstances: MarketInfo[] = [];

  recurringMarkets.forEach((recurringMarket) => {
    const startDate = new Date(recurringMarket.startDate);
    const endDate = new Date(recurringMarket.endDate);
    const dayOfWeek = recurringMarket.dayOfWeek;

    const currentDate = new Date(startDate);

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
          image: recurringMarket.image,
        });
      }
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
  });

  return allInstances;
}

// Fallback to legacy data if database is not available
const legacyMarketInstances = generateMarketInstancesLegacy();

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
 * Retrieves the next upcoming market.
 * Now uses database data with fallback to legacy JSON data.
 * All date comparisons are done in UTC to ensure consistency.
 */
export async function getNextUpcomingMarket(): Promise<MarketInfo | null> {
  try {
    // Try to get from database first
    return await getNextUpcomingMarketFromDb();
  } catch (error) {
    console.warn("Failed to fetch market from database, falling back to legacy data:", error);

    // Fallback to legacy logic
    const now = new Date();
    const upcomingMarkets = legacyMarketInstances
      .filter((market) => {
        const marketDateString = market.date;
        let marketEndDateTime;

        if (market.endTime === "00:00") {
          const tempDate = new Date(marketDateString + "T00:00:00Z");
          tempDate.setUTCDate(tempDate.getUTCDate() + 1);
          marketEndDateTime = tempDate;
        } else {
          marketEndDateTime = new Date(`${marketDateString}T${market.endTime}:00Z`);
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
}

/**
 * Retrieves all upcoming markets, sorted by date.
 * Now uses database data with fallback to legacy JSON data.
 * All date comparisons are done in UTC to ensure consistency.
 */
export async function getAllUpcomingMarkets(): Promise<MarketInfo[]> {
  try {
    // Try to get from database first
    return await getUpcomingMarkets();
  } catch (error) {
    console.warn("Failed to fetch markets from database, falling back to legacy data:", error);

    // Fallback to legacy logic
    const now = new Date();
    return legacyMarketInstances
      .filter((market) => {
        const marketDateString = market.date;
        let marketEndDateTime;

        if (market.endTime === "00:00") {
          const tempDate = new Date(marketDateString + "T00:00:00Z");
          tempDate.setUTCDate(tempDate.getUTCDate() + 1);
          marketEndDateTime = tempDate;
        } else {
          marketEndDateTime = new Date(`${marketDateString}T${market.endTime}:00Z`);
        }
        return marketEndDateTime > now;
      })
      .sort((a, b) => {
        const aStartDateTime = new Date(`${a.date}T${a.startTime}:00Z`);
        const bStartDateTime = new Date(`${b.date}T${b.startTime}:00Z`);
        return aStartDateTime.getTime() - bStartDateTime.getTime();
      });
  }
}

/**
 * Retrieves all market instances, sorted by date (most recent first).
 * Now uses database data with fallback to legacy JSON data.
 */
export async function getAllMarketsSorted(): Promise<MarketInfo[]> {
  try {
    // Try to get from database first
    return await getAllMarketsSortedFromDb();
  } catch (error) {
    console.warn("Failed to fetch markets from database, falling back to legacy data:", error);

    // Fallback to legacy logic
    return [...legacyMarketInstances].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }
}
