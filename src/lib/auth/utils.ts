import { type NextRequest, type NextResponse } from "next/server";
import { permissionsByRole, AppRole, AppPermission } from "@/config/permissions";

/**
 * Checks if a user with a given role has a specific permission.
 *
 * @param role The role of the user. Can be null or undefined for guests.
 * @param permission The permission to check for.
 * @returns `true` if the user has the permission, `false` otherwise.
 */
export function hasPermission(
  role: AppRole | null | undefined,
  permission: AppPermission,
  // Internal set to track visited roles and prevent infinite recursion
  visitedRoles = new Set<AppRole>()
): boolean {
  if (!role || visitedRoles.has(role)) {
    return false;
  }

  visitedRoles.add(role);

  const userPermissionsAndRoles = permissionsByRole[role];

  if (!userPermissionsAndRoles) {
    return false;
  }

  // 1. Direct permission check
  if (userPermissionsAndRoles.includes(permission)) {
    return true;
  }

  // 2. Wildcard permission check (e.g., 'products:*' grants 'products:create')
  const permissionParts = permission.split(':');
  const wildcardPermission = `${permissionParts[0]}:*` as AppPermission;
  if (userPermissionsAndRoles.includes(wildcardPermission)) {
    return true;
  }

  // 3. Recursive check for inherited roles
  for (const p of userPermissionsAndRoles) {
    // Check if the item is a role defined in our permissions config
    if (p in permissionsByRole) {
      if (hasPermission(p as AppRole, permission, visitedRoles)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks if a user has a specific role, including through inheritance.
 * For example, a 'dev' role might inherit 'admin' privileges.
 *
 * @param userRole The role of the user.
 * @param requiredRole The role to check for.
 * @returns `true` if the user has the required role, `false` otherwise.
 */
export function hasRole(
  userRole: AppRole | null | undefined,
  requiredRole: AppRole,
  visitedRoles = new Set<AppRole>()
): boolean {
  if (!userRole || visitedRoles.has(userRole)) {
    return false;
  }

  // Direct match
  if (userRole === requiredRole) {
    return true;
  }

  visitedRoles.add(userRole);

  const userPermissionsAndRoles = permissionsByRole[userRole];

  if (!userPermissionsAndRoles) {
    return false;
  }

  // Recursive check for inherited roles
  for (const p of userPermissionsAndRoles) {
    // Check if the item is a role defined in our permissions config
    if (p in permissionsByRole) {
      if (hasRole(p as AppRole, requiredRole, visitedRoles)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Clears all Supabase authentication cookies from the request and response.
 * This is useful for forcing a clean logout when the session is invalid on the server.
 *
 * @param request The incoming NextRequest from the middleware.
 * @param response The outgoing NextResponse that will be sent to the client.
 */
export function clearSupabaseCookies(
  request: NextRequest,
  response: NextResponse
) {
  const cookieOptions = {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
  };

  request.cookies.getAll().forEach((cookie) => {
    // Supabase auth tokens follow the pattern sb-<project_ref>-auth-token
    if (cookie.name.startsWith("sb-") && cookie.name.endsWith("-auth-token")) {
      response.cookies.set({ name: cookie.name, value: "", ...cookieOptions });
      // Also remove from the request cookies to ensure consistency for subsequent operations in the same middleware chain
      request.cookies.delete(cookie.name);
    }
  });
}
