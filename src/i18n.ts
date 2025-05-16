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
    console.error(`[i18n] Failed to load Global.json for locale ${localeToUse}:`, _e);
  }

  let accountPageNamespaceContent: Record<string, unknown> | undefined = undefined;
  try {
    accountPageNamespaceContent = (await import(`./i18n/messages/${localeToUse}/AccountPage.json`))
      .default;
  } catch (_e) {
    console.error(`[i18n] Failed to load AccountPage.json for locale ${localeToUse}:`, _e);
  }

  let profileNavNamespaceContent: Record<string, unknown> | undefined = undefined;
  try {
    profileNavNamespaceContent = (await import(`./i18n/messages/${localeToUse}/ProfileNav.json`))
      .default;
  } catch (_e) {
    console.error(`[i18n] Failed to load ProfileNav.json for locale ${localeToUse}:`, _e);
  }

  let cartSheetNamespaceContent: Record<string, unknown> | undefined = undefined;
  try {
    cartSheetNamespaceContent = (await import(`./i18n/messages/${localeToUse}/CartSheet.json`))
      .default;
  } catch (_e) {
    console.error(`[i18n] Failed to load CartSheet.json for locale ${localeToUse}:`, _e);
  }

  let passwordPageNamespaceContent: Record<string, unknown> | undefined = undefined;
  try {
    passwordPageNamespaceContent = (
      await import(`./i18n/messages/${localeToUse}/PasswordPage.json`)
    ).default;
  } catch (e) {
    console.error(`[i18n] Failed to load PasswordPage.json for locale ${localeToUse}:`, e);
  }

  let profileEditPageNamespaceContent: Record<string, unknown> | undefined = undefined;
  try {
    profileEditPageNamespaceContent = (
      await import(`./i18n/messages/${localeToUse}/ProfileEditPage.json`)
    ).default;
  } catch (e) {
    console.error(`[i18n] Failed to load ProfileEditPage.json for locale ${localeToUse}:`, e);
  }

  let shopPageNamespaceContent: Record<string, unknown> | undefined = undefined;
  try {
    shopPageNamespaceContent = (await import(`./i18n/messages/${localeToUse}/ShopPage.json`))
      .default;
  } catch (e) {
    console.error(`[i18n] FAILED TO LOAD ShopPage.json for locale ${localeToUse}:`, e);
  }

  // Tentative de chargement pour un fichier de messages racine (si applicable)
  let rootMessagesContent: Record<string, unknown> | undefined = undefined;
  try {
    // Corrigé le chemin pour être cohérent avec les autres, pointant vers src/i18n/messages/
    rootMessagesContent = (await import(`./messages/${localeToUse}.json`)).default;
  } catch (_e) {
    // Pas critique si ce fichier n'existe pas, car les namespaces sont chargés séparément.
  }

  const safeGlobal = globalNamespaceContent || {};
  const safeAccountPage = accountPageNamespaceContent || {};
  const safeProfileNav = profileNavNamespaceContent || {};
  const safeCartSheet = cartSheetNamespaceContent || {};
  const safePasswordPage = passwordPageNamespaceContent || {};
  const safeProfileEditPage = profileEditPageNamespaceContent || {};
  const safeShopPage = shopPageNamespaceContent || {};
  const safeRoot = rootMessagesContent || {};

  const mergedMessages = {
    ...safeRoot, // Les messages racines en premier (s'ils existent)
    ...(Object.keys(safeGlobal).length > 0 ? { Global: safeGlobal } : {}),
    ...(Object.keys(safeAccountPage).length > 0 ? { AccountPage: safeAccountPage } : {}),
    ...(Object.keys(safeProfileNav).length > 0 ? { ProfileNav: safeProfileNav } : {}),
    ...(Object.keys(safeCartSheet).length > 0 ? { CartSheet: safeCartSheet } : {}),
    ...(Object.keys(safePasswordPage).length > 0 ? { PasswordPage: safePasswordPage } : {}),
    ...(Object.keys(safeProfileEditPage).length > 0
      ? { ProfileEditPage: safeProfileEditPage }
      : {}),
    ...(Object.keys(safeShopPage).length > 0 ? { ShopPage: safeShopPage } : {}),
  };

  // Condition pour notFound si AUCUN message n'est chargé (ni racine, ni aucun des namespaces)
  if (
    Object.keys(safeRoot).length === 0 &&
    Object.keys(safeGlobal).length === 0 &&
    Object.keys(safeAccountPage).length === 0 &&
    Object.keys(safeProfileNav).length === 0 &&
    Object.keys(safeCartSheet).length === 0 &&
    Object.keys(safePasswordPage).length === 0 &&
    Object.keys(safeProfileEditPage).length === 0 &&
    Object.keys(safeShopPage).length === 0
  ) {
    notFound();
  }

  return {
    locale: localeToUse,
    messages: mergedMessages,
    timeZone: "Europe/Paris",
  };
});
