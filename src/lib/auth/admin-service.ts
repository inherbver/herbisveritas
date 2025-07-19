import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPrivateEnv } from "@/lib/config/env-validator";
import {
  type UserRole,
  type AdminCheckResult,
  type SecurityEvent,
  type CachedRoleData,
  CACHE_TTL,
  isAdminRole,
  getPermissionsForRole,
} from "./types";

// === CACHE EN MÉMOIRE POUR LES RÔLES ===
const roleCache = new Map<string, CachedRoleData>();

/**
 * Nettoie le cache des entrées expirées
 */
function cleanExpiredCache(): void {
  const now = Date.now();
  for (const [userId, data] of roleCache.entries()) {
    if (now > data.timestamp + data.ttl) {
      roleCache.delete(userId);
    }
  }
}

/**
 * Obtient les données de rôle depuis le cache si elles sont valides
 */
function getCachedRoleData(userId: string): CachedRoleData | null {
  const cached = roleCache.get(userId);
  if (!cached) return null;

  const now = Date.now();
  if (now > cached.timestamp + cached.ttl) {
    roleCache.delete(userId);
    return null;
  }

  return cached;
}

/**
 * Met en cache les données de rôle d'un utilisateur
 */
function setCachedRoleData(
  userId: string,
  role: UserRole,
  permissions: string[],
  ttl: number = CACHE_TTL
): void {
  roleCache.set(userId, {
    role,
    permissions,
    timestamp: Date.now(),
    ttl,
  });

  // Nettoyer le cache périodiquement
  if (roleCache.size > 100) {
    cleanExpiredCache();
  }
}

/**
 * Vérifie les permissions admin d'un utilisateur en consultant la base de données (avec cache)
 * @param userId - UUID de l'utilisateur
 * @returns Résultat de la vérification avec rôle et permissions
 */
export async function checkAdminRole(userId: string): Promise<AdminCheckResult> {
  try {
    // Vérifier le cache d'abord
    const cached = getCachedRoleData(userId);
    if (cached) {
      return {
        isAdmin: isAdminRole(cached.role),
        role: cached.role,
        permissions: cached.permissions,
        userId,
      };
    }

    const supabase = await createSupabaseServerClient();

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (error || !profile) {
      console.warn(`Admin check failed for user ${userId}:`, error?.message);
      return {
        isAdmin: false,
        role: null,
        permissions: [],
        userId,
      };
    }

    const role = profile.role as UserRole;
    // Utiliser les permissions du rôle par défaut (pas de colonne permissions dans la DB)
    const permissions = getPermissionsForRole(role);

    // Mettre en cache le résultat
    setCachedRoleData(userId, role, permissions);

    return {
      isAdmin: isAdminRole(role),
      role,
      permissions,
      userId,
    };
  } catch (error) {
    console.error("Unexpected error in checkAdminRole:", error);
    return {
      isAdmin: false,
      role: null,
      permissions: [],
      userId,
    };
  }
}

/**
 * Vérifie qu'un utilisateur a accès aux routes admin et log l'événement
 * @param userId - UUID de l'utilisateur
 * @param context - Contexte de la vérification (route, action, etc.)
 * @returns Résultat de la vérification avec permissions
 */
export async function verifyAdminAccess(
  userId: string,
  context: string
): Promise<{ permissions: string[] }> {
  const { isAdmin, permissions, role } = await checkAdminRole(userId);

  if (!isAdmin) {
    // Logger l'événement de sécurité
    await logSecurityEvent({
      type: "unauthorized_admin_access",
      userId,
      details: {
        message: `Tentative d'accès admin non autorisée: ${context}`,
        path: context,
        timestamp: new Date().toISOString(),
      },
    });

    throw new Error(`Access denied: User ${userId} is not admin (role: ${role})`);
  }

  // Logger l'accès réussi
  await logSecurityEvent({
    type: "successful_admin_login",
    userId,
    details: {
      message: `Accès admin autorisé: ${context}`,
      path: context,
      timestamp: new Date().toISOString(),
    },
  });

  return { permissions };
}

