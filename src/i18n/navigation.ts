import { createNavigation } from "next-intl/navigation";
import { locales, defaultLocale, localePrefix } from "../i18n-config";

// Optionnel: Définir des pathnames spécifiques par locale si nécessaire
// Exemple: '/about' en anglais devient '/a-propos' en français
export const pathnames = {
  "/": "/", // Root path needs definition too
  "/products": {
    en: "/products",
    fr: "/produits",
  },
  // --- START: Product detail page ---
  "/product/[slug]": {
    en: "/product/[slug]",
    fr: "/produit/[slug]",
  },
  // --- END: Product detail page ---
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
    fr: "/contact", // Ou '/contactez-nous'
  },
  "/legal": {
    en: "/legal",
    fr: "/legal", // Ou '/mentions-legales'
  },
  "/shop": {
    en: "/shop",
    fr: "/boutique",
  },
  "/login": {
    en: "/login",
    fr: "/connexion",
  },
  "/register": {
    en: "/register",
    fr: "/inscription",
  },
  // --- START: Profile Pages ---
  "/profile/account": {
    en: "/profile/account",
    fr: "/profile/account",
  },
  "/profile/addresses": {
    en: "/profile/addresses",
    fr: "/profile/addresses",
  },
  "/profile/orders": {
    en: "/profile/orders",
    fr: "/profile/orders",
  },
  "/profile/password": {
    en: "/profile/password",
    fr: "/profile/password",
  },
  // --- END: Profile Pages ---
  "/mission": {
    en: "/mission",
    fr: "/mission",
  },
  // Ajoutez d'autres chemins ici...
} as const;

// Type for canonical pathnames based on the keys of the pathnames object
export type AppPathname = keyof typeof pathnames;

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation({
  locales,
  defaultLocale,
  localePrefix,
  pathnames,
});
