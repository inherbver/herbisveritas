import { z } from "zod";

export const profileSchema = z.object({
  first_name: z
    .string()
    .min(2, { message: "First name must be at least 2 characters." })
    .max(50, { message: "First name must be at most 50 characters." })
    .trim(),
  last_name: z
    .string()
    .min(2, { message: "Last name must be at least 2 characters." })
    .max(50, { message: "Last name must be at most 50 characters." })
    .trim(),
  phone_number: z
    .string()
    .regex(/^(\+\d{1,3}[- ]?)?\d{10}$/, { message: "Invalid phone number format." })
    .or(z.literal("")) // Permet une chaîne vide
    .nullable(), // Permet null
  // Nouveaux champs pour l'adresse de livraison
  shipping_address_line1: z
    .string()
    .max(100, { message: "Address line 1 must be at most 100 characters." })
    .or(z.literal(""))
    .nullable(),
  shipping_address_line2: z
    .string()
    .max(100, { message: "Address line 2 must be at most 100 characters." })
    .optional()
    .or(z.literal("")) // Permet chaîne vide si fourni
    .nullable(),
  shipping_postal_code: z
    .string()
    .max(20, { message: "Postal code must be at most 20 characters." })
    .or(z.literal(""))
    .nullable(),
  shipping_city: z
    .string()
    .max(50, { message: "City must be at most 50 characters." })
    .or(z.literal(""))
    .nullable(),
  shipping_country: z
    .string()
    .max(50, { message: "Country must be at most 50 characters." })
    .or(z.literal(""))
    .nullable(),
  // Champ pour l'acceptation des termes (sera traité en timestamp dans l'action)
  terms_accepted: z.boolean().optional(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
