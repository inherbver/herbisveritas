// src/lib/cart-helpers.ts
// Helper functions pour les actions du panier (sans "use server")

import type { CartDataFromServer, ServerCartItem } from "@/lib/supabase/types";

// --- Action Result Types ---

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

/**
 * A discriminated union for server action results.
 * The `success` property can be `true`, `false`, or `undefined` for the initial state.
 */
export type CartActionResult<T> = (SuccessResult<T> | ValidationErrorResult | GeneralErrorResult) & {
  success?: boolean;
};

// --- Result Creator Functions ---

export function createSuccessResult<T>(data: T, message?: string): SuccessResult<T> {
  return { success: true, data, message };
}

export function createValidationErrorResult(
  errors: Record<string, string[] | undefined>,
  message?: string
): ValidationErrorResult {
  return { success: false, errors, message };
}

export function createGeneralErrorResult(error: string, message?: string): GeneralErrorResult {
  return { success: false, error, message };
}

// --- Type Guards ---

export function isSuccessResult<T>(result: CartActionResult<T>): result is SuccessResult<T> {
  return result.success === true;
}

export function isValidationErrorResult<T>(result: CartActionResult<T>): result is ValidationErrorResult {
  return result.success === false && "errors" in result;
}

export function isGeneralErrorResult<T>(result: CartActionResult<T>): result is GeneralErrorResult {
  return result.success === false && "error" in result;
}

// --- Initial State for useActionState ---

/**
 * Initial state for `useActionState`.
 * `success` is `undefined` to distinguish it from a failed action (`false`).
 */
export const INITIAL_ACTION_STATE_DO_NOT_PROCESS: CartActionResult<null> = {
  success: undefined,
  message: "Initial state. This result should not be processed.",
};

// --- Transformation Functions ---

/**
 * CORRECTION: Cette fonction transforme les ServerCartItem[] en structure client
 * Elle ne prend pas CartDataFromServer[] mais ServerCartItem[]
 */
export const transformServerCartToClientItems = (
  serverItems: ServerCartItem[]
): Array<{
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  slug?: string;
}> => {
  if (!serverItems || serverItems.length === 0) {
    return [];
  }
  
  return serverItems.map((serverItem: ServerCartItem) => ({
    id: serverItem.product_id, // Utilise product_id comme id temporaire côté client
    productId: serverItem.product_id,
    name: serverItem.name,
    price: serverItem.price,
    quantity: serverItem.quantity,
    image: serverItem.image_url || undefined,
    slug: undefined, // Pas disponible dans ServerCartItem selon la définition
  }));
};
