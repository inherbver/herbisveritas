"use server";

import { withPermissionSafe } from "@/lib/auth/server-actions-auth";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

interface SetUserRoleParams {
  userId: string;
  newRole: "user" | "dev" | "admin";
  reason: string;
}

export const setUserRole = withPermissionSafe(
  "users:update:role",
  async ({ userId, newRole, reason }: SetUserRoleParams): Promise<{ error: string | null }> => {
    try {
      const supabaseServer = await createSupabaseServerClient();
      const { data: { user: caller } } = await supabaseServer.auth.getUser();

      if (!caller) {
        throw new Error("Utilisateur non authentifié.");
      }

      const internalFunctionSecret = process.env.INTERNAL_FUNCTION_SECRET;
      if (!internalFunctionSecret) {
        console.error("INTERNAL_FUNCTION_SECRET n'est pas défini.");
        throw new Error("Configuration serveur incorrecte.");
      }

      const supabaseAdmin = createSupabaseAdminClient();
      const { error } = await supabaseAdmin.functions.invoke("set-user-role", {
        body: { userId, role: newRole, reason, callerId: caller.id },
        headers: {
          "X-Internal-Authorization": internalFunctionSecret,
        },
      });

      if (error) {
        console.error("Error invoking set-user-role function:", error);
        throw new Error(error.message || "Une erreur est survenue lors de l'appel à la fonction Edge.");
      }

      return { error: null };
    } catch (err) {
      const error = err as Error;
      console.error("Unexpected error in setUserRole:", error.message);
      return { error: "Une erreur inattendue est survenue." };
    }
  },
);
