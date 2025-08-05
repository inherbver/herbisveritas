/**
 * Market Data Transformers
 * 
 * Utilities to transform data between database format and application format.
 * Handles conversions between snake_case (DB) and camelCase (App) properties.
 */

import type { Market } from "@/types/market";
import type { MarketInfo, RecurringMarketInfo } from "@/types/market";
import type { Partner, PartnerInfo } from "@/types/partner";

/**
 * Transform database Market to MarketInfo for display
 */
export function transformMarketToInfo(market: Market, date: string): MarketInfo {
  return {
    id: `${market.id}-${date}`,
    name: market.name,
    date: date, // YYYY-MM-DD string
    startTime: market.start_time,
    endTime: market.end_time,
    city: market.city,
    address: market.address || undefined,
    description: market.description || undefined,
    gpsLink: market.gps_link || undefined,
    heroImage: market.hero_image_url || undefined,
    image: market.image_url || undefined,
  };
}

/**
 * Transform database Market to legacy RecurringMarketInfo for compatibility
 * @deprecated Use Market type directly in new code
 */
export function transformMarketToRecurring(market: Market): RecurringMarketInfo {
  return {
    id: market.id,
    name: market.name,
    startDate: market.start_date,
    endDate: market.end_date,
    dayOfWeek: market.day_of_week,
    startTime: market.start_time,
    endTime: market.end_time,
    city: market.city,
    address: market.address || undefined,
    description: market.description || undefined,
    gpsLink: market.gps_link || undefined,
    heroImage: market.hero_image_url || undefined,
    image: market.image_url || undefined,
  };
}

/**
 * Transform database Partner to PartnerInfo for display
 */
export function transformPartnerToInfo(partner: Partner): PartnerInfo {
  return {
    id: partner.id,
    name: partner.name,
    description: partner.description,
    address: partner.address,
    imageUrl: partner.image_url,
    facebookUrl: partner.facebook_url || undefined,
    displayOrder: partner.display_order || 0,
    isActive: partner.is_active ?? true,
  };
}

/**
 * Generate market instances from database market data
 * This maintains the same logic as the original generateMarketInstances function
 */
export function generateMarketInstancesFromDb(markets: Market[]): MarketInfo[] {
  const allInstances: MarketInfo[] = [];

  markets.forEach((market) => {
    // Dates from database are strings like 'YYYY-MM-DD'. new Date('YYYY-MM-DD') creates a date at UTC midnight.
    const startDate = new Date(market.start_date);
    const endDate = new Date(market.end_date);
    const dayOfWeek = market.day_of_week;

    const currentDate = new Date(startDate);
    // No need to set hours, it's already at midnight UTC.

    while (currentDate <= endDate) {
      if (currentDate.getUTCDay() === dayOfWeek) {
        const isoDate = currentDate.toISOString().split("T")[0];
        allInstances.push(transformMarketToInfo(market, isoDate));
      }
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
  });

  return allInstances;
}

/**
 * Check if a market instance is upcoming (not yet ended)
 */
export function isMarketUpcoming(market: MarketInfo, now: Date = new Date()): boolean {
  const marketDateString = market.date;
  let marketEndDateTime: Date;

  if (market.endTime === "00:00") {
    // Market ends at midnight, which is the start of the next day.
    const tempDate = new Date(marketDateString + "T00:00:00Z"); // Midnight UTC on market day
    tempDate.setUTCDate(tempDate.getUTCDate() + 1); // Advance to next day in UTC
    marketEndDateTime = tempDate;
  } else {
    marketEndDateTime = new Date(`${marketDateString}T${market.endTime}:00Z`); // Create as UTC
  }

  return marketEndDateTime > now;
}

/**
 * Sort market instances by start date/time
 */
export function sortMarketsByStartTime(markets: MarketInfo[]): MarketInfo[] {
  return markets.sort((a, b) => {
    const aStartDateTime = new Date(`${a.date}T${a.startTime}:00Z`);
    const bStartDateTime = new Date(`${b.date}T${b.startTime}:00Z`);
    return aStartDateTime.getTime() - bStartDateTime.getTime();
  });
}

/**
 * Sort market instances by date (most recent first)
 */
export function sortMarketsByDate(markets: MarketInfo[], ascending = false): MarketInfo[] {
  return markets.sort((a, b) => {
    const aDate = new Date(a.date).getTime();
    const bDate = new Date(b.date).getTime();
    return ascending ? aDate - bDate : bDate - aDate;
  });
}

/**
 * Filter upcoming markets from a list of market instances
 */
export function filterUpcomingMarkets(markets: MarketInfo[], now: Date = new Date()): MarketInfo[] {
  return markets.filter(market => isMarketUpcoming(market, now));
}

/**
 * Sort partners by display order
 */
export function sortPartnersByOrder(partners: PartnerInfo[]): PartnerInfo[] {
  return partners.sort((a, b) => {
    // First sort by display_order, then by name for ties
    if (a.displayOrder !== b.displayOrder) {
      return a.displayOrder - b.displayOrder;
    }
    return a.name.localeCompare(b.name);
  });
}

/**
 * Filter active partners
 */
export function filterActivePartners(partners: PartnerInfo[]): PartnerInfo[] {
  return partners.filter(partner => partner.isActive);
}