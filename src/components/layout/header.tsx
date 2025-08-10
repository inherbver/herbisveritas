// src/components/layout/header.tsx
"use client";

import React, { useEffect, useState } from "react";
import { HeaderClient } from "./header-client";
import { createClient } from "@/lib/supabase/client";

export function Header() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

          setIsAdmin(data?.role === "admin");
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, []);

  return <HeaderClient isAdmin={isAdmin} />;
}
