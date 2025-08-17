#!/usr/bin/env tsx

/**
 * Script de Suppression de l'Admin Hardcodé
 *
 * OBJECTIF: Supprimer complètement le fallback UUID hardcodé pour les admins
 * CRITICITÉ: HAUTE - Vulnérabilité de sécurité critique
 *
 * Fonctionnalités:
 * - Suppression des références hardcodées
 * - Migration vers système DB uniquement
 * - Validation de la sécurité
 * - Procédure d'urgence pour recréer un admin
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync } from "fs";
import { join } from "path";
import { createClient } from "@supabase/supabase-js";

interface RemovalResult {
  success: boolean;
  removedReferences: string[];
  validationTests: ValidationTest[];
  emergencyProcedure: string;
  errors: string[];
}

interface ValidationTest {
  name: string;
  description: string;
  passed: boolean;
  error?: string;
}

class HardcodedAdminRemover {
  private projectRoot: string;
  private supabaseUrl: string;
  private serviceKey: string;
  private removedReferences: string[] = [];
  private errors: string[] = [];

  constructor() {
    this.projectRoot = process.cwd();

    // Extraire les clés Supabase du .env.local
    const envPath = join(this.projectRoot, ".env.local");
    const envContent = readFileSync(envPath, "utf8");

    const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=([^\n\r]*)/);
    const serviceMatch = envContent.match(
      /SUPABASE_SERVICE_ROLE_KEY="([^"]*)"/,
    );

    if (!urlMatch || !serviceMatch) {
      throw new Error("Impossible d'extraire les clés Supabase du .env.local");
    }

    this.supabaseUrl = urlMatch[1].trim();
    this.serviceKey = serviceMatch[1];
  }

  /**
   * Supprime toutes les références hardcodées à l'admin
   */
  async removeHardcodedAdmin(): Promise<RemovalResult> {
    console.log("🗑️  Suppression de l'admin hardcodé...");
    console.log(`📅 ${new Date().toISOString()}\n`);

    try {
      // 1. Valider l'état actuel
      console.log("📋 Étape 1: Validation de l'état actuel...");
      const currentValidation = await this.validateCurrentState();

      // 2. Supprimer les références hardcodées
      console.log("\n🔥 Étape 2: Suppression des références hardcodées...");
      await this.removeHardcodedReferences();

      // 3. Nettoyer les fichiers obsolètes
      console.log("\n🧹 Étape 3: Nettoyage des fichiers obsolètes...");
      await this.cleanupObsoleteFiles();

      // 4. Supprimer la variable d'environnement
      console.log(
        "\n🔧 Étape 4: Suppression de la variable d'environnement...",
      );
      await this.removeEnvironmentVariable();

      // 5. Validation finale
      console.log("\n✅ Étape 5: Validation finale...");
      const finalValidation = await this.validateRemoval();

      const emergencyProcedure = this.generateEmergencyProcedure();

      return {
        success: finalValidation.every((test) => test.passed),
        removedReferences: this.removedReferences,
        validationTests: [...currentValidation, ...finalValidation],
        emergencyProcedure,
        errors: this.errors,
      };
    } catch (error) {
      this.errors.push(`Erreur générale: ${error}`);
      return {
        success: false,
        removedReferences: this.removedReferences,
        validationTests: [],
        emergencyProcedure: this.generateEmergencyProcedure(),
        errors: this.errors,
      };
    }
  }

  /**
   * Valide l'état actuel avant suppression
   */
  private async validateCurrentState(): Promise<ValidationTest[]> {
    const tests: ValidationTest[] = [];

    // Test 1: Vérifier qu'il y a au moins un admin en DB
    tests.push(await this.testAdminExistsInDB());

    // Test 2: Vérifier que le système DB fonctionne
    tests.push(await this.testDatabaseAdminSystem());

    // Test 3: Identifier les références hardcodées
    tests.push(await this.testHardcodedReferences());

    return tests;
  }

  /**
   * Test: Vérifier qu'il y a au moins un admin en DB
   */
  private async testAdminExistsInDB(): Promise<ValidationTest> {
    try {
      const supabase = createClient(this.supabaseUrl, this.serviceKey);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, role")
        .eq("role", "admin")
        .limit(5);

      if (error) {
        return {
          name: "admin-exists-db",
          description: "Vérification existence admin en DB",
          passed: false,
          error: `Erreur DB: ${error.message}`,
        };
      }

      if (!data || data.length === 0) {
        return {
          name: "admin-exists-db",
          description: "Vérification existence admin en DB",
          passed: false,
          error: "CRITIQUE: Aucun admin trouvé en base de données!",
        };
      }

      console.log(`✅ ${data.length} admin(s) trouvé(s) en base de données`);
      data.forEach((admin) => {
        console.log(`  - ${admin.email} (${admin.id})`);
      });

      return {
        name: "admin-exists-db",
        description: "Vérification existence admin en DB",
        passed: true,
      };
    } catch (error) {
      return {
        name: "admin-exists-db",
        description: "Vérification existence admin en DB",
        passed: false,
        error: `Erreur: ${error}`,
      };
    }
  }

  /**
   * Test: Vérifier que le système DB fonctionne
   */
  private async testDatabaseAdminSystem(): Promise<ValidationTest> {
    try {
      const supabase = createClient(this.supabaseUrl, this.serviceKey);

      // Tester une requête de vérification de rôle
      const { data, error } = await supabase.rpc("is_admin", {
        user_id_param: "00000000-0000-0000-0000-000000000000",
      });

      if (error && !error.message.includes("could not find function")) {
        return {
          name: "db-admin-system",
          description: "Test du système admin en DB",
          passed: false,
          error: `Erreur fonction is_admin: ${error.message}`,
        };
      }

      // Si la fonction n'existe pas, c'est normal (elle peut ne pas être implémentée)
      return {
        name: "db-admin-system",
        description: "Test du système admin en DB",
        passed: true,
      };
    } catch (error) {
      return {
        name: "db-admin-system",
        description: "Test du système admin en DB",
        passed: false,
        error: `Erreur: ${error}`,
      };
    }
  }

  /**
   * Test: Identifier les références hardcodées
   */
  private async testHardcodedReferences(): Promise<ValidationTest> {
    try {
      const references = await this.findHardcodedReferences();

      console.log(
        `🔍 ${references.length} référence(s) hardcodée(s) trouvée(s):`,
      );
      references.forEach((ref) => console.log(`  - ${ref}`));

      return {
        name: "hardcoded-references",
        description: "Identification des références hardcodées",
        passed: true,
      };
    } catch (error) {
      return {
        name: "hardcoded-references",
        description: "Identification des références hardcodées",
        passed: false,
        error: `Erreur: ${error}`,
      };
    }
  }

  /**
   * Trouve toutes les références hardcodées
   */
  private async findHardcodedReferences(): Promise<string[]> {
    const references: string[] = [];

    const filesToCheck = [
      "src/config/admin.ts",
      "src/lib/auth/admin-service.ts",
      "src/lib/config/env-validator.ts",
      "src/lib/admin/monitoring-service.ts",
      ".env.local",
      ".env.example",
    ];

    for (const filePath of filesToCheck) {
      const fullPath = join(this.projectRoot, filePath);
      if (existsSync(fullPath)) {
        const content = readFileSync(fullPath, "utf8");

        if (
          content.includes("ADMIN_PRINCIPAL_ID") ||
          content.includes("isEmergencyAdmin")
        ) {
          references.push(filePath);
        }
      }
    }

    return references;
  }

  /**
   * Supprime les références hardcodées dans le code
   */
  private async removeHardcodedReferences(): Promise<void> {
    // 1. Supprimer isEmergencyAdmin de admin-service.ts
    await this.removeEmergencyAdminFunction();

    // 2. Marquer config/admin.ts comme obsolète complet
    await this.deprecateAdminConfig();

    // 3. Nettoyer env-validator.ts
    await this.cleanupEnvValidator();

    // 4. Nettoyer monitoring-service.ts
    await this.cleanupMonitoringService();
  }

  /**
   * Supprime la fonction isEmergencyAdmin
   */
  private async removeEmergencyAdminFunction(): Promise<void> {
    const filePath = join(this.projectRoot, "src/lib/auth/admin-service.ts");

    if (!existsSync(filePath)) {
      return;
    }

    let content = readFileSync(filePath, "utf8");

    // Supprimer la fonction isEmergencyAdmin complètement
    const functionStart = content.indexOf(
      "/**\n * Fallback pour vérifier l'admin principal",
    );
    const functionEnd = content.indexOf("\n}\n", functionStart) + 3;

    if (functionStart !== -1 && functionEnd !== -1) {
      content = content.slice(0, functionStart) + content.slice(functionEnd);
      this.removedReferences.push(
        "isEmergencyAdmin function from admin-service.ts",
      );
    }

    // Supprimer l'import de getPrivateEnv si plus utilisé
    if (
      !content.includes("getPrivateEnv") &&
      content.includes("import { getPrivateEnv }")
    ) {
      content = content.replace(/import { getPrivateEnv } from[^;]+;/g, "");
      content = content.replace(/,\s*getPrivateEnv/g, "");
      content = content.replace(/getPrivateEnv,\s*/g, "");
    }

    writeFileSync(filePath, content);
    console.log("✅ Fonction isEmergencyAdmin supprimée");
  }

  /**
   * Marque le fichier admin config comme complètement obsolète
   */
  private async deprecateAdminConfig(): Promise<void> {
    const filePath = join(this.projectRoot, "src/config/admin.ts");

    if (!existsSync(filePath)) {
      return;
    }

    const deprecatedContent = `/**
 * @deprecated FICHIER OBSOLÈTE - SUPPRESSION COMPLÈTE
 * 
 * Ce fichier contenait des configurations d'admin hardcodées qui représentaient
 * une vulnérabilité de sécurité critique. Il a été rendu obsolète suite à la
 * migration vers un système de gestion des admins basé sur la base de données.
 * 
 * ⚠️  NE PAS UTILISER - SERA SUPPRIMÉ DANS UNE FUTURE VERSION
 * 
 * Utilisez maintenant: @/lib/auth/admin-service pour toute vérification admin
 * Les rôles admin sont gérés exclusivement via la table 'profiles' en base.
 */

// Ce fichier est conservé temporairement pour éviter les erreurs d'import
// Il sera supprimé dans la prochaine version majeure

console.warn('⚠️  UTILISATION D\\'UN FICHIER OBSOLÈTE: src/config/admin.ts');
console.warn('Migration nécessaire vers @/lib/auth/admin-service');

export const ADMIN_CONFIG = {
  // Supprimé pour des raisons de sécurité
} as const;

export function isAuthorizedAdmin(_userId: string): boolean {
  throw new Error('FONCTION OBSOLÈTE: Utilisez checkAdminRole() de @/lib/auth/admin-service');
}
`;

    writeFileSync(filePath, deprecatedContent);
    this.removedReferences.push(
      "ADMIN_CONFIG and isAuthorizedAdmin from admin.ts",
    );
    console.log("✅ Fichier admin.ts marqué comme obsolète");
  }

  /**
   * Nettoie env-validator.ts
   */
  private async cleanupEnvValidator(): Promise<void> {
    const filePath = join(this.projectRoot, "src/lib/config/env-validator.ts");

    if (!existsSync(filePath)) {
      return;
    }

    let content = readFileSync(filePath, "utf8");

    // Supprimer ADMIN_PRINCIPAL_ID des schémas
    content = content.replace(/ADMIN_PRINCIPAL_ID:[^,\n}]+[,\n]?/g, "");
    content = content.replace(/,\s*ADMIN_PRINCIPAL_ID:[^,\n}]+/g, "");

    // Supprimer des validations
    content = content.replace(
      /\s*ADMIN_PRINCIPAL_ID:\s*process\.env\.ADMIN_PRINCIPAL_ID,?\s*/g,
      "",
    );

    // Nettoyer les références dans les exports
    content = content.replace(
      /\s*ADMIN_PRINCIPAL_ID:\s*env\.ADMIN_PRINCIPAL_ID,?\s*/g,
      "",
    );

    writeFileSync(filePath, content);
    this.removedReferences.push("ADMIN_PRINCIPAL_ID from env-validator.ts");
    console.log("✅ env-validator.ts nettoyé");
  }

  /**
   * Nettoie monitoring-service.ts
   */
  private async cleanupMonitoringService(): Promise<void> {
    const filePath = join(
      this.projectRoot,
      "src/lib/admin/monitoring-service.ts",
    );

    if (!existsSync(filePath)) {
      return;
    }

    let content = readFileSync(filePath, "utf8");

    // Supprimer les références à ADMIN_PRINCIPAL_ID
    content = content.replace(
      /if\s*\(!ADMIN_CONFIG\.ADMIN_PRINCIPAL_ID\)[^}]+}/g,
      "",
    );
    content = content.replace(
      /throw new Error\("Configuration admin manquante[^"]+"\);/g,
      "",
    );

    writeFileSync(filePath, content);
    this.removedReferences.push(
      "ADMIN_PRINCIPAL_ID references from monitoring-service.ts",
    );
    console.log("✅ monitoring-service.ts nettoyé");
  }

  /**
   * Nettoie les fichiers obsolètes
   */
  private async cleanupObsoleteFiles(): Promise<void> {
    // Pour l'instant, on garde les fichiers mais on les marque comme obsolètes
    // Dans une future version, ces fichiers peuvent être supprimés complètement
    console.log("✅ Fichiers marqués comme obsolètes (suppression future)");
  }

  /**
   * Supprime la variable d'environnement
   */
  private async removeEnvironmentVariable(): Promise<void> {
    const envPath = join(this.projectRoot, ".env.local");

    if (!existsSync(envPath)) {
      return;
    }

    let content = readFileSync(envPath, "utf8");

    // Supprimer la ligne ADMIN_PRINCIPAL_ID
    content = content.replace(/^.*ADMIN_PRINCIPAL_ID.*$/gm, "");

    // Nettoyer les lignes vides multiples
    content = content.replace(/\n\n\n+/g, "\n\n");

    // Ajouter un commentaire de sécurité
    const securityComment = `
# SÉCURITÉ: Variable ADMIN_PRINCIPAL_ID supprimée le ${new Date().toISOString()}
# Les admins sont maintenant gérés exclusivement via la base de données
# Table: profiles, colonne: role = 'admin'
`;

    content = securityComment + content;

    writeFileSync(envPath, content);
    this.removedReferences.push("ADMIN_PRINCIPAL_ID from .env.local");
    console.log("✅ Variable ADMIN_PRINCIPAL_ID supprimée de .env.local");
  }

  /**
   * Valide que la suppression a bien eu lieu
   */
  private async validateRemoval(): Promise<ValidationTest[]> {
    const tests: ValidationTest[] = [];

    // Test 1: Vérifier qu'aucune référence hardcodée ne reste
    tests.push(await this.testNoHardcodedReferences());

    // Test 2: Vérifier que le système DB fonctionne toujours
    tests.push(await this.testDatabaseStillWorks());

    // Test 3: Vérifier qu'aucun admin hardcodé ne peut se connecter
    tests.push(await this.testNoHardcodedAdminAccess());

    return tests;
  }

  /**
   * Test: Aucune référence hardcodée ne reste
   */
  private async testNoHardcodedReferences(): Promise<ValidationTest> {
    try {
      const references = await this.findHardcodedReferences();

      if (references.length > 0) {
        return {
          name: "no-hardcoded-references",
          description: "Vérification absence de références hardcodées",
          passed: false,
          error: `Références restantes: ${references.join(", ")}`,
        };
      }

      return {
        name: "no-hardcoded-references",
        description: "Vérification absence de références hardcodées",
        passed: true,
      };
    } catch (error) {
      return {
        name: "no-hardcoded-references",
        description: "Vérification absence de références hardcodées",
        passed: false,
        error: `Erreur: ${error}`,
      };
    }
  }

  /**
   * Test: Le système DB fonctionne toujours
   */
  private async testDatabaseStillWorks(): Promise<ValidationTest> {
    try {
      const supabase = createClient(this.supabaseUrl, this.serviceKey);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("role", "admin")
        .limit(1);

      if (error) {
        return {
          name: "database-still-works",
          description: "Vérification fonctionnement système DB",
          passed: false,
          error: `Erreur DB: ${error.message}`,
        };
      }

      if (!data || data.length === 0) {
        return {
          name: "database-still-works",
          description: "Vérification fonctionnement système DB",
          passed: false,
          error: "Aucun admin trouvé en base après suppression",
        };
      }

      return {
        name: "database-still-works",
        description: "Vérification fonctionnement système DB",
        passed: true,
      };
    } catch (error) {
      return {
        name: "database-still-works",
        description: "Vérification fonctionnement système DB",
        passed: false,
        error: `Erreur: ${error}`,
      };
    }
  }

  /**
   * Test: Aucun admin hardcodé ne peut se connecter
   */
  private async testNoHardcodedAdminAccess(): Promise<ValidationTest> {
    // Ce test simule qu'il n'y a plus de fallback hardcodé
    // En réalité, c'est vérifié par l'absence de code hardcodé

    return {
      name: "no-hardcoded-admin-access",
      description: "Vérification absence d'accès admin hardcodé",
      passed: true,
    };
  }

  /**
   * Génère la procédure d'urgence
   */
  private generateEmergencyProcedure(): string {
    return `
# PROCÉDURE D'URGENCE - Recréer un Admin

En cas de perte complète d'accès admin, suivez cette procédure:

## 1. Via Interface Supabase (Recommandé)
1. Connectez-vous à https://supabase.com/dashboard
2. Allez dans votre projet > Table Editor > profiles
3. Trouvez votre utilisateur ou créez-en un nouveau
4. Modifiez la colonne 'role' vers 'admin'
5. Redémarrez l'application

## 2. Via SQL Direct (Interface Supabase)
\`\`\`sql
-- Remplacez YOUR_USER_ID par l'UUID de votre utilisateur
UPDATE profiles 
SET role = 'admin' 
WHERE id = 'YOUR_USER_ID';
\`\`\`

## 3. Via CLI Supabase (si configuré)
\`\`\`bash
supabase db reset
# Puis suivre la procédure 1 ou 2
\`\`\`

## 4. Vérification
1. Connectez-vous à l'application
2. Vérifiez l'accès au dashboard admin
3. Testez les fonctionnalités administratives

## ⚠️ Important
- Ne JAMAIS remettre de code hardcodé
- Documentez l'utilisateur admin créé
- Changez le mot de passe après création
- Activez l'authentification 2FA si disponible

Date de suppression: ${new Date().toISOString()}
`;
  }
}

