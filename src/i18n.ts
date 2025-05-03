import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales, defaultLocale, Locale } from "./i18n-config";

export default getRequestConfig(async ({ locale: requestLocale }) => {
  // Validate that the incoming `locale` parameter is valid.
  // Utilise la locale demandée si elle est valide, sinon la locale par défaut.
  let locale = defaultLocale;
  if (requestLocale && locales.includes(requestLocale as Locale)) {
    locale = requestLocale as Locale;
  }

  try {
    // --- DEBUG PATH ---
    // const filePath = require.resolve(`./messages/${locale}.json`); // Corrected path
    // console.log(`\n--- Attempting to load messages from: ${filePath} ---\n`);
    // --- END DEBUG PATH ---
    const messages = (await import(`./messages/${locale}.json`)).default; // Corrected path
    // --- DEBUG LOG ---
    // console.log(`\n--- Messages loaded for locale '${locale}': ---`);
    // console.log(JSON.stringify(messages, null, 2));
    // console.log(`--- End of messages for locale '${locale}' ---\n`);
    // --- END DEBUG LOG ---
    return { locale, messages, timeZone: "Europe/Paris" };
  } catch (_error) {
    // console.error(`Error loading messages for locale ${locale}:`, _error);
    try {
      // --- DEBUG PATH (Fallback) ---
      // const fallbackFilePath = require.resolve(`./messages/${defaultLocale}.json`); // Corrected path
      // console.log(`\n--- Attempting to load FALLBACK messages from: ${fallbackFilePath} ---\n`);
      // --- END DEBUG PATH (Fallback) ---
      const defaultMessages = (await import(`./messages/${defaultLocale}.json`)).default; // Corrected path
      // --- DEBUG LOG (Fallback) ---
      // console.log(`\n--- FALLBACK Messages loaded for locale '${defaultLocale}': ---`);
      // console.log(JSON.stringify(defaultMessages, null, 2));
      // console.log(`--- End of fallback messages for locale '${defaultLocale}' ---\n`);
      // --- END DEBUG LOG (Fallback) ---
      return { locale: defaultLocale, messages: defaultMessages, timeZone: "Europe/Paris" };
    } catch (_defaultError) {
      // console.error(`Error loading default messages (${defaultLocale}):`, _defaultError);
      notFound();
    }
  }
});
