import type { SupabaseClientType } from "@/lib/supabase/types";

export async function getActiveUserId(supabase: SupabaseClientType): Promise<string | null> {
  const {
    data: { user },
    error: getUserError,
  } = await supabase.auth.getUser();

  if (getUserError) {
    // Ne pas logger d'erreur si c'est simplement une session manquante (cas invité normal)
    // La logique de fallback vers signInAnonymously gère ce cas.
    if (getUserError.message !== "Auth session missing!") {
      console.error("Erreur lors de la récupération de l'utilisateur:", getUserError.message);
    }
  }

  let userId = user?.id;

  if (!userId) {
    const { data: anonAuthResponse, error: anonError } = await supabase.auth.signInAnonymously();
    if (anonError) {
      console.error("Erreur lors de la connexion anonyme:", anonError.message);
      return null;
    }
    if (!anonAuthResponse?.user) {
      console.error("La connexion anonyme n'a pas retourné d'utilisateur.");
      return null;
    }
    userId = anonAuthResponse.user.id;
  }
  return userId;
}
