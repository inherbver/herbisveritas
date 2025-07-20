import { z } from "zod";
import { ProductStatus } from "@/types/product-filters";

// Schéma pour une seule traduction de produit
export const productTranslationSchema = z.object({
  locale: z.string().min(2, { message: "Le code de langue est requis (ex: fr)." }),
  name: z.string().min(3, { message: "Le nom du produit doit contenir au moins 3 caractères." }),
  short_description: z.string().optional(),
  description_long: z.string().optional(),
  usage_instructions: z.string().optional(),
  properties: z.string().optional(),
  composition_text: z.string().optional(),
});

// Schéma principal avec des types cohérents
export const productSchema = z.object({
  // Champs obligatoires
  id: z.string().uuid({ message: "Le SKU/ID doit être un UUID valide." }).optional(),
  slug: z
    .string()
    .min(3, { message: "Le slug doit contenir au moins 3 caractères." })
    .regex(/^[a-z0-9-]+$/, {
      message: "Le slug ne peut contenir que des minuscules, chiffres et tirets.",
    }),

  // Champs numériques - utilisation de coerce pour conversion automatique
  price: z.coerce.number().min(0, { message: "Le prix doit être positif." }),
  stock: z.coerce.number().int().min(0, { message: "Le stock doit être un entier positif." }),

  // Champs texte
  unit: z.string(),
  image_url: z.string(),

  // Arrays
  inci_list: z.array(z.string()),

  // Statut du produit
  status: z.enum(["active", "inactive", "draft"] as const),

  // Booléens (maintenu pour compatibilité)
  is_active: z.boolean(),
  is_new: z.boolean(),
  is_on_promotion: z.boolean(),

  // Champ pour les traductions associées
  translations: z
    .array(productTranslationSchema)
    .min(1, { message: "Au moins une traduction est requise." }),
});

// Schéma pour les defaultValues avec status requis mais avec default
export const productFormSchema = productSchema.extend({
  status: z.enum(["active", "inactive", "draft"] as const).default("active"),
});

// Types inférés
export type ProductFormValues = z.infer<typeof productSchema>;
export type ProductTranslation = z.infer<typeof productTranslationSchema>;

// Type pour les valeurs par défaut
export const getDefaultProductValues = (): ProductFormValues => ({
  id: crypto.randomUUID(),
  slug: "",
  price: 0,
  stock: 0,
  unit: "",
  image_url: "",
  inci_list: [],
  status: "active" as ProductStatus,
  is_active: true,
  is_new: false,
  is_on_promotion: false,
  translations: [
    {
      locale: "fr",
      name: "",
      short_description: "",
      description_long: "",
      usage_instructions: "",
      properties: "",
      composition_text: "",
    },
  ],
});
