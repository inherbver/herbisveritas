import { z } from "zod";

export const profileSchema = z.object({
  first_name: z
    .string()
    .min(2, { message: "First name must be at least 2 characters long." })
    .max(50, { message: "First name must be at most 50 characters long." })
    .optional()
    .or(z.literal("")), // Permet une chaîne vide pour "supprimer" la valeur
  last_name: z
    .string()
    .min(2, { message: "Last name must be at least 2 characters long." })
    .max(50, { message: "Last name must be at most 50 characters long." })
    .optional()
    .or(z.literal("")), // Permet une chaîne vide
  phone_number: z
    .string()
    .max(20, { message: "Phone number must be at most 20 characters long." })
    .optional()
    .or(z.literal("")), // Permet une chaîne vide
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
