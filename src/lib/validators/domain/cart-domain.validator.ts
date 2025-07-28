/**
 * Domain-level validation for cart operations
 * 
 * These validators enforce business rules and domain constraints
 * that are independent of API format or transport layer.
 */

import { z } from "zod";
import { BusinessError, ValidationError } from "@/lib/core/errors";
import { Result } from "@/lib/core/result";

/**
 * Domain constraints
 */
export const CART_CONSTRAINTS = {
  MAX_QUANTITY_PER_ITEM: 99,
  MIN_QUANTITY: 1,
  MAX_ITEMS_IN_CART: 50,
  MAX_TOTAL_QUANTITY: 500,
} as const;

/**
 * Domain validation schemas
 */
export const CartDomainSchemas = {
  productId: z.string().uuid("ID produit invalide"),
  cartItemId: z.string().uuid("ID article panier invalide"),
  userId: z.string().uuid("ID utilisateur invalide"),
  
  quantity: z
    .number()
    .int("La quantité doit être un nombre entier")
    .min(CART_CONSTRAINTS.MIN_QUANTITY, `Quantité minimum: ${CART_CONSTRAINTS.MIN_QUANTITY}`)
    .max(CART_CONSTRAINTS.MAX_QUANTITY_PER_ITEM, `Quantité maximum: ${CART_CONSTRAINTS.MAX_QUANTITY_PER_ITEM}`),
  
  optionalQuantity: z
    .number()
    .int("La quantité doit être un nombre entier")
    .min(0, "La quantité ne peut pas être négative")
    .max(CART_CONSTRAINTS.MAX_QUANTITY_PER_ITEM, `Quantité maximum: ${CART_CONSTRAINTS.MAX_QUANTITY_PER_ITEM}`),
  
  price: z
    .number()
    .positive("Le prix doit être positif")
    .finite("Le prix doit être un nombre fini"),
  
  productName: z
    .string()
    .min(1, "Le nom du produit est requis")
    .max(255, "Le nom du produit est trop long"),
};

/**
 * Domain entities validation
 */
export const CartItemDomainSchema = z.object({
  id: CartDomainSchemas.cartItemId.optional(),
  productId: CartDomainSchemas.productId,
  quantity: CartDomainSchemas.quantity,
  name: CartDomainSchemas.productName,
  price: CartDomainSchemas.price,
  image: z.string().url("URL image invalide").optional(),
  slug: z.string().min(1, "Slug requis").optional(),
});

export const CartDomainSchema = z.object({
  id: z.string().uuid("ID panier invalide").optional(),
  userId: CartDomainSchemas.userId,
  items: z.array(CartItemDomainSchema).max(CART_CONSTRAINTS.MAX_ITEMS_IN_CART, "Trop d'articles dans le panier"),
  totalQuantity: z.number().max(CART_CONSTRAINTS.MAX_TOTAL_QUANTITY, "Quantité totale trop élevée").optional(),
});

/**
 * Domain operation schemas
 */
export const AddItemToCartDomainSchema = z.object({
  userId: CartDomainSchemas.userId,
  productId: CartDomainSchemas.productId,
  quantity: CartDomainSchemas.quantity,
  productDetails: z.object({
    name: CartDomainSchemas.productName,
    price: CartDomainSchemas.price,
    image: z.string().url().optional(),
    slug: z.string().optional(),
    stock: z.number().int().min(0, "Stock invalide"),
  }),
});

export const RemoveItemFromCartDomainSchema = z.object({
  userId: CartDomainSchemas.userId,
  cartItemId: CartDomainSchemas.cartItemId,
});

export const UpdateCartItemQuantityDomainSchema = z.object({
  userId: CartDomainSchemas.userId,
  cartItemId: CartDomainSchemas.cartItemId,
  quantity: CartDomainSchemas.optionalQuantity,
});

export const MigrateCartDomainSchema = z.object({
  fromUserId: CartDomainSchemas.userId,
  toUserId: CartDomainSchemas.userId,
});

/**
 * Type definitions
 */
export type CartItemDomain = z.infer<typeof CartItemDomainSchema>;
export type CartDomain = z.infer<typeof CartDomainSchema>;
export type AddItemToCartDomain = z.infer<typeof AddItemToCartDomainSchema>;
export type RemoveItemFromCartDomain = z.infer<typeof RemoveItemFromCartDomainSchema>;
export type UpdateCartItemQuantityDomain = z.infer<typeof UpdateCartItemQuantityDomainSchema>;
export type MigrateCartDomain = z.infer<typeof MigrateCartDomainSchema>;

/**
 * Domain validation utilities
 */
export class CartDomainValidator {
  /**
   * Validates add item operation with business rules
   */
  static validateAddItem(data: unknown): Result<AddItemToCartDomain, ValidationError> {
    try {
      const validated = AddItemToCartDomainSchema.parse(data);
      
      // Business rule: Check stock availability
      if (validated.quantity > validated.productDetails.stock) {
        return Result.error(new ValidationError(
          `Stock insuffisant. Disponible: ${validated.productDetails.stock}, demandé: ${validated.quantity}`,
          'quantity'
        ));
      }
      
      return Result.ok(validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Result.error(new ValidationError(
          'Données invalides pour l\'ajout au panier',
          undefined,
          { zodErrors: error.errors }
        ));
      }
      return Result.error(new ValidationError('Erreur de validation inconnue'));
    }
  }
  
