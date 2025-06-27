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
        const { data } = await supabase.auth.getUser();
        setUser(data.user);
        setRole((data.user?.user_metadata?.role as AppRole) || null);
      } catch (error) {
        console.error("Error fetching user:", error);
        setUser(null);
        setRole(null);
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
