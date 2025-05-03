import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Locale } from "@/i18n-config"; // Import Locale type

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a numeric price into a localized currency string.
 * Defaults to EUR currency.
 *
 * @param price The price as a number, or null.
 * @param locale The locale string (e.g., 'fr', 'en').
 * @returns The formatted price string (e.g., "12,50 €") or an empty string if price is null/undefined.
 */
export function formatPrice(price: number | null | undefined, locale: Locale): string {
  if (price === null || price === undefined) {
    return ""; // Or return a placeholder like "Prix non disponible"
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR", // TODO: Make currency dynamic if needed
      // minimumFractionDigits: 2, // Optional: Ensure 2 decimal places
      // maximumFractionDigits: 2, // Optional: Ensure 2 decimal places
    }).format(price);
  } catch (error) {
    console.error(`Error formatting price ${price} for locale ${locale}:`, error);
    // Fallback formatting in case of Intl error
    return `${price.toFixed(2)} €`;
  }
}
