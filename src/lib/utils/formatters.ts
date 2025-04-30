/**
 * Formats a number as a price string according to the locale and currency (EUR).
 *
 * @param price The number to format.
 * @param locale The locale string (e.g., 'fr-FR', 'en-US'). Defaults to 'fr-FR'.
 * @returns The formatted price string (e.g., "15,00 €").
 */
export function formatPrice(
  price: number,
  locale: string = "fr-FR" // Default to French locale for consistency
): string {
  // Ensure locale is valid, fallback if necessary
  let usedLocale = "fr-FR";
  try {
    // Check if provided locale is supported by Intl.NumberFormat
    new Intl.NumberFormat(locale);
    usedLocale = locale;
  } catch {
    // Removed unused 'e' variable
    console.warn(
      `Unsupported locale '${locale}' provided to formatPrice. Falling back to 'fr-FR'.`
    );
    // Fallback locale is already set
  }

  return new Intl.NumberFormat(usedLocale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2, // Ensure two decimal places
    maximumFractionDigits: 2,
  }).format(price);
}

// Add other formatters here as needed (e.g., formatDate)
