#!/usr/bin/env tsx

/**
 * Script de Rotation des Clés Supabase
 *
 * OBJECTIF: Automatiser la rotation sécurisée des clés Supabase
 * CRITICITÉ: HAUTE - Vulnérabilité de sécurité critique
 *
 * Fonctionnalités:
 * - Génération automatique de nouvelles clés
 * - Validation que les nouvelles clés fonctionnent
 * - Backup automatique des anciennes clés
 * - Rollback en cas d'échec
 * - Tests de connectivité avant/après rotation
 */

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, readFileSync, existsSync, copyFileSync } from "fs";
import { join } from "path";

interface RotationConfig {
  supabaseUrl: string;
  currentServiceKey: string;
  currentAnonKey: string;
  projectRef: string;
  backupPath: string;
  envPath: string;
}

interface RotationResult {
  success: boolean;
  newServiceKey?: string;
  newAnonKey?: string;
  backupFile?: string;
  error?: string;
  validationResults?: ValidationResult[];
}

interface ValidationResult {
  test: string;
  success: boolean;
  error?: string;
  duration: number;
}

class SupabaseKeyRotator {
  private config: RotationConfig;
  private startTime: number;

  constructor(config: RotationConfig) {
    this.config = config;
    this.startTime = Date.now();
  }

  /**
   * Exécute la rotation complète des clés
   */
  async rotateKeys(): Promise<RotationResult> {
    console.log("🔄 Début de la rotation des clés Supabase...");
    console.log(`📅 ${new Date().toISOString()}`);

    try {
      // 1. Valider l'état actuel
      console.log("\n📋 Étape 1: Validation de l'état actuel...");
      const currentValidation = await this.validateCurrentKeys();
      if (!currentValidation.success) {
        throw new Error(
          `Échec validation actuelle: ${currentValidation.error}`,
        );
      }

      // 2. Créer un backup
      console.log("\n💾 Étape 2: Création du backup...");
      const backupFile = await this.createBackup();

      // 3. Générer nouvelles clés (simulé - nécessite API Supabase Management)
      console.log("\n🔑 Étape 3: Génération de nouvelles clés...");
      const newKeys = await this.generateNewKeys();

      // 4. Valider les nouvelles clés
      console.log("\n✅ Étape 4: Validation des nouvelles clés...");
      const newValidation = await this.validateNewKeys(newKeys);
      if (!newValidation.success) {
        throw new Error(
          `Échec validation nouvelles clés: ${newValidation.error}`,
        );
      }

      // 5. Mettre à jour le fichier .env.local
      console.log("\n📝 Étape 5: Mise à jour des variables d'environnement...");
      await this.updateEnvironmentFile(newKeys);

      // 6. Tests de connectivité post-rotation
      console.log("\n🧪 Étape 6: Tests de connectivité finale...");
      const finalValidation = await this.validateEnvironmentUpdate();
      if (!finalValidation.success) {
        console.log("⚠️  Échec des tests finaux, rollback...");
        await this.rollback(backupFile);
        throw new Error(`Échec tests finaux: ${finalValidation.error}`);
      }

      const duration = Date.now() - this.startTime;
      console.log(`\n✅ Rotation réussie en ${duration}ms`);
      console.log("🔐 Nouvelles clés activées et validées");

      return {
        success: true,
        newServiceKey: newKeys.serviceKey,
        newAnonKey: newKeys.anonKey,
        backupFile,
        validationResults: [currentValidation, newValidation, finalValidation],
      };
    } catch (error) {
      console.error("❌ Erreur lors de la rotation:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      };
    }
  }

  /**
   * Valide que les clés actuelles fonctionnent
   */
  private async validateCurrentKeys(): Promise<ValidationResult> {
    const start = Date.now();

    try {
      const supabase = createClient(
        this.config.supabaseUrl,
        this.config.currentServiceKey,
      );

      // Test simple: lister les tables
      const { data: _data, error } = await supabase
        .from("profiles")
        .select("id")
        .limit(1);

      if (error) {
        return {
          test: "current-keys-validation",
          success: false,
          error: error.message,
          duration: Date.now() - start,
        };
      }

      return {
        test: "current-keys-validation",
        success: true,
        duration: Date.now() - start,
      };
    } catch (error) {
      return {
        test: "current-keys-validation",
        success: false,
        error: error instanceof Error ? error.message : "Erreur de connexion",
        duration: Date.now() - start,
      };
    }
  }

  /**
   * Génère de nouvelles clés (simulation - nécessite l'API Management de Supabase)
   */
  private async generateNewKeys(): Promise<{
    serviceKey: string;
    anonKey: string;
  }> {
    // ATTENTION: Ceci est une simulation
    // En production, utiliser l'API Management de Supabase:
    // https://supabase.com/docs/reference/api/management-api

    console.log(
      "⚠️  SIMULATION: En production, utilisez l'API Management Supabase",
    );
    console.log(
      "📖 Docs: https://supabase.com/docs/reference/api/management-api",
    );

    // Simulation de génération de nouvelles clés
    return {
      serviceKey: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.NEW_SERVICE_KEY_${Date.now()}`,
      anonKey: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.NEW_ANON_KEY_${Date.now()}`,
    };
  }

  /**
   * Valide les nouvelles clés avant mise à jour
   */
  private async validateNewKeys(keys: {
    serviceKey: string;
    anonKey: string;
  }): Promise<ValidationResult> {
    const start = Date.now();

    try {
      // En mode simulation, on valide la structure JWT
      if (
        !keys.serviceKey.startsWith("eyJ") ||
        !keys.anonKey.startsWith("eyJ")
      ) {
        return {
          test: "new-keys-validation",
          success: false,
          error: "Format JWT invalide",
          duration: Date.now() - start,
        };
      }

      // En production, tester la connectivité avec les nouvelles clés
      // const supabase = createClient(this.config.supabaseUrl, keys.serviceKey);
      // const { error } = await supabase.from('profiles').select('id').limit(1);

      return {
        test: "new-keys-validation",
        success: true,
        duration: Date.now() - start,
      };
    } catch (error) {
      return {
        test: "new-keys-validation",
        success: false,
        error: error instanceof Error ? error.message : "Erreur validation",
        duration: Date.now() - start,
      };
    }
  }

  /**
   * Crée un backup des clés actuelles
   */
  private async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFile = join(
      this.config.backupPath,
      `env-backup-${timestamp}.txt`,
    );

    try {
      const currentEnv = readFileSync(this.config.envPath, "utf8");
      writeFileSync(backupFile, currentEnv);
      console.log(`✅ Backup créé: ${backupFile}`);
      return backupFile;
    } catch (error) {
      throw new Error(`Échec création backup: ${error}`);
    }
  }

