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
  // Profils (événements critiques uniquement)
  | "PROFILE_RECOVERY"
  | "PROFILE_UPDATED"
  | "ADDRESS_ADDED"
  | "ADDRESS_UPDATED"
  // Newsletter
  | "NEWSLETTER_SUBSCRIPTION"
  | "NEWSLETTER_UNSUBSCRIPTION"
  // E-commerce & Conversion (Phase 1)
  | "CART_ITEM_ADDED"
  | "CART_ITEM_REMOVED"
  | "PRODUCT_VIEWED"
  | "CHECKOUT_STARTED"
  // Phase 2 - E-commerce avancé
  | "CART_ABANDONED"
  | "CHECKOUT_ABANDONED"
  | "SEARCH_PERFORMED"
  | "FILTER_APPLIED"
  // Webhooks & Intégrations (Phase 1)
  | "STRIPE_WEBHOOK_RECEIVED"
  | "STRIPE_WEBHOOK_FAILED"
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
  data: {
    message: string;
    // Context enrichi (Phase 1)
    session_id?: string;
    ip_address?: string;
    user_agent?: string;
    page_url?: string;
    referrer?: string;
    // Données business
    product_id?: string;
    product_name?: string;
    product_price?: number;
    quantity?: number;
    cart_total?: number;
    order_value?: number;
    email?: string;
    // Données techniques
    response_time?: number;
    error_code?: string;
    event_type?: string;
    stripe_event_id?: string;
    amount?: number;
  } | null;
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
    case "PROFILE_RECOVERY":
      return `⚠️ Récupération de profil manquant (${data?.recovery_reason || "raison inconnue"})`;
    case "NEWSLETTER_SUBSCRIPTION":
      return `Nouvel abonné newsletter: ${data?.email || ""}`;
    case "NEWSLETTER_UNSUBSCRIPTION":
      return `Désabonnement newsletter: ${data?.email || ""}`;
    case "CART_ITEM_ADDED":
      return `🛒 Ajout panier: ${data?.product_name || "produit"} (${data?.quantity || 1}x)`;
    case "CART_ITEM_REMOVED":
      return `🗑️ Suppression panier: ${data?.product_name || "produit"}`;
    case "PRODUCT_VIEWED":
      return `👁️ Vue produit: ${data?.product_name || "produit"} (${data?.price || 0}€)`;
    case "CHECKOUT_STARTED":
      return `💳 Début commande: ${data?.cart_total || 0}€ (${data?.items_count || 0} articles)`;
    case "STRIPE_WEBHOOK_RECEIVED":
      return `✅ Webhook Stripe: ${data?.event_type || "événement"} - ${data?.amount || 0}€`;
    case "STRIPE_WEBHOOK_FAILED":
      return `❌ Échec webhook Stripe: ${data?.event_type || "événement"} - ${data?.error || "erreur inconnue"}`;
    case "CART_ABANDONED":
      return `🛒💔 Panier abandonné: ${data?.cart_total || 0}€ (${data?.items_count || 0} articles)`;
    case "CHECKOUT_ABANDONED":
      return `💳💔 Checkout abandonné: ${data?.cart_total || 0}€ à l'étape ${data?.checkout_step || "inconnue"}`;
    case "SEARCH_PERFORMED":
      return `🔍 Recherche: "${data?.search_query || ""}" (${data?.results_count || 0} résultats)`;
    case "FILTER_APPLIED":
      return `🎛️ Filtre appliqué: ${data?.filter_type || ""} = ${data?.filter_value || ""}`;
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
