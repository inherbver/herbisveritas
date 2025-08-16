"use server";

import { withPermissionSafe } from "@/lib/auth/server-actions-auth";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

// New imports for Clean Architecture
import { ActionResult } from "@/lib/core/result";
import { LogUtils } from "@/lib/core/logger";
import { 
  AuthenticationError,
  ErrorUtils 
} from "@/lib/core/errors";

// SÉCURITÉ: Rate limiting pour actions d'administration
import { withRateLimit } from "@/lib/security/rate-limit-decorator";

interface SetUserRoleParams {
  userId: string;
  newRole: "user" | "dev" | "admin";
  reason: string;
}

export const setUserRole = withRateLimit(
  'ADMIN',
  'set-user-role'
)(withPermissionSafe(
  "users:update:role",
  async ({ userId, newRole, reason }: SetUserRoleParams): Promise<ActionResult<null>> => {
    const context = LogUtils.createUserActionContext('unknown', 'set_user_role', 'admin', { 
      targetUserId: userId, 
      newRole 
    });
    LogUtils.logOperationStart('set_user_role', context);

    try {
      const supabaseServer = await createSupabaseServerClient();
      const {
        data: { user: caller },
      } = await supabaseServer.auth.getUser();

      if (!caller) {
        throw new AuthenticationError("Utilisateur non authentifié.");
      }
      context.userId = caller.id;

      const internalFunctionSecret = process.env.INTERNAL_FUNCTION_SECRET;
      if (!internalFunctionSecret) {
        throw new Error("Configuration serveur incorrecte: INTERNAL_FUNCTION_SECRET non défini.");
      }

      const supabaseAdmin = createSupabaseAdminClient();
      const { error } = await supabaseAdmin.functions.invoke("set-user-role", {
        body: { userId, role: newRole, reason, callerId: caller.id },
        headers: {
          "X-Internal-Authorization": internalFunctionSecret,
        },
      });

      if (error) {
        throw new Error(
          error.message || "Une erreur est survenue lors de l'appel à la fonction Edge."
        );
      }

      LogUtils.logOperationSuccess('set_user_role', { 
        ...context, 
        reason: reason.substring(0, 50) // Limiter pour les logs 
      });
      return ActionResult.ok(null, `Rôle utilisateur mis à jour vers ${newRole}`);
    } catch (error) {
      LogUtils.logOperationError('set_user_role', error, context);
      return ActionResult.error(
        ErrorUtils.isAppError(error) ? ErrorUtils.formatForUser(error) : 'Une erreur inattendue est survenue'
      );
    }
  }
));
