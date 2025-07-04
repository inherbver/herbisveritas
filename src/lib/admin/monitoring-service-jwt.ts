import { createSupabaseAdminClient } from "../supabase/admin";
import { ADMIN_CONFIG, isAuthorizedAdmin } from "../../config/admin";
import { getUserRoleFromJWT, AppRole } from "../auth/role-helpers";
// Stubs for logging and email, to be implemented
const logSecurityEvent = async (event: Record<string, unknown>) =>
  console.log("SECURITY_EVENT:", event);
const sendAdminAlert = async (admins: AdminUser[]) => console.warn("ADMIN_ALERT:", admins);
const sendCriticalErrorAlert = async (error: unknown) =>
  console.error("CRITICAL_ERROR_ALERT:", error);

export interface AdminUser {
  id: string;
  email: string;
  role: AppRole;
  created_at: string;
  last_sign_in_at: string | null;
  is_authorized: boolean;
  source: "jwt" | "profile_fallback";
}

/**
 * Fonction principale : vérifier les admins non autorisés
 * Version JWT-FIRST avec fallback intelligent
 */
export async function checkForUnauthorizedAdmins(): Promise<AdminUser[]> {
  const supabase = createSupabaseAdminClient();

  try {
    if (!ADMIN_CONFIG.ADMIN_PRINCIPAL_ID) {
      throw new Error("Configuration admin manquante - ADMIN_PRINCIPAL_ID requis");
    }

    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error("Erreur récupération utilisateurs:", usersError);
      throw usersError;
    }

    const adminUsers: AdminUser[] = [];

    for (const user of users.users) {
      const jwtRole = getUserRoleFromJWT(user);

      if (!["admin", "dev"].includes(jwtRole)) {
        continue;
      }

      adminUsers.push({
        id: user.id,
        email: user.email ?? "email_inconnu",
        role: jwtRole,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at ?? null,
        is_authorized: isAuthorizedAdmin(user.id),
        source: "jwt",
      });
    }

    const unauthorizedAdmins = adminUsers.filter((admin) => !admin.is_authorized);

    for (const admin of unauthorizedAdmins) {
      await logSecurityEvent({
        type: "unauthorized_admin",
        userId: admin.id,
        details: { adminEmail: admin.email, role: admin.role },
      });
    }

    if (unauthorizedAdmins.length > 0) {
      await sendAdminAlert(unauthorizedAdmins);
    }

    return unauthorizedAdmins;
  } catch (error) {
    console.error("Erreur critique lors de la vérification JWT des administrateurs:", error);
    await sendCriticalErrorAlert(error);
    throw error;
  }
}

/**
 * Fonction de comparaison : vérifier la cohérence JWT vs DB
 */
export async function auditRoleConsistency(): Promise<{
  consistent: AdminUser[];
  inconsistent: Array<AdminUser & { profile_role: string }>;
}> {
  console.log("[audit] Début de la fonction auditRoleConsistency.");
  console.log("[audit] Création du client Supabase admin...");
  const supabase = createSupabaseAdminClient();
  console.log("[audit] Client créé.");

  try {
    console.log("[audit] Appel à supabase.auth.admin.listUsers()...");
    const { data: users, error: listUsersError } = await supabase.auth.admin.listUsers();
    console.log("[audit] Appel terminé.");

    if (listUsersError) {
      console.error(
        "[audit] Erreur lors de la récupération des utilisateurs:",
        listUsersError.message
      );
      throw listUsersError;
    }

    if (!users) {
      console.warn("[audit] Aucun utilisateur retourné par l'API.");
      return { consistent: [], inconsistent: [] };
    }

    console.log(`[audit] ${users.users.length} utilisateurs à traiter.`);

    const consistent: AdminUser[] = [];
    const inconsistent: Array<AdminUser & { profile_role: string }> = [];

    for (const user of users.users) {
      const jwtRole = getUserRoleFromJWT(user);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const profileRole = (profile?.role as AppRole) || "user";

      const adminUser: AdminUser = {
        id: user.id,
        email: user.email ?? "email_inconnu",
        role: jwtRole,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at ?? null,
        is_authorized: isAuthorizedAdmin(user.id),
        source: "jwt",
      };

      if (jwtRole === profileRole) {
        consistent.push(adminUser);
      } else {
        inconsistent.push({
          ...adminUser,
          profile_role: profileRole,
        });
      }
    }

    if (inconsistent.length > 0) {
      console.warn(`🔍 Incohérences JWT/DB détectées:`, inconsistent);
      await logSecurityEvent({
        type: "role_inconsistency",
        details: {
          count: inconsistent.length,
          users: inconsistent.map((u) => ({
            id: u.id,
            jwt_role: u.role,
            profile_role: u.profile_role,
          })),
        },
      });
    }

    console.log("[audit] Fin de la fonction auditRoleConsistency.");
    return { consistent, inconsistent };
  } catch (error) {
    console.error("[audit] Erreur critique dans auditRoleConsistency:", error);
    throw error;
  }
}

/**
 * Fonction de migration : synchroniser les rôles DB avec JWT
 */
export async function syncRolesFromJWTToDB(): Promise<{
  updated: number;
  errors: Array<{ user_id: string; error: string }>;
}> {
  const supabase = createSupabaseAdminClient();
  let updated = 0;
  const errors: Array<{ user_id: string; error: string }> = [];

  try {
    const { data: users, error: listUsersError } = await supabase.auth.admin.listUsers();
    if (listUsersError) throw listUsersError;

    for (const user of users.users) {
      try {
        const jwtRole = getUserRoleFromJWT(user);

        const { error } = await supabase
          .from("profiles")
          .update({ role: jwtRole })
          .eq("id", user.id);

        if (error) {
          errors.push({ user_id: user.id, error: error.message });
        } else {
          updated++;
        }
      } catch (error) {
        errors.push({
          user_id: user.id,
          error: error instanceof Error ? error.message : "Erreur inconnue",
        });
      }
    }

    console.log(
      `✅ Synchronisation terminée: ${updated} utilisateurs mis à jour, ${errors.length} erreurs`
    );

    return { updated, errors };
  } catch (error) {
    console.error("Erreur lors de la synchronisation JWT → DB:", error);
    throw error;
  }
}
