import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/supabase";

// Charge les variables d'environnement depuis .env.local
dotenv.config({ path: ".env.local" });

const ADMIN_USER_ID = "245eba22-0041-44d1-94ee-9ca71d3d561d";
const ADMIN_EMAIL = "inherbver@gmail.com";

async function fixAdminRole() {
  console.log("🔧 Correction du rôle admin pour l'utilisateur:", ADMIN_USER_ID);

  try {
    // Créer un client admin pour ce script
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 0. Vérifier la structure de la table profiles
    console.log("🔍 Vérification de la structure de la table profiles...");

    // Essayer de vérifier avec une requête simple
    const { data: sampleProfile, error: sampleError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", ADMIN_USER_ID)
      .single();

    if (sampleError && sampleError.code === "42703") {
      console.log("⚠️ Les colonnes role/permissions n'existent pas. Ajout des colonnes...");

      // Note: Cannot execute DDL statements via RPC in this context
      console.log("⚠️ DDL operations not available via RPC. Database schema needs manual update.");
      const alterError1 = new Error("DDL not supported via RPC");

      if (alterError1) {
        console.log("⚠️ Erreur lors de l'ajout des colonnes (tentative alternative)...");

        // Note: Cannot execute DDL statements via RPC in this context
        console.log("⚠️ Alternative DDL approach also not available via RPC.");
        const alterError2 = new Error("DDL not supported via RPC");

        if (alterError2) {
          console.error("❌ Impossible d'ajouter les colonnes automatiquement:", alterError2);
          console.log("💡 Veuillez exécuter manuellement la migration SQL:");
          console.log("   npx supabase db push");
          console.log(
            "   ou exécuter la migration: supabase/migrations/20250119120000_add_role_based_admin_system.sql"
          );
          return;
        }
      }

      console.log("✅ Colonnes ajoutées avec succès");
    }

    // 1. Vérifier l'état actuel du profil
    console.log("📋 Vérification de l'état actuel du profil...");
    const { data: currentProfile, error: fetchError } = await supabase
      .from("profiles")
      .select("id, role, permissions, created_at")
      .eq("id", ADMIN_USER_ID)
      .single();

    if (fetchError) {
      console.error("❌ Erreur lors de la récupération du profil:", fetchError);

      if (fetchError.code === "PGRST116") {
        console.log("⚠️ Profil non trouvé. Création du profil admin...");

        // Créer le profil s'il n'existe pas
        const { error: insertError } = await supabase.from("profiles").insert({
          id: ADMIN_USER_ID,
          role: "admin",
          permissions: ["*"],
        });

        if (insertError) {
          console.error("❌ Erreur lors de la création du profil:", insertError);
          return;
        }

        console.log("✅ Profil admin créé avec succès!");
        return;
      }
      return;
    }

    // Type guard to ensure currentProfile exists and has the expected properties
    if (!currentProfile || typeof currentProfile !== "object" || !("id" in currentProfile)) {
      console.error("❌ Profile data is invalid or missing");
      return;
    }

    console.log("📊 État actuel du profil:", {
      id: (currentProfile as any).id,
      role: (currentProfile as any).role,
      permissions: (currentProfile as any).permissions,
      created_at: (currentProfile as any).created_at,
    });

    // 2. Mettre à jour le rôle si nécessaire
    if ((currentProfile as any).role !== "admin") {
      console.log("🔄 Mise à jour du rôle vers 'admin'...");

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          role: "admin",
          permissions: ["*"],
          updated_at: new Date().toISOString(),
        })
        .eq("id", ADMIN_USER_ID);

      if (updateError) {
        console.error("❌ Erreur lors de la mise à jour:", updateError);
        return;
      }

      console.log("✅ Rôle admin assigné avec succès!");
    } else {
      console.log("✅ L'utilisateur a déjà le rôle admin");

      // Vérifier les permissions
      const hasWildcard =
        Array.isArray((currentProfile as any).permissions) &&
        (currentProfile as any).permissions.includes("*");

      if (!hasWildcard) {
        console.log("🔄 Ajout de la permission wildcard (*)...");

        const { error: permError } = await supabase
          .from("profiles")
          .update({
            permissions: ["*"],
            updated_at: new Date().toISOString(),
          })
          .eq("id", ADMIN_USER_ID);

        if (permError) {
          console.error("❌ Erreur lors de la mise à jour des permissions:", permError);
          return;
        }

        console.log("✅ Permissions mises à jour!");
      }
    }

    // 3. Vérification finale
    console.log("🔍 Vérification finale...");
    const { data: finalProfile } = await supabase
      .from("profiles")
      .select("role, permissions")
      .eq("id", ADMIN_USER_ID)
      .single();

    console.log("📊 Profil final:", finalProfile);

    console.log("🎉 Succès! Le profil admin a été configuré.");
    console.log(
      "💡 Vous pouvez maintenant vous déconnecter et vous reconnecter pour actualiser votre session."
    );
    console.log("🔗 Ou videz le cache du navigateur si le problème persiste.");
  } catch (error) {
    console.error("💥 Erreur inattendue:", error);
  }
}

fixAdminRole().catch((err) => {
  console.error("Erreur non gérée:", err);
  process.exit(1);
});
