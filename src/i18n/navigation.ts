import { createNavigation } from 'next-intl/navigation';
import { locales, defaultLocale } from '../i18n-config'; // Importe depuis le middleware

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

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation({
  locales,
  defaultLocale,
  localePrefix: 'as-needed', // Doit correspondre à la config du middleware
  pathnames,
});
