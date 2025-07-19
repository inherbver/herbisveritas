// src/i18n-config.ts
// Retrait de l'import problématique
// import { Pathnames } from 'next-intl/navigation';

// Définition des locales supportées
export const locales = ["en", "fr"] as const;
export type Locale = (typeof locales)[number];

// Locale par défaut
export const defaultLocale: Locale = "fr";
export const localePrefix = "always"; // Options: 'as-needed', 'always', 'never'

// Définition des pathnames pour le routage localisé
export const pathnames = {
  // Le chemin canonique '/' est mappé à la page d'accueil
  "/": "/",

  // Le chemin canonique '/shop' est mappé à des URLs localisées
  "/shop": {
    en: "/shop",
    fr: "/boutique",
  },

  // Le chemin canonique pour les produits (route dynamique)
  "/products/[slug]": {
    en: "/products/[slug]",
    fr: "/produits/[slug]",
  },

  // Le chemin canonique pour la page de paiement
  "/checkout": {
    en: "/checkout",
    fr: "/paiement",
  },

  // Le chemin canonique pour la page de contact
  "/contact": {
    en: "/contact",
    fr: "/contact",
  },

  // Profile pages - keeping same URL for both languages for consistency
  // "/profile": {
  //   en: "/profile",
  //   fr: "/profil",
  // },
};

export const localeDetection = true; // Activer/désactiver la détection automatique
