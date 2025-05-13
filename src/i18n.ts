import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales, defaultLocale, Locale } from "./i18n-config";

export default getRequestConfig(async ({ locale: requestLocale }) => {
  let localeToUse = defaultLocale;
  if (locales.includes(requestLocale as Locale)) {
    localeToUse = requestLocale as Locale;
  }
  console.log(`[i18n] Using locale: ${localeToUse} (requested: ${requestLocale})`);

  let globalNamespaceContent: any = undefined; // Contenu de Global.json
  let rootLevelMessages: any = undefined;    // Contenu de [locale].json (ancien format plat)

  // Charger le contenu du namespace 'Global' (src/i18n/messages/[locale]/Global.json)
  try {
    const rawGlobalImport = await import(`@/i18n/messages/${localeToUse}/Global.json`);
    console.log(`[i18n] Raw import for @/i18n/messages/${localeToUse}/Global.json:`, JSON.stringify(rawGlobalImport, null, 2));
    globalNamespaceContent = rawGlobalImport.default;
    console.log(`[i18n] Content from @/i18n/messages/${localeToUse}/Global.json after .default:`, JSON.stringify(globalNamespaceContent, null, 2));
  } catch (error) {
    console.error(`[i18n] ERROR importing @/i18n/messages/${localeToUse}/Global.json:`, error);
    if (localeToUse !== defaultLocale) {
      console.warn(`[i18n] Attempting fallback for Global namespace content to locale: ${defaultLocale}`);
      try {
        const rawFallbackGlobalImport = await import(`@/i18n/messages/${defaultLocale}/Global.json`);
        console.log(`[i18n] Raw fallback import for @/i18n/messages/${defaultLocale}/Global.json:`, JSON.stringify(rawFallbackGlobalImport, null, 2));
        globalNamespaceContent = rawFallbackGlobalImport.default;
        console.log(`[i18n] Fallback content from @/i18n/messages/${defaultLocale}/Global.json after .default:`, JSON.stringify(globalNamespaceContent, null, 2));
      } catch (fallbackError) {
        console.error(`[i18n] ERROR importing fallback @/i18n/messages/${defaultLocale}/Global.json:`, fallbackError);
      }
    }
  }

  // Charger les messages de premier niveau (src/messages/[locale].json)
  try {
    const rawRootImport = await import(`@/messages/${localeToUse}.json`);
    console.log(`[i18n] Raw import for @/messages/${localeToUse}.json:`, JSON.stringify(rawRootImport, null, 2));
    rootLevelMessages = rawRootImport.default;
    console.log(`[i18n] Content from @/messages/${localeToUse}.json after .default:`, JSON.stringify(rootLevelMessages, null, 2));
  } catch (error) {
    console.error(`[i18n] ERROR importing @/messages/${localeToUse}.json:`, error);
    if (localeToUse !== defaultLocale) {
      console.warn(`[i18n] Attempting fallback for root level messages to locale: ${defaultLocale}`);
      try {
        const rawFallbackRootImport = await import(`@/messages/${defaultLocale}.json`);
        console.log(`[i18n] Raw fallback import for @/messages/${defaultLocale}.json:`, JSON.stringify(rawFallbackRootImport, null, 2));
        rootLevelMessages = rawFallbackRootImport.default;
        console.log(`[i18n] Fallback content from @/messages/${defaultLocale}.json after .default:`, JSON.stringify(rootLevelMessages, null, 2));
      } catch (fallbackError) {
        console.error(`[i18n] ERROR importing fallback @/messages/${defaultLocale}.json:`, fallbackError);
      }
    }
  }
  
  // Assurer que les objets messages ne sont pas undefined
  console.log('[i18n] Before || {}: globalNamespaceContent:', JSON.stringify(globalNamespaceContent, null, 2));
  console.log('[i18n] Before || {}: rootLevelMessages:', JSON.stringify(rootLevelMessages, null, 2));
  globalNamespaceContent = globalNamespaceContent || {};
  rootLevelMessages = rootLevelMessages || {};
  console.log('[i18n] After || {}: globalNamespaceContent:', JSON.stringify(globalNamespaceContent, null, 2));
  console.log('[i18n] After || {}: rootLevelMessages:', JSON.stringify(rootLevelMessages, null, 2));

  const mergedMessages = {
    ...rootLevelMessages, // Les messages plats sont à la racine
    Global: globalNamespaceContent // Le contenu de Global.json est sous la clé 'Global'
  };
  console.log('[i18n] Final mergedMessages structure:', JSON.stringify(mergedMessages, null, 2));

  // Déclencher notFound seulement si absolument aucun message n'a été chargé
  if (Object.keys(rootLevelMessages).length === 0 && Object.keys(globalNamespaceContent).length === 0) {
    console.error(`[i18n] Critital: No messages could be loaded for locale ${localeToUse} or its fallback ${defaultLocale} from any source. Triggering notFound.`);
    notFound();
  }

  return {
    locale: localeToUse, 
    messages: mergedMessages,
    timeZone: "Europe/Paris", 
  };
});
