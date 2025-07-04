// src/lib/supabase/server.ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// createSupabaseServerClient redevient async pour gérer correctement le typage de cookies()
export async function createSupabaseServerClient() {
  const cookieStore = await cookies(); // await est nécessaire pour le typage correct

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (_error) {
            // Le bloc `set` peut échouer si appelé depuis une Server Component.
            // Ceci est attendu car ils ne peuvent pas définir de cookies.
            // Les Server Actions et les Route Handlers PEUVENT définir des cookies.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            // Utilisation de cookieStore.delete() pour la clarté et la sémantique
            cookieStore.delete({ name, ...options });
          } catch (_error) {
            // Le bloc `delete` peut échouer si appelé depuis une Server Component.
            // Voir la note ci-dessus dans le bloc `set`.
          }
        },
      },
    }
  );
}

// getSupabaseUserSession reste async et attend createSupabaseServerClient
export async function getSupabaseUserSession() {
  // Appel avec await car createSupabaseServerClient est async
  const supabase = await createSupabaseServerClient();

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error("Erreur lors de la récupération de la session Supabase:", error.message);
    return null;
  }

  return session;
}
