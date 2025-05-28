import createMiddleware from "next-intl/middleware";
import {
  locales,
  defaultLocale,
  localePrefix,
  pathnames,
  localeDetection,
  type Locale,
} from "./i18n-config"; // Import centralisé + Locale type
import { createServerClient, type CookieOptions } from "@supabase/ssr"; // <-- Importer Supabase
import { type NextRequest, NextResponse } from "next/server"; // <-- Importer types Next & NextResponse

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
  let response; // Déclarer la variable response

  if (request.nextUrl.pathname.startsWith("/test-cart-actions")) {
    // Pour /test-cart-actions, créer une réponse de passage sans traitement i18n.
    // Les en-têtes de la requête originale sont conservés pour que Supabase puisse y accéder si besoin.
    response = NextResponse.next({
      request: {
        // Important pour que Supabase (et d'autres middlewares potentiels) aient les bons headers
        headers: request.headers,
      },
    });
  } else {
    // Pour tous les autres chemins, exécuter le middleware i18n.
    response = handleI18n(request);
  }

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
  // 3. Rafraîchir la session (important pour garder l'utilisateur connecté) et récupérer l'utilisateur
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("Supabase auth error in middleware:", authError);
    // Vous pourriez vouloir gérer cette erreur différemment,
    // par exemple, rediriger vers une page d'erreur ou invalider la session.
  }

  // 4. Logique de protection des routes Admin
  const pathname = request.nextUrl.pathname;
  let currentLocale = defaultLocale;
  let pathToCheck = pathname;

  // Extraire la locale du chemin si présente
  const firstPathSegment = pathname.split("/")[1];
  const isValidLocale = locales.find((loc) => loc === firstPathSegment);

  if (isValidLocale) {
    currentLocale = firstPathSegment as Locale; // Correction du type
    // Obtenir le chemin sans le préfixe de locale (ex: /fr/admin -> /admin)
    // Puisque localePrefix est 'always', le chemin commencera toujours par la locale.
    pathToCheck = pathname.substring(`/${currentLocale}`.length);
    // S'assurer que pathToCheck commence par / s'il n'est pas vide (ex: /fr -> /)
    if (pathToCheck === "" || !pathToCheck.startsWith("/")) {
      pathToCheck = "/" + pathToCheck;
    }
  } else {
    // Si la première partie du chemin n'est pas une locale reconnue (ex: /admin sans /fr/admin)
    // et que localePrefix est 'always', cela pourrait être une route invalide ou une route sans locale (comme /favicon.ico)
    // Pour les routes admin, nous nous attendons à ce qu'elles soient préfixées par la locale.
    // Si pathToCheck (qui est le pathname complet ici) commence par /admin, c'est un accès non préfixé.
    // On pourrait le rediriger vers la version avec la locale par défaut, ou simplement le bloquer si l'utilisateur n'est pas admin.
    // Pour l'instant, on laisse la logique suivante gérer le cas où l'utilisateur n'est pas authentifié/admin.
  }

  // Vérifier si c'est une route admin
  if (pathToCheck.startsWith("/admin")) {
    if (!user) {
      // Utilisateur non authentifié : redirection vers la page de connexion
      // Puisque localePrefix est 'always', le chemin de redirection inclura toujours la locale.
      const loginRedirectPath = `/${currentLocale}/login`;
      return NextResponse.redirect(new URL(loginRedirectPath, request.nextUrl.origin));
    }

    // Utilisateur authentifié : vérifier le rôle
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin") {
      // Erreur de profil, ou utilisateur non admin : redirection vers la page d'accueil
      // Puisque localePrefix est 'always', le chemin de redirection inclura toujours la locale.
      const homeRedirectPath = `/${currentLocale}/`;
      return NextResponse.redirect(new URL(homeRedirectPath, request.nextUrl.origin));
    }
    // Utilisateur admin : accès autorisé, continuer avec la réponse de i18n
  }

  // 5. Renvoyer la réponse (modifiée par i18n, Supabase cookies, et potentiellement admin redirect)
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
