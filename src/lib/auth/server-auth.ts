import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import { hasPermission } from "@/lib/auth/utils";
import type { AppPermission, AppRole } from "@/config/permissions";

// Strict type for the authorization result
type AuthResult = {
  isAuthorized: boolean;
  user?: User;
  role?: AppRole;
  error?: string;
};

/**
 * Checks if the current user has a specific permission.
 * This function is designed to be used on the server side (Server Components, API Routes, Server Actions).
 * @param permission The permission to check for.
 * @returns An object containing authorization status, user info, and role.
 */
export const checkUserPermission = cache(
  async (permission: AppPermission): Promise<AuthResult> => {
  try {
    const supabase = await createSupabaseServerClient();

    // 1. Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.warn(`[Security] Auth error: ${authError.message}`);
      return { isAuthorized: false, error: "Authentication failed" };
    }

    if (!user) {
      return { isAuthorized: false, error: "Not authenticated" };
    }

    // 2. Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.warn(`[Security] Profile query error for user ${user.id}: ${profileError.message}`);
      return { isAuthorized: false, user, error: "Profile access failed" };
    }

    if (!profile) {
      console.warn(`[Security] No profile found for user ${user.id}`);
      return { isAuthorized: false, user, error: "Profile not found" };
    }

    const userRole = profile.role as AppRole;

    // 3. Check permission using the centralized RBAC utility
    const isAuthorized = hasPermission(userRole, permission);

    if (!isAuthorized) {
      console.warn(`[Security] Permission '${permission}' denied for role '${userRole}' (User ID: ${user.id})`);
      return { isAuthorized: false, user, role: userRole, error: "Insufficient privileges" };
    }

    // 4. Success - log for audit
    console.info(`[Security] Permission '${permission}' granted for role '${userRole}' (User ID: ${user.id})`);
    return { isAuthorized: true, user, role: userRole };

  } catch (error) {
    console.error(`[Security] Unexpected error during permission check:`, error);
    return { isAuthorized: false, error: "System error" };
  }
});
