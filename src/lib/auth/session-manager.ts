/**
 * Session Manager - Gestion centralisée des sessions utilisateur
 *
 * Fonctionnalités:
 * - Détection de sessions multiples
 * - Invalidation de sessions
 * - Tracking des devices
 * - Analyse comportementale basique
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";

export interface SessionInfo {
  id: string;
  userId: string;
  deviceId?: string;
  userAgent?: string;
  ipAddress?: string;
  lastActivity: Date;
  createdAt: Date;
  isActive: boolean;
}

export interface DeviceInfo {
  id: string;
  name: string;
  type: "desktop" | "mobile" | "tablet" | "unknown";
  os?: string;
  browser?: string;
  lastSeen: Date;
  trusted: boolean;
}

export class SessionManager {
  private static instance: SessionManager;

  private constructor() {}

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Enregistre une nouvelle session
   */
  async createSession(
    userId: string,
    deviceInfo?: Partial<DeviceInfo>,
  ): Promise<SessionInfo> {
    const supabase = await createSupabaseServerClient();

    // Générer un ID de session unique
    const sessionId = crypto.randomUUID();

    // Enregistrer dans la DB
    const { data, error } = await supabase
      .from("user_sessions")
      .insert({
        id: sessionId,
        user_id: userId,
        device_info: deviceInfo,
        is_active: true,
        last_activity: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create session:", error);
      throw new Error("Session creation failed");
    }

    return this.mapToSessionInfo(data);
  }

  /**
   * Récupère toutes les sessions actives d'un utilisateur
   */
  async getUserSessions(userId: string): Promise<SessionInfo[]> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("user_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("last_activity", { ascending: false });

    if (error) {
      console.error("Failed to get user sessions:", error);
      return [];
    }

    return data.map(this.mapToSessionInfo);
  }

  /**
   * Met à jour l'activité d'une session
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    const supabase = await createSupabaseServerClient();

    await supabase
      .from("user_sessions")
      .update({
        last_activity: new Date().toISOString(),
      })
      .eq("id", sessionId);
  }

  /**
   * Invalide une session spécifique
   */
  async invalidateSession(sessionId: string): Promise<void> {
    const supabase = await createSupabaseServerClient();

    await supabase
      .from("user_sessions")
      .update({
        is_active: false,
        invalidated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
  }

  /**
   * Invalide toutes les sessions d'un utilisateur sauf celle en cours
   */
  async invalidateOtherSessions(
    userId: string,
    currentSessionId: string,
  ): Promise<number> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("user_sessions")
      .update({
        is_active: false,
        invalidated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("is_active", true)
      .neq("id", currentSessionId)
      .select();

    return data?.length || 0;
  }

  /**
   * Détecte les activités suspectes
   */
  async detectSuspiciousActivity(userId: string): Promise<{
    suspicious: boolean;
    reasons: string[];
  }> {
    const reasons: string[] = [];
    const sessions = await this.getUserSessions(userId);

    // Vérifier le nombre de sessions actives
    if (sessions.length > 5) {
      reasons.push(`Trop de sessions actives (${sessions.length})`);
    }

    // Vérifier les IPs distinctes dans la dernière heure
    const recentSessions = sessions.filter((s) => {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      return s.lastActivity > hourAgo;
    });

    const uniqueIPs = new Set(
      recentSessions.map((s) => s.ipAddress).filter(Boolean),
    );

    if (uniqueIPs.size > 3) {
      reasons.push(`Connexions depuis ${uniqueIPs.size} IPs différentes`);
    }

    // Vérifier les changements rapides de localisation
    // TODO: Implémenter la géolocalisation

    return {
      suspicious: reasons.length > 0,
      reasons,
    };
  }

  /**
   * Nettoie les sessions expirées
   */
  async cleanupExpiredSessions(): Promise<number> {
    const admin = createAdminClient();

    // Sessions inactives depuis plus de 30 jours
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const { data, error } = await admin
      .from("user_sessions")
      .delete()
      .or(`is_active.eq.false,last_activity.lt.${thirtyDaysAgo.toISOString()}`)
      .select();

    if (error) {
      console.error("Failed to cleanup sessions:", error);
      return 0;
    }

    return data?.length || 0;
  }

  /**
   * Mapper les données DB vers SessionInfo
   */
  private mapToSessionInfo(data: any): SessionInfo {
    return {
      id: data.id,
      userId: data.user_id,
      deviceId: data.device_info?.id,
      userAgent: data.device_info?.userAgent,
      ipAddress: data.ip_address,
      lastActivity: new Date(data.last_activity),
      createdAt: new Date(data.created_at),
      isActive: data.is_active,
    };
  }

  /**
   * Obtient les informations du device depuis le User-Agent
   */
  parseDeviceInfo(userAgent: string): Partial<DeviceInfo> {
    // Détection basique - peut être amélioré avec une lib comme ua-parser-js
    const isMobile = /Mobile|Android|iPhone/i.test(userAgent);
    const isTablet = /iPad|Tablet/i.test(userAgent);

    let type: DeviceInfo["type"] = "unknown";
    if (isMobile) type = "mobile";
    else if (isTablet) type = "tablet";
    else if (userAgent) type = "desktop";

    // Détection OS
    let os: string | undefined;
    if (/Windows/i.test(userAgent)) os = "Windows";
    else if (/Mac OS/i.test(userAgent)) os = "macOS";
    else if (/Linux/i.test(userAgent)) os = "Linux";
    else if (/Android/i.test(userAgent)) os = "Android";
    else if (/iOS|iPhone|iPad/i.test(userAgent)) os = "iOS";

    // Détection navigateur
    let browser: string | undefined;
    if (/Chrome/i.test(userAgent) && !/Edge/i.test(userAgent))
      browser = "Chrome";
    else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent))
      browser = "Safari";
    else if (/Firefox/i.test(userAgent)) browser = "Firefox";
    else if (/Edge/i.test(userAgent)) browser = "Edge";

    return {
      type,
      os,
      browser,
      name: `${browser || "Unknown"} on ${os || "Unknown"}`,
    };
  }
}

export const sessionManager = SessionManager.getInstance();
