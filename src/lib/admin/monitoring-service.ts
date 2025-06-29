// src/lib/admin/monitoring-service.ts - Version corrigée
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ADMIN_CONFIG, isAuthorizedAdmin } from "@/config/admin";
import { sendEmail } from "@/lib/email";

// Type pour le retour de la requête Supabase (après migration FK)
type AdminProfileWithUser = {
  id: string;
  role: string;
  user: {
    email: string;
    created_at: string;
    last_sign_in_at: string | null;
  } | null;
};

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  created_at: string;
  last_sign_in_at: string | null;
  is_authorized: boolean;
}

export interface SecurityEvent {
  type: "unauthorized_admin" | "unauthorized_access" | "privilege_escalation";
  userId: string;
  details: Record<string, unknown> & { adminEmail: string };
}

export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  const supabase = await createSupabaseServerClient();

  try {
    const { error } = await supabase.from("audit_logs").insert({
      event_type: event.type,
      user_id: event.userId,
      data: event.details,
    });

    if (error) {
      console.error("Erreur lors du logging de sécurité:", error);
      // Ne pas faire échouer le processus principal pour un problème de log
    }
  } catch (error) {
    console.error("Erreur critique lors du logging:", error);
  }
}

export async function checkForUnauthorizedAdmins(): Promise<AdminUser[]> {
  const supabase = await createSupabaseServerClient();

  try {
    // Vérifier la configuration
    if (!ADMIN_CONFIG.ADMIN_PRINCIPAL_ID) {
      throw new Error("Configuration admin manquante - ADMIN_PRINCIPAL_ID requis");
    }

    // Option 1: Requête avec jointure (après migration FK)
    const { data, error } = await supabase
      .from("profiles")
      .select(
        `
        id,
        role,
        user:users (
          email,
          created_at,
          last_sign_in_at
        )
      `
      )
      .in("role", ["admin", "dev"]);

    if (error) {
      console.error("Erreur lors de la récupération des administrateurs:", error);

      // Fallback: requêtes séparées si la jointure échoue encore
      return await checkAdminsWithSeparateQueries();
    }

    const admins = data as unknown as AdminProfileWithUser[];

    if (!admins || admins.length === 0) {
      return [];
    }

    // Filtrer et mapper les données
    const adminUsers: AdminUser[] = admins
      .filter(
        (
          admin
        ): admin is AdminProfileWithUser & {
          user: NonNullable<AdminProfileWithUser["user"]>;
        } => {
          if (!admin.user?.email) {
            console.warn(`Profil admin avec données utilisateur manquantes: ${admin.id}`);
            return false;
          }
          return true;
        }
      )
      .map((admin) => ({
        id: admin.id,
        email: admin.user.email,
        role: admin.role,
        created_at: admin.user.created_at,
        last_sign_in_at: admin.user.last_sign_in_at,
        is_authorized: isAuthorizedAdmin(admin.id),
      }));

    // Identifier les admins non autorisés
    const unauthorizedAdmins = adminUsers.filter((admin) => !admin.is_authorized);

    // Logger les événements de sécurité
    for (const admin of unauthorizedAdmins) {
      await logSecurityEvent({
        type: "unauthorized_admin",
        userId: admin.id,
        details: {
          adminEmail: admin.email,
          role: admin.role,
          created_at: admin.created_at,
          last_sign_in_at: admin.last_sign_in_at,
          detection_method: "automated_scan",
        },
      });
    }

    // Envoyer une alerte si nécessaire
    if (unauthorizedAdmins.length > 0) {
      await sendAdminAlert(unauthorizedAdmins);
    }

    return unauthorizedAdmins;
  } catch (error) {
    console.error("Erreur critique lors de la vérification des administrateurs:", error);

    // Alerte critique par email
    await sendCriticalErrorAlert(error);

    throw error;
  }
}

// Méthode de fallback avec requêtes séparées
async function checkAdminsWithSeparateQueries(): Promise<AdminUser[]> {
  const supabase = await createSupabaseServerClient();

  console.log("🔄 Utilisation du fallback avec requêtes séparées");

  // 1. Récupérer les profils admin
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .in("role", ["admin", "dev"]);

  if (profileError) {
    throw new Error(`Erreur profils: ${profileError.message}`);
  }

  if (!profiles || profiles.length === 0) {
    return [];
  }

  // 2. Récupérer les données utilisateur pour chaque profil
  const adminUsers: AdminUser[] = [];

  for (const profile of profiles) {
    try {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("email, created_at, last_sign_in_at")
        .eq("id", profile.id)
        .single();

      if (userError || !userData?.email) {
        console.warn(`Données utilisateur manquantes pour le profil: ${profile.id}`);
        continue;
      }

      adminUsers.push({
        id: profile.id,
        email: userData.email,
        role: profile.role,
        created_at: userData.created_at,
        last_sign_in_at: userData.last_sign_in_at,
        is_authorized: isAuthorizedAdmin(profile.id),
      });
    } catch (error) {
      console.error(`Erreur pour le profil ${profile.id}:`, error);
    }
  }

  // Filtrer les non autorisés
  const unauthorizedAdmins = adminUsers.filter((admin) => !admin.is_authorized);

  // Logger et alerter si nécessaire
  for (const admin of unauthorizedAdmins) {
    await logSecurityEvent({
      type: "unauthorized_admin",
      userId: admin.id,
      details: {
        adminEmail: admin.email,
        role: admin.role,
        created_at: admin.created_at,
        last_sign_in_at: admin.last_sign_in_at,
        detection_method: "fallback_separate_queries",
      },
    });
  }

  if (unauthorizedAdmins.length > 0) {
    await sendAdminAlert(unauthorizedAdmins);
  }

  return unauthorizedAdmins;
}

