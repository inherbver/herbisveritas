/**
 * Anomaly Detector - Détection des comportements suspects
 *
 * Détecte:
 * - Tentatives de force brute
 * - Connexions depuis localisations inhabituelles
 * - Patterns de navigation suspects
 * - Changements de device/browser inhabituels
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logSecurityEvent } from "./admin-service";

export interface AnomalyReport {
  userId?: string;
  email?: string;
  type: AnomalyType;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence: number; // 0-100
  details: Record<string, any>;
  recommendations: string[];
  timestamp: Date;
}

export type AnomalyType =
  | "BRUTE_FORCE"
  | "IMPOSSIBLE_TRAVEL"
  | "NEW_DEVICE"
  | "SUSPICIOUS_PATTERN"
  | "ACCOUNT_TAKEOVER"
  | "RATE_LIMIT_ABUSE"
  | "SESSION_HIJACKING";

export class AnomalyDetector {
  private static instance: AnomalyDetector;

  // Seuils de détection
  private readonly THRESHOLDS = {
    MAX_FAILED_ATTEMPTS: 5,
    TIME_WINDOW_MINUTES: 15,
    MAX_DISTANCE_KM_PER_HOUR: 1000, // Vitesse max de déplacement
    SUSPICIOUS_ACTIONS_COUNT: 10,
    NEW_DEVICE_TRUST_DAYS: 7,
  };

  private constructor() {}

  static getInstance(): AnomalyDetector {
    if (!AnomalyDetector.instance) {
      AnomalyDetector.instance = new AnomalyDetector();
    }
    return AnomalyDetector.instance;
  }

  /**
   * Analyse principale - vérifie toutes les anomalies
   */
  async analyzeUserBehavior(
    userId: string,
    currentAction: string,
    metadata?: Record<string, any>,
  ): Promise<AnomalyReport[]> {
    const reports: AnomalyReport[] = [];

    // Vérifier les tentatives de force brute
    const bruteForce = await this.checkBruteForce(userId);
    if (bruteForce) reports.push(bruteForce);

    // Vérifier le voyage impossible
    if (metadata?.ipAddress) {
      const travel = await this.checkImpossibleTravel(
        userId,
        metadata.ipAddress,
      );
      if (travel) reports.push(travel);
    }

    // Vérifier les nouveaux devices
    if (metadata?.userAgent) {
      const device = await this.checkNewDevice(userId, metadata.userAgent);
      if (device) reports.push(device);
    }

    // Vérifier les patterns suspects
    const pattern = await this.checkSuspiciousPattern(userId, currentAction);
    if (pattern) reports.push(pattern);

    // Logger les anomalies critiques
    for (const report of reports) {
      if (report.severity === "CRITICAL" || report.severity === "HIGH") {
        await this.handleCriticalAnomaly(report);
      }
    }

    return reports;
  }

  /**
   * Détection de force brute
   */
  private async checkBruteForce(userId: string): Promise<AnomalyReport | null> {
    const supabase = await createSupabaseServerClient();

    const timeWindow = new Date(
      Date.now() - this.THRESHOLDS.TIME_WINDOW_MINUTES * 60 * 1000,
    );

    // Compter les tentatives échouées
    const { data: failedAttempts } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("event_type", "LOGIN_FAILED")
      .gte("created_at", timeWindow.toISOString());

    if (
      !failedAttempts ||
      failedAttempts.length < this.THRESHOLDS.MAX_FAILED_ATTEMPTS
    ) {
      return null;
    }

    return {
      userId,
      type: "BRUTE_FORCE",
      severity: failedAttempts.length > 10 ? "CRITICAL" : "HIGH",
      confidence: Math.min(95, 50 + failedAttempts.length * 5),
      details: {
        attempts: failedAttempts.length,
        timeWindow: this.THRESHOLDS.TIME_WINDOW_MINUTES,
        lastAttempt: failedAttempts[failedAttempts.length - 1].created_at,
      },
      recommendations: [
        "Bloquer temporairement le compte",
        "Forcer un reset de mot de passe",
        "Activer la 2FA",
      ],
      timestamp: new Date(),
    };
  }

  /**
   * Détection de voyage impossible
   */
  private async checkImpossibleTravel(
    userId: string,
    currentIP: string,
  ): Promise<AnomalyReport | null> {
    const supabase = await createSupabaseServerClient();

    // Récupérer la dernière connexion
    const { data: lastLogin } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("event_type", "USER_LOGIN")
      .order("created_at", { ascending: false })
      .limit(2); // Current + previous

    if (!lastLogin || lastLogin.length < 2) {
      return null;
    }

    const previous = lastLogin[1];
    const previousIP = previous.data?.ip_address;

    if (!previousIP || previousIP === currentIP) {
      return null;
    }

    // Calculer le temps écoulé
    const timeDiff = Date.now() - new Date(previous.created_at).getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    // Obtenir la distance approximative (simplifiée - en prod utiliser une API de géolocalisation)
    const distance = await this.estimateIPDistance(previousIP, currentIP);

    if (distance / hoursDiff > this.THRESHOLDS.MAX_DISTANCE_KM_PER_HOUR) {
      return {
        userId,
        type: "IMPOSSIBLE_TRAVEL",
        severity: "HIGH",
        confidence: 85,
        details: {
          previousIP,
          currentIP,
          distance: `${distance} km`,
          timeDiff: `${hoursDiff.toFixed(1)} heures`,
          speed: `${(distance / hoursDiff).toFixed(0)} km/h`,
        },
        recommendations: [
          "Vérifier l'identité de l'utilisateur",
          "Demander une confirmation par email",
          "Révoquer les sessions suspectes",
        ],
        timestamp: new Date(),
      };
    }

    return null;
  }

  /**
   * Détection de nouveau device
   */
  private async checkNewDevice(
    userId: string,
    userAgent: string,
  ): Promise<AnomalyReport | null> {
    const supabase = await createSupabaseServerClient();

    // Parser le user agent
    const deviceFingerprint = this.generateDeviceFingerprint(userAgent);

    // Vérifier si ce device est connu
    const { data: knownDevices } = await supabase
      .from("user_devices")
      .select("*")
      .eq("user_id", userId)
      .eq("fingerprint", deviceFingerprint);

    if (knownDevices && knownDevices.length > 0) {
      // Device connu
      const lastSeen = new Date(knownDevices[0].last_seen);
      const daysSinceLastSeen =
        (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60 * 24);

      // Mise à jour last_seen
      await supabase
        .from("user_devices")
        .update({ last_seen: new Date().toISOString() })
        .eq("id", knownDevices[0].id);

      // Alerte si device non vu depuis longtemps
      if (daysSinceLastSeen > 30) {
        return {
          userId,
          type: "NEW_DEVICE",
          severity: "LOW",
          confidence: 60,
          details: {
            deviceId: knownDevices[0].id,
            lastSeen: lastSeen.toISOString(),
            daysSinceLastSeen: Math.round(daysSinceLastSeen),
          },
          recommendations: ["Demander confirmation à l'utilisateur"],
          timestamp: new Date(),
        };
      }

      return null;
    }

    // Nouveau device détecté
    await supabase.from("user_devices").insert({
      user_id: userId,
      fingerprint: deviceFingerprint,
      user_agent: userAgent,
      trusted: false,
      last_seen: new Date().toISOString(),
    });

    return {
      userId,
      type: "NEW_DEVICE",
      severity: "MEDIUM",
      confidence: 75,
      details: {
        userAgent,
        fingerprint: deviceFingerprint,
      },
      recommendations: [
        "Envoyer un email de notification",
        "Demander confirmation du nouveau device",
        "Suggérer l'activation de la 2FA",
      ],
      timestamp: new Date(),
    };
  }

  /**
   * Détection de patterns suspects
   */
  private async checkSuspiciousPattern(
    userId: string,
    currentAction: string,
  ): Promise<AnomalyReport | null> {
    const supabase = await createSupabaseServerClient();

    // Analyser les actions récentes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const { data: recentActions } = await supabase
      .from("audit_logs")
      .select("event_type, created_at")
      .eq("user_id", userId)
      .gte("created_at", fiveMinutesAgo.toISOString())
      .order("created_at", { ascending: false });

    if (!recentActions) return null;

    // Patterns suspects
    const suspiciousPatterns = [
      {
        pattern: ["LOGIN", "PROFILE_UPDATE", "PASSWORD_CHANGE"],
        severity: "HIGH" as const,
        description: "Changement rapide de mot de passe après connexion",
      },
      {
        pattern: ["LOGIN", "BULK_DELETE", "LOGOUT"],
        severity: "CRITICAL" as const,
        description: "Suppression massive de données",
      },
      {
        pattern: ["LOGIN_FAILED", "LOGIN_FAILED", "LOGIN_FAILED", "LOGIN"],
        severity: "MEDIUM" as const,
        description: "Connexion après multiples échecs",
      },
    ];

    // Vérifier chaque pattern
    for (const { pattern, severity, description } of suspiciousPatterns) {
      if (
        this.matchesPattern(
          recentActions.map((a) => a.event_type),
          pattern,
        )
      ) {
        return {
          userId,
          type: "SUSPICIOUS_PATTERN",
          severity,
          confidence: 70,
          details: {
            pattern: pattern.join(" → "),
            description,
            actions: recentActions.slice(0, pattern.length),
          },
          recommendations: [
            "Examiner l'activité en détail",
            "Contacter l'utilisateur pour confirmation",
            severity === "CRITICAL" ? "Suspendre le compte immédiatement" : "",
          ].filter(Boolean),
          timestamp: new Date(),
        };
      }
    }

    // Vérifier le volume d'actions
    if (recentActions.length > this.THRESHOLDS.SUSPICIOUS_ACTIONS_COUNT) {
      return {
        userId,
        type: "RATE_LIMIT_ABUSE",
        severity: "MEDIUM",
        confidence: 65,
        details: {
          actionCount: recentActions.length,
          timeWindow: "5 minutes",
          actions: recentActions.map((a) => a.event_type),
        },
        recommendations: [
          "Appliquer un rate limiting plus strict",
          "Surveiller l'activité",
        ],
        timestamp: new Date(),
      };
    }

    return null;
  }

  /**
   * Gestion des anomalies critiques
   */
  private async handleCriticalAnomaly(report: AnomalyReport): Promise<void> {
    // Logger l'événement de sécurité
    await logSecurityEvent({
      type: "anomaly_detected",
      userId: report.userId,
      severity: report.severity,
      details: {
        anomalyType: report.type,
        confidence: report.confidence,
        ...report.details,
      },
    });

    // Actions automatiques selon le type
    switch (report.type) {
      case "BRUTE_FORCE":
        // TODO: Bloquer temporairement le compte
        console.error(
          `CRITICAL: Brute force detected for user ${report.userId}`,
        );
        break;

      case "ACCOUNT_TAKEOVER":
        // TODO: Révoquer toutes les sessions
        console.error(
          `CRITICAL: Potential account takeover for user ${report.userId}`,
        );
        break;

      case "SESSION_HIJACKING":
        // TODO: Invalider la session suspecte
        console.error(
          `CRITICAL: Session hijacking detected for user ${report.userId}`,
        );
        break;
    }

    // TODO: Envoyer des alertes (email, Slack, etc.)
  }

  /**
   * Helpers
   */
  private generateDeviceFingerprint(userAgent: string): string {
    // Simplification - en prod utiliser une lib comme fingerprintjs
    const parts =
      userAgent.match(/(Chrome|Safari|Firefox|Edge)\/[\d.]+/g) || [];
    const os =
      userAgent.match(/(Windows|Mac|Linux|Android|iOS)/i)?.[0] || "Unknown";
    return `${os}-${parts.join("-")}`.toLowerCase();
  }

  private async estimateIPDistance(ip1: string, ip2: string): Promise<number> {
    // Simplification - en prod utiliser une API de géolocalisation
    // Pour l'instant, retourner une distance aléatoire pour le test
    if (ip1 === ip2) return 0;

    // Simulation basique
    const hash1 = ip1.split(".").reduce((a, b) => a + parseInt(b), 0);
    const hash2 = ip2.split(".").reduce((a, b) => a + parseInt(b), 0);
    const diff = Math.abs(hash1 - hash2);

    // Convertir en distance approximative (très simplifiée)
    return diff * 10; // km
  }

  private matchesPattern(actions: string[], pattern: string[]): boolean {
    if (actions.length < pattern.length) return false;

    for (let i = 0; i <= actions.length - pattern.length; i++) {
      let matches = true;
      for (let j = 0; j < pattern.length; j++) {
        if (actions[i + j] !== pattern[j]) {
          matches = false;
          break;
        }
      }
      if (matches) return true;
    }

    return false;
  }
}

export const anomalyDetector = AnomalyDetector.getInstance();
