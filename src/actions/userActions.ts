"use server";

import { withPermissionSafe } from "@/lib/auth/server-actions-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

// New imports for Clean Architecture
import { ActionResult } from "@/lib/core/result";
import { LogUtils } from "@/lib/core/logger";
import { ErrorUtils } from "@/lib/core/errors";

export interface UserForAdminPanel {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  created_at: string;
  last_sign_in_at: string | null;
}

export const getUsers = withPermissionSafe(
  "users:read:all",
  async (): Promise<ActionResult<UserForAdminPanel[]>> => {
    const context = LogUtils.createUserActionContext('unknown', 'get_users', 'admin');
    LogUtils.logOperationStart('get_users', context);

    try {
      const supabase = createSupabaseAdminClient();

      // 1. Get all users from auth.users
      const {
        data: { users },
        error: usersError,
      } = await supabase.auth.admin.listUsers();

      if (usersError) {
        throw ErrorUtils.fromSupabaseError(usersError);
      }

      // 2. Get all profiles from public.profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, role");

      if (profilesError) {
        throw ErrorUtils.fromSupabaseError(profilesError);
      }

      // 3. Combine data
      const combinedUsers: UserForAdminPanel[] = users.map((user) => {
        const profile = profiles?.find((p) => p.id === user.id);
        const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || null;

        return {
          id: user.id,
          email: user.email || "",
          full_name: fullName,
          // Prioritize JWT role, fallback to profile role
          role: user.app_metadata.role || profile?.role || "user",
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at || null,
        };
      });

      LogUtils.logOperationSuccess('get_users', { ...context, userCount: combinedUsers.length });
      return ActionResult.ok(combinedUsers, `${combinedUsers.length} utilisateurs récupérés`);
    } catch (error) {
      LogUtils.logOperationError('get_users', error, context);
      return ActionResult.error(
        ErrorUtils.isAppError(error) ? ErrorUtils.formatForUser(error) : 'Impossible de récupérer les utilisateurs'
      );
    }
  }
);
