/**
 * Market and Partner Database Queries
 * 
 * Centralized database queries for markets and partners data.
 * Uses server-side Supabase client for secure data access.
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cache } from "react";
import type { Market, MarketInfo } from "@/types/market";
import type { Partner, PartnerInfo } from "@/types/partner";
import { 
  generateMarketInstancesFromDb, 
  transformPartnerToInfo,
  filterUpcomingMarkets,
  sortMarketsByStartTime,
  sortPartnersByOrder,
  filterActivePartners
} from "./transformers";

/**
 * Fetch all markets from database
 * Cached for performance during SSR
 */
export const getMarketsFromDb = cache(async (): Promise<Market[]> => {
  const supabase = await createSupabaseServerClient();
  
  const { data: markets, error } = await supabase
    .from("markets")
    .select("*")
    .gte("end_date", new Date().toISOString().split("T")[0]) // Only active markets
    .order("start_date", { ascending: true });

  if (error) {
    console.error("Error fetching markets:", error);
    return [];
  }

  return markets || [];
});

/**
 * Fetch all partners from database
 * Cached for performance during SSR
 */
export const getPartnersFromDb = cache(async (): Promise<Partner[]> => {
  const supabase = await createSupabaseServerClient();
  
  const { data: partners, error } = await supabase
    .from("partners")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Error fetching partners:", error);
    return [];
  }

  return partners || [];
});

/**
 * Generate all market instances from database data
 * This replaces the JSON-based generation in the original market-utils.ts
 */
export const getAllMarketInstances = cache(async (): Promise<MarketInfo[]> => {
  const markets = await getMarketsFromDb();
  return generateMarketInstancesFromDb(markets);
});

/**
 * Get upcoming market instances, sorted by start time
 */
export const getUpcomingMarkets = cache(async (): Promise<MarketInfo[]> => {
  const allInstances = await getAllMarketInstances();
  const upcoming = filterUpcomingMarkets(allInstances);
  return sortMarketsByStartTime(upcoming);
});

/**
 * Get the next upcoming market
 */
export const getNextUpcomingMarket = cache(async (): Promise<MarketInfo | null> => {
  const upcomingMarkets = await getUpcomingMarkets();
  return upcomingMarkets.length > 0 ? upcomingMarkets[0] : null;
});

/**
 * Get all market instances sorted by date (most recent first)
 */
export const getAllMarketsSorted = cache(async (): Promise<MarketInfo[]> => {
  const allInstances = await getAllMarketInstances();
  return allInstances.sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
});

/**
 * Get active partners sorted by display order
 */
export const getActivePartners = cache(async (): Promise<PartnerInfo[]> => {
  const partners = await getPartnersFromDb();
  const partnerInfos = partners.map(transformPartnerToInfo);
  const activePartners = filterActivePartners(partnerInfos);
  return sortPartnersByOrder(activePartners);
});

/**
 * Get all partners (for admin interface)
 */
export const getAllPartners = cache(async (): Promise<PartnerInfo[]> => {
  const partners = await getPartnersFromDb();
  const partnerInfos = partners.map(transformPartnerToInfo);
  return sortPartnersByOrder(partnerInfos);
});

/**
 * Get a specific market by ID
 */
export const getMarketById = cache(async (id: string): Promise<Market | null> => {
  const supabase = await createSupabaseServerClient();
  
  const { data: market, error } = await supabase
    .from("markets")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching market:", error);
    return null;
  }

  return market;
});

/**
 * Get a specific partner by ID
 */
export const getPartnerById = cache(async (id: string): Promise<Partner | null> => {
  const supabase = await createSupabaseServerClient();
  
  const { data: partner, error } = await supabase
    .from("partners")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching partner:", error);
    return null;
  }

  return partner;
});

/**
 * Search markets by city or name
 */
export const searchMarkets = cache(async (query: string): Promise<MarketInfo[]> => {
  if (!query.trim()) {
    return await getAllMarketInstances();
  }

  const allInstances = await getAllMarketInstances();
  const searchTerm = query.toLowerCase();
  
  return allInstances.filter(market => 
    market.name.toLowerCase().includes(searchTerm) ||
    market.city.toLowerCase().includes(searchTerm) ||
    market.description?.toLowerCase().includes(searchTerm)
  );
});

/**
 * Get markets for a specific city
 */
export const getMarketsByCity = cache(async (city: string): Promise<MarketInfo[]> => {
  const allInstances = await getAllMarketInstances();
  return allInstances.filter(market => 
    market.city.toLowerCase() === city.toLowerCase()
  );
});

/**
 * Get markets for a specific date range
 */
export const getMarketsInDateRange = cache(async (
  startDate: string, 
  endDate: string
): Promise<MarketInfo[]> => {
  const allInstances = await getAllMarketInstances();
  return allInstances.filter(market => 
    market.date >= startDate && market.date <= endDate
  );
});