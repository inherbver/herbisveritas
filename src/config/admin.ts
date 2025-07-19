/**
 * @deprecated Ce fichier est obsolète. Le système de gestion des admins
 * a été migré vers un système basé sur les rôles en base de données.
 *
 * Utilisez @/lib/auth/admin-service pour les vérifications admin.
 */

// Configuration conservée pour la migration et les alertes d'urgence
export const ADMIN_CONFIG = {
  ADMIN_PRINCIPAL_ID: process.env.ADMIN_PRINCIPAL_ID,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || "admin@example.com",
  CHECK_INTERVAL: 2 * 60 * 1000, // 2 minutes
} as const;

/**
 * @deprecated Utilisez checkAdminRole() de @/lib/auth/admin-service
 * Fonction conservée temporairement pour les systèmes d'alerte d'urgence
 */
export function isAuthorizedAdmin(userId: string): boolean {
  if (!ADMIN_CONFIG.ADMIN_PRINCIPAL_ID) {
    console.error("ADMIN_PRINCIPAL_ID non configuré !");
    return false;
  }

  return userId === ADMIN_CONFIG.ADMIN_PRINCIPAL_ID;
}
