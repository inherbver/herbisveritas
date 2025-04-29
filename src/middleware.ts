import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale, localePrefix, pathnames, localeDetection } from "./i18n-config"; // Import centralisé

// Utilisation directe de createMiddleware avec la configuration importée
export default createMiddleware({
  // A list of all locales that are supported
  locales: locales,

  // Used when no locale matches
  defaultLocale,

  // Le préfixe de locale dans l'URL
  localePrefix,

  // Utiliser les pathnames spécifiques si définis
  pathnames,

  // Activer ou désactiver la détection de locale automatique
  localeDetection,
});

export const config = {
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    "/((?!api|_next|_vercel|.*\\.).*)",
  ],
};
