// src/components/layout/header.tsx
"use client";

import React, { useEffect, useState } from "react";
import { HeaderClient } from "./header-client";
import { createClient } from "@/lib/supabase/client";
import { isAdminRole, hasAdminAccess, type UserRole } from "@/lib/auth/types";

export function Header() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [_isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.warn("Header: Error getting user:", userError.message);
          setIsAdmin(false);
          return;
        }

        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

          if (profileError) {
            console.warn("Header: Error getting profile:", profileError.message);
            setIsAdmin(false);
            return;
          }

          const role = profile?.role as UserRole;

          // Utiliser les fonctions robustes pour la vérification
          const adminStatus = isAdminRole(role) || hasAdminAccess(role);

          setIsAdmin(adminStatus);
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error("Header: Error checking admin status:", error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, []);

  return <HeaderClient isAdmin={isAdmin} />;
}
