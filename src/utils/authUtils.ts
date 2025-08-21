import type { SupabaseClientType } from "@/lib/supabase/types";
import { cookies } from "next/headers";

// Cache simple basé sur les cookies pour éviter les appels multiples
let lastSessionCheck: {
  userId: string | null;
  timestamp: number;
  cookieHash: string;
} | null = null;

async function getCookieHash(): Promise<string> {
  try {
    // Méthode server-side avec cookies de Next.js
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    // Filtrer les cookies Supabase
    const supabaseCookies = allCookies
      .filter((c) => c.name.includes("sb-"))
      .map((c) => `${c.name}=${c.value}`)
      .join("");

    if (supabaseCookies) {
      // Créer un hash simple basé sur les valeurs des cookies
      return supabaseCookies.slice(0, 50); // Premier partie comme hash
    }

    // Fallback si aucun cookie Supabase trouvé
    return `server-${Date.now()}`;
  } catch {
    // Client-side fallback (si exécuté côté client)
    if (typeof document !== "undefined") {
      const authCookies =
        document.cookie
          .split(";")
          .filter(
            (cookie) => cookie.includes("sb-") && cookie.includes("auth-token"),
          )
          .join("") || "";
      return authCookies;
    }
    return `unknown-${Date.now()}`;
  }
}

export async function getActiveUserId(
  supabase: SupabaseClientType,
): Promise<string | null> {
  // NOUVELLE APPROCHE : Toujours vérifier directement avec Supabase
  // car les cookies du middleware ne sont pas transmis aux Server Components

  try {
    // Utiliser le cache pour éviter les appels multiples
    const cookieHash = await getCookieHash();

    if (
      lastSessionCheck &&
      Date.now() - lastSessionCheck.timestamp < 2000 &&
      lastSessionCheck.cookieHash === cookieHash
    ) {
      console.log(
        "🔐 [getActiveUserId] Using cache:",
        lastSessionCheck.userId
          ? `authenticated (${lastSessionCheck.userId.slice(0, 8)})`
          : "guest",
      );
      return lastSessionCheck.userId;
    }

    console.log("🔐 [getActiveUserId] Checking auth with Supabase...");

    // Appel direct à Supabase - LA source de vérité
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      // Ne pas logger si session manquante (normal pour invités)
      if (!error.message.includes("Auth session missing")) {
        console.error("🔐 [getActiveUserId] Auth error:", error.message);
      }

      // Mettre à jour le cache
      lastSessionCheck = {
        userId: null,
        timestamp: Date.now(),
        cookieHash,
      };

      return null;
    }

    const userId = user?.id || null;
    console.log(
      "🔐 [getActiveUserId] Supabase auth result:",
      userId ? `authenticated (${userId.slice(0, 8)})` : "guest",
    );

    // Mettre à jour le cache
    lastSessionCheck = {
      userId,
      timestamp: Date.now(),
      cookieHash,
    };

    return userId;
  } catch (error) {
    console.error("🔐 [getActiveUserId] Unexpected error:", error);
    return null;
  }
}

// Wrapper simplifié - plus d'AsyncLocalStorage
export async function withStableSession<T>(
  callback: () => Promise<T>,
): Promise<T> {
  return await callback();
}
