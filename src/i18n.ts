import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, defaultLocale } from './i18n-config'; // Assumes i18n-config.ts is in the same directory (src)

export default getRequestConfig(async ({ locale: requestLocale }) => {
  // Validate that the incoming `locale` parameter is valid.
  // Utilise la locale demandée si elle est valide, sinon la locale par défaut.
  let locale = defaultLocale;
  if (requestLocale && locales.includes(requestLocale as any)) {
    locale = requestLocale;
  }

  try {
    return {
      locale: locale as string, // Assurer le type string
      messages: (await import(`../messages/${locale}.json`)).default // Corrected path to ../messages/
    };
  } catch (error) {
    console.error(`Error loading messages for locale ${locale}:`, error);
    try {
      return {
        locale: defaultLocale, // Retourner la locale par défaut
        messages: (await import(`../messages/${defaultLocale}.json`)).default, // Corrected path to ../messages/
      };
    } catch (defaultError) {
      console.error(`Error loading default messages (${defaultLocale}):`, defaultError);
      notFound();
    }
  }
});
