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
        // Gestionnaire d'erreurs pour les problèmes de refresh token
        onAuthStateChange: async (event, session) => {
          if (event === "TOKEN_REFRESHED") {
            console.log("Token refreshed successfully");
          } else if (event === "SIGNED_OUT") {
            // Nettoyer le localStorage en cas de déconnexion
            const storageKey = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL!.replace("https://", "").split(".")[0]}-auth-token`;
            localStorage.removeItem(storageKey);
          }
        },
      },
      global: {
        headers: {
          "x-client-info": "inherbis-web",
        },
      },
    }
  );
}
