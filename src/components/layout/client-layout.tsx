"use client";

import { NextIntlClientProvider, AbstractIntlMessages } from "next-intl";
import { ReactNode, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
// import { Toaster } from "@/components/ui/sonner"; // Toaster est déjà dans LocaleLayout
import { ThemeProvider } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import useCartStore from "@/stores/cartStore";

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

  // Fonction pour vider le panier de manière sécurisée
  const clearCartSafely = useCallback((reason: string) => {
    console.log(`ClientLayout: Clearing cart - ${reason}`);
    const cartState = useCartStore.getState();
    if (cartState.items.length > 0) {
      cartState.clearCart();
      console.log("ClientLayout: Cart cleared successfully");
    } else {
      console.log("ClientLayout: Cart was already empty");
    }
  }, []);

  // Fonction pour valider la session de manière asynchrone
  const validateSession = useCallback(async () => {
    try {
      // Utilise getUser() pour une validation côté serveur, plus sécurisée
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        // Pas d'utilisateur authentifié côté serveur
        return null;
      }

      // Si l'utilisateur est validé, on peut récupérer la session locale en toute confiance
      const { data: { session } } = await supabase.auth.getSession();
      return session;

    } catch (error) {
      console.error("ClientLayout: Exception during session validation:", error);
      return null;
    }
  }, []);

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
              // Double vérification pour éviter les sessions "fantômes"
              setTimeout(async () => {
                const validatedSession = await validateSession();
                if (!validatedSession && session) {
                  console.log("ClientLayout: Session validation failed, clearing cart");
                  clearCartSafely("Session validation failed after initial session");
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
