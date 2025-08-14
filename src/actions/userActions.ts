"use server";

import { withPermissionSafe } from "@/lib/auth/server-actions-auth";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

// New imports for Clean Architecture
import { ActionResult } from "@/lib/core/result";
import { LogUtils } from "@/lib/core/logger";
import { ErrorUtils, AuthenticationError } from "@/lib/core/errors";

export interface UserForAdminPanel {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  status?: string;
}

export interface UserStats {
  total: number;
  active: number;
  suspended: number;
  admins: number;
  editors: number;
  users: number;
  newThisWeek: number;
  activeToday: number;
}

export const getUsers = withPermissionSafe(
  "users:read:all",
  async (): Promise<ActionResult<UserForAdminPanel[]>> => {
    const context = LogUtils.createUserActionContext("unknown", "get_users", "admin");
    LogUtils.logOperationStart("get_users", context);

    try {
      const supabase = createSupabaseAdminClient();

      // 1. Get all users from auth.users (paginated to handle large datasets)
      let allUsers: any[] = [];
      let page = 1;
      const perPage = 1000; // Maximum allowed by Supabase

      while (true) {
        const { data: authUsers, error: authUsersError } = await supabase.auth.admin.listUsers({
          page,
          perPage,
        });

        if (authUsersError) {
          throw ErrorUtils.fromSupabaseError(authUsersError);
        }

        if (!authUsers?.users || authUsers.users.length === 0) {
          break;
        }

        allUsers = allUsers.concat(authUsers.users);

        // If we got less than perPage, we're done
        if (authUsers.users.length < perPage) {
          break;
        }

        page++;
      }

      const users = allUsers;

      // 2. Get all profiles from public.profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, role, status");

      if (profilesError) {
        throw ErrorUtils.fromSupabaseError(profilesError);
      }

      // 3. Combine data
      const combinedUsers: UserForAdminPanel[] = users.map((user) => {
        const profile = profiles?.find((p) => p.id === user.id);
        const fullName =
          [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || null;

        return {
          id: user.id,
          email: user.email || "",
          full_name: fullName,
          // Prioritize JWT role, fallback to profile role
          role: user.app_metadata.role || profile?.role || "user",
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at || null,
          status: profile?.status || "active",
        };
      });

      LogUtils.logOperationSuccess("get_users", { ...context, userCount: combinedUsers.length });
      return ActionResult.ok(combinedUsers, `${combinedUsers.length} utilisateurs récupérés`);
    } catch (error) {
      LogUtils.logOperationError("get_users", error, context);
      return ActionResult.error(
        ErrorUtils.isAppError(error)
          ? ErrorUtils.formatForUser(error)
          : "Impossible de récupérer les utilisateurs"
      );
    }
  }
);

interface DeleteUserParams {
  userId: string;
  reason: string;
}

export const deleteUser = withPermissionSafe(
  "users:delete",
  async ({ userId, reason }: DeleteUserParams): Promise<ActionResult<null>> => {
    const context = LogUtils.createUserActionContext("unknown", "delete_user", "admin", {
      targetUserId: userId,
    });
    LogUtils.logOperationStart("delete_user", context);

    try {
      const supabaseServer = await createSupabaseServerClient();
      const {
        data: { user: caller },
      } = await supabaseServer.auth.getUser();

      if (!caller) {
        throw new AuthenticationError("Utilisateur non authentifié.");
      }
      context.userId = caller.id;

      // Vérifier qu'on ne supprime pas son propre compte
      if (caller.id === userId) {
        throw new Error("Impossible de supprimer votre propre compte utilisateur.");
      }

      const supabaseAdmin = createSupabaseAdminClient();

      // 1. Supprimer le profil d'abord (foreign key constraint)
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (profileError) {
        throw ErrorUtils.fromSupabaseError(profileError);
      }

      // 2. Supprimer l'utilisateur de auth.users
      const { error: userError } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (userError) {
        throw ErrorUtils.fromSupabaseError(userError);
      }

      // 3. Logger l'audit de sécurité
      const { error: auditError } = await supabaseAdmin.from("audit_logs").insert({
        user_id: caller.id,
        action: "user_deleted",
        resource: "users",
        details: {
          deleted_user_id: userId,
          reason: reason.substring(0, 200), // Limiter la taille
          timestamp: new Date().toISOString(),
        },
      });

      if (auditError) {
        // Log l'erreur mais ne fait pas échouer la suppression
        LogUtils.logOperationError("delete_user_audit", auditError, context);
      }

      LogUtils.logOperationSuccess("delete_user", {
        ...context,
        reason: reason.substring(0, 50),
      });
      return ActionResult.ok(null, "Utilisateur supprimé avec succès");
    } catch (error) {
      LogUtils.logOperationError("delete_user", error, context);
      return ActionResult.error(
        ErrorUtils.isAppError(error)
          ? ErrorUtils.formatForUser(error)
          : "Une erreur est survenue lors de la suppression"
      );
    }
  }
);

export const getUserStats = withPermissionSafe(
  "users:read:all",
  async (): Promise<ActionResult<UserStats>> => {
    const context = LogUtils.createUserActionContext("unknown", "get_user_stats", "admin");
    LogUtils.logOperationStart("get_user_stats", context);

    try {
      const supabase = createSupabaseAdminClient();

      // 1. Get all users from auth.users (paginated to handle large datasets)
      let allUsers: any[] = [];
      let page = 1;
      const perPage = 1000; // Maximum allowed by Supabase

      while (true) {
        const { data: authUsers, error: authUsersError } = await supabase.auth.admin.listUsers({
          page,
          perPage,
        });

        if (authUsersError) {
          throw ErrorUtils.fromSupabaseError(authUsersError);
        }

        if (!authUsers?.users || authUsers.users.length === 0) {
          break;
        }

        allUsers = allUsers.concat(authUsers.users);

        // If we got less than perPage, we're done
        if (authUsers.users.length < perPage) {
          break;
        }

        page++;
      }

      const users = allUsers;

      // 2. Get profile statistics
      const { data: profileStats, error: profileStatsError } = await supabase
        .from("profiles")
        .select("role, status, created_at, last_activity");

      if (profileStatsError) {
        throw ErrorUtils.fromSupabaseError(profileStatsError);
      }

      // Calculate date thresholds
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Calculate statistics
      const totalUsers = allUsers?.length || 0;
      const profiles = profileStats || [];

      const stats: UserStats = {
        total: totalUsers,
        active: profiles.filter((p) => p.status === "active" || !p.status).length,
        suspended: profiles.filter((p) => p.status === "suspended").length,
        admins: profiles.filter((p) => p.role === "admin").length,
        editors: profiles.filter((p) => p.role === "editor").length,
        users: profiles.filter((p) => p.role === "user" || !p.role).length,
        newThisWeek: profiles.filter((p) => new Date(p.created_at) > oneWeekAgo).length,
        activeToday: profiles.filter(
          (p) => p.last_activity && new Date(p.last_activity) > oneDayAgo
        ).length,
      };

      LogUtils.logOperationSuccess("get_user_stats", { ...context, stats });
      return ActionResult.ok(stats, "Statistiques utilisateur récupérées");
    } catch (error) {
      LogUtils.logOperationError("get_user_stats", error, context);
      return ActionResult.error(
        ErrorUtils.isAppError(error)
          ? ErrorUtils.formatForUser(error)
          : "Impossible de récupérer les statistiques"
      );
    }
  }
);