/**
 * Vérifie une permission spécifique pour un utilisateur (avec cache)
 * @param userId - UUID de l'utilisateur
 * @param permission - Permission à vérifier (ex: 'products:write', 'users:read')
 * @returns true si l'utilisateur a la permission
 */
export async function hasPermission(userId: string, permission: string): Promise<boolean> {
  const { permissions } = await checkAdminRole(userId);

  // Les admins avec permission wildcard ont toutes les permissions
  if (permissions.includes("*")) {
    return true;
  }

  // Vérifier la permission spécifique
  return permissions.includes(permission);
}

/**
 * Invalide le cache pour un utilisateur spécifique
 * Utile après un changement de rôle ou de permissions
 */
export function invalidateUserCache(userId: string): void {
  roleCache.delete(userId);
}

/**
 * Invalide tout le cache
 * Utile pour le debugging ou après des changements système
 */
export function invalidateAllCache(): void {
  roleCache.clear();
}

/**
 * Logger un événement de sécurité dans la base de données
 * @param event - Événement de sécurité à logger
 */
export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.from("audit_logs").insert({
      user_id: event.userId,
      event_type: event.type,
      details: event.details,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Failed to log security event:", error);
      // En cas d'erreur, logger au moins dans la console
      console.warn("Security Event (fallback):", JSON.stringify(event, null, 2));
    }
  } catch (error) {
    console.error("Unexpected error logging security event:", error);
    // Fallback logging
    console.warn("Security Event (fallback):", JSON.stringify(event, null, 2));
  }
}

/**
 * Fallback pour vérifier l'admin principal via variable d'environnement
 * À utiliser uniquement en cas d'urgence ou de migration
 * @param userId - UUID de l'utilisateur
 * @returns true si l'utilisateur est l'admin principal
 */
export function isEmergencyAdmin(userId: string): boolean {
  try {
    const env = getPrivateEnv("admin-service.isEmergencyAdmin");
    return userId === env.ADMIN_PRINCIPAL_ID;
  } catch (error) {
    console.error("Cannot access emergency admin config:", error);
    return false;
  }
}

/**
 * Service pour gérer les rôles utilisateur (admin uniquement)
 */
export class UserRoleService {
  private userId: string;
  private permissions: string[];

  constructor(userId: string, permissions: string[]) {
    this.userId = userId;
    this.permissions = permissions;
  }

  /**
   * Assigner un rôle à un utilisateur
   */
  async assignRole(targetUserId: string, newRole: UserRole): Promise<void> {
    // Vérifier que l'utilisateur actuel peut gérer les rôles
    if (!this.permissions.includes("users:manage") && !this.permissions.includes("*")) {
      throw new Error("Permission denied: cannot manage user roles");
    }

    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", targetUserId);

    if (error) {
      throw new Error(`Failed to assign role: ${error.message}`);
    }

    // Invalider le cache pour l'utilisateur modifié
    invalidateUserCache(targetUserId);

    // Logger l'action
    await logSecurityEvent({
      type: "admin_action",
      userId: this.userId,
      details: {
        message: `Role assigned: ${newRole} to user ${targetUserId}`,
        action: "assign_role",
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Assigner des permissions à un utilisateur (temporairement désactivé - pas de colonne permissions)
   */
  async assignPermissions(_targetUserId: string, _newPermissions: string[]): Promise<void> {
    throw new Error("Permission management not implemented: no permissions column in database");
  }
}

/**
 * Factory pour créer un service de gestion des rôles
 * @param adminUserId - UUID de l'administrateur
 * @returns Service de gestion des rôles si l'utilisateur est admin
 */
export async function createUserRoleService(adminUserId: string): Promise<UserRoleService> {
  const { permissions } = await verifyAdminAccess(adminUserId, "UserRoleService");
  return new UserRoleService(adminUserId, permissions);
}
