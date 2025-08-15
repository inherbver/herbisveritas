import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkAdminRole } from "@/lib/auth/admin-service";
import { CacheService } from "@/lib/cache/cache-service";
import { PerformanceMonitor } from "@/lib/performance/performance-monitor";

/**
 * Endpoint pour forcer le nettoyage de la mémoire (admin seulement)
 */
export async function POST(request: NextRequest) {
  // API temporairement désactivée
  return NextResponse.json(
    { error: "Service temporairement indisponible" },
    { status: 503 }
  );

  /* API masquée temporairement
  try {
    const supabase = await createSupabaseServerClient();
    
    // Vérification admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !(await checkAdminRole(user.id))) {
      return NextResponse.json(
        { error: "Accès non autorisé" },
        { status: 403 }
      );
    }

    // Capture de l'état avant nettoyage
    const memoryBefore = process.memoryUsage();
    const cacheStatsBefore = CacheService.getStats();

    // Force le nettoyage
    CacheService.clearAll();
    PerformanceMonitor.cleanup();

    // Force garbage collection si disponible
    if (global.gc) {
      global.gc();
    }

    // Capture de l'état après nettoyage
    const memoryAfter = process.memoryUsage();
    const cacheStatsAfter = CacheService.getStats();

    const report = {
      success: true,
      timestamp: new Date().toISOString(),
      memoryBefore: {
        heapUsed: Math.round(memoryBefore.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memoryBefore.heapTotal / 1024 / 1024), // MB
        rss: Math.round(memoryBefore.rss / 1024 / 1024), // MB
      },
      memoryAfter: {
        heapUsed: Math.round(memoryAfter.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memoryAfter.heapTotal / 1024 / 1024), // MB
        rss: Math.round(memoryAfter.rss / 1024 / 1024), // MB
      },
      memoryFreed: Math.round((memoryBefore.heapUsed - memoryAfter.heapUsed) / 1024 / 1024), // MB
      cacheBefore: cacheStatsBefore.memory.size,
      cacheAfter: cacheStatsAfter.memory.size,
      cacheCleared: cacheStatsBefore.memory.size - cacheStatsAfter.memory.size,
    };

    // Log de l'action
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      event_type: "memory_cleanup",
      data: {
        action: "force_memory_cleanup",
        report: report,
      },
    });

    return NextResponse.json(report);

  } catch (error) {
    console.error("Erreur lors du nettoyage mémoire:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
  */
}

/**
 * Endpoint pour obtenir l'état actuel de la mémoire
 */
export async function GET(request: NextRequest) {
  // API temporairement désactivée
  return NextResponse.json(
    { error: "Service temporairement indisponible" },
    { status: 503 }
  );

  /* API masquée temporairement
  try {
    const supabase = await createSupabaseServerClient();
    
    // Vérification admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !(await checkAdminRole(user.id))) {
      return NextResponse.json(
        { error: "Accès non autorisé" },
        { status: 403 }
      );
    }

    const memory = process.memoryUsage();
    const cacheStats = CacheService.getStats();

    const status = {
      timestamp: new Date().toISOString(),
      memory: {
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024), // MB
        rss: Math.round(memory.rss / 1024 / 1024), // MB
        external: Math.round(memory.external / 1024 / 1024), // MB
      },
      cache: {
        size: cacheStats.memory.size,
        maxSize: cacheStats.memory.maxSize,
        utilization: Math.round((cacheStats.memory.size / cacheStats.memory.maxSize) * 100), // %
      },
      health: {
        memoryStatus: memory.heapUsed / 1024 / 1024 > 500 ? "critique" : 
                    memory.heapUsed / 1024 / 1024 > 200 ? "attention" : "bon",
        cacheStatus: cacheStats.memory.size / cacheStats.memory.maxSize > 0.8 ? "plein" : "normal",
      },
    };

    return NextResponse.json(status);

  } catch (error) {
    console.error("Erreur lors de la récupération de l'état mémoire:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
  */
}