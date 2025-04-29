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
  // Ajoutez d'autres chemins ici...
} as const;

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation({
  locales,
  defaultLocale,
  localePrefix: "as-needed", // Doit correspondre à la config du middleware
  pathnames,
});
