/**
 * Market Validation Schemas
 * 
 * Zod schemas for validating market data in forms and server actions.
 */

import { z } from "zod";

// Time format validation (HH:MM or HH:MM:SS)
const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;

// Date format validation (YYYY-MM-DD)
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

// URL validation that allows empty strings
const optionalUrlSchema = z.string()
  .optional()
  .refine((val) => !val || z.string().url().safeParse(val).success, {
    message: "URL invalide"
  });

// Base market object schema (without validation refines)
const baseMarketSchema = z.object({
  name: z.string()
    .min(1, "Le nom est requis")
    .max(100, "Le nom ne peut pas dépasser 100 caractères"),
  
  start_date: z.string()
    .regex(dateRegex, "Format de date invalide (YYYY-MM-DD requis)")
    .refine((date) => {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    }, "Date de début invalide"),
  
  end_date: z.string()
    .regex(dateRegex, "Format de date invalide (YYYY-MM-DD requis)"),
  
  day_of_week: z.number()
    .int("Le jour de la semaine doit être un entier")
    .min(0, "Le jour de la semaine doit être entre 0 et 6")
    .max(6, "Le jour de la semaine doit être entre 0 et 6"),
  
  start_time: z.string()
    .regex(timeRegex, "Format d'heure invalide (HH:MM requis)")
    .transform((time) => time.substring(0, 5)), // Convert HH:MM:SS to HH:MM
  
  end_time: z.string()
    .regex(timeRegex, "Format d'heure invalide (HH:MM requis)")
    .transform((time) => time.substring(0, 5)), // Convert HH:MM:SS to HH:MM
  
  city: z.string()
    .min(1, "La ville est requise")
    .max(100, "La ville ne peut pas dépasser 100 caractères"),
  
  address: z.string()
    .min(1, "L'adresse est requise")
    .max(200, "L'adresse ne peut pas dépasser 200 caractères"),
  
  description: z.string()
    .max(500, "La description ne peut pas dépasser 500 caractères")
    .optional(),
  
  gps_link: optionalUrlSchema,
  
  hero_image_url: z.string()
    .max(500, "L'URL de l'image hero ne peut pas dépasser 500 caractères")
    .optional(),
  
  image_url: z.string()
    .max(500, "L'URL de l'image ne peut pas dépasser 500 caractères")
    .optional(),

  is_active: z.boolean()
    .optional()
    .default(true),
});

// Schema for creating markets (server actions) - includes future date validation
export const createMarketSchema = baseMarketSchema.refine((data) => {
  // Validate that start_date is in the future for new markets
  const startDate = new Date(data.start_date);
  const today = new Date(new Date().setHours(0, 0, 0, 0));
  return startDate >= today;
}, {
  message: "La date de début doit être dans le futur",
  path: ["start_date"]
}).refine((data) => {
  // Validate that end_date is after start_date
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);
  return endDate >= startDate;
}, {
  message: "La date de fin doit être postérieure ou égale à la date de début",
  path: ["end_date"]
}).refine((data) => {
  // Validate that end_time is after start_time (handle overnight markets)
  const [startHour, startMinute] = data.start_time.split(':').map(Number);
  const [endHour, endMinute] = data.end_time.split(':').map(Number);
  const startMinutes = startHour * 60 + startMinute;
  let endMinutes = endHour * 60 + endMinute;
  
  // Handle overnight markets: if end_time is before start_time, assume next day
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60; // Add 24 hours (next day)
  }
  
  return endMinutes > startMinutes;
}, {
  message: "L'heure de fin doit être postérieure à l'heure de début",
  path: ["end_time"]
});

// Base market schema for general use (legacy compatibility)
export const marketSchema = createMarketSchema;

// Schema for updating markets (all fields optional, with ID required)
export const updateMarketSchema = z.object({
  id: z.string().uuid("ID de marché invalide"),
  
  name: z.string()
    .min(1, "Le nom est requis")
    .max(100, "Le nom ne peut pas dépasser 100 caractères")
    .optional(),
  
  start_date: z.string()
    .regex(dateRegex, "Format de date invalide (YYYY-MM-DD requis)")
    .refine((date) => {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    }, "Date de début invalide")
    .optional(),
  
  end_date: z.string()
    .regex(dateRegex, "Format de date invalide (YYYY-MM-DD requis)")
    .optional(),
  
  day_of_week: z.number()
    .int("Le jour de la semaine doit être un entier")
    .min(0, "Le jour de la semaine doit être entre 0 et 6")
    .max(6, "Le jour de la semaine doit être entre 0 et 6")
    .optional(),
  
  start_time: z.string()
    .regex(timeRegex, "Format d'heure invalide (HH:MM requis)")
    .transform((time) => time.substring(0, 5)) // Convert HH:MM:SS to HH:MM
    .optional(),
  
  end_time: z.string()
    .regex(timeRegex, "Format d'heure invalide (HH:MM requis)")
    .transform((time) => time.substring(0, 5)) // Convert HH:MM:SS to HH:MM
    .optional(),
  
  city: z.string()
    .min(1, "La ville est requise")
    .max(100, "La ville ne peut pas dépasser 100 caractères")
    .optional(),
  
  address: z.string()
    .min(1, "L'adresse est requise")
    .max(200, "L'adresse ne peut pas dépasser 200 caractères")
    .optional(),
  
  description: z.string()
    .max(500, "La description ne peut pas dépasser 500 caractères")
    .optional(),
  
  gps_link: optionalUrlSchema,
  
  hero_image_url: z.string()
    .max(500, "L'URL de l'image hero ne peut pas dépasser 500 caractères")
    .optional(),
  
  image_url: z.string()
    .max(500, "L'URL de l'image ne peut pas dépasser 500 caractères")
    .optional(),

  is_active: z.boolean()
    .optional(),
}).refine((data) => {
  // Only validate dates if both are provided
  if (data.start_date && data.end_date) {
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);
    return endDate >= startDate;
  }
  return true;
}, {
  message: "La date de fin doit être postérieure ou égale à la date de début",
  path: ["end_date"]
}).refine((data) => {
  // Only validate times if both are provided
  if (data.start_time && data.end_time) {
    const [startHour, startMinute] = data.start_time.split(':').map(Number);
    const [endHour, endMinute] = data.end_time.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    let endMinutes = endHour * 60 + endMinute;
    
    // Handle overnight markets: if end_time is before start_time, assume next day
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60; // Add 24 hours (next day)
    }
    
    return endMinutes > startMinutes;
  }
  return true;
}, {
  message: "L'heure de fin doit être postérieure à l'heure de début",
  path: ["end_time"]
});

