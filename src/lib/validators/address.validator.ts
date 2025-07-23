import { z } from "zod";

// Messages d'erreur communs pour la réutilisation
const requiredFieldMessage = (fieldName: string) => `${fieldName} est requis.`;

export const addressSchema = z.object({
  // id, user_id, created_at, updated_at ne sont généralement pas dans le formulaire utilisateur
  // mais sont gérés côté serveur ou par la base de données.

  address_type: z.enum(["shipping", "billing"], {
    required_error: requiredFieldMessage("Le type d'adresse"),
    invalid_type_error: "Le type d'adresse doit être 'shipping' ou 'billing'.",
  }),

  company_name: z
    .string()
    .max(100, "Le nom de l'entreprise ne doit pas dépasser 100 caractères.")
    .optional()
    .nullable(), // Permet une chaîne vide ou null

  first_name: z
    .string()
    .min(2, { message: "Le prénom doit contenir au moins 2 caractères." })
    .max(50, { message: "Le prénom ne peut pas dépasser 50 caractères." }),

  last_name: z
    .string()
    .min(2, { message: "Le nom de famille doit contenir au moins 2 caractères." })
    .max(50, { message: "Le nom de famille ne peut pas dépasser 50 caractères." }),

  email: z
    .string()
    .email({ message: "Veuillez saisir une adresse e-mail valide." })
    .optional()
    .or(z.literal("")), // Permet une chaîne vide

  street_number: z
    .string()
    .max(20, "Le numéro de rue ne doit pas dépasser 20 caractères.")
    .optional()
    .nullable(),

  address_line1: z
    .string()
    .min(1, requiredFieldMessage("Le nom de rue"))
    .max(200, "Le nom de rue ne doit pas dépasser 200 caractères."),

  address_line2: z
    .string()
    .max(200, "Le complément d'adresse ne doit pas dépasser 200 caractères.")
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

// Définit la structure requise pour les traductions du formulaire d'adresse
export interface AddressFormTranslations {
  formTitle: (addressType: "shipping" | "billing", isEditing: boolean) => string;
  recipientSectionTitle: string;
  addressSectionTitle: string;
  contactSectionTitle: string;

  fieldLabels: {
    first_name: string;
    last_name: string;
    email: string;
    company_name: string;
    street_number: string;
    address_line1: string;
    address_line2: string;
    postal_code: string;
    city: string;
    country_code: string;
    state_province_region: string;
    phoneNumber: string;
  };
  placeholders: {
    first_name?: string;
    last_name?: string;
    email?: string;
    company_name?: string;
    street_number?: string;
    address_line1?: string;
    address_line2?: string;
    postal_code?: string;
    city?: string;
    country_code?: string;
    state_province_region?: string;
    phoneNumber?: string;
  };
  buttons: {
    save: string;
    saving: string;
    cancel: string;
    showOptionalFields: string;
  };
  serverActions: {
    validationError: string;
    success: string;
    error: string;
  };
}

// Interface pour les props du composant AddressForm
export interface AddressFormProps {
  translations: AddressFormTranslations;
  addressType: "shipping" | "billing";
  existingAddress?: (Partial<AddressFormData> & { id?: string }) | null;
  onCancel: () => void;
  onSuccess: () => void;
  locale: string;
}

// Un sous-ensemble pour la création, car l'ID n'est pas fourni par le client
export const createAddressSchema = addressSchema;

// Un sous-ensemble pour la mise à jour, où l'ID est pertinent (mais pas dans le corps du formulaire)
export const updateAddressSchema = addressSchema;
