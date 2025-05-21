import { z } from "zod";

// Schéma pour l'ajout d'un article au panier
export const AddToCartInputSchema = z.object({
  productId: z.string().min(1, { message: "L'ID du produit ne peut pas être vide." }),
  quantity: z
    .number()
    .int({ message: "La quantité doit être un nombre entier." })
    .positive({ message: "La quantité doit être supérieure à zéro." })
    .min(1, { message: "La quantité doit être au moins de 1." }),
  // Vous pourriez ajouter d'autres champs ici si nécessaire, par ex. des options de produit
});
export type AddToCartInput = z.infer<typeof AddToCartInputSchema>;

// Schéma pour la suppression d'un article du panier
export const RemoveFromCartInputSchema = z.object({
  cartItemId: z.string().uuid({ message: "L'ID de l'article du panier doit être un UUID valide." }),
});
export type RemoveFromCartInput = z.infer<typeof RemoveFromCartInputSchema>;

// Schéma pour la mise à jour de la quantité d'un article dans le panier
export const UpdateCartItemQuantityInputSchema = z.object({
  cartItemId: z.string().uuid({ message: "L'ID de l'article du panier doit être un UUID valide." }),
  quantity: z
    .number()
    .int({ message: "La quantité doit être un nombre entier." })
    .min(0, { message: "La quantité ne peut pas être négative." }), // 0 signifiera suppression
});
export type UpdateCartItemQuantityInput = z.infer<typeof UpdateCartItemQuantityInputSchema>;

// Optionnel: Un schéma pour l'identifiant du panier, si vous devez le passer explicitement
export const CartIdSchema = z.object({
  cartId: z.string().uuid({ message: "L'ID du panier doit être un UUID valide." }),
});
export type CartIdInput = z.infer<typeof CartIdSchema>;
