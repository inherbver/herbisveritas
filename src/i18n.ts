import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales, defaultLocale, Locale } from "./i18n-config";

export default getRequestConfig(async ({ locale: requestLocale }) => {
  let localeToUse = defaultLocale;
  if (locales.includes(requestLocale as Locale)) {
    localeToUse = requestLocale as Locale;
  }

  let globalNamespaceContent: Record<string, unknown> | undefined = undefined;
  let rootLevelMessages: Record<string, unknown> | undefined = undefined;

  try {
    const rawGlobalImport = await import(`@/i18n/messages/${localeToUse}/Global.json`);
    globalNamespaceContent = rawGlobalImport.default;
  } catch (_error) {
    if (localeToUse !== defaultLocale) {
      try {
        const rawFallbackGlobalImport = await import(
          `@/i18n/messages/${defaultLocale}/Global.json`
        );
        globalNamespaceContent = rawFallbackGlobalImport.default;
      } catch (_fallbackError) {
        console.warn(
          `Could not load fallback messages for Global.json (default locale: ${defaultLocale}).`
        );
      }
    }
  }

  try {
    const rawRootImport = await import(`@/messages/${localeToUse}.json`);
    rootLevelMessages = rawRootImport.default;
  } catch (_error) {
    if (localeToUse !== defaultLocale) {
      try {
        const rawFallbackRootImport = await import(`@/messages/${defaultLocale}.json`);
        rootLevelMessages = rawFallbackRootImport.default;
      } catch (_fallbackError) {
        console.warn(`Could not load fallback root messages for locale ${defaultLocale}.json.`);
      }
    }
  }

  globalNamespaceContent = globalNamespaceContent || {};
  rootLevelMessages = rootLevelMessages || {};

  const mergedMessages = {
    ...rootLevelMessages,
    Global: globalNamespaceContent,
  };

  if (
    Object.keys(rootLevelMessages).length === 0 &&
    Object.keys(globalNamespaceContent).length === 0
  ) {
    notFound();
  }

  return {
    locale: localeToUse,
    messages: mergedMessages,
    timeZone: "Europe/Paris",
  };
});
