/**
 * @deprecated Ce fichier est obsolète. Utilisez les types et permissions de @/lib/auth/types
 *
 * Redirection vers la nouvelle source unique de vérité pour les rôles et permissions.
 */

// Réexporter les types depuis la nouvelle source centralisée
export type { UserRole as AppRole, AppPermission } from "@/lib/auth/types";
export { ROLE_PERMISSIONS as permissionsByRole } from "@/lib/auth/types";
