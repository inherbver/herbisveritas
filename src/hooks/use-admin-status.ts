"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { isAdminRole, hasAdminAccess, type UserRole } from "@/lib/auth/types";
import type { User } from "@supabase/supabase-js";

interface AdminStatus {
  isAdmin: boolean;
  isLoading: boolean;
  user: User | null;
  role: UserRole | null;
  error: string | null;
}

/**
 * Hook personnalisé pour obtenir le statut admin de l'utilisateur actuel
 * Inclut une mise en cache et une gestion robuste des erreurs
 */
export function useAdminStatus(): AdminStatus {
  const [status, setStatus] = useState<AdminStatus>({
    isAdmin: false,
    isLoading: true,
    user: null,
    role: null,
    error: null,
  });

  const checkAdminStatus = useCallback(async () => {
    try {
      const supabase = createClient();

      // Obtenir l'utilisateur actuel
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        setStatus({
          isAdmin: false,
          isLoading: false,
          user: null,
          role: null,
          error: userError.message,
        });
        return;
      }

      if (!user) {
        setStatus({
          isAdmin: false,
          isLoading: false,
          user: null,
          role: null,
          error: null,
        });
        return;
      }

      // Obtenir le profil avec le rôle
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, status")
        .eq("id", user.id)
        .single();

      if (profileError) {
        setStatus({
          isAdmin: false,
          isLoading: false,
          user,
          role: null,
          error: profileError.message,
        });
        return;
      }

      // Vérifier le statut du compte
      if (profile?.status === "suspended" || profile?.status === "deleted") {
        setStatus({
          isAdmin: false,
          isLoading: false,
          user,
          role: profile.role as UserRole,
          error: "Account is suspended or deleted",
        });
        return;
      }

      const role = profile?.role as UserRole | null;
      const adminStatus = role
        ? isAdminRole(role) || hasAdminAccess(role)
        : false;

      setStatus({
        isAdmin: adminStatus,
        isLoading: false,
        user,
        role,
        error: null,
      });
    } catch (error) {
      console.error("useAdminStatus: Error checking admin status", error);
      setStatus({
        isAdmin: false,
        isLoading: false,
        user: null,
        role: null,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, []);

  useEffect(() => {
    // Vérification initiale
    checkAdminStatus();

    // Écouter les changements d'authentification
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      // Revérifier le statut lors des événements importants
      if (
        ["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED", "TOKEN_REFRESHED"].includes(
          event,
        )
      ) {
        checkAdminStatus();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [checkAdminStatus]);

  return status;
}
