/**
 * Safe internationalization hooks
 * 
 * Ces hooks gèrent les erreurs de contexte next-intl de manière gracieuse
 * et respectent les Rules of Hooks de React.
 */

import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useHydrated } from "./use-hydrated";

/**
 * Hook sécurisé pour usePathname qui ne cause pas d'erreur si le contexte n'est pas disponible
 */
export function useSafePathname(): string {
  // Appeler useHydrated inconditionnellement pour respecter les Rules of Hooks
  const hydrated = useHydrated();
  
  try {
    const pathname = usePathname();
    return hydrated ? pathname : '/';
  } catch {
    return '/';
  }
}

/**
 * Hook sécurisé pour useTranslations qui retourne une fonction identity si le contexte n'est pas disponible
 */
export function useSafeTranslations(namespace: string): (key: string) => string {
  // Appeler useHydrated inconditionnellement pour respecter les Rules of Hooks
  const hydrated = useHydrated();
  
  try {
    const t = useTranslations(namespace);
    return hydrated ? t : (key: string) => key;
  } catch {
    return (key: string) => key;
  }
}

/**
 * Hook sécurisé pour useRouter qui retourne null si le contexte n'est pas disponible
 */
export function useSafeRouter() {
  // Appeler useHydrated inconditionnellement pour respecter les Rules of Hooks
  const hydrated = useHydrated();
  
  try {
    const router = useRouter();
    return hydrated ? router : null;
  } catch {
    return null;
  }
}