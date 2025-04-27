// src/i18n-config.ts
// Retrait de l'import problématique
// import { Pathnames } from 'next-intl/navigation';

export const locales = ['en', 'fr'] as const;
export const defaultLocale = 'fr';
export const localePrefix = 'always'; // Options: 'as-needed', 'always', 'never'

// Optionnel: Définir des pathnames spécifiques par locale si nécessaire
export const pathnames = {
  '/': '/',
  // Exemple:
  // '/about': {
  //   en: '/about',
  //   fr: '/a-propos'
  // }
};

type AppPathnames = keyof typeof pathnames;

export const localeDetection = true; // Activer/désactiver la détection automatique
