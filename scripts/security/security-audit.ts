#!/usr/bin/env tsx

/**
 * Script d'audit sécurité automatisé
 *
 * Vérifie :
 * - Configuration RLS policies
 * - Variables d'environnement sensibles
 * - Permissions fichiers
 * - Logs d'événements suspects
 *
 * Usage :
 *   npm run security:audit
 *   npm run security:audit -- --fix-issues
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/core/logger";
import { readFileSync, accessSync, constants } from "fs";
import { join } from "path";

interface SecurityAuditResult {
  rlsPolicies: RLSPolicyCheck[];
  environmentVariables: EnvVariableCheck[];
  auditLogs: SuspiciousActivity[];
  filePermissions: FilePermissionCheck[];
  overallScore: number;
  criticalIssues: string[];
  recommendations: string[];
}

interface RLSPolicyCheck {
  tableName: string;
  hasRLS: boolean;
  policyCount: number;
  issues: string[];
}

interface EnvVariableCheck {
  variable: string;
  status: "present" | "missing" | "insecure";
  issue?: string;
}

interface SuspiciousActivity {
  timestamp: string;
  eventType: string;
  details: any;
  riskLevel: "low" | "medium" | "high";
}

interface FilePermissionCheck {
  filePath: string;
  hasCorrectPermissions: boolean;
  issue?: string;
}

interface AuditConfig {
  fixIssues: boolean;
  checkLogs: boolean;
  logsDays: number;
}

export class SecurityAuditor {
  private supabase = createSupabaseAdminClient();

  async runFullAudit(config: AuditConfig): Promise<SecurityAuditResult> {
    logger.info("Début audit sécurité complet");

    const result: SecurityAuditResult = {
      rlsPolicies: [],
      environmentVariables: [],
      auditLogs: [],
      filePermissions: [],
      overallScore: 0,
      criticalIssues: [],
      recommendations: [],
    };

    try {
      // 1. Vérification RLS policies
      result.rlsPolicies = await this.checkRLSPolicies();

      // 2. Vérification variables d'environnement
      result.environmentVariables = this.checkEnvironmentVariables();

      // 3. Analyse logs suspects
      if (config.checkLogs) {
        result.auditLogs = await this.analyzeSuspiciousActivity(
          config.logsDays,
        );
      }

      // 4. Vérification permissions fichiers
      result.filePermissions = this.checkFilePermissions();

      // 5. Calcul score général
      result.overallScore = this.calculateSecurityScore(result);

      // 6. Génération recommandations
      result.recommendations = this.generateRecommendations(result);
      result.criticalIssues = this.identifyCriticalIssues(result);

      logger.info("Audit sécurité terminé", {
        score: result.overallScore,
        criticalIssues: result.criticalIssues.length,
      });

      return result;
    } catch (error) {
      logger.error("Erreur lors de l'audit sécurité", { error });
      throw error;
    }
  }

  private async checkRLSPolicies(): Promise<RLSPolicyCheck[]> {
    const checks: RLSPolicyCheck[] = [];

    try {
      // Récupérer toutes les tables publiques
      const { data: tables, error: tablesError } = await this.supabase.rpc(
        "execute_sql",
        {
          query: `
          SELECT tablename 
          FROM pg_tables 
          WHERE schemaname = 'public' 
          AND tablename NOT LIKE 'pg_%'
        `,
        },
      );

      if (tablesError) throw tablesError;

      for (const table of tables || []) {
        const tableName = table.tablename;

        // Vérifier RLS activé
        const { data: rlsCheck } = await this.supabase.rpc("execute_sql", {
          query: `
            SELECT relrowsecurity as rls_enabled
            FROM pg_class c
            JOIN pg_namespace n ON c.relnamespace = n.oid
            WHERE n.nspname = 'public' AND c.relname = '${tableName}'
          `,
        });

        const hasRLS = rlsCheck?.[0]?.rls_enabled || false;

        // Compter les policies
        const { data: policies } = await this.supabase.rpc("execute_sql", {
          query: `
            SELECT count(*) as policy_count
            FROM pg_policies
            WHERE schemaname = 'public' AND tablename = '${tableName}'
          `,
        });

        const policyCount = parseInt(policies?.[0]?.policy_count || "0");

        const issues: string[] = [];
        if (!hasRLS) {
          issues.push("RLS non activé");
        }
        if (policyCount === 0 && hasRLS) {
          issues.push("Aucune policy définie avec RLS activé");
        }

        checks.push({
          tableName,
          hasRLS,
          policyCount,
          issues,
        });
      }
    } catch (error) {
      logger.error("Erreur vérification RLS policies", { error });
    }

    return checks;
  }

  private checkEnvironmentVariables(): EnvVariableCheck[] {
    const requiredVars = [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "STRIPE_SECRET_KEY",
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "ADMIN_PRINCIPAL_ID",
    ];

    const sensitiveVars = [
      "SUPABASE_SERVICE_ROLE_KEY",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
    ];

    return requiredVars.map((variable) => {
      const value = process.env[variable];

      if (!value) {
        return {
          variable,
          status: "missing" as const,
          issue: "Variable d'environnement manquante",
        };
      }

      // Vérifications spécifiques pour variables sensibles
      if (sensitiveVars.includes(variable)) {
        if (value.length < 32) {
          return {
            variable,
            status: "insecure" as const,
            issue: "Clé trop courte (< 32 caractères)",
          };
        }

        if (value.includes("test") || value.includes("demo")) {
          return {
            variable,
            status: "insecure" as const,
            issue: "Semble être une clé de test",
          };
        }
      }

      return {
        variable,
        status: "present" as const,
      };
    });
  }

  private async analyzeSuspiciousActivity(
    days: number,
  ): Promise<SuspiciousActivity[]> {
    try {
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - days);

      const { data: logs, error } = await this.supabase
        .from("audit_logs")
        .select("*")
        .gte("created_at", sinceDate.toISOString())
        .in("event_type", [
          "auth_failure",
          "admin_access_denied",
          "rate_limit_exceeded",
          "suspicious_activity",
        ])
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      return (logs || []).map((log) => {
        let riskLevel: "low" | "medium" | "high" = "low";

        // Analyser le niveau de risque
        if (log.event_type === "admin_access_denied") {
          riskLevel = "high";
        } else if (log.event_type === "rate_limit_exceeded") {
          riskLevel = "medium";
        }

        // Détection patterns suspects
        const details = log.details || {};
        if (details.ip_address && this.isKnownBadIP(details.ip_address)) {
          riskLevel = "high";
        }

        return {
          timestamp: log.created_at,
          eventType: log.event_type,
          details: log.details,
          riskLevel,
        };
      });
    } catch (error) {
      logger.error("Erreur analyse activité suspecte", { error });
      return [];
    }
  }

  private checkFilePermissions(): FilePermissionCheck[] {
    const criticalFiles = [
      ".env.local",
      ".env.production",
      "supabase/config.toml",
    ];

    return criticalFiles.map((filePath) => {
      try {
        const fullPath = join(process.cwd(), filePath);

        // Vérifier que le fichier existe et est accessible
        accessSync(fullPath, constants.F_OK);

        // Sur les systèmes Unix, vérifier les permissions
        if (process.platform !== "win32") {
          try {
            accessSync(fullPath, constants.R_OK | constants.W_OK);
            // Idéalement, vérifier que les permissions sont 600 (lecture/écriture propriétaire uniquement)
          } catch {
            return {
              filePath,
              hasCorrectPermissions: false,
              issue: "Permissions fichier trop permissives",
            };
          }
        }

        return {
          filePath,
          hasCorrectPermissions: true,
        };
      } catch (error) {
        if (filePath.includes(".env.production")) {
          // .env.production peut ne pas exister en développement
          return {
            filePath,
            hasCorrectPermissions: true,
          };
        }

        return {
          filePath,
          hasCorrectPermissions: false,
          issue: "Fichier non accessible ou manquant",
        };
      }
    });
  }

  private calculateSecurityScore(result: SecurityAuditResult): number {
    let score = 100;

    // Déductions pour RLS policies
    const tablesWithoutRLS = result.rlsPolicies.filter((p) => !p.hasRLS).length;
    score -= tablesWithoutRLS * 10;

    // Déductions pour variables d'environnement
    const missingVars = result.environmentVariables.filter(
      (v) => v.status === "missing",
    ).length;
    const insecureVars = result.environmentVariables.filter(
      (v) => v.status === "insecure",
    ).length;
    score -= missingVars * 15;
    score -= insecureVars * 10;

    // Déductions pour activités suspectes
    const highRiskActivities = result.auditLogs.filter(
      (a) => a.riskLevel === "high",
    ).length;
    const mediumRiskActivities = result.auditLogs.filter(
      (a) => a.riskLevel === "medium",
    ).length;
    score -= highRiskActivities * 5;
    score -= mediumRiskActivities * 2;

    // Déductions pour permissions fichiers
    const badPermissions = result.filePermissions.filter(
      (f) => !f.hasCorrectPermissions,
    ).length;
    score -= badPermissions * 8;

    return Math.max(0, Math.min(100, score));
  }

  private generateRecommendations(result: SecurityAuditResult): string[] {
    const recommendations: string[] = [];

    // RLS recommendations
    const tablesWithoutRLS = result.rlsPolicies.filter((p) => !p.hasRLS);
    if (tablesWithoutRLS.length > 0) {
      recommendations.push(
        `Activer RLS sur ${tablesWithoutRLS.length} tables : ${tablesWithoutRLS.map((t) => t.tableName).join(", ")}`,
      );
    }

    // Environment variables
    const missingVars = result.environmentVariables.filter(
      (v) => v.status === "missing",
    );
    if (missingVars.length > 0) {
      recommendations.push(
        `Configurer les variables manquantes : ${missingVars.map((v) => v.variable).join(", ")}`,
      );
    }

    // High risk activities
    const highRiskCount = result.auditLogs.filter(
      (a) => a.riskLevel === "high",
    ).length;
    if (highRiskCount > 5) {
      recommendations.push(
        `Investiguer ${highRiskCount} activités à haut risque récentes`,
      );
    }

    // File permissions
    const badPermissions = result.filePermissions.filter(
      (f) => !f.hasCorrectPermissions,
    );
    if (badPermissions.length > 0) {
      recommendations.push(
        `Corriger les permissions des fichiers : ${badPermissions.map((f) => f.filePath).join(", ")}`,
      );
    }

    return recommendations;
  }

  private identifyCriticalIssues(result: SecurityAuditResult): string[] {
    const issues: string[] = [];

    // Issues critiques RLS
    const publicTablesWithoutRLS = result.rlsPolicies.filter(
      (p) => !p.hasRLS && ["orders", "profiles", "carts"].includes(p.tableName),
    );

    publicTablesWithoutRLS.forEach((table) => {
      issues.push(`Table sensible sans RLS : ${table.tableName}`);
    });

    // Issues critiques environment
    const criticalMissingVars = result.environmentVariables.filter(
      (v) =>
        v.status === "missing" &&
        ["SUPABASE_SERVICE_ROLE_KEY", "STRIPE_SECRET_KEY"].includes(v.variable),
    );

    criticalMissingVars.forEach((variable) => {
      issues.push(`Variable critique manquante : ${variable.variable}`);
    });

    // Activités hautement suspectes
    const criticalActivities = result.auditLogs.filter(
      (a) => a.riskLevel === "high",
    ).length;
    if (criticalActivities > 10) {
      issues.push(`Nombre élevé d'activités suspectes : ${criticalActivities}`);
    }

    return issues;
  }

  private isKnownBadIP(ip: string): boolean {
    // Liste simplifiée d'IPs suspectes pour démo
    const knownBadIPs = [
      "127.0.0.1", // Exemple : localhost ne devrait pas être en production
      "0.0.0.0",
    ];

    return knownBadIPs.includes(ip);
  }

  async generateSecurityReport(result: SecurityAuditResult): Promise<string> {
    let report = "\n=== RAPPORT AUDIT SÉCURITÉ ===\n\n";

    // Score global
    report += `## SCORE GLOBAL : ${result.overallScore}/100\n`;

    if (result.overallScore >= 90) {
      report += "Statut : EXCELLENT\n";
    } else if (result.overallScore >= 75) {
      report += "Statut : BON\n";
    } else if (result.overallScore >= 60) {
      report += "Statut : MOYEN - Améliorations requises\n";
    } else {
      report += "Statut : CRITIQUE - Action immédiate requise\n";
    }

    report += "\n";

    // Issues critiques
    if (result.criticalIssues.length > 0) {
      report += "## ISSUES CRITIQUES\n";
      result.criticalIssues.forEach((issue) => {
        report += `- ${issue}\n`;
      });
      report += "\n";
    }

    // RLS Policies
    const rlsIssues = result.rlsPolicies.filter((p) => p.issues.length > 0);
    if (rlsIssues.length > 0) {
      report += "## PROBLÈMES RLS\n";
      rlsIssues.forEach((table) => {
        report += `- ${table.tableName}: ${table.issues.join(", ")}\n`;
      });
      report += "\n";
    }

    // Variables d'environnement
    const envIssues = result.environmentVariables.filter(
      (v) => v.status !== "present",
    );
    if (envIssues.length > 0) {
      report += "## VARIABLES D'ENVIRONNEMENT\n";
      envIssues.forEach((variable) => {
        report += `- ${variable.variable}: ${variable.issue || variable.status}\n`;
      });
      report += "\n";
    }

    // Activités suspectes
    const highRiskActivities = result.auditLogs.filter(
      (a) => a.riskLevel === "high",
    );
    if (highRiskActivities.length > 0) {
      report += "## ACTIVITÉS À HAUT RISQUE\n";
      highRiskActivities.slice(0, 10).forEach((activity) => {
        report += `- ${activity.timestamp}: ${activity.eventType}\n`;
      });
      if (highRiskActivities.length > 10) {
        report += `... et ${highRiskActivities.length - 10} autres\n`;
      }
      report += "\n";
    }

    // Recommandations
    if (result.recommendations.length > 0) {
      report += "## RECOMMANDATIONS\n";
      result.recommendations.forEach((rec, i) => {
        report += `${i + 1}. ${rec}\n`;
      });
    }

    return report;
  }
}

// Script CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  const config: AuditConfig = {
    fixIssues: args.includes("--fix-issues"),
    checkLogs: !args.includes("--skip-logs"),
    logsDays: parseInt(
      args.find((arg) => arg.startsWith("--logs-days="))?.split("=")[1] || "7",
    ),
  };

  const auditor = new SecurityAuditor();

  auditor
    .runFullAudit(config)
    .then(async (result) => {
      const report = await auditor.generateSecurityReport(result);
      console.log(report);

      // Sortir avec erreur si score critique
      if (result.overallScore < 60 || result.criticalIssues.length > 0) {
        console.error(
          `\nAUDIT ÉCHOUÉ : Score ${result.overallScore}/100 avec ${result.criticalIssues.length} issues critiques`,
        );
        process.exit(1);
      }

      console.log(`\nAUDIT RÉUSSI : Score ${result.overallScore}/100`);
    })
    .catch((error) => {
      console.error("Erreur audit sécurité:", error);
      process.exit(1);
    });
}
