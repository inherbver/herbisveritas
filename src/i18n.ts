import { getRequestConfig } from "next-intl/server";
import { IntlErrorCode, IntlError } from "next-intl";
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

  let cartDisplayNamespaceContent: Record<string, unknown> | undefined = undefined;
  try {
    cartDisplayNamespaceContent = (await import(`./i18n/messages/${localeToUse}/CartDisplay.json`))
      .default;
  } catch (_e) {
    console.error(`[i18n] Failed to load CartDisplay.json for locale ${localeToUse}:`, _e);
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

  let addressesPageNamespaceContent: Record<string, unknown> | undefined = undefined;
  try {
    addressesPageNamespaceContent = (
      await import(`./i18n/messages/${localeToUse}/AddressesPage.json`)
    ).default;
  } catch (e) {
    console.error(`[i18n] Failed to load AddressesPage.json for locale ${localeToUse}:`, e);
  }

  let productCardNamespaceContent: Record<string, unknown> | undefined = undefined;
  try {
    productCardNamespaceContent = (await import(`./i18n/messages/${localeToUse}/ProductCard.json`))
      .default;
  } catch (_e) {
    console.error(`[i18n] Failed to load ProductCard.json for locale ${localeToUse}:`, _e);
  }

  let authNamespaceContent: Record<string, unknown> | undefined = undefined;
  try {
    authNamespaceContent = (await import(`./i18n/messages/${localeToUse}/Auth.json`)).default;
  } catch (_e) {
    console.error(`[i18n] Failed to load Auth.json for locale ${localeToUse}:`, _e);
  }

  let addressFormNamespaceContent: Record<string, unknown> | undefined = undefined;
  try {
    addressFormNamespaceContent = (await import(`./i18n/messages/${localeToUse}/AddressForm.json`))
      .default;
  } catch (_e) {
    console.error(`[i18n] Failed to load AddressForm.json for locale ${localeToUse}:`, _e);
  }

  let productDetailModalNamespaceContent: Record<string, unknown> | undefined = undefined;
  try {
    productDetailModalNamespaceContent = (
      await import(`./i18n/messages/${localeToUse}/ProductDetailModal.json`)
    ).default;
  } catch (_e) {
    console.error(`[i18n] Failed to load ProductDetailModal.json for locale ${localeToUse}:`, _e);
  }

  let quantityInputNamespaceContent: Record<string, unknown> | undefined = undefined;
  try {
    quantityInputNamespaceContent = (
      await import(`./i18n/messages/${localeToUse}/QuantityInput.json`)
    ).default;
  } catch (_e) {
    console.error(`[i18n] Failed to load QuantityInput.json for locale ${localeToUse}:`, _e);
  }

  let productDetailNamespaceContent: Record<string, unknown> | undefined = undefined;
  try {
    productDetailNamespaceContent = (
      await import(`./i18n/messages/${localeToUse}/ProductDetail.json`)
    ).default;
  } catch (_e) {
    console.error(`[i18n] Failed to load ProductDetail.json for locale ${localeToUse}:`, _e);
  }

  let notFoundPageNamespaceContent: Record<string, unknown> | undefined = undefined;
  try {
    notFoundPageNamespaceContent = (
      await import(`./i18n/messages/${localeToUse}/NotFoundPage.json`)
    ).default;
  } catch (_e) {
    console.error(`[i18n] Failed to load NotFoundPage.json for locale ${localeToUse}:`, _e);
  }

  let categoryFilterNamespaceContent: Record<string, unknown> | undefined = undefined;
  try {
    categoryFilterNamespaceContent = (
      await import(`./i18n/messages/${localeToUse}/CategoryFilter.json`)
    ).default;
  } catch (_e) {
    console.error(`[i18n] Failed to load CategoryFilter.json for locale ${localeToUse}:`, _e);
  }

  let heroComponentNamespaceContent: Record<string, unknown> | undefined = undefined;
  try {
    heroComponentNamespaceContent = (
      await import(`./i18n/messages/${localeToUse}/HeroComponent.json`)
    ).default;
  } catch (_e) {
    console.error(`[i18n] Failed to load HeroComponent.json for locale ${localeToUse}:`, _e);
  }

  let homePageNamespaceContent: Record<string, unknown> | undefined = undefined;
  try {
    homePageNamespaceContent = (await import(`./i18n/messages/${localeToUse}/HomePage.json`))
      .default;
  } catch (_e) {
    console.error(`[i18n] Failed to load HomePage.json for locale ${localeToUse}:`, _e);
  }

  let productGridNamespaceContent: Record<string, unknown> | undefined = undefined;
  try {
    productGridNamespaceContent = (await import(`./i18n/messages/${localeToUse}/ProductGrid.json`))
      .default;
  } catch (_e) {
    console.error(`[i18n] Failed to load ProductGrid.json for locale ${localeToUse}:`, _e);
  }

  let legalNamespaceContent: Record<string, unknown> | undefined = undefined;
  try {
    legalNamespaceContent = (await import(`./i18n/messages/${localeToUse}/Legal.json`)).default;
  } catch (_e) {
    console.error(`[i18n] Failed to load Legal.json for locale ${localeToUse}:`, _e);
  }

  let testPageNamespaceContent: Record<string, unknown> | undefined = undefined;
  try {
    testPageNamespaceContent = (await import(`./i18n/messages/${localeToUse}/TestPage.json`))
      .default;
  } catch (_e) {
    console.error(`[i18n] Failed to load TestPage.json for locale ${localeToUse}:`, _e);
  }

  const safeGlobal = globalNamespaceContent || {};
  const safeAccountPage = accountPageNamespaceContent || {};
  const safeProfileNav = profileNavNamespaceContent || {};
  const safeCartSheet = cartSheetNamespaceContent || {};
  const safeCartDisplay = cartDisplayNamespaceContent || {};
  const safePasswordPage = passwordPageNamespaceContent || {};
  const safeProfileEditPage = profileEditPageNamespaceContent || {};
  const safeShopPage = shopPageNamespaceContent || {};
  const safeAddressesPage = addressesPageNamespaceContent || {};
  const safeProductCard = productCardNamespaceContent || {};
  const safeAuth = authNamespaceContent || {};
  const safeAddressForm = addressFormNamespaceContent || {};
  const safeProductDetailModal = productDetailModalNamespaceContent || {};
  const safeQuantityInput = quantityInputNamespaceContent || {};
  const safeProductDetail = productDetailNamespaceContent || {};
  const safeNotFoundPage = notFoundPageNamespaceContent || {};
  const safeCategoryFilter = categoryFilterNamespaceContent || {};
  const safeHeroComponent = heroComponentNamespaceContent || {};
  const safeHomePage = homePageNamespaceContent || {};
  const safeProductGrid = productGridNamespaceContent || {};
  const safeLegal = legalNamespaceContent || {};
  const safeTestPage = testPageNamespaceContent || {};

  const mergedMessages = {
    ...(Object.keys(safeGlobal).length > 0 ? { Global: safeGlobal } : {}),
    ...(Object.keys(safeAccountPage).length > 0 ? { AccountPage: safeAccountPage } : {}),
    ...(Object.keys(safeProfileNav).length > 0 ? { ProfileNav: safeProfileNav } : {}),
    ...(Object.keys(safeCartSheet).length > 0 ? { CartSheet: safeCartSheet } : {}),
    ...(Object.keys(safeCartDisplay).length > 0 ? { CartDisplay: safeCartDisplay } : {}),
    ...(Object.keys(safePasswordPage).length > 0 ? { PasswordPage: safePasswordPage } : {}),
    ...(Object.keys(safeProfileEditPage).length > 0
      ? { ProfileEditPage: safeProfileEditPage }
      : {}),
    ...(Object.keys(safeShopPage).length > 0 ? { ShopPage: safeShopPage } : {}),
    ...(Object.keys(safeAddressesPage).length > 0 ? { AddressesPage: safeAddressesPage } : {}),
    ...(Object.keys(safeProductCard).length > 0 ? { ProductCard: safeProductCard } : {}),
    ...(Object.keys(safeAuth).length > 0 ? { Auth: safeAuth } : {}),
    ...(Object.keys(safeAddressForm).length > 0 ? { AddressForm: safeAddressForm } : {}),
    ...(Object.keys(safeProductDetailModal).length > 0
      ? { ProductDetailModal: safeProductDetailModal }
      : {}),
    ...(Object.keys(safeQuantityInput).length > 0 ? { QuantityInput: safeQuantityInput } : {}),
    ...(Object.keys(safeProductDetail).length > 0 ? { ProductDetail: safeProductDetail } : {}),
    ...(Object.keys(safeNotFoundPage).length > 0 ? { NotFoundPage: safeNotFoundPage } : {}),
    ...(Object.keys(safeCategoryFilter).length > 0 ? { CategoryFilter: safeCategoryFilter } : {}),
    ...(Object.keys(safeHeroComponent).length > 0 ? { HeroComponent: safeHeroComponent } : {}),
    ...(Object.keys(safeHomePage).length > 0 ? { HomePage: safeHomePage } : {}),
    ...(Object.keys(safeProductGrid).length > 0 ? { ProductGrid: safeProductGrid } : {}),
    ...(Object.keys(safeLegal).length > 0 ? { Legal: safeLegal } : {}),
    ...(Object.keys(safeTestPage).length > 0 ? { TestPage: safeTestPage } : {}),
  };

  // Condition pour notFound si AUCUN message de namespace n'est chargé
  if (
    Object.keys(safeGlobal).length === 0 &&
    Object.keys(safeAccountPage).length === 0 &&
    Object.keys(safeProfileNav).length === 0 &&
    Object.keys(safeCartSheet).length === 0 &&
    Object.keys(safeCartDisplay).length === 0 &&
    Object.keys(safePasswordPage).length === 0 &&
    Object.keys(safeProfileEditPage).length === 0 &&
    Object.keys(safeShopPage).length === 0 &&
    Object.keys(safeAddressesPage).length === 0 &&
    Object.keys(safeProductCard).length === 0 &&
    Object.keys(safeAuth).length === 0 &&
    Object.keys(safeAddressForm).length === 0 &&
    Object.keys(safeProductDetailModal).length === 0 &&
    Object.keys(safeQuantityInput).length === 0 &&
    Object.keys(safeProductDetail).length === 0 &&
    Object.keys(safeNotFoundPage).length === 0 &&
    Object.keys(safeCategoryFilter).length === 0 &&
    Object.keys(safeHeroComponent).length === 0 &&
    Object.keys(safeHomePage).length === 0 &&
    Object.keys(safeProductGrid).length === 0 &&
    Object.keys(safeLegal).length === 0 &&
    Object.keys(safeTestPage).length === 0
  ) {
    notFound();
  }

  return {
    locale: localeToUse,
    messages: mergedMessages,
    timeZone: "Europe/Paris",
    onError(error: IntlError) {
      process.stdout.write(
        `\n[[[!!! i18n DEBUG onError !!!]]] ERROR CODE: ${error.code}, MESSAGE: ${error.message}\n`
      );
      if (error.code === IntlErrorCode.MISSING_MESSAGE) {
        process.stdout.write(
          `\n[[[!!! i18n DEBUG onError !!!]]] Specific log for MISSING_MESSAGE: ${error.message}\n`
        );
      } else {
        process.stdout.write(
          `\n[[[!!! i18n DEBUG onError !!!]]] Other i18n error: ${error.message}\n`
        );
      }
    },
    getMessageFallback: ({
      namespace,
      key,
      error,
    }: {
      namespace?: string;
      key: string;
      error: IntlError;
    }) => {
      process.stdout.write(
        `\n[[[!!! i18n DEBUG getMessageFallback !!!]]] NAMESPACE: ${namespace}, KEY: ${key}, ERROR_CODE: ${error.code}\n`
      );
      const path = [namespace, key].filter((part) => part != null).join(".");
      if (error.code === IntlErrorCode.MISSING_MESSAGE) {
        return process.env.NODE_ENV === "development" ? `⚠️ MISSING_TRANSLATION: ${path}` : ""; // En production, chaîne vide ou clé de secours
      } else {
        // Pour d'autres types d'erreurs (ex: FORMATTING_ERROR)
        return process.env.NODE_ENV === "development" ? `❌ TRANSLATION_ERROR_IN_KEY: ${path}` : ""; // En production, chaîne vide ou clé de secours
      }
    },
  };
});
