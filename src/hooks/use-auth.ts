"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { type User, type Session, type AuthChangeEvent } from "@supabase/supabase-js";
import { type AppPermission, type AppRole } from "@/config/permissions";
import { hasPermission } from "@/lib/auth/utils";

// This hook manages the full auth state on the client, providing user, role, and a permission check function.
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Memoize the Supabase client instance to prevent re-creation on re-renders.
  const supabase = createClient();

  useEffect(() => {
    // Set up an auth state change listener.
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        // The role is stored in user_metadata, which is a secure place for such data.
        setRole((currentUser?.user_metadata?.role as AppRole) || null);
        setIsLoading(false);
      }
    );

    // Perform an initial check of the user's auth state when the hook mounts.
    const checkUser = async () => {
      try {
        // Ajouter un timeout pour éviter les blocages
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Auth_Timeout")), 3000)
        );

        const userPromise = supabase.auth.getUser();
        const { data } = await Promise.race([userPromise, timeoutPromise]);

        setUser(data.user);
        setRole((data.user?.user_metadata?.role as AppRole) || null);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        // Gestion silencieuse des erreurs réseau temporaires
        if (
          errorMessage === "Auth_Timeout" ||
          errorMessage.includes("Failed to fetch") ||
          errorMessage.includes("fetch") ||
          errorMessage.includes("network")
        ) {
          console.warn(
            "useAuth: Network/timeout error during user check - continuing silently:",
            errorMessage
          );
          // Ne pas bloquer, juste continuer sans utilisateur
          setUser(null);
          setRole(null);
        } else {
          console.error("Error fetching user:", error);
          setUser(null);
          setRole(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();

    // Cleanup: Unsubscribe from the auth listener when the component unmounts.
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  // useCallback memoizes the function, ensuring it's not re-created on every render
  // unless its dependencies (the role) change.
  const checkPermission = useCallback(
    (permission: AppPermission) => {
      if (isLoading || !role) return false;
      return hasPermission(role, permission);
    },
    [role, isLoading]
  );

  return { user, role, isLoading, checkPermission };
}
