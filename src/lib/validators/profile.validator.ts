import { z } from "zod";

export const profileSchema = z
  .object({
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
    // Champs pour l'adresse de livraison
    shipping_address_line1: z
      .string()
      .max(100, { message: "Address line 1 must be at most 100 characters." })
      .or(z.literal(""))
      .nullable(),
    shipping_address_line2: z
      .string()
      .max(100, { message: "Address line 2 must be at most 100 characters." })
      .optional()
      .or(z.literal(""))
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
    // Champs pour l'adresse de facturation
    billing_address_is_different: z.boolean(),
    billing_address_line1: z
      .string()
      .max(100, { message: "Billing address line 1 must be at most 100 characters." })
      .optional()
      .or(z.literal(""))
      .nullable(),
    billing_address_line2: z
      .string()
      .max(100, { message: "Billing address line 2 must be at most 100 characters." })
      .optional()
      .or(z.literal(""))
      .nullable(),
    billing_postal_code: z
      .string()
      .max(20, { message: "Billing postal code must be at most 20 characters." })
      .optional()
      .or(z.literal(""))
      .nullable(),
    billing_city: z
      .string()
      .max(50, { message: "Billing city must be at most 50 characters." })
      .optional()
      .or(z.literal(""))
      .nullable(),
    billing_country: z
      .string()
      .max(50, { message: "Billing country must be at most 50 characters." })
      .optional()
      .or(z.literal(""))
      .nullable(),
  })
  .refine(
    (data) => {
      if (data.billing_address_is_different) {
        return (
          !!data.billing_address_line1 &&
          !!data.billing_postal_code &&
          !!data.billing_city &&
          !!data.billing_country
        );
      }
      return true;
    },
    {
      message: "Billing address fields are required when billing address is different.",
      // On peut spécifier des chemins pour cibler les erreurs sur des champs spécifiques si nécessaire
      // mais pour une validation inter-champs, un message général est souvent suffisant.
      // Si on veut cibler un champ spécifique, par exemple le premier champ requis:
      // path: ["billing_address_line1"],
    }
  );

export type ProfileFormValues = z.infer<typeof profileSchema>;
