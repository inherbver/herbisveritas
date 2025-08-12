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
    }
  );
}
