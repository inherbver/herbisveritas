// src/lib/cart-helpers.ts
// Helper functions pour les actions du panier (sans "use server")

import type { CartItem as ClientCartItem, ServerCartItem } from "@/types/cart";

// Union discriminée stricte pour CartActionResult
export type SuccessResult<T> = {
  success: true;
  message?: string;
  data: T;
};

export type ValidationErrorResult = {
  success: false;
  message?: string;
  errors: Record<string, string[] | undefined>;
};

export type GeneralErrorResult = {
  success: false;
  message?: string;
  error: string;
};

export type CartActionResult<T> = SuccessResult<T> | ValidationErrorResult | GeneralErrorResult;

// Type guards pour une utilisation TypeScript-safe
export const isSuccessResult = <T>(result: CartActionResult<T>): result is SuccessResult<T> => {
  return result.success === true;
};

export const isValidationError = <T>(
  result: CartActionResult<T>
): result is ValidationErrorResult => {
  return result.success === false && Object.prototype.hasOwnProperty.call(result, "errors");
};

export const isGeneralError = <T>(result: CartActionResult<T>): result is GeneralErrorResult => {
  return (
    result.success === false &&
    Object.prototype.hasOwnProperty.call(result, "error") &&
    !Object.prototype.hasOwnProperty.call(result, "errors")
  );
};

// Fonctions utilitaires pour créer les résultats
export const createSuccessResult = <T>(data: T, message?: string): SuccessResult<T> => ({
  success: true,
  data,
  message,
});

export const createValidationErrorResult = (
  errors: Record<string, string[] | undefined>,
  message?: string
): ValidationErrorResult => ({
  success: false,
  errors,
  message,
});

export const createGeneralErrorResult = (error: string, message?: string): GeneralErrorResult => ({
  success: false,
  error,
  message,
});

// Fonction pour transformer ServerCartItem[] (structure serveur) en CartItem[] (structure client)
export const transformServerCartToClientItems = (
  serverItems: ServerCartItem[]
): ClientCartItem[] => {
  if (!serverItems || serverItems.length === 0) {
    return [];
  }
  return serverItems.map(
    (serverItem: ServerCartItem): ClientCartItem => ({
      id: serverItem.id, // This is cart_items.id
      productId: serverItem.product_id,
      name: serverItem.products?.name || "Produit inconnu",
      price: serverItem.products?.price || 0,
      quantity: serverItem.quantity,
      image: serverItem.products?.image_url || undefined, // products.image_url from DB maps to CartItem.image
      slug: serverItem.products?.slug || undefined,
    })
  );
};
