// src/config/admin.ts - Configuration côté serveur
export const ADMIN_CONFIG = {
  // ❌ Ne jamais utiliser NEXT_PUBLIC_ pour les données sensibles
  ADMIN_PRINCIPAL_ID: process.env.ADMIN_PRINCIPAL_ID,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || "admin@example.com",
  // Liste blanche d'IDs autorisés (optionnel, pour plusieurs admins)
  AUTHORIZED_ADMIN_IDS: process.env.AUTHORIZED_ADMIN_IDS?.split(",") || [],
  CHECK_INTERVAL: 2 * 60 * 1000, // 2 minutes au lieu de 5
} as const;

// Fonction de validation côté serveur
export function isAuthorizedAdmin(userId: string): boolean {
  if (!ADMIN_CONFIG.ADMIN_PRINCIPAL_ID) {
    console.error("ADMIN_PRINCIPAL_ID non configuré !");
    return false;
  }

  return (
    userId === ADMIN_CONFIG.ADMIN_PRINCIPAL_ID || ADMIN_CONFIG.AUTHORIZED_ADMIN_IDS.includes(userId)
  );
}
