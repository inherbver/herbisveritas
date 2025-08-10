"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { errorManager } from "@/lib/core/error-manager";
import { ErrorDomain } from "@/lib/core/error-manager";

/**
 * Hook pour gérer les erreurs d'authentification via le système centralisé
 */
export function useAuthErrorHandler() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    // Utiliser le gestionnaire d'erreurs centralisé
    const handleAuthError = async (error: unknown) => {
      await errorManager.handleError(error, {
        router,
        component: "auth-hook",
      });
    };

    // Écouter les changements d'état d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" && !session) {
        // Session terminée, s'assurer que tout est nettoyé
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const storageKey = `sb-${url.replace("https://", "").split(".")[0]}-auth-token`;
        localStorage.removeItem(storageKey);
      }

      if (event === "TOKEN_REFRESHED") {
        console.log("Token successfully refreshed");
      }
    });

    // Intercepter les erreurs globales liées à l'authentification
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);

        // Vérifier si c'est une erreur de refresh token
        if (!response.ok && response.status === 401) {
          const text = await response.text();
          if (text.includes("Refresh Token") || text.includes("refresh_token")) {
            await handleAuthError({ message: text });
          }
        }

        return response;
      } catch (error) {
        // Gérer les erreurs de réseau
        if (error instanceof Error && error.message.includes("Refresh Token")) {
          await handleAuthError(error);
        }
        throw error;
      }
    };

    // Cleanup
    return () => {
      subscription.unsubscribe();
      window.fetch = originalFetch;
    };
  }, [router]);
}
