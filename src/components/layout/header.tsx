// src/components/layout/header.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { HeaderClient } from "./header-client";
import { createClient } from "@/lib/supabase/client";
import { isAdminRole, type UserRole } from "@/lib/auth/types";
import type { AuthChangeEvent } from "@supabase/supabase-js";

// Clés pour le cache de session (sessionStorage)
const SESSION_CACHE_KEY = "admin_ui_hint";
const SESSION_CACHE_TIMESTAMP_KEY = "admin_ui_hint_timestamp";
const CACHE_VALIDITY_MS = 5 * 60 * 1000; // 5 minutes

export function Header() {
  // Initialiser avec le cache de session pour affichage immédiat
  const [isAdmin, setIsAdmin] = useState(() => {
    if (typeof window !== "undefined") {
      // Vérifier si on vient juste de se connecter (présence du flag)
      const justLoggedIn = sessionStorage.getItem("just_logged_in");
      if (justLoggedIn) {
        // Si on vient de se connecter, forcer la vérification immédiate
        sessionStorage.removeItem("just_logged_in");
        return false; // Ne pas utiliser le cache, forcer la vérification
      }

      const cachedValue = sessionStorage.getItem(SESSION_CACHE_KEY);
      const cachedTimestamp = sessionStorage.getItem(
        SESSION_CACHE_TIMESTAMP_KEY,
      );

      // Vérifier si le cache est encore valide
      if (cachedValue && cachedTimestamp) {
        const timestamp = parseInt(cachedTimestamp, 10);
        const isValid = Date.now() - timestamp < CACHE_VALIDITY_MS;

        if (isValid) {
          return cachedValue === "true";
        } else {
          // Cache expiré, le nettoyer
          sessionStorage.removeItem(SESSION_CACHE_KEY);
          sessionStorage.removeItem(SESSION_CACHE_TIMESTAMP_KEY);
        }
      }
    }
    return false;
  });

  const [isLoading, setIsLoading] = useState(true);

  const checkAdminStatus = useCallback(async (retryCount = 0) => {
    try {
      const supabase = createClient();

      // Obtenir l'utilisateur actuel
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        // Si c'est un retry et qu'il n'y a toujours pas d'utilisateur, arrêter
        if (retryCount > 0) {
          setIsAdmin(false);
          sessionStorage.removeItem(SESSION_CACHE_KEY);
          sessionStorage.removeItem(SESSION_CACHE_TIMESTAMP_KEY);
          setIsLoading(false);
          return;
        }

        // Premier essai : possibilité de timing, retry après délai court
        setTimeout(() => checkAdminStatus(retryCount + 1), 200);
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

        // Si c'est le premier essai et que le profil n'est pas trouvé,
        // il se peut que ce soit un problème de timing après connexion
        if (retryCount === 0 && profileError?.code === "PGRST116") {
          setTimeout(() => checkAdminStatus(retryCount + 1), 300);
          return;
        }

        setIsAdmin(false);
        sessionStorage.removeItem(SESSION_CACHE_KEY);
        sessionStorage.removeItem(SESSION_CACHE_TIMESTAMP_KEY);
        setIsLoading(false);
        return;
      }

      // Vérifier le statut du compte
      if (profile.status === "suspended" || profile.status === "deleted") {
        setIsAdmin(false);
        sessionStorage.removeItem(SESSION_CACHE_KEY);
        sessionStorage.removeItem(SESSION_CACHE_TIMESTAMP_KEY);
        setIsLoading(false);
        return;
      }

      // Vérifier si l'utilisateur est admin
      const role = profile.role as UserRole | null;
      const isUserAdmin = role === "admin" && isAdminRole(role);

      // Mettre à jour l'état et le cache de session
      setIsAdmin(isUserAdmin);

      if (isUserAdmin) {
        const timestamp = Date.now().toString();
        sessionStorage.setItem(SESSION_CACHE_KEY, "true");
        sessionStorage.setItem(SESSION_CACHE_TIMESTAMP_KEY, timestamp);
      } else {
        sessionStorage.removeItem(SESSION_CACHE_KEY);
        sessionStorage.removeItem(SESSION_CACHE_TIMESTAMP_KEY);
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
      sessionStorage.removeItem(SESSION_CACHE_TIMESTAMP_KEY);
      setIsLoading(false);
    }
  }, []); // checkAdminStatus maintenant prend un paramètre optionnel

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
        // Pour SIGNED_IN, ajouter un petit délai pour s'assurer que
        // la session est complètement établie
        if (event === "SIGNED_IN") {
          // Marquer qu'on vient de se connecter pour forcer le refresh
          if (typeof window !== "undefined") {
            sessionStorage.setItem("just_logged_in", "true");
          }
          // Nettoyer le cache admin pour forcer la vérification
          sessionStorage.removeItem(SESSION_CACHE_KEY);
          sessionStorage.removeItem(SESSION_CACHE_TIMESTAMP_KEY);
          setTimeout(() => checkAdminStatus(), 150);
        } else {
          checkAdminStatus();
        }
      }

      // Nettoyage immédiat lors de la déconnexion
      if (event === "SIGNED_OUT") {
        setIsAdmin(false);
        sessionStorage.removeItem(SESSION_CACHE_KEY);
        sessionStorage.removeItem(SESSION_CACHE_TIMESTAMP_KEY);
      }
    });

    // Cleanup
    return () => {
      subscription.unsubscribe();
    };
  }, [checkAdminStatus]);

  return <HeaderClient isAdmin={isAdmin} isLoading={isLoading} />;
}
