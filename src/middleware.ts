import createMiddleware from "next-intl/middleware";
import {
  locales,
  defaultLocale,
  localePrefix,
  localeDetection,
  pathnames,
  type Locale,
} from "./i18n-config";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { clearSupabaseCookies } from "@/lib/auth/utils";
import { type NextRequest, NextResponse } from "next/server";

const handleI18n = createMiddleware({
  locales,
  defaultLocale,
  localePrefix,
  pathnames,
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
        // Si l'erreur spécifique est 'user_not_found', cela signifie que le token est invalide ou expiré.
        // Nous nettoyons les cookies pour forcer une déconnexion propre.
        if (error.code === "user_not_found") {
          console.log("User not found with existing auth token. Clearing cookies.");
          clearSupabaseCookies(request, response);
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

  // Rediriger la racine vers la page boutique
  if (pathToCheck === "/") {
    // Utiliser la configuration de pathnames pour obtenir le chemin localisé de la boutique
    const shopPath = pathnames["/shop"][currentLocale as Locale] || "/shop";
    return NextResponse.redirect(new URL(`/${currentLocale}${shopPath}`, request.url));
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
  // Protéger les routes admin avec le nouveau système basé sur la base de données
  else if (pathToCheck.startsWith("/admin")) {
    if (!user) {
      // Utilisateur non authentifié : redirection vers la page de connexion avec redirectUrl
      const loginRedirectPath = `/${currentLocale}/login?redirectUrl=${encodeURIComponent(request.nextUrl.pathname)}`;
      return NextResponse.redirect(new URL(loginRedirectPath, request.nextUrl.origin));
    }

    // Vérification admin via la base de données (nouveau système unifié)
    try {
      // Import dynamique pour éviter les problèmes de dépendance circulaire
      const { checkAdminRole, logSecurityEvent } = await import("@/lib/auth/admin-service");

      const adminCheck = await checkAdminRole(user.id);

      if (!adminCheck.isAdmin) {
        // Logger l'événement de sécurité
        await logSecurityEvent({
          type: "unauthorized_admin_access",
          userId: user.id,
          details: {
            adminEmail: user.email || "N/A",
            message: `Tentative d'accès admin non autorisée - Rôle actuel: ${adminCheck.role}`,
            path: pathToCheck,
            timestamp: new Date().toISOString(),
          },
        });

        const unauthorizedUrl = new URL(`/${currentLocale}/unauthorized`, request.url);
        return NextResponse.redirect(unauthorizedUrl);
      }

      // Utilisateur admin vérifié : accès autorisé
      console.log(
        `Admin access granted for user ${user.id} (role: ${adminCheck.role}) to ${pathToCheck}`
      );
    } catch (error) {
      console.error("Error checking admin role in middleware:", error);

      // En cas d'erreur critique, rediriger vers unauthorized par sécurité
      console.warn(`Admin check failed for user ${user.id} due to system error`);
      const unauthorizedUrl = new URL(`/${currentLocale}/unauthorized`, request.url);
      return NextResponse.redirect(unauthorizedUrl);
    }
  }

  // 5. Renvoyer la réponse (modifiée par i18n, Supabase cookies, et potentiellement admin redirect)
  return response;
}

// La configuration du matcher reste la même
export const config = {
  matcher: [
    // Match all request paths except for the ones starting with:
    // - api (API routes)
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    // - any other files with an extension (e.g. .svg, .png, .jpg)
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
