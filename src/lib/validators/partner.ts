/**
 * Partner Validation Schemas
 * 
 * Zod schemas for validating partner data in forms and server actions.
 */

import { z } from "zod";

// URL validation that allows empty strings
const optionalUrlSchema = z.string()
  .optional()
  .refine((val) => !val || z.string().url().safeParse(val).success, {
    message: "URL invalide"
  });

// Base partner schema for creation and updates
export const partnerSchema = z.object({
  name: z.string()
    .min(1, "Le nom est requis")
    .max(100, "Le nom ne peut pas dépasser 100 caractères"),
  
  description: z.string()
    .min(1, "La description est requise")
    .max(500, "La description ne peut pas dépasser 500 caractères"),
  
  address: z.string()
    .min(1, "L'adresse est requise")
    .max(200, "L'adresse ne peut pas dépasser 200 caractères"),
  
  image_url: z.string()
    .url("URL d'image invalide")
    .max(500, "L'URL de l'image ne peut pas dépasser 500 caractères"),
  
  facebook_url: optionalUrlSchema,
  
  display_order: z.number()
    .int("L'ordre d'affichage doit être un entier")
    .min(0, "L'ordre d'affichage doit être positif")
    .optional()
    .default(0),
  
  is_active: z.boolean()
    .optional()
    .default(true),
});

// Schema for creating partners (server actions)
export const createPartnerSchema = partnerSchema;

// Schema for updating partners (all fields optional except validation logic)
export const updatePartnerSchema = partnerSchema.partial().extend({
  id: z.string().uuid("ID de partenaire invalide")
});

// Schema for partner form data (handles string inputs from forms)
export const partnerFormSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  description: z.string().min(1, "La description est requise"),
  address: z.string().min(1, "L'adresse est requise"),
  image_url: z.string().url("URL d'image invalide"),
  facebook_url: z.string().optional(),
  display_order: z.string()
    .optional()
    .transform((val) => val ? parseInt(val, 10) : 0),
  is_active: z.string()
    .optional()
    .transform((val) => val === 'true' || val === 'on')
    .default(true),
}).transform((data) => ({
  ...data,
  // Clean up optional string fields (convert empty strings to undefined)
  facebook_url: data.facebook_url?.trim() || undefined,
}));

// Schema for updating partner display order
export const updatePartnerOrderSchema = z.object({
  partners: z.array(z.object({
    id: z.string().uuid(),
    display_order: z.number().int().min(0)
  }))
});

// Schema for toggling partner active status
export const togglePartnerStatusSchema = z.object({
  id: z.string().uuid("ID de partenaire invalide"),
  is_active: z.boolean()
});

// Type inference
export type PartnerFormValues = z.infer<typeof partnerFormSchema>;
export type CreatePartnerInput = z.infer<typeof createPartnerSchema>;
export type UpdatePartnerInput = z.infer<typeof updatePartnerSchema>;
export type UpdatePartnerOrderInput = z.infer<typeof updatePartnerOrderSchema>;
export type TogglePartnerStatusInput = z.infer<typeof togglePartnerStatusSchema>;

// Validation helper functions
export function validatePartnerData(data: unknown): CreatePartnerInput | null {
  const result = createPartnerSchema.safeParse(data);
  return result.success ? result.data : null;
}

export function validatePartnerForm(formData: FormData): PartnerFormValues | null {
  const data = Object.fromEntries(formData.entries());
  const result = partnerFormSchema.safeParse(data);
  return result.success ? result.data : null;
}

export function validatePartnerOrder(data: unknown): UpdatePartnerOrderInput | null {
  const result = updatePartnerOrderSchema.safeParse(data);
  return result.success ? result.data : null;
}