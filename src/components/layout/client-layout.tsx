"use client";

import { NextIntlClientProvider, AbstractIntlMessages } from "next-intl";
import { ReactNode, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
// import { Toaster } from "@/components/ui/sonner"; // Toaster est déjà dans LocaleLayout
import { ThemeProvider } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { useCartOperations } from "@/lib/store-sync/cart-sync";

// Types spécifiques pour les réponses Supabase
interface SupabaseUserResponse {
  data: { user: User | null };
  error: Error | null;
}

interface SupabaseSessionResponse {
  data: { session: Session | null };
  error: Error | null;
}

interface ClientLayoutProps {
  children: ReactNode;
  locale: string;
  messages: AbstractIntlMessages;
  timeZone?: string;
}

// Initialiser le client Supabase une seule fois
const supabase = createClient();

export default function ClientLayout({ children, locale, messages, timeZone }: ClientLayoutProps) {
  const searchParams = useSearchParams();
  // Ref pour éviter les doubles clears
  const hasCheckedInitialSession = useRef(false);
  const lastSessionState = useRef<Session | null | undefined>(undefined);

  // Hook pour les opérations panier
  const { clearCart } = useCartOperations();
  
  // Fonction pour vider le panier de manière sécurisée
  const clearCartSafely = useCallback((reason: string) => {
    console.log(`ClientLayout: Clearing cart - ${reason}`);
    clearCart();
    console.log("ClientLayout: Cart cleared successfully");
  }, [clearCart]);

  // Fonction helper pour les appels Supabase avec timeout et retry
  const supabaseCallWithTimeout = useCallback(
    async <T,>(promise: Promise<T>, timeoutMs = 3000, maxRetries = 2): Promise<T> => {
      let lastError: Error;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Supabase_Timeout")), timeoutMs)
          );

          return await Promise.race([promise, timeoutPromise]);
        } catch (error) {
          lastError = error as Error;

          // Si c'est un timeout ou erreur réseau et qu'on a encore des tentatives
          if (
            attempt < maxRetries &&
            (lastError.message === "Supabase_Timeout" ||
              lastError.message.includes("fetch") ||
              lastError.message.includes("network") ||
              lastError.message.includes("Failed to fetch"))
          ) {
            console.warn(
              `ClientLayout: Retry attempt ${attempt + 1}/${maxRetries + 1} after error:`,
              lastError.message
            );
            // Délai exponentiel entre les tentatives (500ms, 1s)
            await new Promise((resolve) => setTimeout(resolve, 500 * Math.pow(2, attempt)));
            continue;
          }

          // Relancer l'erreur si pas de retry ou retry épuisé
          throw lastError;
        }
      }

      throw lastError!;
    },
    []
  );

  // Fonction pour valider la session de manière asynchrone avec timeout et retry
  const validateSession = useCallback(async () => {
    try {
      // Utilise getUser() pour une validation côté serveur, plus sécurisée
      const {
        data: { user },
        error: userError,
      } = await supabaseCallWithTimeout<SupabaseUserResponse>(
        supabase.auth.getUser(),
        2500, // Timeout de 2.5 secondes
        1 // 1 retry seulement pour ne pas trop ralentir
      );

      if (userError || !user) {
        // Pas d'utilisateur authentifié côté serveur
        return null;
      }

      // Si l'utilisateur est validé, on peut récupérer la session locale en toute confiance
      const {
        data: { session },
      } = await supabaseCallWithTimeout<SupabaseSessionResponse>(
        supabase.auth.getSession(),
        2000, // Timeout plus court pour getSession
        1
      );
      return session;
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === "Supabase_Timeout" ||
          error.message.includes("fetch") ||
          error.message.includes("network") ||
          error.message.includes("Failed to fetch"))
      ) {
        console.warn(
          "ClientLayout: Network/timeout error during session validation. Continuing gracefully:",
          error.message
        );
      } else {
        console.error("ClientLayout: Exception during session validation:", error);
      }
      return null;
    }
  }, [supabaseCallWithTimeout]);

  // useEffect to check for 'logged_out' URL parameter on mount or when searchParams change
  useEffect(() => {
    if (searchParams.get("logged_out") === "true") {
      console.log(
        "ClientLayout: Detected logged_out=true URL parameter via useSearchParams. Ensuring cart is cleared."
      );
      clearCartSafely("Detected logged_out=true URL parameter via useSearchParams");
      // Optionally, remove the parameter from URL to prevent re-clearing on subsequent refreshes of the same URL
      // Consider if this is needed, as it might interfere with history or reloads if not handled carefully.
      // window.history.replaceState(null, '', window.location.pathname);
    }
  }, [searchParams, clearCartSafely]); // Depends on searchParams and clearCartSafely

  useEffect(() => {
    console.log("ClientLayout: Setting up auth state management");

    // Vérification initiale de la session avec délai pour éviter les états transitoires
    const checkInitialSession = async () => {
      if (hasCheckedInitialSession.current) return;

      // Délai court pour laisser le temps à Supabase de se synchroniser
      await new Promise((resolve) => setTimeout(resolve, 100));

      const currentSession = await validateSession();
      console.log("ClientLayout: Initial session check:", currentSession ? "Active" : "None");

      if (!currentSession) {
        clearCartSafely("Initial session check - no active session");
      }

      lastSessionState.current = currentSession;
      hasCheckedInitialSession.current = true;
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      console.log(`ClientLayout: Auth event [${event}]`, {
        sessionExists: !!session,
        userId: session?.user?.id,
        timestamp: new Date().toISOString(),
      });

      // Gestion spécifique par événement
      switch (event) {
        case "SIGNED_OUT":
          console.log("ClientLayout: Processing SIGNED_OUT");
          clearCartSafely("User signed out");
          lastSessionState.current = null;
          break;

        case "SIGNED_IN":
          console.log("ClientLayout: Processing SIGNED_IN");
          lastSessionState.current = session;
          // Ici vous pourriez implémenter la logique de fusion du panier si nécessaire
          break;

        case "INITIAL_SESSION":
          if (!hasCheckedInitialSession.current) {
            console.log("ClientLayout: Processing INITIAL_SESSION");

            if (!session) {
              clearCartSafely("Initial session - no session found");
            } else {
              // Double vérification pour éviter les sessions "fantômes" avec gestion d'erreur
              setTimeout(async () => {
                try {
                  const validatedSession = await validateSession();
                  if (!validatedSession && session) {
                    console.log("ClientLayout: Session validation failed, clearing cart");
                    clearCartSafely("Session validation failed after initial session");
                  }
                } catch (error) {
                  console.warn(
                    "ClientLayout: Error during delayed session validation, ignoring:",
                    error
                  );
                  // Ne pas bloquer ou vider le panier sur erreur de validation différée
                }
              }, 200);
            }

            lastSessionState.current = session;
            hasCheckedInitialSession.current = true;
          }
          break;

        case "TOKEN_REFRESHED":
          if (!session && lastSessionState.current) {
            console.log("ClientLayout: Token refresh failed, session expired");
            clearCartSafely("Token refresh failed - session expired");
          }
          lastSessionState.current = session;
          break;

        default:
          console.log(`ClientLayout: Unhandled auth event: ${event}`);
      }
    });

    // Déclencher la vérification initiale
    checkInitialSession();

    return () => {
      console.log("ClientLayout: Cleaning up auth state listener");
      subscription?.unsubscribe();
    };
  }, [clearCartSafely, validateSession]); // Dependencies for the main auth listener effect

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
        {children}
      </NextIntlClientProvider>
    </ThemeProvider>
  );
}
