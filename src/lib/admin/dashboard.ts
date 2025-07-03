import { createSupabaseServerClient } from "@/lib/supabase/server";

// Interface pour un élément du journal d'activité
export interface ActivityLogItem {
  id: string;
  timestamp: string;
  description: string;
  user_email: string;
  type: "user_registered" | "order_validated" | "product_created" | "security_alert";
}

// Typage pour la structure des logs bruts et des détails
type AuditLog = {
  id: string;
  created_at: string;
  event_type: ActivityLogItem["type"];
  data: { message: string } | null;
  user_id: string | null;
};

// Fonction principale exportée pour récupérer les logs d'activité récents
export async function getRecentActivityLogs(): Promise<ActivityLogItem[]> {
  const supabase = await createSupabaseServerClient();

  // 1. Récupérer les logs d'audit sans jointure
  const { data: auditLogs, error: logsError } = await supabase
    .from("audit_logs")
    .select("id, created_at, event_type, data, user_id")
    .order("created_at", { ascending: false })
    .limit(10);

  if (logsError) {
    console.error("Error fetching audit logs:", JSON.stringify(logsError, null, 2));
    return [];
  }

  if (!auditLogs || auditLogs.length === 0) {
    return []; // Pas de logs, on retourne un tableau vide
  }

  // 2. Collecter les IDs utilisateurs uniques et valides
  const userIds = [...new Set(auditLogs.map((log) => log.user_id).filter((id) => id))] as string[];

  const userEmailMap = new Map<string, string>();

  // 3. Si des IDs existent, récupérer les infos utilisateurs
  if (userIds.length > 0) {
    const { data, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error("Error fetching users:", JSON.stringify(usersError, null, 2));
      // En cas d'erreur, on continue sans les emails
    } else {
      data.users
        .filter((user) => userIds.includes(user.id))
        .forEach((user) => {
          if (user.email) {
            userEmailMap.set(user.id, user.email);
          }
        });
    }
  }

  // 4. Combiner les logs avec les emails
  return (auditLogs as AuditLog[]).map((log) => ({
    id: log.id,
    timestamp: log.created_at,
    description: log.data?.message || `Événement: ${log.event_type}`,
    user_email: log.user_id ? userEmailMap.get(log.user_id) || "Utilisateur inconnu" : "Système",
    type: log.event_type as ActivityLogItem["type"],
  }));
}
