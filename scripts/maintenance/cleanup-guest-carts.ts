#!/usr/bin/env tsx

/**
 * Script de maintenance : Nettoyage automatique des paniers invités
 *
 * Fonctionnalités :
 * - Supprime les paniers invités expirés (>14 jours par défaut)
 * - Mode dry-run pour validation avant exécution
 * - Logging détaillé des opérations
 * - Gestion d'erreurs robuste
 *
 * Usage :
 *   npm run maintenance:cleanup-guest-carts
 *   npm run maintenance:cleanup-guest-carts -- --dry-run
 *   npm run maintenance:cleanup-guest-carts -- --max-age-days 7
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/core/logger";

interface CleanupConfig {
  dryRun?: boolean;
  maxAgeDays?: number;
  batchSize?: number;
}

interface CleanupStats {
  cartsScanned: number;
  cartsDeleted: number;
  itemsDeleted: number;
  errors: string[];
  durationMs: number;
}

export class GuestCartCleanupService {
  private supabase = createSupabaseAdminClient();

  async cleanup(config: CleanupConfig = {}): Promise<CleanupStats> {
    const startTime = Date.now();
    const stats: CleanupStats = {
      cartsScanned: 0,
      cartsDeleted: 0,
      itemsDeleted: 0,
      errors: [],
      durationMs: 0,
    };

    const { dryRun = false, maxAgeDays = 14, batchSize = 100 } = config;

    logger.info(`🧹 Début nettoyage paniers invités`, {
      dryRun,
      maxAgeDays,
      batchSize,
    });

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

      // 1. Identifier les paniers expirés
      const { data: expiredCarts, error: queryError } = await this.supabase
        .from("carts")
        .select("id, guest_id, created_at")
        .is("user_id", null) // Seulement les paniers invités
        .not("guest_id", "is", null)
        .lt("created_at", cutoffDate.toISOString())
        .order("created_at", { ascending: true })
        .limit(batchSize);

      if (queryError) {
        throw new Error(
          `Erreur requête paniers expirés: ${queryError.message}`,
        );
      }

      if (!expiredCarts?.length) {
        logger.info(`✅ Aucun panier invité expiré trouvé`);
        stats.durationMs = Date.now() - startTime;
        return stats;
      }

      stats.cartsScanned = expiredCarts.length;

      logger.info(`🔍 Paniers expirés trouvés : ${expiredCarts.length}`, {
        oldestCart: expiredCarts[0]?.created_at,
        newestCart: expiredCarts[expiredCarts.length - 1]?.created_at,
      });

      // 2. Compter les articles dans ces paniers
      const cartIds = expiredCarts.map((cart) => cart.id);
      const { count: itemsCount, error: countError } = await this.supabase
        .from("cart_items")
        .select("*", { count: "exact", head: true })
        .in("cart_id", cartIds);

      if (countError) {
        stats.errors.push(`Erreur comptage articles: ${countError.message}`);
      } else {
        stats.itemsDeleted = itemsCount || 0;
      }

      if (dryRun) {
        logger.info(`🔄 Mode DRY-RUN - Aucune suppression effectuée`, {
          cartsToDelete: stats.cartsScanned,
          itemsToDelete: stats.itemsDeleted,
        });

        stats.durationMs = Date.now() - startTime;
        return stats;
      }

      // 3. Supprimer les articles des paniers (CASCADE auto)
      const { error: deleteItemsError } = await this.supabase
        .from("cart_items")
        .delete()
        .in("cart_id", cartIds);

      if (deleteItemsError) {
        throw new Error(
          `Erreur suppression articles: ${deleteItemsError.message}`,
        );
      }

      // 4. Supprimer les paniers
      const { error: deleteCartsError } = await this.supabase
        .from("carts")
        .delete()
        .in("id", cartIds);

      if (deleteCartsError) {
        throw new Error(
          `Erreur suppression paniers: ${deleteCartsError.message}`,
        );
      }

      stats.cartsDeleted = expiredCarts.length;

      logger.info(`✅ Nettoyage terminé avec succès`, {
        cartsDeleted: stats.cartsDeleted,
        itemsDeleted: stats.itemsDeleted,
        durationMs: Date.now() - startTime,
      });

      // 5. Audit logging
      await this.logCleanupOperation(stats, config);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erreur inconnue";
      stats.errors.push(errorMessage);

      logger.error(`❌ Erreur lors du nettoyage paniers invités`, {
        error: errorMessage,
        stats,
      });

      throw error;
    }

    stats.durationMs = Date.now() - startTime;
    return stats;
  }

  private async logCleanupOperation(
    stats: CleanupStats,
    config: CleanupConfig,
  ): Promise<void> {
    try {
      await this.supabase.from("audit_logs").insert({
        event_type: "maintenance_cleanup",
        details: {
          operation: "guest_carts_cleanup",
          stats,
          config,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.warn(`Impossible d'enregistrer l'audit cleanup`, { error });
    }
  }

  async getCleanupPreview(maxAgeDays: number = 14): Promise<{
    expiredCartsCount: number;
    expiredItemsCount: number;
    oldestCart: string | null;
    diskSpaceEstimate: string;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

    // Compter paniers expirés
    const { count: cartsCount } = await this.supabase
      .from("carts")
      .select("*", { count: "exact", head: true })
      .is("user_id", null)
      .not("guest_id", "is", null)
      .lt("created_at", cutoffDate.toISOString());

    // Compter articles dans paniers expirés
    const { data: cartIds } = await this.supabase
      .from("carts")
      .select("id")
      .is("user_id", null)
      .not("guest_id", "is", null)
      .lt("created_at", cutoffDate.toISOString());

    let itemsCount = 0;
    if (cartIds?.length) {
      const { count } = await this.supabase
        .from("cart_items")
        .select("*", { count: "exact", head: true })
        .in(
          "cart_id",
          cartIds.map((c) => c.id),
        );
      itemsCount = count || 0;
    }

    // Plus ancien panier
    const { data: oldestCarts } = await this.supabase
      .from("carts")
      .select("created_at")
      .is("user_id", null)
      .not("guest_id", "is", null)
      .order("created_at", { ascending: true })
      .limit(1);

    const oldestCart = oldestCarts?.[0]?.created_at || null;

    // Estimation espace disque (approximatif)
    const estimatedBytes = (cartsCount || 0) * 200 + itemsCount * 100; // 200B par panier, 100B par article
    const diskSpaceEstimate =
      estimatedBytes > 1024 * 1024
        ? `${(estimatedBytes / 1024 / 1024).toFixed(2)} MB`
        : `${(estimatedBytes / 1024).toFixed(2)} KB`;

    return {
      expiredCartsCount: cartsCount || 0,
      expiredItemsCount: itemsCount,
      oldestCart,
      diskSpaceEstimate,
    };
  }
}

// Script CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const maxAgeDays = parseInt(
    args.find((arg) => arg.startsWith("--max-age-days="))?.split("=")[1] ||
      "14",
  );
  const preview = args.includes("--preview");

  const service = new GuestCartCleanupService();

  if (preview) {
    // Mode preview
    service
      .getCleanupPreview(maxAgeDays)
      .then((preview) => {
        console.log("\n🔍 Aperçu du nettoyage:");
        console.log(`Paniers expirés: ${preview.expiredCartsCount}`);
        console.log(`Articles concernés: ${preview.expiredItemsCount}`);
        console.log(`Plus ancien panier: ${preview.oldestCart || "N/A"}`);
        console.log(`Espace disque libéré: ~${preview.diskSpaceEstimate}`);
        console.log("");
      })
      .catch((error) => {
        console.error("❌ Erreur preview:", error);
        process.exit(1);
      });
  } else {
    // Mode exécution
    service
      .cleanup({ dryRun, maxAgeDays })
      .then((stats) => {
        console.log("\n✅ Nettoyage terminé:");
        console.log(`Paniers supprimés: ${stats.cartsDeleted}`);
        console.log(`Articles supprimés: ${stats.itemsDeleted}`);
        console.log(`Durée: ${stats.durationMs}ms`);

        if (stats.errors.length > 0) {
          console.log("⚠️  Erreurs:", stats.errors);
          process.exit(1);
        }
      })
      .catch((error) => {
        console.error("❌ Erreur nettoyage:", error);
        process.exit(1);
      });
  }
}
