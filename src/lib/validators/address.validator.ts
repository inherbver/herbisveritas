import { z } from "zod";

// Messages d'erreur communs pour la réutilisation
const requiredFieldMessage = (fieldName: string) => `${fieldName} est requis.`;
const invalidTypeMessage = (fieldName: string, type: string) =>
  `${fieldName} doit être de type ${type}.`;

export const addressSchema = z.object({
  // id, user_id, created_at, updated_at ne sont généralement pas dans le formulaire utilisateur
  // mais sont gérés côté serveur ou par la base de données.

  address_type: z.enum(["shipping", "billing"], {
    required_error: requiredFieldMessage("Le type d'adresse"),
    invalid_type_error: "Le type d'adresse doit être 'shipping' ou 'billing'.",
  }),

  is_default: z.boolean({
    invalid_type_error: invalidTypeMessage('La case "Adresse par défaut"', "booléen"),
  }),

  company_name: z
    .string()
    .max(100, "Le nom de l'entreprise ne doit pas dépasser 100 caractères.")
    .optional()
    .nullable(), // Permet une chaîne vide ou null

  full_name: z
    .string()
    .min(1, requiredFieldMessage("Le nom complet"))
    .max(150, "Le nom complet ne doit pas dépasser 150 caractères."),

  address_line1: z
    .string()
    .min(1, requiredFieldMessage("L'adresse (ligne 1)"))
    .max(200, "L'adresse (ligne 1) ne doit pas dépasser 200 caractères."),

  address_line2: z
    .string()
    .max(200, "L'adresse (ligne 2) ne doit pas dépasser 200 caractères.")
    .optional()
    .nullable(),

  postal_code: z
    .string()
    .min(1, requiredFieldMessage("Le code postal"))
    .max(20, "Le code postal ne doit pas dépasser 20 caractères."), // Assez générique pour la plupart des formats

  city: z
    .string()
    .min(1, requiredFieldMessage("La ville"))
    .max(100, "La ville ne doit pas dépasser 100 caractères."),

  country_code: z
    .string()
    .length(2, "Le code pays doit contenir exactement 2 caractères.")
    .regex(
      /^[A-Z]{2}$/,
      "Le code pays doit être composé de 2 lettres majuscules (format ISO 3166-1 alpha-2)."
    )
    .transform((value) => value.toUpperCase()), // Assure la casse

  state_province_region: z
    .string()
    .max(100, "L'état/province/région ne doit pas dépasser 100 caractères.")
    .optional()
    .nullable(),

  phone_number: z
    .string()
    // Regex basique pour valider une séquence de chiffres, espaces, tirets, parenthèses, plus.
    // Peut être affinée pour des formats plus stricts.
    .regex(/^[\d\s\-()+]*$/, "Le numéro de téléphone contient des caractères non valides.")
    .max(30, "Le numéro de téléphone ne doit pas dépasser 30 caractères.")
    .optional()
    .nullable(),
});

// Type TypeScript inféré à partir du schéma Zod
export type AddressFormData = z.infer<typeof addressSchema>;

// Un sous-ensemble pour la création, car l'ID n'est pas fourni par le client
export const createAddressSchema = addressSchema;

// Un sous-ensemble pour la mise à jour, où l'ID est pertinent (mais pas dans le corps du formulaire)
export const updateAddressSchema = addressSchema;
