import { createClient } from "@supabase/supabase-js";

/**
 * Crée un client Supabase avec les privilèges d'administrateur (service_role).
 * Ce client est destiné UNIQUEMENT aux scripts côté serveur sécurisés (ex: scripts d'audit, tâches cron).
 * Il ne doit JAMAIS être utilisé ou exposé côté client.
 */
export function createSupabaseAdminClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Variables d'environnement Supabase (URL et SERVICE_ROLE_KEY) manquantes.");
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