  /**
   * Validates remove item operation
   */
  static validateRemoveItem(data: unknown): Result<RemoveItemFromCartDomain, ValidationError> {
    try {
      const validated = RemoveItemFromCartDomainSchema.parse(data);
      return Result.ok(validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Result.error(new ValidationError(
          'Données invalides pour la suppression',
          undefined,
          { zodErrors: error.errors }
        ));
      }
      return Result.error(new ValidationError('Erreur de validation inconnue'));
    }
  }
  
  /**
   * Validates update quantity operation with business rules
   */
  static validateUpdateQuantity(data: unknown): Result<UpdateCartItemQuantityDomain, ValidationError> {
    try {
      const validated = UpdateCartItemQuantityDomainSchema.parse(data);
      return Result.ok(validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Result.error(new ValidationError(
          'Données invalides pour la mise à jour de quantité',
          undefined,
          { zodErrors: error.errors }
        ));
      }
      return Result.error(new ValidationError('Erreur de validation inconnue'));
    }
  }
  
  /**
   * Validates cart state with business constraints
   */
  static validateCartState(cart: unknown): Result<CartDomain, ValidationError | BusinessError> {
    try {
      const validated = CartDomainSchema.parse(cart);
      
      // Business rule: Check total quantity
      const totalQuantity = validated.items.reduce((sum, item) => sum + item.quantity, 0);
      if (totalQuantity > CART_CONSTRAINTS.MAX_TOTAL_QUANTITY) {
        return Result.error(new BusinessError(
          `Quantité totale trop élevée: ${totalQuantity}/${CART_CONSTRAINTS.MAX_TOTAL_QUANTITY}`
        ));
      }
      
      // Business rule: Check duplicate products
      const productIds = validated.items.map(item => item.productId);
      const uniqueProductIds = new Set(productIds);
      if (productIds.length !== uniqueProductIds.size) {
        return Result.error(new BusinessError(
          'Produits en double détectés dans le panier'
        ));
      }
      
      return Result.ok(validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Result.error(new ValidationError(
          'État du panier invalide',
          undefined,
          { zodErrors: error.errors }
        ));
      }
      return Result.error(new ValidationError('Erreur de validation inconnue'));
    }
  }
  
  /**
   * Validates migration operation
   */
  static validateMigration(data: unknown): Result<MigrateCartDomain, ValidationError | BusinessError> {
    try {
      const validated = MigrateCartDomainSchema.parse(data);
      
      // Business rule: Cannot migrate to same user
      if (validated.fromUserId === validated.toUserId) {
        return Result.error(new BusinessError(
          'Impossible de migrer vers le même utilisateur'
        ));
      }
      
      return Result.ok(validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Result.error(new ValidationError(
          'Données invalides pour la migration',
          undefined,
          { zodErrors: error.errors }
        ));
      }
      return Result.error(new ValidationError('Erreur de validation inconnue'));
    }
  }
  
  /**
   * Validates if a quantity update is safe (considers stock)
   */
  static validateQuantityUpdate(
    currentQuantity: number,
    newQuantity: number,
    availableStock: number
  ): Result<boolean, BusinessError> {
    if (newQuantity < 0) {
      return Result.error(new BusinessError('La quantité ne peut pas être négative'));
    }
    
    if (newQuantity > availableStock) {
      return Result.error(new BusinessError(
        `Stock insuffisant. Disponible: ${availableStock}, demandé: ${newQuantity}`
      ));
    }
    
    if (newQuantity > CART_CONSTRAINTS.MAX_QUANTITY_PER_ITEM) {
      return Result.error(new BusinessError(
        `Quantité par article limitée à ${CART_CONSTRAINTS.MAX_QUANTITY_PER_ITEM}`
      ));
    }
    
    return Result.ok(true);
  }
  
  /**
   * Business rule: Check if cart can accept new item
   */
  static canAddItemToCart(
    currentCart: CartDomain,
    newItemQuantity: number
  ): Result<boolean, BusinessError> {
    const currentTotalQuantity = currentCart.items.reduce((sum, item) => sum + item.quantity, 0);
    const newTotalQuantity = currentTotalQuantity + newItemQuantity;
    
    if (newTotalQuantity > CART_CONSTRAINTS.MAX_TOTAL_QUANTITY) {
      return Result.error(new BusinessError(
        `Ajout impossible. Limite totale: ${CART_CONSTRAINTS.MAX_TOTAL_QUANTITY}, actuel: ${currentTotalQuantity}`
      ));
    }
    
    if (currentCart.items.length >= CART_CONSTRAINTS.MAX_ITEMS_IN_CART) {
      return Result.error(new BusinessError(
        `Nombre maximum d'articles différents atteint: ${CART_CONSTRAINTS.MAX_ITEMS_IN_CART}`
      ));
    }
    
    return Result.ok(true);
  }
}