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
    const messages = (await import(`./messages/${locale}.json`)).default; // Corrected path
    return { locale, messages, timeZone: "Europe/Paris" };
  } catch (_error) {
    try {
      const defaultMessages = (await import(`./messages/${defaultLocale}.json`)).default; // Corrected path
      return { locale: defaultLocale, messages: defaultMessages, timeZone: "Europe/Paris" };
    } catch (_defaultError) {
      notFound();
    }
  }
});
