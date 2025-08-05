/**
 * Market Types
 * 
 * Types for market management system including database models,
 * form data, and display instances.
 */

import type { Database } from '@/lib/supabase/types';

// Database types
export type Market = Database['public']['Tables']['markets']['Row'];
export type MarketInsert = Database['public']['Tables']['markets']['Insert'];
export type MarketUpdate = Database['public']['Tables']['markets']['Update'];

// Représente une instance unique d'un marché, avec une date spécifique.
// Sera généré à partir de Market (base de données).
export interface MarketInfo {
  id: string;
  name: string;
  date: string; // Format ISO YYYY-MM-DD
  startTime: string;
  endTime: string;
  city: string;
  address?: string;
  description?: string;
  gpsLink?: string;
  heroImage?: string; // Mapped from hero_image_url
  image?: string; // Mapped from image_url
}

// Représente les informations d'un marché récurrent (legacy pour compatibilité).
// @deprecated - Utiliser Market (database type) pour les nouvelles implémentations
export interface RecurringMarketInfo {
  id: string; // Identifiant pour le type de marché, ex: "marche-portiragnes"
  name: string;
  startDate: string; // Date de début de la période (YYYY-MM-DD)
  endDate: string; // Date de fin de la période (YYYY-MM-DD)
  dayOfWeek: number; // Jour de la semaine (0 = Dimanche, 1 = Lundi, ..., 6 = Samedi)
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  city: string;
  address?: string;
  description?: string;
  gpsLink?: string;
  heroImage?: string;
  image?: string;
}

// Form types for creating/updating markets
export interface CreateMarketData {
  name: string;
  start_date: string; // YYYY-MM-DD format
  end_date: string; // YYYY-MM-DD format
  day_of_week: number; // 0-6 (Sunday-Saturday)
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  city: string;
  address: string; // Required in database
  description?: string;
  gps_link?: string;
  hero_image_url?: string; // Updated field name
  image_url?: string; // Updated field name
  is_active?: boolean; // New field
}

export interface UpdateMarketData extends Partial<CreateMarketData> {
  id: string;
}

// Day of week constants
export const DAYS_OF_WEEK = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
} as const;

export const DAY_NAMES = {
  [DAYS_OF_WEEK.SUNDAY]: 'Dimanche',
  [DAYS_OF_WEEK.MONDAY]: 'Lundi',
  [DAYS_OF_WEEK.TUESDAY]: 'Mardi',
  [DAYS_OF_WEEK.WEDNESDAY]: 'Mercredi',
  [DAYS_OF_WEEK.THURSDAY]: 'Jeudi',
  [DAYS_OF_WEEK.FRIDAY]: 'Vendredi',
  [DAYS_OF_WEEK.SATURDAY]: 'Samedi',
} as const;

export type DayOfWeek = typeof DAYS_OF_WEEK[keyof typeof DAYS_OF_WEEK];
