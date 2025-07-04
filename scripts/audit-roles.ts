import dotenv from "dotenv";
import { auditRoleConsistency } from "../src/lib/admin/monitoring-service-jwt";

// Charge les variables d'environnement depuis le fichier .env
dotenv.config();

async function main() {
  console.log("--- Lancement de l'audit de cohérence des rôles JWT vs DB ---");
  try {
    const { consistent, inconsistent } = await auditRoleConsistency();

    console.log(`
✅ Utilisateurs cohérents: ${consistent.length}`);
    console.log(`⚠️  Incohérences détectées: ${inconsistent.length}`);

    if (inconsistent.length > 0) {
      console.log("\n--- Tableau des incohérences ---");
      console.table(
        inconsistent.map((u) => ({
          ID: u.id,
          Email: u.email,
          "Rôle JWT": u.role,
          "Rôle Profile": u.profile_role,
        }))
      );
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
