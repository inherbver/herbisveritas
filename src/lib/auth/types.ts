/**
 * TYPES CENTRALISÉS POUR L'AUTHENTIFICATION ET LES AUTORISATIONS
 *
 * Ce fichier contient la source unique de vérité pour tous les types
 * liés aux rôles et permissions dans l'application.
 */

// === RÔLES UTILISATEUR ===
// Synchronisé avec l'enum de la base de données et le schéma Supabase
export type UserRole = "user" | "editor" | "admin";

// === PERMISSIONS DE L'APPLICATION ===
// Format standardisé : "action:resource" ou "resource:action"
export type AppPermission =
  // --- Accès Admin ---
  | "admin:access" // Accès au dashboard admin
  | "admin:read" // Lecture des données admin
  | "admin:write" // Écriture des données admin

  // --- Gestion des Produits ---
  | "products:read" // Voir les produits
  | "products:create" // Créer des produits
  | "products:update" // Modifier des produits
  | "products:delete" // Supprimer des produits

  // --- Gestion des Commandes ---
  | "orders:read:all" // Voir toutes les commandes
  | "orders:read:own" // Voir ses propres commandes
  | "orders:update:status" // Modifier le statut des commandes

  // --- Gestion des Utilisateurs ---
  | "users:read:all" // Voir tous les utilisateurs
  | "users:update:role" // Modifier les rôles utilisateur
  | "users:delete" // Supprimer des utilisateurs
  | "users:manage" // Permission générale de gestion des utilisateurs

  // --- Gestion du Profil ---
  | "profile:read:own" // Voir son propre profil
  | "profile:update:own" // Modifier son propre profil

  // --- Gestion du Contenu ---
  | "content:read" // Lire le contenu public
  | "content:create" // Créer du contenu
  | "content:update" // Modifier du contenu
  | "content:delete" // Supprimer du contenu
  | "content:publish" // Publier du contenu
  | "content:unpublish" // Dépublier du contenu

  // --- Paramètres Système ---
  | "settings:view" // Voir les paramètres système
  | "settings:update" // Modifier les paramètres système

  // --- Permission Wildcard ---
  | "*"; // Toutes les permissions (super admin)

// === MAPPING RÔLES -> PERMISSIONS ===
export const ROLE_PERMISSIONS: Record<UserRole, AppPermission[]> = {
  // Utilisateur standard : accès aux fonctionnalités de base
  user: ["orders:read:own", "profile:read:own", "profile:update:own", "content:read"],

  // Éditeur : gestion des produits et du contenu
  editor: [
    "admin:access",
    "products:read",
    "products:create",
    "products:update",
    "profile:read:own",
    "profile:update:own",
    "content:read",
    "content:create",
    "content:update",
    "content:delete",
    "content:publish",
    "content:unpublish",
  ],

  // Admin : contrôle total sauf suppression d'utilisateurs
  admin: [
    "admin:access",
    "admin:read",
    "admin:write",
    "settings:view",
    "settings:update",
    "products:read",
    "products:create",
    "products:update",
    "products:delete",
    "orders:read:all",
    "orders:read:own",
    "orders:update:status",
    "profile:read:own",
    "profile:update:own",
    "users:read:all",
    "users:update:role",
    "users:manage",
    "content:read",
    "content:create",
    "content:update",
    "content:delete",
    "content:publish",
    "content:unpublish",
  ],
};

// === TYPES POUR LES VÉRIFICATIONS D'ADMIN ===
export interface AdminCheckResult {
  isAdmin: boolean;
  role: UserRole | null;
  permissions: string[];
  userId: string;
  isAuthorized?: boolean; // Pour la compatibilité avec l'ancien système
}

// === TYPES POUR LES ÉVÉNEMENTS DE SÉCURITÉ ===
export type SecurityEventType =
  | "unauthorized_admin_access"
  | "successful_admin_login"
  | "admin_action"
  | "role_change"
  | "permission_change";

export interface SecurityEvent {
  type: SecurityEventType;
  userId: string;
  details: {
    adminEmail?: string;
    message: string;
    path?: string;
    action?: string;
    timestamp: string;
    [key: string]: unknown;
  };
}

// === UTILITAIRES DE TYPE ===
/**
 * Vérifie si un rôle est considéré comme admin
 */
export function isAdminRole(role: UserRole | null): boolean {
  return role === "admin";
}

/**
 * Vérifie si un rôle a accès au dashboard admin
 */
export function hasAdminAccess(role: UserRole | null): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role];
  return permissions.includes("admin:access");
}

/**
 * Obtient toutes les permissions pour un rôle donné
 */
export function getPermissionsForRole(role: UserRole): AppPermission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Vérifie si un rôle a une permission spécifique
 */
export function roleHasPermission(role: UserRole, permission: AppPermission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions.includes(permission) || permissions.includes("*");
}

// === TYPES POUR LA CACHE ===
export interface CachedRoleData {
  role: UserRole;
  permissions: string[];
  timestamp: number;
  ttl: number; // Time to live en millisecondes
}

// === CONSTANTES ===
export const CACHE_TTL = 5 * 60 * 1000; // 5 minutes en millisecondes
export const EMERGENCY_ADMIN_CACHE_TTL = 1 * 60 * 1000; // 1 minute pour l'admin d'urgence
