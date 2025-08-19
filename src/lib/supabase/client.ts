import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  // Crée un client Supabase côté navigateur avec gestion améliorée des erreurs de token
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
      global: {
        headers: {
          "x-client-info": "inherbis-web",
        },
      },
    },
  );
}

/**
 * Nettoie tous les tokens Supabase du localStorage
 * Utile en cas d'erreur "Refresh Token Not Found"
 */
export function clearSupabaseTokens() {
  if (typeof window === "undefined") return;

  Object.keys(localStorage).forEach((key) => {
    if (key.includes("supabase") || key.includes("sb-")) {
      localStorage.removeItem(key);
      console.log("Token supprimé:", key);
    }
  });

  // Nettoyer aussi les cookies Supabase si présents
  document.cookie.split(";").forEach((cookie) => {
    const eqPos = cookie.indexOf("=");
    const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
    if (name.includes("supabase") || name.includes("sb-")) {
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      console.log("Cookie supprimé:", name);
    }
  });
}
