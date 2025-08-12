import { Locale } from "@/i18n-config";

/**
 * Formats a numeric price into a localized currency string.
 * Defaults to EUR currency.
 *
 * @param price The price as a number, or null/undefined.
 * @param locale The locale string (e.g., 'fr', 'en').
 * @param currency Optional currency code (defaults to EUR).
 * @returns The formatted price string (e.g., "12,50 €") or an empty string if price is null/undefined.
 */
export function formatPrice(
  price: number | null | undefined,
  locale: Locale | string = "fr-FR",
  currency: string = "EUR"
): string {
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
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  } catch (error) {
    console.error(`Error formatting price ${price} for locale ${usedLocale}:`, error);
    // Fallback formatting in case of Intl error
    return `${price.toFixed(2)} €`;
  }
}

/**
 * Format date in various formats
 */
export function formatDate(
  date: Date | string | null | undefined,
  format: "default" | "short" | "long" | "time" = "default",
  locale: string = "fr-FR"
): string {
  if (!date) return "";

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;

    if (!dateObj || isNaN(dateObj.getTime())) {
      return "Date invalide";
    }

    const formatOptions: Record<string, Intl.DateTimeFormatOptions> = {
      default: { year: "numeric", month: "long", day: "numeric" },
      short: { year: "numeric", month: "2-digit", day: "2-digit" },
      long: { weekday: "long", year: "numeric", month: "long", day: "numeric" },
      time: { hour: "2-digit", minute: "2-digit" },
    };
    const options = formatOptions[format] || formatOptions.default;

    return new Intl.DateTimeFormat(locale, options).format(dateObj);
  } catch {
    return "Date invalide";
  }
}

/**
 * Format phone number
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return "";

  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, "");

  // Handle French numbers
  if (cleaned.startsWith("+33") || cleaned.startsWith("33")) {
    const number = cleaned.replace(/^\+?33/, "");
    if (number.length === 9) {
      return `+33 ${number[0]} ${number.slice(1, 3)} ${number.slice(3, 5)} ${number.slice(5, 7)} ${number.slice(7)}`;
    }
  }

  // Handle French numbers without country code
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8)}`;
  }

  // Handle US numbers
  if (cleaned.startsWith("+1") && cleaned.length === 12) {
    const number = cleaned.slice(2);
    return `+1 ${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)}`;
  }

  // Handle UK numbers
  if (cleaned.startsWith("+44") && cleaned.length === 13) {
    const number = cleaned.slice(3);
    return `+44 ${number.slice(0, 2)} ${number.slice(2, 6)} ${number.slice(6)}`;
  }

  // Return original if no pattern matches
  return phone;
}

/**
 * Format order number with prefix
 */
export function formatOrderNumber(orderNumber: string | number): string {
  if (!orderNumber) return "CMD-000000";

  const numStr = orderNumber.toString();

  // If already has prefix, return as is
  if (numStr.includes("-")) {
    return numStr;
  }

  // Add prefix and pad with zeros
  const paddedNumber = numStr.padStart(6, "0");
  return `CMD-${paddedNumber}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number, suffix: string = "..."): string {
  if (!text) return "";
  if (maxLength <= 0) return suffix;
  if (text.length <= maxLength) return text;

  return text.slice(0, maxLength) + suffix;
}

/**
 * Capitalize first letter and lowercase rest
 */
export function capitalizeFirst(text: string): string {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  const isNegative = bytes < 0;
  bytes = Math.abs(bytes);

  if (bytes === 0) return "0 B";

  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, index);

  return `${isNegative ? "-" : ""}${value.toFixed(1)} ${units[index]}`;
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format currency with custom symbol
 */
export function formatCurrency(
  amount: number,
  symbol: string,
  position: "before" | "after" = "before",
  decimals: number = 2
): string {
  const formatted = amount.toFixed(decimals);
  return position === "before" ? `${symbol} ${formatted}` : `${formatted} ${symbol}`;
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string, locale: string = "fr-FR"): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (Math.abs(diffSecs) < 30) {
    return locale === "fr-FR" ? "à l'instant" : "just now";
  } else if (Math.abs(diffMins) < 60) {
    return rtf.format(-diffMins, "minute");
  } else if (Math.abs(diffHours) < 24) {
    return rtf.format(-diffHours, "hour");
  } else if (Math.abs(diffDays) < 7) {
    return rtf.format(-diffDays, "day");
  } else {
    return rtf.format(-diffWeeks, "week");
  }
}
