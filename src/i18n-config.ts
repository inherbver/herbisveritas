// src/i18n-config.ts
// Retrait de l'import problématique
// import { Pathnames } from 'next-intl/navigation';

// Définition des locales supportées
export const locales = ["en", "fr"] as const;
export type Locale = (typeof locales)[number];

// Locale par défaut
export const defaultLocale: Locale = "fr";
export const localePrefix = "always"; // Options: 'as-needed', 'always', 'never'

// Optionnel: Définir des pathnames spécifiques par locale si nécessaire
export const pathnames = {
  "/shop": "/", // The shop content (canonical /shop) is served at the root URL (/)
  // Exemple:
  // '/about': {
  //   en: '/about',
  //   fr: '/a-propos'
  // }
};

export const localeDetection = true; // Activer/désactiver la détection automatique
