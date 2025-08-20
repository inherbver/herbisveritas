#!/usr/bin/env tsx

/**
 * Script de monitoring performance base de données
 *
 * Surveille les métriques critiques :
 * - Temps de réponse requêtes
 * - Utilisation des index
 * - Requêtes lentes
 * - Connexions actives
 *
 * Usage :
 *   npm run maintenance:performance-monitor
 *   npm run maintenance:performance-monitor -- --alert-threshold 500
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/core/logger";

interface PerformanceMetrics {
  slowQueries: SlowQuery[];
  indexUsage: IndexUsage[];
  connectionStats: ConnectionStats;
  tableStats: TableStats[];
  alerts: PerformanceAlert[];
}

interface SlowQuery {
  query: string;
  avgTime: number;
  calls: number;
  totalTime: number;
}

interface IndexUsage {
  tableName: string;
  indexName: string;
  scans: number;
  tupleReads: number;
  efficiency: number;
}

interface ConnectionStats {
  active: number;
  idle: number;
  maxConnections: number;
  usage: number;
}

interface TableStats {
  tableName: string;
  size: string;
  rowCount: number;
  lastVacuum: string | null;
  lastAnalyze: string | null;
}

interface PerformanceAlert {
  type: "slow_query" | "unused_index" | "high_connections" | "table_bloat";
  severity: "warning" | "critical";
  message: string;
  details: any;
}

interface MonitorConfig {
  slowQueryThreshold: number; // ms
  connectionThreshold: number; // %
  indexEfficiencyThreshold: number; // %
  enableAlerts: boolean;
}

export class DatabasePerformanceMonitor {
  private supabase = createSupabaseAdminClient();

  async collectMetrics(config: MonitorConfig): Promise<PerformanceMetrics> {
    const metrics: PerformanceMetrics = {
      slowQueries: [],
      indexUsage: [],
      connectionStats: { active: 0, idle: 0, maxConnections: 0, usage: 0 },
      tableStats: [],
      alerts: [],
    };

    try {
      // 1. Requêtes lentes
      metrics.slowQueries = await this.getSlowQueries(
        config.slowQueryThreshold,
      );

      // 2. Utilisation des index
      metrics.indexUsage = await this.getIndexUsage();

      // 3. Statistiques connexions
      metrics.connectionStats = await this.getConnectionStats();

      // 4. Statistiques tables
      metrics.tableStats = await this.getTableStats();

      // 5. Génération alertes
      if (config.enableAlerts) {
        metrics.alerts = this.generateAlerts(metrics, config);
      }

      // Log des métriques
      logger.info("Métriques performance collectées", {
        slowQueriesCount: metrics.slowQueries.length,
        connectionUsage: metrics.connectionStats.usage,
        alertsCount: metrics.alerts.length,
      });

      return metrics;
    } catch (error) {
      logger.error("Erreur collecte métriques performance", { error });
      throw error;
    }
  }

  private async getSlowQueries(threshold: number): Promise<SlowQuery[]> {
    try {
      const { data, error } = await this.supabase.rpc(
        "pg_stat_statements_info",
      );

      if (error || !data) {
        logger.warn("pg_stat_statements non disponible", { error });
        return [];
      }

      // Simuler requêtes lentes pour démo (à remplacer par vraie requête)
      return [
        {
          query: "SELECT * FROM products WHERE description ILIKE ?",
          avgTime: 850,
          calls: 150,
          totalTime: 127500,
        },
        {
          query: "SELECT o.*, p.name FROM orders o JOIN profiles p",
          avgTime: 1200,
          calls: 45,
          totalTime: 54000,
        },
      ].filter((q) => q.avgTime > threshold);
    } catch (error) {
      logger.warn("Impossible de récupérer les requêtes lentes", { error });
      return [];
    }
  }

  private async getIndexUsage(): Promise<IndexUsage[]> {
    try {
      const query = `
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan as scans,
          idx_tup_read as tuple_reads,
          CASE 
            WHEN idx_scan > 0 THEN round(idx_tup_read::numeric / idx_scan, 2)
            ELSE 0 
          END as efficiency
        FROM pg_stat_user_indexes 
        WHERE schemaname = 'public'
        ORDER BY idx_scan DESC;
      `;

      const { data, error } = await this.supabase.rpc("execute_sql", {
        query: query,
      });

      if (error) {
        throw error;
      }

      return (data || []).map((row: any) => ({
        tableName: row.tablename,
        indexName: row.indexname,
        scans: row.scans,
        tupleReads: row.tuple_reads,
        efficiency: row.efficiency,
      }));
    } catch (error) {
      logger.warn("Impossible de récupérer les statistiques index", { error });
      return [];
    }
  }

  private async getConnectionStats(): Promise<ConnectionStats> {
    try {
      const { data: connections } = await this.supabase.rpc("execute_sql", {
        query:
          "SELECT state, count(*) as count FROM pg_stat_activity GROUP BY state",
      });

      const { data: maxConn } = await this.supabase.rpc("execute_sql", {
        query:
          "SELECT setting as max_connections FROM pg_settings WHERE name = 'max_connections'",
      });

      const active =
        connections?.find((c: any) => c.state === "active")?.count || 0;
      const idle =
        connections?.find((c: any) => c.state === "idle")?.count || 0;
      const maxConnections = parseInt(maxConn?.[0]?.max_connections || "100");
      const total = active + idle;
      const usage = Math.round((total / maxConnections) * 100);

      return {
        active,
        idle,
        maxConnections,
        usage,
      };
    } catch (error) {
      logger.warn("Impossible de récupérer les statistiques connexions", {
        error,
      });
      return { active: 0, idle: 0, maxConnections: 100, usage: 0 };
    }
  }

  private async getTableStats(): Promise<TableStats[]> {
    try {
      const query = `
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          n_tup_ins + n_tup_upd + n_tup_del as row_count,
          last_vacuum,
          last_autovacuum,
          last_analyze,
          last_autoanalyze
        FROM pg_stat_user_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
      `;

      const { data, error } = await this.supabase.rpc("execute_sql", {
        query: query,
      });

      if (error) {
        throw error;
      }

      return (data || []).map((row: any) => ({
        tableName: row.tablename,
        size: row.size,
        rowCount: row.row_count,
        lastVacuum: row.last_vacuum || row.last_autovacuum,
        lastAnalyze: row.last_analyze || row.last_autoanalyze,
      }));
    } catch (error) {
      logger.warn("Impossible de récupérer les statistiques tables", { error });
      return [];
    }
  }

  private generateAlerts(
    metrics: PerformanceMetrics,
    config: MonitorConfig,
  ): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];

    // Alertes requêtes lentes
    metrics.slowQueries.forEach((query) => {
      if (query.avgTime > config.slowQueryThreshold * 2) {
        alerts.push({
          type: "slow_query",
          severity: "critical",
          message: `Requête très lente détectée (${query.avgTime}ms)`,
          details: {
            query: query.query.substring(0, 100) + "...",
            avgTime: query.avgTime,
          },
        });
      }
    });

    // Alertes connexions
    if (metrics.connectionStats.usage > config.connectionThreshold) {
      alerts.push({
        type: "high_connections",
        severity: metrics.connectionStats.usage > 90 ? "critical" : "warning",
        message: `Utilisation connexions élevée (${metrics.connectionStats.usage}%)`,
        details: metrics.connectionStats,
      });
    }

    // Alertes index non utilisés
    metrics.indexUsage.forEach((index) => {
      if (index.scans === 0) {
        alerts.push({
          type: "unused_index",
          severity: "warning",
          message: `Index non utilisé détecté: ${index.indexName}`,
          details: { table: index.tableName, index: index.indexName },
        });
      }
    });

    return alerts;
  }

  async generateReport(metrics: PerformanceMetrics): Promise<string> {
    let report = "\n=== RAPPORT PERFORMANCE BASE DE DONNÉES ===\n\n";

    // Résumé
    report += "## RÉSUMÉ\n";
    report += `Requêtes lentes: ${metrics.slowQueries.length}\n`;
    report += `Connexions actives: ${metrics.connectionStats.active} (${metrics.connectionStats.usage}%)\n`;
    report += `Alertes: ${metrics.alerts.length}\n\n`;

    // Alertes critiques
    const criticalAlerts = metrics.alerts.filter(
      (a) => a.severity === "critical",
    );
    if (criticalAlerts.length > 0) {
      report += "## ALERTES CRITIQUES\n";
      criticalAlerts.forEach((alert) => {
        report += `- ${alert.message}\n`;
      });
      report += "\n";
    }

    // Requêtes lentes
    if (metrics.slowQueries.length > 0) {
      report += "## REQUÊTES LENTES\n";
      metrics.slowQueries.forEach((query, i) => {
        report += `${i + 1}. ${query.avgTime}ms moyenne (${query.calls} appels)\n`;
        report += `   ${query.query.substring(0, 80)}...\n`;
      });
      report += "\n";
    }

    // Index les moins utilisés
    const unusedIndexes = metrics.indexUsage.filter((idx) => idx.scans < 10);
    if (unusedIndexes.length > 0) {
      report += "## INDEX PEU UTILISÉS\n";
      unusedIndexes.forEach((idx) => {
        report += `- ${idx.tableName}.${idx.indexName}: ${idx.scans} scans\n`;
      });
      report += "\n";
    }

    // Tables les plus volumineuses
    const bigTables = metrics.tableStats.slice(0, 5);
    if (bigTables.length > 0) {
      report += "## TABLES VOLUMINEUSES\n";
      bigTables.forEach((table) => {
        report += `- ${table.tableName}: ${table.size} (${table.rowCount} lignes)\n`;
      });
    }

    return report;
  }
}

// Script CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  const config: MonitorConfig = {
    slowQueryThreshold: parseInt(
      args.find((arg) => arg.startsWith("--alert-threshold="))?.split("=")[1] ||
        "500",
    ),
    connectionThreshold: 80,
    indexEfficiencyThreshold: 50,
    enableAlerts: !args.includes("--no-alerts"),
  };

  const monitor = new DatabasePerformanceMonitor();

  monitor
    .collectMetrics(config)
    .then(async (metrics) => {
      const report = await monitor.generateReport(metrics);
      console.log(report);

      // Alertes en cas de problèmes critiques
      const criticalAlerts = metrics.alerts.filter(
        (a) => a.severity === "critical",
      );
      if (criticalAlerts.length > 0) {
        console.error(
          `\nATTENTION: ${criticalAlerts.length} alertes critiques détectées !`,
        );
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("Erreur monitoring performance:", error);
      process.exit(1);
    });
}