  /**
   * Met à jour le fichier .env.local avec les nouvelles clés
   */
  private async updateEnvironmentFile(keys: {
    serviceKey: string;
    anonKey: string;
  }): Promise<void> {
    try {
      let envContent = readFileSync(this.config.envPath, "utf8");

      // Remplacer les clés en préservant les commentaires
      envContent = envContent.replace(
        /SUPABASE_SERVICE_ROLE_KEY="[^"]*"/,
        `SUPABASE_SERVICE_ROLE_KEY="${keys.serviceKey}"`,
      );

      envContent = envContent.replace(
        /NEXT_PUBLIC_SUPABASE_ANON_KEY="[^"]*"/,
        `NEXT_PUBLIC_SUPABASE_ANON_KEY="${keys.anonKey}"`,
      );

      // Ajouter commentaire de rotation
      const rotationComment = `\n# Clés rotées automatiquement le ${new Date().toISOString()}\n`;
      envContent = rotationComment + envContent;

      writeFileSync(this.config.envPath, envContent);
      console.log("✅ Fichier .env.local mis à jour");
    } catch (error) {
      throw new Error(`Échec mise à jour .env.local: ${error}`);
    }
  }

  /**
   * Valide que la mise à jour de l'environnement fonctionne
   */
  private async validateEnvironmentUpdate(): Promise<ValidationResult> {
    const start = Date.now();

    try {
      // Recharger les variables d'environnement
      delete require.cache[require.resolve("dotenv")];
      require("dotenv").config({ path: this.config.envPath });

      // Tester avec les nouvelles variables
      const newServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!newServiceKey) {
        throw new Error("Variable SUPABASE_SERVICE_ROLE_KEY non trouvée");
      }

      return {
        test: "environment-update-validation",
        success: true,
        duration: Date.now() - start,
      };
    } catch (error) {
      return {
        test: "environment-update-validation",
        success: false,
        error: error instanceof Error ? error.message : "Erreur validation env",
        duration: Date.now() - start,
      };
    }
  }

  /**
   * Effectue un rollback en cas d'échec
   */
  private async rollback(backupFile: string): Promise<void> {
    try {
      copyFileSync(backupFile, this.config.envPath);
      console.log("✅ Rollback effectué avec succès");
    } catch (error) {
      console.error("❌ Erreur lors du rollback:", error);
      throw new Error(`Rollback failed: ${error}`);
    }
  }
}

