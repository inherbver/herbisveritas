// src/components/layout/header.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { HeaderClient } from "./header-client";
import { createClient } from "@/lib/supabase/client";
import { isAdminRole, type UserRole } from "@/lib/auth/types";
import type { AuthChangeEvent } from "@supabase/supabase-js";

// Clé pour le cache de session (sessionStorage)
const SESSION_CACHE_KEY = "admin_ui_hint";

export function Header() {
  // Initialiser avec le cache de session pour affichage immédiat
  const [isAdmin, setIsAdmin] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem(SESSION_CACHE_KEY) === "true";
    }
    return false;
  });

  const [isLoading, setIsLoading] = useState(true);

  const checkAdminStatus = useCallback(async () => {
    try {
      const supabase = createClient();

      // Obtenir l'utilisateur actuel
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        // Pas d'utilisateur ou erreur : nettoyer et retourner false
        setIsAdmin(false);
        sessionStorage.removeItem(SESSION_CACHE_KEY);
        setIsLoading(false);
        return;
      }

      // Récupérer le profil pour vérifier le rôle
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, status")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        console.warn("Header: Could not fetch profile", profileError?.message);
        setIsAdmin(false);
        sessionStorage.removeItem(SESSION_CACHE_KEY);
        setIsLoading(false);
        return;
      }

      // Vérifier le statut du compte
      if (profile.status === "suspended" || profile.status === "deleted") {
        setIsAdmin(false);
        sessionStorage.removeItem(SESSION_CACHE_KEY);
        setIsLoading(false);
        return;
      }

      // Vérifier si l'utilisateur est admin
      const role = profile.role as UserRole | null;
      const isUserAdmin = role === "admin" && isAdminRole(role);

      // Mettre à jour l'état et le cache de session
      setIsAdmin(isUserAdmin);

      if (isUserAdmin) {
        sessionStorage.setItem(SESSION_CACHE_KEY, "true");
      } else {
        sessionStorage.removeItem(SESSION_CACHE_KEY);
      }

      setIsLoading(false);

      if (process.env.NODE_ENV === "development") {
        console.log("Header: Admin check completed", {
          userId: user.id,
          role,
          isAdmin: isUserAdmin,
        });
      }
    } catch (error) {
      console.error("Header: Error checking admin status:", error);
      // En cas d'erreur, par sécurité, refuser l'accès admin
      setIsAdmin(false);
      sessionStorage.removeItem(SESSION_CACHE_KEY);
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
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      // Événements nécessitant une revérification
      const eventsToCheck: AuthChangeEvent[] = [
        "SIGNED_IN",
        "SIGNED_OUT",
        "USER_UPDATED",
        "TOKEN_REFRESHED",
      ];

      if (eventsToCheck.includes(event)) {
        checkAdminStatus();
      }

      // Nettoyage immédiat lors de la déconnexion
      if (event === "SIGNED_OUT") {
        setIsAdmin(false);
        sessionStorage.removeItem(SESSION_CACHE_KEY);
      }
    });

    // Cleanup
    return () => {
      subscription.unsubscribe();
    };
  }, [checkAdminStatus]);

  return <HeaderClient isAdmin={isAdmin} isLoading={isLoading} />;
}
