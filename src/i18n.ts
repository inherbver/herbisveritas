import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales, defaultLocale, Locale } from "./i18n-config";

export default getRequestConfig(async ({ locale: requestLocale }) => {
  let localeToUse = defaultLocale;

  if (requestLocale && locales.includes(requestLocale as Locale)) {
    localeToUse = requestLocale as Locale;
  } else if (requestLocale) {
    // requestLocale was provided, but it's not in the supported locales.
    // localeToUse remains defaultLocale. This comment prevents an empty block.
  }
  // If requestLocale was undefined, localeToUse also remains defaultLocale.
  // This structure ensures no empty blocks from previous else/else if.

  let globalNamespaceContent: Record<string, unknown> | undefined = undefined;
  try {
    globalNamespaceContent = (await import(`./i18n/messages/${localeToUse}/Global.json`)).default;
  } catch (_e) {
    // Si Global.json n'est pas trouvé, on continue sans, ce n'est pas bloquant.
    // On pourrait vouloir logguer une erreur ici dans un vrai système de logging
  }

  let rootMessagesContent: Record<string, unknown> | undefined = undefined;
  try {
    rootMessagesContent = (await import(`./messages/${localeToUse}.json`)).default;
  } catch (_e) {
    // C'est plus critique si le fichier de messages racine est manquant.
    // On pourrait décider de `notFound()` ici si les messages racine sont essentiels.
    // Pour l'instant, on logue et on continue, ce qui peut entraîner des messages manquants.
  }

  const safeGlobal = globalNamespaceContent || {};
  const safeRoot = rootMessagesContent || {};

  const mergedMessages = {
    ...safeRoot,
    ...(Object.keys(safeGlobal).length > 0 ? { Global: safeGlobal } : {}),
  };

  if (Object.keys(safeRoot).length === 0 && Object.keys(safeGlobal).length === 0) {
    notFound();
  }

  return {
    locale: localeToUse,
    messages: mergedMessages,
    timeZone: "Europe/Paris",
  };
});
