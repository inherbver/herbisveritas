import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale, localePrefix, pathnames, localeDetection } from "./i18n-config"; // Import centralisé
import { createServerClient, type CookieOptions } from "@supabase/ssr"; // <-- Importer Supabase
import { type NextRequest } from "next/server"; // <-- Importer types Next

// Créer d'abord le gestionnaire i18n
const handleI18n = createMiddleware({
  locales: locales,
  defaultLocale,
  localePrefix,
  pathnames,
  localeDetection,
});

// Exporter une fonction middleware asynchrone
export async function middleware(request: NextRequest) {
  // 1. Exécuter le middleware i18n
  const response = handleI18n(request);

  // 2. Créer un client Supabase pour gérer les cookies sur la requête/réponse
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Si `set` est appelé, nous devons muter la requête ET la réponse
          request.cookies.set({ name, value, ...options });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          // Si `remove` est appelé, nous devons muter la requête ET la réponse
          request.cookies.set({ name, value: "", ...options });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // 3. Rafraîchir la session (important pour garder l'utilisateur connecté)
  // Cela lira/écrira les cookies si nécessaire via les fonctions `get`, `set`, `remove` ci-dessus
  await supabase.auth.getUser();

  // 4. Renvoyer la réponse (modifiée par i18n et potentiellement par Supabase pour les cookies)
  return response;
}

// La configuration du matcher reste la même
export const config = {
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    "/((?!api|_next|_vercel|.*\\.).*)",
  ],
};
