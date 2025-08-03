import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Interface pour un élément du journal d'activité
export interface ActivityLogItem {
  id: string;
  timestamp: string;
  description: string;
  user_email: string;
  type: EventType;
  severity: EventSeverity;
}

// Types d'événements supportés
export type EventType =
  // Authentification
  | "USER_REGISTERED"
  | "USER_LOGIN"
  | "PASSWORD_RESET_REQUESTED"
  | "PASSWORD_RESET_COMPLETED"
  // Commandes
  | "ORDER_CREATED"
  | "PAYMENT_SUCCEEDED"
  | "PAYMENT_FAILED"
  | "ORDER_STATUS_CHANGED"
  // Profils
  | "PROFILE_UPDATED"
  | "ADDRESS_ADDED"
  | "ADDRESS_UPDATED"
  | "PROFILE_RECOVERY"
  // Sécurité
  | "unauthorized_admin_access"
  | "successful_admin_login"
  | "admin_action"
  // Anciens types (compatibilité)
  | "user_registered"
  | "order_validated"
  | "product_created"
  | "security_alert"
  // Erreurs système
  | "DATABASE_ERROR"
  | "API_ERROR"
  | "SYNC_ERROR"
  | "DATABASE_CLEANUP";

export type EventSeverity = "INFO" | "WARNING" | "ERROR" | "CRITICAL";

// Typage pour la structure des logs bruts et des détails
type AuditLog = {
  id: string;
  created_at: string;
  event_type: EventType;
  data: { message: string } | null;
  user_id: string | null;
  severity: EventSeverity;
};

// Fonction principale exportée pour récupérer les logs d'activité récents
export async function getRecentActivityLogs(): Promise<ActivityLogItem[]> {
  // Utiliser le client admin pour bypasser les politiques RLS et accéder aux logs d'audit
  const supabase = createSupabaseAdminClient();

  // 1. Récupérer les logs d'audit sans jointure
  const { data: auditLogs, error: logsError } = await supabase
    .from("audit_logs")
    .select("id, created_at, event_type, data, user_id, severity")
    .order("created_at", { ascending: false })
    .limit(20);

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

  // 3. Si des IDs existent, récupérer les infos depuis auth.users avec le client admin
  if (userIds.length > 0) {
    try {
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
    } catch (error) {
      console.error("Error calling admin.listUsers:", error);
      // En cas d'erreur, on continue sans les emails
    }
  }

  // 4. Combiner les logs avec les emails
  return (auditLogs as AuditLog[]).map((log) => ({
    id: log.id,
    timestamp: log.created_at,
    description: log.data?.message || getEventDescription(log.event_type, log.data || {}),
    user_email: log.user_id ? userEmailMap.get(log.user_id) || "Utilisateur inconnu" : "Système",
    type: log.event_type,
    severity: log.severity,
  }));
}

// Fonction utilitaire pour générer des descriptions d'événements plus lisibles
function getEventDescription(eventType: EventType, data: Record<string, unknown>): string {
  switch (eventType) {
    case "USER_REGISTERED":
      return "Nouvel utilisateur inscrit";
    case "ORDER_CREATED":
      return `Nouvelle commande ${data?.order_number || ""} (${data?.total_amount || ""}€)`;
    case "PAYMENT_SUCCEEDED":
      return `Paiement réussi pour la commande ${data?.order_number || ""} (${data?.total_amount || ""}€)`;
    case "PAYMENT_FAILED":
      return `Échec du paiement pour la commande ${data?.order_number || ""}`;
    case "ORDER_STATUS_CHANGED":
      return `Commande ${data?.order_number || ""}: ${data?.old_status || ""} → ${data?.new_status || ""}`;
    case "PROFILE_UPDATED":
      return "Profil utilisateur mis à jour";
    case "PROFILE_RECOVERY":
      return `Récupération de profil manquant (${data?.recovery_reason || "raison inconnue"})`;
    case "ADDRESS_ADDED":
      return `Nouvelle adresse ${data?.address_type || ""} ajoutée`;
    case "ADDRESS_UPDATED":
      return `Adresse ${data?.address_type || ""} modifiée`;
    case "unauthorized_admin_access":
      return "Tentative d'accès admin non autorisée";
    case "successful_admin_login":
      return "Connexion admin réussie";
    case "DATABASE_CLEANUP":
      return `Nettoyage base de données: ${data?.users_deleted_count || 0} utilisateurs supprimés`;
    default:
      return `Événement: ${eventType}`;
  }
}
