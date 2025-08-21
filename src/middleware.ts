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
import { CSRFProtection } from "@/lib/security/csrf-protection";

const handleI18n = createMiddleware({
  locales,
  defaultLocale,
  localePrefix,
  pathnames,
  localeDetection,
});

export async function middleware(request: NextRequest) {
  const startTime = Date.now();
  console.log(
    `🔄 [middleware] Processing: ${request.method} ${request.nextUrl.pathname}`,
  );

  // Variables pour tracking et debugging
  let response: NextResponse;
  let supabaseCookiesToSync: Array<{
    name: string;
    value: string;
    options?: CookieOptions;
  }> = [];

  // Extraction de la locale pour gérer les rewrites localisés
  const pathname = request.nextUrl.pathname;
  let currentLocaleForRewrite: Locale = defaultLocale;
  const firstPathSegment = pathname.split("/")[1];
  const isValidLocale = locales.includes(firstPathSegment as Locale);

  if (isValidLocale) {
    currentLocaleForRewrite = firstPathSegment as Locale;
    const pathToCheckForRewrite =
      pathname.substring(`/${currentLocaleForRewrite}`.length) || "/";

    // Gestion des routes localisées : /boutique -> /shop
    if (pathToCheckForRewrite === "/boutique") {
      console.log(
        `🔄 [middleware] Rewriting /boutique to /shop for locale ${currentLocaleForRewrite}`,
      );
      return NextResponse.rewrite(
        new URL(`/${currentLocaleForRewrite}/shop`, request.url),
      );
    }
  }

  // 1. ÉTAPE INITIALE : Gérer i18n et routes spéciales
  try {
    if (request.nextUrl.pathname.startsWith("/test-cart-actions")) {
      response = NextResponse.next();
    } else {
      // Appliquer le middleware i18n
      response = handleI18n(request);
    }
  } catch (error) {
    console.error(`🔄 [middleware] Error in initial routing:`, error);
    response = NextResponse.next();
  }

  // 2. ÉTAPE AUTH : Créer le client Supabase avec capture des cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const allCookies = request.cookies.getAll();
          const supabaseCookies = allCookies.filter((c) =>
            c.name.includes("sb-"),
          );
          console.log(
            `🔄 [middleware] getAll() - Found ${supabaseCookies.length} Supabase cookies`,
          );
          return allCookies;
        },
        setAll(cookiesToSet) {
          // IMPORTANT: Capturer les cookies pour synchronisation ultérieure
          console.log(
            `🔄 [middleware] setAll() - Capturing ${cookiesToSet.length} cookies for sync`,
          );
          supabaseCookiesToSync = [...supabaseCookiesToSync, ...cookiesToSet];

          // Synchroniser avec la request pour que Supabase puisse les lire
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
        },
      },
    },
  );

  // 3. ÉTAPE VÉRIFICATION : Obtenir l'utilisateur authentifié
  let user = null;
  try {
    console.log(`🔄 [middleware] Calling getUser()...`);
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.warn(`🔄 [middleware] Auth error:`, error.message);
    } else {
      user = authUser;
    }

    console.log(
      `🔄 [middleware] User: ${user ? `authenticated (${user.id.slice(0, 8)})` : "guest"}`,
    );
  } catch (error) {
    console.error(`🔄 [middleware] Failed to get user:`, error);
  }

  // 4. ÉTAPE FINALE : Préparer les headers et la response
  const requestHeaders = new Headers(request.headers);

  // Headers pour Server Actions (qui les reçoivent correctement)
  if (user) {
    requestHeaders.set("x-user-id", user.id);
    requestHeaders.set("x-user-email", user.email || "");
    console.log(`🔄 [middleware] Set auth headers for ${user.id.slice(0, 8)}`);
  } else {
    requestHeaders.delete("x-user-id");
    requestHeaders.delete("x-user-email");
    console.log(`🔄 [middleware] Cleared auth headers for guest`);
  }

  // Créer la response finale
  const finalResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Cookie Bridge : TOUJOURS définir les cookies auth pour les utilisateurs authentifiés
  // Vérifier d'abord les cookies existants
  const existingAuthId = request.cookies.get("herbis-auth-id")?.value;
  const existingAuthEmail = request.cookies.get("herbis-auth-email")?.value;

  if (user) {
    // TOUJOURS définir les cookies pour les utilisateurs authentifiés
    finalResponse.cookies.set("herbis-auth-id", user.id, {
      httpOnly: false, // Changé pour permettre la lecture côté client si nécessaire
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 jours
    });

    finalResponse.cookies.set("herbis-auth-email", user.email || "", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    if (existingAuthId !== user.id) {
      console.log(
        `🔄 [middleware] Cookie Bridge: Set/Updated auth cookies for ${user.id.slice(0, 8)}`,
      );
    }
  } else {
    // Nettoyer les cookies pour les invités
    if (existingAuthId || existingAuthEmail) {
      finalResponse.cookies.delete("herbis-auth-id");
      finalResponse.cookies.delete("herbis-auth-email");
      console.log(
        `🔄 [middleware] Cookie Bridge: Cleared auth cookies for guest`,
      );
    }
  }

  // 5. ÉTAPE COOKIES : Préserver TOUS les cookies (i18n + Supabase)
  try {
    // Copier les cookies de la response i18n initiale
    const i18nCookies = response.cookies.getAll();
    console.log(
      `🔄 [middleware] Preserving ${i18nCookies.length} i18n cookies`,
    );
    i18nCookies.forEach((cookie) => {
      finalResponse.cookies.set(cookie.name, cookie.value, {
        path: "/",
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
    });

    // Appliquer les cookies Supabase capturés
    console.log(
      `🔄 [middleware] Applying ${supabaseCookiesToSync.length} Supabase cookies`,
    );
    supabaseCookiesToSync.forEach(({ name, value, options }) => {
      finalResponse.cookies.set(name, value, {
        ...options,
        path: "/",
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
    });
  } catch (error) {
    console.error(`🔄 [middleware] Error syncing cookies:`, error);
  }

  // Remplacer la response pour la suite du traitement
  response = finalResponse;

  // Logique de protection des routes Admin et extraction de la locale
  // (pathname, firstPathSegment et isValidLocale déjà déclarés plus haut)
  let currentLocale: Locale = defaultLocale;
  let pathToCheck = pathname;

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

  // Rediriger la racine vers la page boutique (utilise la route physique)
  if (pathToCheck === "/") {
    return NextResponse.redirect(
      new URL(`/${currentLocale}/shop`, request.url),
    );
  }

  // Protéger les routes de profil
  if (pathToCheck.startsWith("/profile")) {
    if (!user) {
      // Utilisateur non authentifié : redirection vers la page de connexion avec redirectUrl
      const loginRedirectPath = `/${currentLocale}/login?redirectUrl=${encodeURIComponent(request.nextUrl.pathname)}`;
      return NextResponse.redirect(
        new URL(loginRedirectPath, request.nextUrl.origin),
      );
    }
    // Si l'utilisateur est authentifié, l'accès est autorisé pour les pages de profil.
  }
  // Protéger les routes admin avec le nouveau système basé sur la base de données
  else if (pathToCheck.startsWith("/admin")) {
    if (!user) {
      // Utilisateur non authentifié : redirection vers la page de connexion avec redirectUrl
      const loginRedirectPath = `/${currentLocale}/login?redirectUrl=${encodeURIComponent(request.nextUrl.pathname)}`;
      return NextResponse.redirect(
        new URL(loginRedirectPath, request.nextUrl.origin),
      );
    }

    // Vérification admin via la base de données (nouveau système unifié)
    try {
      // Import dynamique pour éviter les problèmes de dépendance circulaire
      const { checkAdminRole, logSecurityEvent } = await import(
        "@/lib/auth/admin-service"
      );

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

        const unauthorizedUrl = new URL(
          `/${currentLocale}/unauthorized`,
          request.url,
        );
        return NextResponse.redirect(unauthorizedUrl);
      }

      // Utilisateur admin vérifié : accès autorisé
      console.log(
        `Admin access granted for user ${user.id} (role: ${adminCheck.role}) to ${pathToCheck}`,
      );
    } catch (error) {
      console.error("Error checking admin role in middleware:", error);

      // En cas d'erreur critique, rediriger vers unauthorized par sécurité
      console.warn(
        `Admin check failed for user ${user.id} due to system error`,
      );
      const unauthorizedUrl = new URL(
        `/${currentLocale}/unauthorized`,
        request.url,
      );
      return NextResponse.redirect(unauthorizedUrl);
    }
  }

  // Protection CSRF temporairement désactivée pour déboguer les server actions
  // TODO: Réactiver une fois la configuration CSRF correcte
  /*
  try {
    const csrfResponse = await CSRFProtection.middleware(request);
    if (csrfResponse) {
      console.warn(
        `[CSRF] Requête bloquée: ${pathname} - Token invalide ou manquant`,
      );
      return csrfResponse;
    }
  } catch (error) {
    console.error("[CSRF] Erreur protection CSRF:", error);
    // En cas d'erreur CSRF critique, bloquer par sécurité
    if (
      CSRFProtection.isServerAction(request) ||
      CSRFProtection.requiresCSRFProtection(pathname)
    ) {
      return new Response(
        JSON.stringify({
          error: "CSRF validation failed",
          code: "CSRF_ERROR",
        }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }
  }
  */

  // 6. VALIDATION FINALE : Vérifier l'intégrité de la response
  const finalCookies = response.cookies.getAll();
  const finalSupabaseCookies = finalCookies.filter((c) =>
    c.name.includes("sb-"),
  );
  const finalAuthCookies = finalCookies.filter((c) =>
    c.name.startsWith("herbis-auth-"),
  );
  const elapsedMs = Date.now() - startTime;

  console.log(`🔄 [middleware] ✅ Complete in ${elapsedMs}ms:`, {
    path: request.nextUrl.pathname,
    user: user ? user.id.slice(0, 8) : "guest",
    cookies: {
      total: finalCookies.length,
      supabase: finalSupabaseCookies.length,
      auth: finalAuthCookies.length,
    },
  });

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
