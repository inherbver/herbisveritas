import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface CleanupResult {
  success: boolean;
  deletedCarts: number;
  deletedItems: number;
  errors?: string[];
}

interface CleanupConfig {
  dryRun?: boolean;
  maxAgeHours?: number;
  batchSize?: number;
}

/**
 * Edge Function pour purger automatiquement les paniers invités expirés
 *
 * Fonctionnalités :
 * - Supprime les paniers invités de plus de 30 jours (configurable)
 * - Supprime les items associés pour éviter les orphelins
 * - Mode dry-run pour tester sans supprimer
 * - Traitement par batch pour éviter la surcharge
 * - Logging détaillé des opérations
 */
Deno.serve(async (req: Request) => {
  try {
    // Vérification de la méthode HTTP
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Initialisation du client Supabase avec service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Configuration depuis le body de la requête
    const body = await req.json().catch(() => ({}));
    const config: CleanupConfig = {
      dryRun: body.dryRun ?? false,
      maxAgeHours: body.maxAgeHours ?? 24 * 14, // 14 jours par défaut
      batchSize: body.batchSize ?? 100,
    };

    console.log("🧹 Début de la purge des paniers invités", {
      config,
      timestamp: new Date().toISOString(),
    });

    const result: CleanupResult = {
      success: false,
      deletedCarts: 0,
      deletedItems: 0,
      errors: [],
    };

    // Calculer la date limite
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - config.maxAgeHours);
    const cutoffISO = cutoffDate.toISOString();

    console.log(`📅 Suppression des paniers créés avant: ${cutoffISO}`);

    // Étape 1: Identifier les paniers invités expirés
    const { data: expiredCarts, error: fetchError } = await supabase
      .from("carts")
      .select("id, created_at, guest_id")
      .is("user_id", null)
      .not("guest_id", "is", null)
      .lt("created_at", cutoffISO)
      .limit(config.batchSize);

    if (fetchError) {
      throw new Error(`Erreur récupération paniers: ${fetchError.message}`);
    }

    if (!expiredCarts || expiredCarts.length === 0) {
      console.log("✅ Aucun panier invité expiré trouvé");
      return new Response(
        JSON.stringify({
          ...result,
          success: true,
          message: "Aucun panier à purger",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log(`🎯 ${expiredCarts.length} paniers invités expirés trouvés`);

    if (config.dryRun) {
      console.log("🔍 Mode DRY-RUN activé - aucune suppression réelle");
      return new Response(
        JSON.stringify({
          ...result,
          success: true,
          message: `DRY-RUN: ${expiredCarts.length} paniers seraient supprimés`,
          preview: expiredCarts.map((cart) => ({
            id: cart.id,
            created_at: cart.created_at,
            guest_id: cart.guest_id,
          })),
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Étape 2: Supprimer les items des paniers (pour éviter les contraintes FK)
    const cartIds = expiredCarts.map((cart) => cart.id);

    const { error: deleteItemsError, count: deletedItemsCount } = await supabase
      .from("cart_items")
      .delete({ count: "exact" })
      .in("cart_id", cartIds);

    if (deleteItemsError) {
      const error = `Erreur suppression items: ${deleteItemsError.message}`;
      result.errors?.push(error);
      console.error("❌", error);
    } else {
      result.deletedItems = deletedItemsCount || 0;
      console.log(`🗑️ ${result.deletedItems} items supprimés`);
    }

    // Étape 3: Supprimer les paniers
    const { error: deleteCartsError, count: deletedCartsCount } = await supabase
      .from("carts")
      .delete({ count: "exact" })
      .in("id", cartIds);

    if (deleteCartsError) {
      const error = `Erreur suppression paniers: ${deleteCartsError.message}`;
      result.errors?.push(error);
      console.error("❌", error);
    } else {
      result.deletedCarts = deletedCartsCount || 0;
      console.log(`🗑️ ${result.deletedCarts} paniers supprimés`);
    }

    // Étape 4: Logger l'opération dans audit_logs
    const logData = {
      event_type: "SYSTEM_CLEANUP",
      user_id: null,
      details: {
        operation: "guest_carts_cleanup",
        deleted_carts: result.deletedCarts,
        deleted_items: result.deletedItems,
        cutoff_date: cutoffISO,
        batch_size: config.batchSize,
        errors: result.errors,
      },
      message: `Purge automatique: ${result.deletedCarts} paniers invités supprimés`,
      severity: result.errors && result.errors.length > 0 ? "WARNING" : "INFO",
    };

    const { error: logError } = await supabase.from("audit_logs").insert(logData);

    if (logError) {
      console.warn("⚠️ Erreur logging audit:", logError.message);
    }

    result.success = !result.errors || result.errors.length === 0;

    console.log("🎉 Purge terminée", result);

    return new Response(
      JSON.stringify({
        ...result,
        message: `Purge terminée: ${result.deletedCarts} paniers et ${result.deletedItems} items supprimés`,
        timestamp: new Date().toISOString(),
      }),
      {
        status: result.success ? 200 : 207, // 207 = Multi-Status (succès partiel)
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("💥 Erreur fatale dans cleanup-guest-carts:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
