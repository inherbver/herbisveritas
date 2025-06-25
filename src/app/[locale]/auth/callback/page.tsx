// src/app/[locale]/auth/callback/page.tsx
"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter, useParams } from "next/navigation"; // useParams pour la locale
import { useTranslations } from "next-intl";
import { createClient } from "../../../../lib/supabase/client";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

// Un composant wrapper pour utiliser useSearchParams car il doit être dans un Suspense
function AuthCallbackContent() {
  const t = useTranslations("AuthCallback");
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams(); // Pour obtenir la locale
  const locale = params.locale as string; // Assumant que locale est toujours présent

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>(t("loading"));

  // Utilisation de useCallback pour la fonction de redirection pour éviter de la recréer à chaque render
  const redirectToPath = useCallback(
    (path: string) => {
      // Assurer que le path est bien localisé si ce n'est pas une URL absolue externe
      // Pour l'instant, on suppose que les paths fournis (comme `nextPath`) sont déjà correctement localisés
      // ou sont des chemins relatifs à la racine qui seront gérés par le routing Next.js
      router.push(path);
    },
    [router]
  );

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true; // Pour éviter les mises à jour d'état sur un composant démonté

    const typeFromParams = searchParams.get("type");
    const codeFromUrl = searchParams.get("code"); // Lire 'code' au lieu de 'token_hash'
    const errorParam = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    const nextPath = searchParams.get("next");

    console.log("[AuthCallback] Initializing useEffect. Params:", {
      typeFromParams,
      codeFromUrl,
      errorParam,
      errorDescription,
      nextPath,
      locale,
    });

    let determinedFinalRedirectPath = `/${locale}/profile/account`; // Default
    if (nextPath) {
      // Valider et s'assurer que nextPath est une route interne et sûre
      if (nextPath.startsWith("/") && !nextPath.startsWith("//") && !nextPath.includes("..")) {
        determinedFinalRedirectPath = nextPath;
      } else {
        console.warn(`Invalid nextPath detected: ${nextPath}. Using default redirect.`);
      }
    }

    if (errorParam && isMounted) {
      console.error("[AuthCallback] Error parameter found in URL:", {
        errorParam,
        errorDescription,
      });
      setStatus("error");
      setMessage(t("errorGeneric", { details: errorDescription || errorParam }));
      return;
    }

    // Le client Supabase côté client gère automatiquement l'échange du 'code'
    // présent dans l'URL contre une session. Nous n'avons pas besoin d'appeler
    // manuellement `verifyOtp`. Nous nous fions au listener `onAuthStateChange`.

    // 1. Listener onAuthStateChange
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, _session: Session | null) => {
        if (!isMounted) return;

        if (event === "SIGNED_IN") {
          console.log("[AuthCallback] Received SIGNED_IN event.");
          setStatus("success");
          // Le message peut dépendre du 'type' si on n'est pas passé par verifyOtp (ex: Magic Link direct)
          // Si 'type' n'est pas dispo ici, on met un message générique ou on essaie de l'inférer.
          setMessage(t("accountConfirmedSuccess")); // Ajuster si besoin
          setTimeout(() => redirectToPath(determinedFinalRedirectPath), 3000);
        } else if (event === "SIGNED_OUT") {
          // Normalement ne devrait pas arriver ici sauf si l'utilisateur se déconnecte pendant le callback
          console.log("[AuthCallback] Received SIGNED_OUT event.");
          setStatus("error");
          setMessage(t("errorGeneric", { details: "User signed out during callback." }));
        }
        // Autres événements comme TOKEN_REFRESHED, USER_UPDATED pourraient être gérés si nécessaire
      }
    );

    // 2. Gestion si pas d'événement SIGNED_IN après un délai
    const timeoutId = setTimeout(() => {
      if (isMounted && status === "loading") {
        console.log("[AuthCallback] Timeout reached, no SIGNED_IN event.");
        // Vérifier si on est toujours en chargement
        setStatus("error");
        setMessage(t("errorTimeout"));
      }
    }, 10000); // 10 secondes timeout

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      authListener?.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router, t, locale, redirectToPath]);

  if (status === "loading") {
    return (
      <main>
        <p>{message}</p>
        {/* TODO: Ajouter un vrai Spinner */}
      </main>
    );
  }

  if (status === "error") {
    return (
      <main>
        <p>{message}</p>
        <button onClick={() => router.push(`/${locale}/login`)}>{t("goToLogin")}</button>
      </main>
    );
  }

  if (status === "success") {
    return (
      <main>
        <p>{message}</p>
        <p>{t("redirecting")}</p>
      </main>
    );
  }

  return null; // Ou un fallback si nécessaire
}

export default function AuthCallbackPage() {
  // La page elle-même est un Server Component par défaut dans App Router si on ne met pas "use client"
  // Mais comme AuthCallbackContent est un client component, c'est ok.
  // On passe la locale ici si AuthCallbackContent en a besoin via props
  return (
    <Suspense fallback={<main>Loading translations and parameters...</main>}>
      <AuthCallbackContent />
    </Suspense>
  );
}
