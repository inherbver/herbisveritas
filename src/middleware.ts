import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale, localePrefix, localeDetection, type Locale } from "./i18n-config";
import { pathnames } from "./i18n/navigation"; // Importer depuis le bon fichier
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const handleI18n = createMiddleware({
  locales: locales,
  defaultLocale,
  localePrefix,
  pathnames, // Passé ici pour la gestion des URLs localisées par next-intl
  localeDetection,
});

export async function middleware(request: NextRequest) {
  let response;

  // Gérer d'abord les chemins spécifiques qui ne nécessitent pas i18n ou Supabase auth
  if (request.nextUrl.pathname.startsWith("/test-cart-actions")) {
    response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
    // Pour ces chemins, nous pourrions vouloir retourner directement
    // si aucune autre logique de middleware (comme Supabase) ne doit s'appliquer.
    // Cependant, si Supabase doit toujours s'exécuter, on continue.
  } else {
    // Pour tous les autres chemins, appliquer le middleware i18n
    response = handleI18n(request);
  }

  // Créer le client Supabase avec la gestion des cookies améliorée
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // S'assurer que les options par défaut sont bien appliquées si non fournies
          const cookieOptions = {
            ...options,
            httpOnly: options.httpOnly ?? true,
            secure: options.secure ?? process.env.NODE_ENV === "production",
            sameSite: options.sameSite ?? "lax",
          };
          request.cookies.set({ name, value, ...cookieOptions });
          // La réponse doit aussi avoir les cookies mis à jour
          response.cookies.set({ name, value, ...cookieOptions });
        },
        remove(name: string, options: CookieOptions) {
          const removeOptions = {
            ...options,
            maxAge: 0, // Forcer l'expiration immédiate
            expires: new Date(0), // Alternative pour l'expiration
            httpOnly: options.httpOnly ?? true,
            secure: options.secure ?? process.env.NODE_ENV === "production",
            sameSite: options.sameSite ?? "lax",
          };
          request.cookies.set({ name, value: "", ...removeOptions });
          response.cookies.set({ name, value: "", ...removeOptions });
        },
      },
    }
  );

  // Gestion plus robuste de la récupération de l'utilisateur
  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      console.warn("Supabase auth warning in middleware:", error.message);
      if (error.message.includes("Auth session missing")) {
        // C'est normal si l'utilisateur n'est pas connecté.
        user = null;
      } else {
        // Pour d'autres erreurs, log plus détaillé et potentiellement nettoyer les cookies
        console.error("Supabase auth error in middleware (not session missing):", error);
        // Si l'erreur spécifique est 'user_not_found', supprimer les cookies d'authentification
        if (error.code === "user_not_found") {
          // Utiliser la méthode 'remove' définie dans la configuration du client Supabase
          // pour s'assurer que les options de suppression sont correctement appliquées.
          // Nous devons trouver les noms exacts des cookies. Supabase SSR les nomme souvent
          // avec un hash. Pour l'instant, nous ciblons les noms communs.
          // Une meilleure approche serait de lister les cookies et supprimer ceux qui matchent un pattern.
          const cookieOptions = {
            path: "/",
            maxAge: 0,
            expires: new Date(0),
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax" as const,
          };
          request.cookies.getAll().forEach((cookie) => {
            if (cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token")) {
              // Pattern plus générique pour les cookies d'auth Supabase
              response.cookies.set({ name: cookie.name, value: "", ...cookieOptions });
              request.cookies.delete(cookie.name); // Garder request.cookies synchronisé
            }
          });
        }
      }
    } else {
      user = data.user;
    }
  } catch (e) {
    // Gérer les erreurs inattendues lors de l'appel à getUser
    console.error("Unexpected error during supabase.auth.getUser() in middleware:", e);
    user = null;
  }

  // Logique de protection des routes Admin et extraction de la locale
  const pathname = request.nextUrl.pathname;
  let currentLocale: Locale = defaultLocale;
  let pathToCheck = pathname;

  const firstPathSegment = pathname.split("/")[1];
  const isValidLocale = locales.includes(firstPathSegment as Locale);

  if (isValidLocale) {
    currentLocale = firstPathSegment as Locale;
    pathToCheck = pathname.substring(`/${currentLocale}`.length) || "/"; // Assurer que pathToCheck est au moins "/"
  } else {
    // Si la locale n'est pas dans le chemin, pathToCheck est le pathname complet
    // et currentLocale reste defaultLocale (ou ce que next-intl détermine)
    // Pour la redirection, il est plus sûr d'utiliser la locale détectée par next-intl si possible,
    // ou defaultLocale si on n'a pas d'autre info.
    // Note: handleI18n(request) a déjà enrichi `request.headers` avec la locale détectée.
    const detectedLocale = request.headers.get("x-next-intl-locale");
    if (detectedLocale && locales.includes(detectedLocale as Locale)) {
      currentLocale = detectedLocale as Locale;
    }
    // Pour les routes admin, nous nous attendons à ce qu'elles soient préfixées par la locale.
    // Si pathToCheck (qui est le pathname complet ici) commence par /admin, c'est un accès non préfixé.
    // On pourrait le rediriger vers la version avec la locale par défaut, ou simplement le bloquer si l'utilisateur n'est pas admin.
    // Pour l'instant, on laisse la logique suivante gérer le cas où l'utilisateur n'est pas authentifié/admin.
  }

  // Redirect from root to the main shop page
  if (pathToCheck === "/") {
    const shopPath = pathnames["/shop"][currentLocale];
    const redirectUrl = new URL(`/${currentLocale}${shopPath}`, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Protéger les routes de profil
  if (pathToCheck.startsWith("/profile")) {
    if (!user) {
      // Utilisateur non authentifié : redirection vers la page de connexion avec redirectUrl
      const loginRedirectPath = `/${currentLocale}/login?redirectUrl=${encodeURIComponent(request.nextUrl.pathname)}`;
      return NextResponse.redirect(new URL(loginRedirectPath, request.nextUrl.origin));
    }
    // Si l'utilisateur est authentifié, l'accès est autorisé pour les pages de profil.
  }
  // Protéger les routes admin (utilisation de 'else if' si /profile et /admin sont mutuellement exclusifs au niveau racine)
  else if (pathToCheck.startsWith("/admin")) {
    if (!user) {
      // Utilisateur non authentifié : redirection vers la page de connexion avec redirectUrl
      // Puisque localePrefix est 'always', le chemin de redirection inclura toujours la locale.
      const loginRedirectPath = `/${currentLocale}/login?redirectUrl=${encodeURIComponent(request.nextUrl.pathname)}`;
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
