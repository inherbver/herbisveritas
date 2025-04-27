import { createLocalizedPathnamesNavigation } from 'next-intl/navigation';
import { locales, defaultLocale } from '../middleware'; // Importe depuis le middleware

// Optionnel: Définir des pathnames spécifiques par locale si nécessaire
// Exemple: '/about' en anglais devient '/a-propos' en français
export const pathnames = {
  // '/': '/',
  // '/about': {
  //   en: '/about',
  //   fr: '/a-propos'
  // },
  // '/products': {
  //   en: '/products',
  //   fr: '/produits'
  // }
  // Ajoutez d'autres chemins ici...
} as const;

export const { Link, redirect, usePathname, useRouter, getPathname } = createLocalizedPathnamesNavigation({
  locales,
  localePrefix: 'as-needed', // Doit correspondre à la config du middleware
  pathnames,
});
