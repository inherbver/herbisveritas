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
    return {
      locale: locale,
      messages: (await import(`../messages/${locale}.json`)).default,
    };
  } catch (error) {
    console.error(`Error loading messages for locale ${locale}:`, error);
    try {
      return {
        locale: defaultLocale,
        messages: (await import(`../messages/${defaultLocale}.json`)).default,
      };
    } catch (defaultError) {
      console.error(`Error loading default messages (${defaultLocale}):`, defaultError);
      notFound();
    }
  }
});
