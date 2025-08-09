/**
 * Cart hooks with proper hydration handling
 *
 * These hooks prevent hydration mismatches by returning safe default values
 * during server-side rendering and initial hydration.
 */

import { useHydrated } from "./use-hydrated";
import {
  useCartTotalItems as useCartTotalItemsStore,
  useCartItems as useCartItemsStore,
  useCartSubtotal as useCartSubtotalStore,
} from "@/stores/cartStore";

/**
 * Hook to get total cart items count with hydration safety
 */
export function useCartTotalItemsHydrated(): number {
  const hydrated = useHydrated();
  const totalItems = useCartTotalItemsStore();

  // Return 0 during SSR and initial hydration to prevent mismatch
  return hydrated ? totalItems : 0;
}

/**
 * Hook to get cart items with hydration safety
 */
export function useCartItemsHydrated() {
  const hydrated = useHydrated();
  const items = useCartItemsStore();

  // Return empty array during SSR and initial hydration
  return hydrated ? items : [];
}

/**
 * Hook to get cart subtotal with hydration safety
 */
export function useCartSubtotalHydrated(): number {
  const hydrated = useHydrated();
  const subtotal = useCartSubtotalStore();

  // Return 0 during SSR and initial hydration
  return hydrated ? subtotal : 0;
}
