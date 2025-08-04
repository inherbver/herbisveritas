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
    try {
      const { data: anonAuthResponse, error: anonError } = await supabase.auth.signInAnonymously();
      if (anonError) {
        // Gérer spécifiquement les erreurs de création d'utilisateur anonyme
        if (anonError.message?.includes("Database error creating anonymous user")) {
          // Cette erreur peut survenir après une déconnexion ou si les politiques RLS bloquent
          // Dans ce cas, on retourne null sans logger d'erreur pour éviter le bruit
          return null;
        }
        
        // Pour toute autre erreur, on la log normalement
        console.error("[ Server ] Erreur lors de la connexion anonyme:", anonError.message);
        return null;
      }
      
      if (!anonAuthResponse?.user) {
        console.error("[ Server ] La connexion anonyme n'a pas retourné d'utilisateur.");
        return null;
      }
      
      userId = anonAuthResponse.user.id;
    } catch (error) {
      // Gérer les exceptions de manière similaire
      if (error instanceof Error && error.message?.includes("Database error creating anonymous user")) {
        // Silencieusement retourner null pour cette erreur spécifique
        return null;
      }
      
      console.error("[ Server ] Exception lors de la connexion anonyme:", error);
      return null;
    }
  }
  
  return userId;
}
