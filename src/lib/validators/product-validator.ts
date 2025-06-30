import { z } from 'zod';

// Schéma pour une seule traduction de produit
export const productTranslationSchema = z.object({
  locale: z.string().min(2, { message: 'Le code de langue est requis (ex: fr).' }),
  name: z.string().min(3, { message: 'Le nom du produit doit contenir au moins 3 caractères.' }),
  short_description: z.string().optional(),
  description_long: z.string().optional(),
  usage_instructions: z.string().optional(),
  properties: z.string().optional(),
  composition_text: z.string().optional(),
});

// ✅ Schéma simplifié pour éviter les conflits TypeScript
export const productSchema = z.object({
  // Champs obligatoires
  id: z.string().min(1, { message: 'Le SKU/ID est requis.' }),
  slug: z.string()
    .min(3, { message: 'Le slug doit contenir au moins 3 caractères.' })
    .regex(/^[a-z0-9-]+$/, { message: 'Le slug ne peut contenir que des minuscules, chiffres et tirets.' }),
  
  // Champs numériques optionnels (nullable)
  price: z.number().min(0).nullable().optional(),
  stock: z.number().int().nullable().optional(),
  
  // Champs texte optionnels
  unit: z.string().optional(),
  image_url: z.string().url().nullable().optional(),
  
  // Arrays (avec defaults dans le composant)
  inci_list: z.array(z.string()).optional(),
  
  // Booléens
  is_active: z.boolean(),
  is_new: z.boolean(),
  is_on_promotion: z.boolean(),

  // Champ pour les traductions associées
  translations: z.array(productTranslationSchema).min(1, { message: 'Au moins une traduction est requise.' }),
});

// ✅ Correction : Type inféré plus strict
export type ProductFormValues = z.infer<typeof productSchema>;

// ✅ Type pour les traductions
export type ProductTranslation = z.infer<typeof productTranslationSchema>;
