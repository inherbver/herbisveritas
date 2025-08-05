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
    // Tentative de connexion anonyme, mais ne pas échouer si cela ne fonctionne pas
    try {
      const { data: anonAuthResponse, error: anonError } = await supabase.auth.signInAnonymously();
      if (anonError) {
        console.warn("Connexion anonyme non disponible:", anonError.message);
        console.warn("Le panier ne sera pas persistant pour les utilisateurs non connectés.");
        return null;
      }
      if (!anonAuthResponse?.user) {
        console.warn("La connexion anonyme n'a pas retourné d'utilisateur.");
        return null;
      }
      userId = anonAuthResponse.user.id;
    } catch (error) {
      console.warn("Erreur lors de la tentative de connexion anonyme:", error);
      console.warn("Le panier ne sera pas persistant pour les utilisateurs non connectés.");
      return null;
    }
  }
  return userId;
}
