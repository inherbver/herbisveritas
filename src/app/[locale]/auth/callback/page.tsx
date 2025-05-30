// src/app/[locale]/auth/callback/page.tsx
"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter, useParams } from "next/navigation"; // useParams pour la locale
import { useTranslations } from "next-intl";
import { createClient } from "../../../../lib/supabase/client";
import type { AuthError, AuthChangeEvent, Session, User } from "@supabase/supabase-js";

// Définition des types OTP valides basés sur la documentation Supabase
// type ValidOtpType = 'signup' | 'invite' | 'recovery' | 'email_change' | 'sms' | 'phone_change';
// Types spécifiques pour token_hash (généralement liés à l'email)
type TokenHashOtpType = "signup" | "invite" | "recovery" | "email_change";
// Pour les autres types comme 'sms', 'phone_change', Supabase utilise 'phone' et 'token' au lieu de 'token_hash' et 'type'.

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

    // 1. Gestion de verifyOtp si codeFromUrl est présent
    // Vérifier si le type est compatible avec token_hash (qui est la valeur de codeFromUrl)
    const isValidTokenHashOtpType =
      typeFromParams === "signup" ||
      typeFromParams === "invite" ||
      typeFromParams === "recovery" ||
      typeFromParams === "email_change";

    if (codeFromUrl && typeFromParams && isValidTokenHashOtpType) {
      console.log("[AuthCallback] Attempting verifyOtp with:", {
        token_hash: codeFromUrl,
        type: typeFromParams as TokenHashOtpType,
      });
      const otpTypeForVerification = typeFromParams as TokenHashOtpType;
      supabase.auth
        .verifyOtp({ token_hash: codeFromUrl, type: otpTypeForVerification }) // Passer codeFromUrl comme token_hash
        .then(
          ({
            data,
            error,
          }: {
            data: { user: User | null; session: Session | null };
            error: AuthError | null;
          }) => {
            if (!isMounted) return;
            console.log("[AuthCallback] verifyOtp responded. Error:", error, "Data:", data);
            if (error) {
              setStatus("error");
              setMessage(t("errorTokenVerification", { details: error.message }));
            } else if (data.session) {
              // Session établie par verifyOtp, onAuthStateChange devrait aussi se déclencher
              // mais on peut agir immédiatement.
              setStatus("success");
              let successMessage = t("accountConfirmedSuccess"); // Message par défaut
              if (otpTypeForVerification === "signup")
                successMessage = t("accountConfirmedSuccess");
              else if (otpTypeForVerification === "email_change")
                successMessage = t("emailVerifiedSuccess");
              // autres types comme 'invite', 'recovery' pourraient avoir des messages spécifiques
              setMessage(successMessage);
              setTimeout(() => redirectToPath(determinedFinalRedirectPath), 3000);
            } else {
              // Cas où verifyOtp réussit mais ne renvoie pas de session (moins courant)
              setStatus("error");
              setMessage(
                t("errorTokenVerification", {
                  details: "Verification successful but no session established.",
                })
              );
            }
          }
        )
        .catch((e: Error) => {
          console.error("[AuthCallback] verifyOtp caught an exception:", e);
          if (!isMounted) return;
          setStatus("error");
          setMessage(
            t("errorTokenVerification", {
              details: e.message || "Unknown error during OTP verification.",
            })
          );
        });
      return; // Attend la résolution de verifyOtp
    }

    // 2. Listener onAuthStateChange
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, _session: Session | null) => {
        if (!isMounted) return;

        if (event === "SIGNED_IN") {
          setStatus("success");
          // Le message peut dépendre du 'type' si on n'est pas passé par verifyOtp (ex: Magic Link direct)
          // Si 'type' n'est pas dispo ici, on met un message générique ou on essaie de l'inférer.
          setMessage(t("accountConfirmedSuccess")); // Ajuster si besoin
          setTimeout(() => redirectToPath(determinedFinalRedirectPath), 3000);
        } else if (event === "SIGNED_OUT") {
          // Normalement ne devrait pas arriver ici sauf si l'utilisateur se déconnecte pendant le callback
          setStatus("error");
          setMessage(t("errorGeneric", { details: "User signed out during callback." }));
        }
        // Autres événements comme TOKEN_REFRESHED, USER_UPDATED pourraient être gérés si nécessaire
      }
    );

    // 3. Gestion si aucun codeFromUrl et pas d'événement SIGNED_IN après un délai
    // (uniquement si on n'est pas déjà en succès ou erreur)
    // Si on arrive ici, c'est que verifyOtp n'a pas été appelé (pas de codeFromUrl)
    // et on attend onAuthStateChange. Si rien ne se passe (ex: magic link invalide sans codeFromUrl),
    // on met un timeout.
    if (!codeFromUrl) {
      // Utiliser codeFromUrl ici pour la condition du timeout
      const timeoutId = setTimeout(() => {
        if (isMounted && status === "loading") {
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
    }

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [searchParams, router, t, locale, redirectToPath, status]); // Ajout de status pour la logique du timeout

  if (status === "loading") {
    return (
      <div>
        <p>{message}</p>
        {/* TODO: Ajouter un vrai Spinner */}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div>
        <p>{message}</p>
        <button onClick={() => router.push(`/${locale}/login`)}>{t("goToLogin")}</button>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div>
        <p>{message}</p>
        <p>{t("redirecting")}</p>
      </div>
    );
  }

  return null; // Ou un fallback si nécessaire
}

export default function AuthCallbackPage() {
  // La page elle-même est un Server Component par défaut dans App Router si on ne met pas "use client"
  // Mais comme AuthCallbackContent est un client component, c'est ok.
  // On passe la locale ici si AuthCallbackContent en a besoin via props
  return (
    <Suspense fallback={<div>Loading translations and parameters...</div>}>
      <AuthCallbackContent />
    </Suspense>
  );
}
