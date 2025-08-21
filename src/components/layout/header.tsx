// src/components/layout/header.tsx
"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { HeaderClient } from "./header-client";
import { createClient } from "@/lib/supabase/client";
import { isAdminRole, hasAdminAccess, type UserRole } from "@/lib/auth/types";
import type { AuthChangeEvent } from "@supabase/supabase-js";

// Cache TTL de 5 minutes pour éviter les vérifications excessives
const ADMIN_CHECK_CACHE_TTL = 5 * 60 * 1000;

interface AdminCheckCache {
  isAdmin: boolean;
  timestamp: number;
  userId: string;
}

export function Header() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const cacheRef = useRef<AdminCheckCache | null>(null);
  const checkInProgressRef = useRef(false);

  const checkAdminStatus = useCallback(async (forceCheck = false) => {
    // Éviter les vérifications concurrentes
    if (checkInProgressRef.current && !forceCheck) {
      return;
    }

    try {
      checkInProgressRef.current = true;
      const supabase = createClient();

      // Obtenir l'utilisateur actuel
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        // En cas d'erreur, réinitialiser l'état admin
        console.warn("Header: Error getting user:", userError.message);
        setIsAdmin(false);
        cacheRef.current = null;
        return;
      }

      if (!user) {
        // Pas d'utilisateur connecté
        setIsAdmin(false);
        cacheRef.current = null;
        return;
      }

      // Vérifier le cache
      const now = Date.now();
      if (
        !forceCheck &&
        cacheRef.current &&
        cacheRef.current.userId === user.id &&
        now - cacheRef.current.timestamp < ADMIN_CHECK_CACHE_TTL
      ) {
        // Utiliser la valeur en cache
        setIsAdmin(cacheRef.current.isAdmin);
        return;
      }

      // Récupérer le profil avec le rôle
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, status")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.warn("Header: Error getting profile:", profileError.message);
        setIsAdmin(false);
        cacheRef.current = null;
        return;
      }

      // Vérifier le statut du compte
      if (profile?.status === "suspended" || profile?.status === "deleted") {
        console.warn("Header: Account is suspended or deleted");
        setIsAdmin(false);
        cacheRef.current = null;
        return;
      }

      const role = profile?.role as UserRole | null;

      // Double vérification : role admin ET permission admin:access
      const adminStatus = role
        ? isAdminRole(role) || hasAdminAccess(role)
        : false;

      // Validation supplémentaire : vérifier que le rôle est bien dans la liste autorisée
      const validAdminRoles: UserRole[] = ["admin"];
      const isValidAdmin =
        role && validAdminRoles.includes(role) && adminStatus;

      // Mettre à jour le cache
      cacheRef.current = {
        isAdmin: isValidAdmin,
        timestamp: now,
        userId: user.id,
      };

      console.log("Header: Admin check completed", {
        userId: user.id,
        role,
        status: profile?.status,
        isAdmin: isValidAdmin,
        cached: !forceCheck,
      });

      setIsAdmin(isValidAdmin);
    } catch (error) {
      console.error("Header: Unexpected error checking admin status:", error);
      // En cas d'erreur inattendue, par sécurité, refuser l'accès admin
      setIsAdmin(false);
      cacheRef.current = null;
    } finally {
      checkInProgressRef.current = false;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Vérification initiale
    checkAdminStatus();

    // Écouter les changements d'authentification
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session) => {
      console.log("Header: Auth state changed", {
        event,
        hasSession: !!session,
      });

      // Événements qui nécessitent une revérification immédiate
      const criticalEvents: AuthChangeEvent[] = [
        "SIGNED_IN",
        "SIGNED_OUT",
        "USER_UPDATED",
        "TOKEN_REFRESHED",
      ];

      if (criticalEvents.includes(event)) {
        // Forcer la vérification pour les événements critiques
        checkAdminStatus(true);
      } else if (event === "INITIAL_SESSION") {
        // Vérification normale pour la session initiale
        checkAdminStatus();
      }

      // Si l'utilisateur se déconnecte, réinitialiser immédiatement
      if (event === "SIGNED_OUT") {
        setIsAdmin(false);
        cacheRef.current = null;
      }
    });

    // Vérification périodique pour s'assurer de la fraîcheur des données
    const intervalId = setInterval(() => {
      checkAdminStatus();
    }, ADMIN_CHECK_CACHE_TTL);

    // Cleanup
    return () => {
      subscription.unsubscribe();
      clearInterval(intervalId);
    };
  }, [checkAdminStatus]);

  // Log pour le débogage en développement
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("Header: Current admin state", { isAdmin, isLoading });
    }
  }, [isAdmin, isLoading]);

  return <HeaderClient isAdmin={isAdmin} isLoading={isLoading} />;
}
