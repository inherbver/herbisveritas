import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// Modifiée pour être async et utiliser await cookies()
export async function createSupabaseServerClient() {
  const cookieStore = await cookies(); // Traiter comme async basé sur les erreurs TS

  // Crée et retourne un client Supabase côté serveur
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
            cookieStore.set({ name, value: "", ...options });
          } catch (_error) {
            // Le bloc `remove` peut échouer si appelé depuis une Server Component.
            // Voir la note ci-dessus dans le bloc `set`.
          }
        },
      },
    }
  );
}

// getSupabaseUserSession reste async et attend maintenant createSupabaseServerClient
export async function getSupabaseUserSession() {
  // Crée un client Supabase côté serveur
  const supabase = await createSupabaseServerClient(); // Await ici

  // Récupère la session utilisateur
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
