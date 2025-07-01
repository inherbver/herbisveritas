import { Locale } from "@/i18n-config";

/**
 * Formats a numeric price into a localized currency string.
 * Defaults to EUR currency.
 *
 * @param price The price as a number, or null/undefined.
 * @param locale The locale string (e.g., 'fr', 'en').
 * @returns The formatted price string (e.g., "12,50 €") or an empty string if price is null/undefined.
 */
export function formatPrice(price: number | null | undefined, locale: Locale): string {
  if (price === null || price === undefined) {
    return ""; // Or a placeholder
  }

  let usedLocale: string = locale;
  try {
    // Check if the provided locale is supported by Intl.NumberFormat
    new Intl.NumberFormat(locale);
  } catch (_e) {
    console.warn(
      `Unsupported locale '${locale}' provided to formatPrice. Falling back to 'fr-FR'.`
    );
    usedLocale = "fr-FR"; // Fallback to a default supported locale
  }

  try {
    return new Intl.NumberFormat(usedLocale, {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  } catch (error) {
    console.error(`Error formatting price ${price} for locale ${usedLocale}:`, error);
    // Fallback formatting in case of Intl error
    return `${price.toFixed(2)} €`;
  }
}
