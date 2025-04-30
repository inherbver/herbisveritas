import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  // Crée un client Supabase côté navigateur.
  // Ceci est sécurisé car les variables d'environnement NEXT_PUBLIC_ sont exposées au navigateur.
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
