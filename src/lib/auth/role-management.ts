import { type NextRequest } from "next/server";
import { createClient } from "../supabase/middleware";
import { hasPermission, AppPermission, AppRole, getUserRoleFromJWT } from "./role-helpers";

/**
 * Helper pour le middleware, vérifie l'authentification et les permissions.
 * Utilise uniquement le JWT comme source de vérité.
 * @param request La requête Next.js.
 * @param requiredPermission La permission requise pour accéder à la ressource.
 * @returns Un objet indiquant si l'utilisateur est autorisé, ainsi que son identité et son rôle.
 */
export async function checkAuthAndRole(request: NextRequest, requiredPermission: AppPermission) {
  const { supabase, response } = createClient(request);

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      authorized: false,
      reason: "not_authenticated",
      user: null,
      userRole: "anon" as AppRole,
      response,
    };
  }

  const userRole = getUserRoleFromJWT(user);

  if (!hasPermission(user, requiredPermission)) {
    return {
      authorized: false,
      reason: "insufficient_permissions",
      user: user,
      userRole: userRole,
      response,
    };
  }

  return {
    authorized: true,
    user,
    userRole,
    response,
  };
}
