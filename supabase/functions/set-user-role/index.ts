// supabase/functions/set-user-role/index.ts

import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors";

type AppRole = "user" | "dev" | "admin";

interface SetRolePayload {
  userId: string;
  role: AppRole;
  reason?: string; // Justification optionnelle
}

interface AuditLog {
  event_type: string;
  admin_id: string;
  target_user_id: string;
  old_role: string | null;
  new_role: string;
  reason?: string;
  ip_address?: string | null;
  user_agent?: string | null;
}

// Fonction utilitaire pour l'audit
async function logSecurityEvent(adminClient: SupabaseClient, event: AuditLog) {
  const { error } = await adminClient.from("audit_logs").insert({
    event_type: event.event_type,
    user_id: event.admin_id,
    data: {
      target_user_id: event.target_user_id,
      old_role: event.old_role,
      new_role: event.new_role,
      reason: event.reason,
      ip_address: event.ip_address,
      user_agent: event.user_agent,
      timestamp: new Date().toISOString(),
    },
  });

  if (error) {
    console.error("Erreur critique lors de l'enregistrement du journal d'audit:", error);
    // Propage l'erreur pour qu'elle soit capturée par le gestionnaire principal
    throw new Error(`Échec de l'enregistrement du journal d'audit: ${error.message}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let adminClient: SupabaseClient | null = null;

  try {
    adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const internalAuthHeader = req.headers.get("X-Internal-Authorization");
    const internalFunctionSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET");

    let caller: User | null = null;
    let isInternalCall = false;

    const { userId, role, reason, callerId }: SetRolePayload & { callerId?: string } = await req.json();

    if (internalAuthHeader && internalAuthHeader === internalFunctionSecret) {
      isInternalCall = true;
      if (!callerId) {
        return new Response(JSON.stringify({ error: "'callerId' est requis pour les appels internes" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const { data: callerData, error: callerError } = await adminClient.auth.admin.getUserById(callerId);
      if (callerError || !callerData.user) {
        return new Response(JSON.stringify({ error: "L'utilisateur appelant est invalide" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      caller = callerData.user;
    } else {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Token d'authentification requis" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Token invalide ou expiré" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      caller = user;
    }

    const callerRole = caller.app_metadata?.role;
    const authorizedAdminIds = (Deno.env.get("AUTHORIZED_ADMIN_IDS") || "").split(",");

    if (callerRole !== "admin" || !authorizedAdminIds.includes(caller.id)) {
      await logSecurityEvent(adminClient, {
        event_type: "unauthorized_role_assignment_attempt",
        admin_id: caller.id,
        target_user_id: userId || "N/A",
        old_role: null,
        new_role: role || "N/A",
        reason: `Tentative non autorisée par ${caller.email} (rôle: ${callerRole})`,
        ip_address: req.headers.get("CF-Connecting-IP") || req.headers.get("X-Forwarded-For"),
        user_agent: req.headers.get("User-Agent") || "",
      });
      return new Response(
        JSON.stringify({ error: "Accès refusé. Seul un administrateur autorisé peut assigner des rôles." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!userId || !role || !["user", "dev", "admin"].includes(role)) {
      return new Response(JSON.stringify({ error: "ID utilisateur et rôle valides sont requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: targetUser, error: targetError } =
      await adminClient.auth.admin.getUserById(userId);

    if (targetError || !targetUser.user) {
      return new Response(JSON.stringify({ error: "Utilisateur introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const oldRole = targetUser.user.app_metadata?.role || "user";

    if (oldRole === "admin" && role !== "admin") {
      const {
        data: { users },
        error: usersError,
      } = await adminClient.auth.admin.listUsers();
      if (usersError) throw usersError;
      const currentAdmins = users.filter((u: User) => u.app_metadata?.role === "admin");
      if (currentAdmins.length <= 1) {
        return new Response(
          JSON.stringify({ error: "Impossible de supprimer le dernier administrateur du système" }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    const { data: _updatedUser, error: updateUserError } =
      await adminClient.auth.admin.updateUserById(userId, {
        app_metadata: {
          ...targetUser.user.app_metadata,
          role: role,
          role_updated_at: new Date().toISOString(),
          role_updated_by: caller.id,
        },
      });

    if (updateUserError) throw updateUserError;

    await logSecurityEvent(adminClient, {
      event_type: "role_assignment_success",
      admin_id: caller.id,
      target_user_id: userId,
      old_role: oldRole,
      new_role: role,
      reason: reason || "Aucune justification fournie",
      ip_address: req.headers.get("CF-Connecting-IP") || req.headers.get("X-Forwarded-For"),
      user_agent: req.headers.get("User-Agent") || "",
    });

    // La synchronisation avec la table profiles est optionnelle mais recommandée pour la cohérence
    await adminClient.from("profiles").update({ role: role }).eq("id", userId);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Rôle de ${targetUser.user.email} mis à jour de '${oldRole}' vers '${role}'`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Erreur dans set-user-role:", error);
    const logPayload = {
      event_type: "role_assignment_failed",
      admin_id: "N/A", // L'ID de l'appelant peut ne pas être disponible ici
      target_user_id: "N/A",
      old_role: null,
      new_role: "N/A",
      reason: `Erreur inattendue: ${error instanceof Error ? error.message : String(error)}`,
      ip_address: req.headers.get("CF-Connecting-IP") || req.headers.get("X-Forwarded-For"),
      user_agent: req.headers.get("User-Agent") || "",
    };
    if (adminClient) {
      // Tenter de logger l'erreur système
      await logSecurityEvent(adminClient, logPayload);
    }
    return new Response(JSON.stringify({ error: "Erreur interne du serveur" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
