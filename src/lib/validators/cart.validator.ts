import { z } from "zod";

// ✅ Schéma pour AddToCartInputSchema
export const AddToCartInputSchema = z.object({
  productId: z.string().uuid("L'ID du produit doit être un UUID valide."),
  quantity: z.preprocess(
    (val) => {
      // Convertir string vers number si nécessaire
      if (typeof val === "string") {
        const parsed = parseInt(val, 10);
        return isNaN(parsed) ? val : parsed;
      }
      return val;
    },
    z
      .number()
      .int("La quantité doit être un nombre entier.")
      .positive("La quantité doit être positive.")
      .max(99, "La quantité ne peut pas dépasser 99.")
  ),
});

export type AddToCartInput = z.infer<typeof AddToCartInputSchema>;

// ✅ Schéma pour RemoveFromCartInputSchema
export const RemoveFromCartInputSchema = z.object({
  cartItemId: z.string().uuid("L'ID de l'article du panier doit être un UUID valide."),
});

export type RemoveFromCartInput = z.infer<typeof RemoveFromCartInputSchema>;

// ✅ Schéma pour UpdateCartItemQuantityInputSchema
export const UpdateCartItemQuantityInputSchema = z.object({
  cartItemId: z.string().uuid("L'ID de l'article du panier doit être un UUID valide."),
  quantity: z
    .number()
    .int("La quantité doit être un nombre entier.")
    .min(0, "La quantité ne peut pas être négative.")
    .max(99, "La quantité ne peut pas dépasser 99."),
});

export type UpdateCartItemQuantityInput = z.infer<typeof UpdateCartItemQuantityInputSchema>;

// ✅ Schéma pour MigrateCartInputSchema
export const MigrateCartInputSchema = z.object({
  guestUserId: z.string().uuid("L'ID de l'invité doit être un UUID valide."),
});

export type MigrateCartInput = z.infer<typeof MigrateCartInputSchema>;
