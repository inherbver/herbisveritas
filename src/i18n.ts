import { getRequestConfig } from "next-intl/server";
import { IntlErrorCode, IntlError } from "next-intl";
import { notFound } from "next/navigation";
import { locales, defaultLocale, Locale } from "./i18n-config";

// ==========================================
// CONFIGURATION DES NAMESPACES
// ==========================================
const namespaces = [
  "AboutPage",
  "AccountPage",
  "AddressForm",
  "AddressesPage",
  "AdminDashboard",
  "AdminLayout",
  "AdminProducts",
  "Auth",
  "AuthCallback",
  "CartDisplay",
  "CartSheet",
  "CategoryFilter",
  "CheckoutCanceledPage",
  "CheckoutFeedback",
  "CheckoutPage",
  "CheckoutSuccessPage",
  "ContactPage",
  "Filters",
  "Footer",
  "Global",
  "Hero",
  "HeroComponent",
  "HomePage",
  "Legal",
  "MagazinePage",
  "MissionPage",
  "NotFoundPage",
  "OrdersPage",
  "PasswordPage",
  "ProductCard",
  "ProductDetail",
  "ProductDetailModal",
  "ProductGrid",
  "ProfileEditPage",
  "ProfileNav",
  "QuantityInput",
  "ShopPage",
  "TestPage",
  "Unauthorized",
] as const;

// ==========================================
// FONCTION DE CHARGEMENT DYNAMIQUE
// ==========================================
type Messages = Record<string, Record<string, string>>;

async function loadMessagesForLocale(locale: Locale): Promise<Messages> {
  const messages: Messages = {};
  let successCount = 0;
  let errorCount = 0;

  // Chargement parallèle de tous les namespaces
  const promises = namespaces.map(async (namespace) => {
    try {
      const module = await import(`./i18n/messages/${locale}/${namespace}.json`);
      const content = module.default || module;

      // Ne garder que les namespaces avec du contenu
      if (content && Object.keys(content).length > 0) {
        messages[namespace] = content;
        successCount++;
        return { namespace, status: "success" };
      } else {
        console.warn(`[i18n] Empty content for ${namespace} in locale ${locale}`);
        return { namespace, status: "empty" };
      }
    } catch (e: unknown) {
      const error = e as Error;
      errorCount++;
      console.error(`[i18n] Failed to load ${namespace}.json for locale ${locale}:`, error.message);
      return { namespace, status: "error", error };
    }
  });

  // Attendre tous les chargements
  const results = await Promise.all(promises);

  // Log du résumé de chargement
  console.log(
    `[i18n] Loaded ${successCount}/${namespaces.length} namespaces for locale '${locale}' (${errorCount} errors)`
  );

  // Debug en développement
  if (process.env.NODE_ENV === "development") {
    const failed = results.filter((r) => r.status === "error");
    if (failed.length > 0) {
      console.group(`[i18n] Failed namespaces for ${locale}:`);
      failed.forEach((f) => console.log(`- ${f.namespace}`));
      console.groupEnd();
    }
  }

  return messages;
}

// ==========================================
// CONFIGURATION PRINCIPALE
// ==========================================
export default getRequestConfig(async ({ locale: requestLocale }) => {
  // Détermination de la locale à utiliser
  let localeToUse = defaultLocale;

  if (requestLocale && locales.includes(requestLocale as Locale)) {
    localeToUse = requestLocale as Locale;
  }

  // Chargement des messages
  const messages = await loadMessagesForLocale(localeToUse);

  // Vérification critique : au moins quelques namespaces essentiels doivent être chargés
  const essentialNamespaces = ["Global", "ShopPage", "Auth"];
  const hasEssentials = essentialNamespaces.some((ns) => messages[ns]);

  if (Object.keys(messages).length === 0 || !hasEssentials) {
    console.error(`[i18n] Critical: No essential messages loaded for locale ${localeToUse}`);
    notFound();
  }

  return {
    locale: localeToUse,
    messages,
    timeZone: "Europe/Paris",

    onError(error: IntlError) {
      console.log(`[i18n] ERROR: ${error.code} - ${error.message}`);

      if (error.code === IntlErrorCode.MISSING_MESSAGE) {
        console.log(`[i18n] MISSING_MESSAGE: ${error.message}`);
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
      const path = [namespace, key].filter((part) => part != null).join(".");

      if (process.env.NODE_ENV === "development") {
        console.log(`[i18n] FALLBACK: ${path} (${error.code})`);

        if (error.code === IntlErrorCode.MISSING_MESSAGE) {
          return `⚠️ MISSING: ${path}`;
        } else {
          return `❌ ERROR: ${path}`;
        }
      }

      // En production, retour silencieux
      return "";
    },
  };
});