// Schema for market form data (handles string inputs from forms) - for creation
export const marketFormSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  start_date: z.string().min(1, "La date de début est requise"),
  end_date: z.string().min(1, "La date de fin est requise"),
  day_of_week: z.string().transform((val) => parseInt(val, 10)),
  start_time: z.string().min(1, "L'heure de début est requise"),
  end_time: z.string().min(1, "L'heure de fin est requise"),
  city: z.string().min(1, "La ville est requise"),
  address: z.string().min(1, "L'adresse est requise"),
  description: z.string().optional(),
  gps_link: z.string().optional(),
  hero_image_url: z.string().optional(),
  image_url: z.string().optional(),
  is_active: z.string()
    .optional()
    .default('true')
    .transform((val) => val === 'true' || val === 'on'),
}).transform((data) => ({
  ...data,
  // Clean up optional string fields (convert empty strings to undefined)
  address: data.address?.trim(), // Required field, don't convert to undefined
  description: data.description?.trim() || undefined,
  gps_link: data.gps_link?.trim() || undefined,
  hero_image_url: data.hero_image_url?.trim() || undefined,
  image_url: data.image_url?.trim() || undefined,
}));

// Schema for market update form data (handles string inputs from forms) - for updates
export const updateMarketFormSchema = z.object({
  name: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  day_of_week: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  description: z.string().optional(),
  gps_link: z.string().optional(),
  hero_image_url: z.string().optional(),
  image_url: z.string().optional(),
  is_active: z.string()
    .optional()
    .default('true'),
}).transform((data) => {
  const result: Record<string, any> = {};
  
  // Only include non-empty fields
  if (data.name && data.name.trim()) result.name = data.name.trim();
  if (data.start_date && data.start_date.trim()) result.start_date = data.start_date.trim();
  if (data.end_date && data.end_date.trim()) result.end_date = data.end_date.trim();
  if (data.day_of_week && data.day_of_week.trim()) result.day_of_week = parseInt(data.day_of_week, 10);
  if (data.start_time && data.start_time.trim()) result.start_time = data.start_time.trim();
  if (data.end_time && data.end_time.trim()) result.end_time = data.end_time.trim();
  if (data.city && data.city.trim()) result.city = data.city.trim();
  if (data.address && data.address.trim()) result.address = data.address.trim();
  if (data.description && data.description.trim()) result.description = data.description.trim();
  if (data.gps_link && data.gps_link.trim()) result.gps_link = data.gps_link.trim();
  if (data.hero_image_url && data.hero_image_url.trim()) result.hero_image_url = data.hero_image_url.trim();
  if (data.image_url && data.image_url.trim()) result.image_url = data.image_url.trim();
  
  // Always include is_active
  result.is_active = data.is_active === 'true' || data.is_active === 'on';
  
  return result;
});

// Type inference
export type MarketFormValues = z.infer<typeof marketFormSchema>;
export type UpdateMarketFormValues = z.infer<typeof updateMarketFormSchema>;
export type CreateMarketInput = z.infer<typeof createMarketSchema>;
export type UpdateMarketInput = z.infer<typeof updateMarketSchema>;

// Validation helper functions
export function validateMarketData(data: unknown): CreateMarketInput | null {
  const result = createMarketSchema.safeParse(data);
  return result.success ? result.data : null;
}

export function validateMarketForm(formData: FormData): MarketFormValues | null {
  const data = Object.fromEntries(formData.entries());
  const result = marketFormSchema.safeParse(data);
  return result.success ? result.data : null;
}

export function validateUpdateMarketForm(formData: FormData): UpdateMarketFormValues | null {
  const data = Object.fromEntries(formData.entries());
  const result = updateMarketFormSchema.safeParse(data);
  return result.success ? result.data : null;
}