import { type User } from "@supabase/supabase-js";

export type AppRole = "anon" | "user" | "admin" | "dev";

export type AppPermission =
  | "user:read"
  | "user:update_own"
  | "admin:access"
  | "admin:read"
  | "admin:write"
  | "dev:access";

/**
 * UNIQUE SOURCE DE VÉRITÉ : Extraction du rôle depuis le JWT.
 * @param user L'objet utilisateur de Supabase, peut être null.
 * @returns Le rôle de l'utilisateur.
 */
export function getUserRoleFromJWT(user: User | null): AppRole {
  if (!user) {
    return "anon";
  }

  const role = user.app_metadata?.role as AppRole;

  if (role && ["anon", "user", "admin", "dev"].includes(role)) {
    return role;
  }

  return "user";
}

/**
 * Vérification des permissions basée sur le rôle extrait du JWT uniquement.
 * @param user L'objet utilisateur de Supabase.
 * @param permission La permission requise.
 * @returns `true` si l'utilisateur a la permission, `false` sinon.
 */
export function hasPermission(user: User | null, permission: AppPermission): boolean {
  const role = getUserRoleFromJWT(user);

  const permissions: Record<AppRole, AppPermission[]> = {
    anon: [],
    user: ["user:read", "user:update_own"],
    admin: ["user:read", "user:update_own", "admin:access", "admin:read", "admin:write"],
    dev: [
      "user:read",
      "user:update_own",
      "admin:access",
      "admin:read",
      "admin:write",
      "dev:access",
    ],
  };

  return permissions[role].includes(permission);
}
