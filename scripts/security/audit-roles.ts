import dotenv from "dotenv";
import { checkForUnauthorizedAdmins } from "../src/lib/admin/monitoring-service";

// Charge les variables d'environnement depuis le fichier .env
dotenv.config();

async function main() {
  console.log("--- Lancement de l'audit des rôles administrateurs ---");
  try {
    const unauthorizedAdmins = await checkForUnauthorizedAdmins();

    if (unauthorizedAdmins.length === 0) {
      console.log("✅ Aucun administrateur non autorisé détecté.");
    } else {
      console.log(`⚠️  ${unauthorizedAdmins.length} administrateur(s) non autorisé(s) détecté(s):`);
      console.log("\n--- Tableau des administrateurs non autorisés ---");
      console.table(
        unauthorizedAdmins.map((admin) => ({
          ID: admin.id,
          Email: admin.email,
          Rôle: admin.role,
          "Créé le": new Date(admin.created_at).toLocaleDateString("fr-FR"),
          "Dernière connexion": admin.last_sign_in_at
            ? new Date(admin.last_sign_in_at).toLocaleDateString("fr-FR")
            : "Jamais",
        }))
      );

      console.log("\n⚠️  Actions recommandées:");
      console.log("1. Vérifiez l'origine de ces comptes administrateurs");
      console.log("2. Révoquez les accès non autorisés via l'interface Supabase");
      console.log("3. Examinez les logs d'audit pour détecter d'éventuelles activités suspectes");
    }
  } catch (error) {
    console.error("\n❌ Erreur critique pendant l'audit:", error);
    process.exit(1);
  }
  console.log("\n--- Audit terminé ---");
}

main().catch((err) => {
  console.error("Erreur non gérée dans l'exécution du script:", err);
  process.exit(1);
});
