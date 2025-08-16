#!/usr/bin/env tsx

/**
 * Script de planification automatique du nettoyage des paniers invités
 *
 * Ce script peut être utilisé de plusieurs façons :
 * 1. Exécution manuelle: `tsx scripts/schedule-cleanup.ts`
 * 2. Cron job: `0 2 * * * tsx scripts/schedule-cleanup.ts` (tous les jours à 2h)
 * 3. Webhook externe: appel via URL
 *
 * Configuration via variables d'environnement :
 * - CLEANUP_MAX_AGE_HOURS: Âge max en heures (défaut: 336 = 14 jours)
 * - CLEANUP_BATCH_SIZE: Taille des batches (défaut: 100)
 * - CLEANUP_DRY_RUN: Mode simulation (défaut: false)
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

// Charger les variables d'environnement
config();

interface CleanupConfig {
  maxAgeHours: number;
  batchSize: number;
  dryRun: boolean;
}

interface CleanupResult {
  deleted_carts: number;
  deleted_items: number;
  operation_time: string;
}

class ScheduledCleanupService {
  private supabase;
  private config: CleanupConfig;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Variables d'environnement Supabase manquantes");
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Configuration depuis les variables d'environnement
    this.config = {
      maxAgeHours: parseInt(process.env.CLEANUP_MAX_AGE_HOURS || "336"), // 14 jours
      batchSize: parseInt(process.env.CLEANUP_BATCH_SIZE || "100"),
      dryRun: process.env.CLEANUP_DRY_RUN === "true",
    };
  }

  /**
   * Exécute le nettoyage automatique des paniers invités
   */
  async executeCleanup(): Promise<CleanupResult | null> {
    try {
      console.log("🕒 Début du nettoyage planifié des paniers invités");
      console.log("📋 Configuration:", this.config);

      const startTime = new Date();

      // Appeler la fonction SQL de nettoyage
      const { data, error } = await this.supabase.rpc("cleanup_expired_guest_carts", {
        max_age_hours: this.config.maxAgeHours,
        batch_size: this.config.batchSize,
        dry_run: this.config.dryRun,
      });

      if (error) {
        throw new Error(`Erreur SQL: ${error.message}`);
      }

      const result = data?.[0] as CleanupResult;
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      console.log("✅ Nettoyage terminé avec succès");
      console.log(
        `📊 Résultats: ${result.deleted_carts} paniers, ${result.deleted_items} items supprimés`
      );
      console.log(`⏱️ Durée: ${duration}ms`);

      // Logger dans les audit logs
      await this.logCleanupEvent(result, duration);

      // Vérifier si des alertes sont nécessaires
      await this.checkAlerts(result);

      return result;
    } catch (error) {
      console.error("❌ Erreur lors du nettoyage planifié:", error);

      // Logger l'erreur
      await this.logError(error as Error);

      throw error;
    }
  }

  /**
   * Logger l'événement de nettoyage dans audit_logs
   */
  private async logCleanupEvent(result: CleanupResult, duration: number): Promise<void> {
    try {
      await this.supabase.from("audit_logs").insert({
        event_type: this.config.dryRun
          ? "SCHEDULED_CLEANUP_SIMULATION"
          : "SCHEDULED_CLEANUP_SUCCESS",
        user_id: null, // Système automatique
        details: {
          operation: "scheduled_cleanup",
          deleted_carts: result.deleted_carts,
          deleted_items: result.deleted_items,
          duration_ms: duration,
          config: this.config,
          execution_time: new Date().toISOString(),
        },
        message: `Nettoyage automatique: ${result.deleted_carts} paniers supprimés (${this.config.maxAgeHours}h)`,
        severity: "INFO",
      });
    } catch (error) {
      console.warn("⚠️ Impossible de logger l'événement:", error);
    }
  }

  /**
   * Logger les erreurs
   */
  private async logError(error: Error): Promise<void> {
    try {
      await this.supabase.from("audit_logs").insert({
        event_type: "SCHEDULED_CLEANUP_ERROR",
        user_id: null,
        details: {
          operation: "scheduled_cleanup",
          error: error.message,
          stack: error.stack,
          config: this.config,
        },
        message: `Erreur nettoyage automatique: ${error.message}`,
        severity: "ERROR",
      });
    } catch (logError) {
      console.warn("⚠️ Impossible de logger l'erreur:", logError);
    }
  }

  /**
   * Vérifier s'il faut envoyer des alertes
   */
  private async checkAlerts(result: CleanupResult): Promise<void> {
    // Alerte si beaucoup de paniers supprimés (signe d'un problème potentiel)
    if (result.deleted_carts > 1000) {
      console.warn(`🚨 ALERTE: ${result.deleted_carts} paniers supprimés - vérifier l'application`);

      await this.supabase.from("audit_logs").insert({
        event_type: "CLEANUP_ALERT_HIGH_VOLUME",
        user_id: null,
        details: {
          deleted_carts: result.deleted_carts,
          threshold: 1000,
          recommendation: "Vérifier l'application et le comportement des utilisateurs",
        },
        message: `ALERTE: Volume élevé de paniers supprimés (${result.deleted_carts})`,
        severity: "WARNING",
      });
    }

    // Alerte si aucun nettoyage depuis longtemps
    const { data: recentCleanups } = await this.supabase
      .from("audit_logs")
      .select("created_at")
      .eq("event_type", "SCHEDULED_CLEANUP_SUCCESS")
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // 7 jours
      .limit(1);

    if (!recentCleanups || recentCleanups.length === 0) {
      console.warn("🚨 ALERTE: Aucun nettoyage automatique depuis 7 jours");
    }
  }

  /**
   * Obtenir des statistiques avant le nettoyage
   */
  async getPreCleanupStats(): Promise<any> {
    const { data, error } = await this.supabase.rpc("get_cleanup_stats");
    if (error) {
      console.warn("⚠️ Impossible de récupérer les stats:", error);
      return null;
    }
    return data;
  }
}

/**
 * Fonction principale d'exécution
 */
async function main() {
  console.log("🚀 Démarrage du service de nettoyage planifié");
  console.log("📅 Heure d'exécution:", new Date().toISOString());

  try {
    const cleanupService = new ScheduledCleanupService();

    // Obtenir les stats avant nettoyage
    const preStats = await cleanupService.getPreCleanupStats();
    if (preStats) {
      console.log("📊 Statistiques avant nettoyage:");
      preStats.forEach((stat: any) => {
        console.log(`   ${stat.description}: ${stat.stat_value}`);
      });
    }

    // Exécuter le nettoyage
    const result = await cleanupService.executeCleanup();

    if (result) {
      console.log("🎉 Nettoyage planifié terminé avec succès");
      process.exit(0);
    } else {
      console.log("⚠️ Aucun résultat de nettoyage");
      process.exit(1);
    }
  } catch (error) {
    console.error("💥 Échec du nettoyage planifié:", error);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main().catch((error) => {
    console.error("💥 Erreur fatale:", error);
    process.exit(1);
  });
}

export { ScheduledCleanupService };
