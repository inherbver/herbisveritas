import type { SupabaseClientType } from "@/lib/supabase/types";

export async function getActiveUserId(supabase: SupabaseClientType): Promise<string | null> {
  const {
    data: { user },
    error: getUserError,
  } = await supabase.auth.getUser();

  if (getUserError) {
    // Ne pas logger d'erreur si c'est simplement une session manquante (cas invité normal)
    if (getUserError.message !== "Auth session missing!") {
      console.error("Erreur lors de la récupération de l'utilisateur:", getUserError.message);
    }
  }

  // Retourner l'ID utilisateur s'il existe, sinon null pour les invités
  // Le système gère les invités via les cookies de session (voir cartReader.ts)
  return user?.id || null;
}
