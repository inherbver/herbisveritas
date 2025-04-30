import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// La fonction doit être async pour utiliser await
export async function createClient() {
  // Utiliser await pour récupérer le store de cookies
  const cookieStore = await cookies();

  // Crée un client Supabase côté serveur qui peut lire/écrire les cookies.
  // Nécessite NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans l'environnement.
  // Si vous avez besoin d'opérations privilégiées (ex: bypass RLS), vous aurez besoin
  // de créer un client *service_role* séparé avec SUPABASE_SERVICE_ROLE_KEY.
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
            // Cela est attendu car ils ne peuvent pas définir de cookies.
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