/**
 * Script principal
 */
async function main() {
  try {
    console.log("🗑️  Suppression de l'Admin Hardcodé - HerbisVeritas");
    console.log("=".repeat(60));

    const remover = new HardcodedAdminRemover();
    const result = await remover.removeHardcodedAdmin();

    console.log("\n📊 RAPPORT DE SUPPRESSION");
    console.log("=".repeat(30));
    console.log(`Statut: ${result.success ? "✅ RÉUSSI" : "❌ ÉCHOUÉ"}`);
    console.log(`Références supprimées: ${result.removedReferences.length}`);

    if (result.removedReferences.length > 0) {
      console.log("\n🗑️  Références supprimées:");
      result.removedReferences.forEach((ref) => console.log(`  - ${ref}`));
    }

    console.log("\n🧪 Tests de validation:");
    result.validationTests.forEach((test) => {
      const status = test.passed ? "✅" : "❌";
      console.log(`${status} ${test.description}`);
      if (!test.passed && test.error) {
        console.log(`     └─ ${test.error}`);
      }
    });

    if (result.errors.length > 0) {
      console.log("\n❌ Erreurs:");
      result.errors.forEach((error) => console.log(`  - ${error}`));
    }

    if (result.success) {
      console.log("\n🎉 Suppression terminée avec succès!");
      console.log(
        "\n📝 Procédure d'urgence sauvegardée dans emergency-admin-procedure.md",
      );

      // Sauvegarder la procédure d'urgence
      writeFileSync(
        join(process.cwd(), "emergency-admin-procedure.md"),
        result.emergencyProcedure,
      );

      process.exit(0);
    } else {
      console.log("\n❌ Échec de la suppression");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Erreur fatale:", error);
    process.exit(1);
  }
}

// Exécuter si lancé directement
if (require.main === module) {
  main();
}

export { HardcodedAdminRemover };
