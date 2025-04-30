import { createNavigation } from "next-intl/navigation";
import { locales, defaultLocale } from "../i18n-config"; // Importe depuis le middleware

// Optionnel: Définir des pathnames spécifiques par locale si nécessaire
// Exemple: '/about' en anglais devient '/a-propos' en français
export const pathnames = {
  "/": "/", // Root path needs definition too
  "/products": {
    en: "/products",
    fr: "/produits",
  },
  "/about": {
    en: "/about",
    fr: "/a-propos",
  },
  "/privacy": {
    en: "/privacy",
    fr: "/privacy", // Ou '/confidentialite'
  },
  "/terms": {
    en: "/terms",
    fr: "/terms", // Ou '/conditions'
  },
  "/contact": {
    en: "/contact",
    fr: "/contact",
  },
  "/legal": {
    en: "/legal",
    fr: "/legal", // Ou '/mentions-legales'
  },
  "/shop": {
    en: "/shop",
    fr: "/boutique",
  },
  // Dynamic product route
  "/product/[slug]": {
    en: "/product/[slug]",
    fr: "/product/[slug]", // Using 'product' for French locale to match folder structure
  },
  // Add authentication paths
  "/login": {
    en: "/login",
    fr: "/login", // Ou /connexion
  },
  "/register": {
    en: "/register",
    fr: "/register", // Ou /inscription
  },
  // Ajoutez d'autres chemins ici...
} as const;

// Type for canonical pathnames based on the keys of the pathnames object
export type AppPathname = keyof typeof pathnames;

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation({
  locales,
  defaultLocale,
  localePrefix: "as-needed", // Doit correspondre à la config du middleware
  pathnames,
});