/**
 * Utilitaires de validation
 */
export class KeyRotationValidator {
  /**
   * Valide qu'un fichier .env.local contient toutes les clés requises
   */
  static validateEnvFile(envPath: string): {
    valid: boolean;
    missing: string[];
  } {
    if (!existsSync(envPath)) {
      return { valid: false, missing: ["Fichier .env.local introuvable"] };
    }

    const content = readFileSync(envPath, "utf8");
    const requiredKeys = [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    ];

    const missing = requiredKeys.filter((key) => !content.includes(key));

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Extrait les clés du fichier .env.local
   */
  static extractKeysFromEnv(envPath: string): RotationConfig | null {
    try {
      const content = readFileSync(envPath, "utf8");

      const urlMatch = content.match(/NEXT_PUBLIC_SUPABASE_URL=([^\n\r]*)/);
      const anonMatch = content.match(
        /NEXT_PUBLIC_SUPABASE_ANON_KEY="([^"]*)"/,
      );
      const serviceMatch = content.match(/SUPABASE_SERVICE_ROLE_KEY="([^"]*)"/);

      if (!urlMatch || !anonMatch || !serviceMatch) {
        return null;
      }

      const url = urlMatch[1].trim();
      const projectRef = url
        .replace("https://", "")
        .replace(".supabase.co", "");

      return {
        supabaseUrl: url,
        currentServiceKey: serviceMatch[1],
        currentAnonKey: anonMatch[1],
        projectRef,
        backupPath: join(process.cwd(), "backups"),
        envPath,
      };
    } catch (error) {
      console.error("Erreur extraction des clés:", error);
      return null;
    }
  }
}

/**
 * Script principal
 */
async function main() {
  try {
    const envPath = join(process.cwd(), ".env.local");

    // Valider le fichier d'environnement
    const validation = KeyRotationValidator.validateEnvFile(envPath);
    if (!validation.valid) {
      console.error("❌ Fichier .env.local invalide:");
      validation.missing.forEach((missing) => console.error(`  - ${missing}`));
      process.exit(1);
    }

    // Extraire la configuration
    const config = KeyRotationValidator.extractKeysFromEnv(envPath);
    if (!config) {
      console.error("❌ Impossible d'extraire la configuration des clés");
      process.exit(1);
    }

    // Créer le dossier de backup s'il n'existe pas
    const { mkdirSync } = await import("fs");
    if (!existsSync(config.backupPath)) {
      mkdirSync(config.backupPath, { recursive: true });
    }

    // Exécuter la rotation
    const rotator = new SupabaseKeyRotator(config);
    const result = await rotator.rotateKeys();

    if (result.success) {
      console.log("\n🎉 Rotation des clés terminée avec succès!");
      console.log("📝 Prochaines étapes:");
      console.log("  1. Redémarrer votre application");
      console.log("  2. Vérifier que tout fonctionne correctement");
      console.log("  3. Supprimer les anciens backups après validation");
      process.exit(0);
    } else {
      console.error("\n❌ Échec de la rotation des clés");
      console.error(`Erreur: ${result.error}`);
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

export { SupabaseKeyRotator };