async function sendAdminAlert(unauthorizedAdmins: AdminUser[]): Promise<void> {
  const { ADMIN_EMAIL } = ADMIN_CONFIG;

  if (!ADMIN_EMAIL) {
    console.error("ADMIN_EMAIL non configuré - impossible d'envoyer l'alerte");
    return;
  }

  const subject = `🚨 ALERTE SÉCURITÉ CRITIQUE : ${unauthorizedAdmins.length} administrateur(s) non autorisé(s)`;

  const adminList = unauthorizedAdmins
    .map(
      (admin) => `
    <tr style="border-bottom: 1px solid #ddd;">
      <td style="padding: 8px;"><strong>${admin.email}</strong></td>
      <td style="padding: 8px;"><code style="background: #f1f5f9; padding: 2px 4px; border-radius: 3px;">${admin.id}</code></td>
      <td style="padding: 8px;">
        <span style="background: #fef2f2; color: #dc2626; padding: 2px 6px; border-radius: 3px; font-size: 12px;">
          ${admin.role.toUpperCase()}
        </span>
      </td>
      <td style="padding: 8px;">${new Date(admin.created_at).toLocaleString("fr-FR")}</td>
      <td style="padding: 8px;">${admin.last_sign_in_at ? new Date(admin.last_sign_in_at).toLocaleString("fr-FR") : "❌ Jamais"}</td>
    </tr>
  `
    )
    .join("");

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 700px; margin: 0 auto;">
      <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">🚨 ALERTE SÉCURITÉ CRITIQUE</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Détection automatique d'administrateurs non autorisés</p>
      </div>
      
      <div style="background: #fefefe; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="font-size: 16px; margin: 0 0 20px 0;">
          <strong style="color: #dc2626;">${unauthorizedAdmins.length}</strong> compte(s) administrateur(s) non autorisé(s) détecté(s) dans le système :
        </p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
          <thead>
            <tr style="background: #f8fafc;">
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Email</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">ID Utilisateur</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Rôle</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Créé le</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Dernière connexion</th>
            </tr>
          </thead>
          <tbody>
            ${adminList}
          </tbody>
        </table>
      </div>
      
      <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 20px; margin: 20px 0; border-radius: 6px;">
        <h3 style="color: #dc2626; margin: 0 0 15px 0; font-size: 18px;">⚡ Actions Immédiates Requises</h3>
        <ol style="margin: 0; padding-left: 20px; color: #7f1d1d;">
          <li style="margin-bottom: 8px;"><strong>Vérifiez immédiatement</strong> l'origine de ces comptes</li>
          <li style="margin-bottom: 8px;"><strong>Révoquez l'accès admin</strong> via l'interface Supabase si non autorisé</li>
          <li style="margin-bottom: 8px;"><strong>Changez le mot de passe</strong> de l'admin principal par précaution</li>
          <li style="margin-bottom: 8px;"><strong>Examinez les logs</strong> d'activité récente dans la table audit_logs</li>
          <li><strong>Vérifiez les accès récents</strong> aux pages d'administration</li>
        </ol>
      </div>
      
      <div style="background: #f8fafc; padding: 15px; border-radius: 6px; color: #6b7280; font-size: 14px;">
        <p style="margin: 0;"><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p style="margin: 5px 0 0 0;"><strong>Système:</strong> Surveillance automatique de sécurité administrative</p>
      </div>
    </div>
  `;

  try {
    await sendEmail({
      to: ADMIN_EMAIL,
      subject,
      html,
    });
    console.log("✅ Alerte critique envoyée avec succès à:", ADMIN_EMAIL);
  } catch (error) {
    console.error("❌ ERREUR CRITIQUE: Impossible d'envoyer l'alerte admin:", error);
  }
}

async function sendCriticalErrorAlert(error: unknown): Promise<void> {
  const { ADMIN_EMAIL } = ADMIN_CONFIG;

  if (!ADMIN_EMAIL) return;

  const errorMessage = error instanceof Error ? error.message : String(error);

  try {
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: "🚨 PANNE SYSTÈME - Surveillance Administrateur",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2 style="color: #dc2626;">🚨 PANNE DU SYSTÈME DE SURVEILLANCE</h2>
          <p><strong>Le système de surveillance des administrateurs a rencontré une erreur critique :</strong></p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <code style="color: #dc2626;">${errorMessage}</code>
          </div>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Action requise:</strong> Vérifiez immédiatement la configuration et les logs du système.</p>
        </div>
      `,
    });
  } catch (emailError) {
    console.error("Impossible d'envoyer l'alerte de panne:", emailError);
  }
}
