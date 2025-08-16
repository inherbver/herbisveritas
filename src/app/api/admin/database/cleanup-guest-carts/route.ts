import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkAdminRole } from "@/lib/auth/admin-service";
import { logEvent } from "@/lib/admin/event-logger";
import { getActiveUserId } from "@/utils/authUtils";

interface CleanupRequest {
  dryRun?: boolean;
  maxAgeHours?: number;
  batchSize?: number;
}

/**
 * API Route pour exécuter le nettoyage des paniers invités
 * Accès : Admin uniquement
 */
export async function POST(request: NextRequest) {
  let userId: string | null = null;

  try {
    // Vérification de l'autorisation admin
    const isAdmin = await checkAdminRole();
    if (!isAdmin) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    userId = await getActiveUserId();
    const body: CleanupRequest = await request.json();

    // Configuration par défaut
    const config = {
      dryRun: body.dryRun ?? false,
      maxAgeHours: body.maxAgeHours ?? 24 * 14, // 14 jours par défaut
      batchSize: body.batchSize ?? 100,
    };

    const supabase = await createSupabaseServerClient();

    console.log("🧹 Début nettoyage paniers invités via API:", {
      config,
      admin_user: userId,
      timestamp: new Date().toISOString(),
    });

    // Appeler la fonction SQL de nettoyage
    const { data, error } = await supabase.rpc("cleanup_expired_guest_carts", {
      max_age_hours: config.maxAgeHours,
      batch_size: config.batchSize,
      dry_run: config.dryRun,
    });

    if (error) {
      console.error("Erreur fonction cleanup SQL:", error);

      // Logger l'erreur
      await logEvent(
        "DATABASE_CLEANUP_ERROR",
        userId,
        {
          operation: "cleanup_expired_guest_carts",
          error: error.message,
          config,
        },
        "ERROR"
      );

      return NextResponse.json(
        {
          success: false,
          error: "Erreur lors du nettoyage de la base de données",
          message: error.message,
        },
        { status: 500 }
      );
    }

    // data est un tableau avec un seul élément contenant le résultat
    const result = data?.[0];
    const deletedCarts = result?.deleted_carts || 0;
    const deletedItems = result?.deleted_items || 0;

    // Logger l'opération réussie
    await logEvent(
      config.dryRun ? "DATABASE_CLEANUP_SIMULATION" : "DATABASE_CLEANUP_SUCCESS",
      userId,
      {
        operation: "cleanup_expired_guest_carts",
        deleted_carts: deletedCarts,
        deleted_items: deletedItems,
        max_age_hours: config.maxAgeHours,
        batch_size: config.batchSize,
        dry_run: config.dryRun,
      },
      "INFO"
    );

    console.log("✅ Nettoyage terminé:", {
      deleted_carts: deletedCarts,
      deleted_items: deletedItems,
      dry_run: config.dryRun,
    });

    const responseMessage = config.dryRun
      ? `Simulation: ${deletedCarts} paniers seraient supprimés`
      : `Nettoyage terminé: ${deletedCarts} paniers et ${deletedItems} items supprimés`;

    return NextResponse.json({
      success: true,
      deleted_carts: deletedCarts,
      deleted_items: deletedItems,
      message: responseMessage,
      timestamp: new Date().toISOString(),
      config,
    });
  } catch (error) {
    console.error("Erreur API cleanup-guest-carts:", error);

    // Logger l'erreur fatale
    if (userId) {
      await logEvent(
        "DATABASE_CLEANUP_FATAL_ERROR",
        userId,
        {
          operation: "cleanup_expired_guest_carts",
          error: (error as Error).message,
          stack: (error as Error).stack,
        },
        "ERROR"
      ).catch(console.error);
    }

    return NextResponse.json(
      {
        success: false,
        error: "Erreur interne du serveur",
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
