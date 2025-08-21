// src/lib/supabase/server.ts
import { createClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/supabase";
import type { SupabaseClientType } from "@/lib/supabase/types";

// Client Supabase server avec gestion améliorée des cookies
export async function createSupabaseServerClient(): Promise<SupabaseClientType> {
  const cookieStore = await cookies();

  // IMPORTANT: Lire TOUS les cookies, y compris ceux de la requête
  const allCookies = cookieStore.getAll();

  // Debug : afficher TOUS les cookies disponibles
  console.log(
    "🍪 [createSupabaseServerClient] ALL cookies count:",
    allCookies.length,
  );
  console.log(
    "🍪 [createSupabaseServerClient] Cookie names:",
    allCookies.map((c) => c.name),
  );

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Retourner directement tous les cookies lus au début
          const supabaseCookies = allCookies.filter((c) =>
            c.name.includes("sb-"),
          );
          console.log(
            "🍪 [createSupabaseServerClient] Supabase cookies:",
            supabaseCookies.length > 0
              ? supabaseCookies.map(
                  (c) => `${c.name}=${c.value.slice(0, 20)}...`,
                )
              : "No Supabase cookies found",
          );

          // Vérification spécifique des cookies d'authentification
          const authCookies = supabaseCookies.filter((c) =>
            c.name.includes("auth-token"),
          );
          if (authCookies.length > 0) {
            console.log(
              "🔐 [createSupabaseServerClient] Auth cookies detected:",
              authCookies.length,
            );
          }

          return allCookies;
        },
        setAll(cookiesToSet) {
          console.log(
            "🍪 [createSupabaseServerClient] Setting cookies:",
            cookiesToSet.map((c) => `${c.name}=${c.value.slice(0, 20)}...`),
          );

          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, {
                ...options,
                // Assurer des options sécurisées par défaut
                path: options?.path || "/",
                httpOnly: options?.httpOnly !== false,
                secure: options?.secure !== false,
                sameSite: options?.sameSite || "lax",
              });
            });
            console.log(
              "🍪 [createSupabaseServerClient] Cookies set successfully",
            );
          } catch (error) {
            console.warn(
              "🍪 [createSupabaseServerClient] Failed to set cookies:",
              error,
            );
          }
        },
      },
    },
  ) as unknown as SupabaseClientType;
}

export const createSupabaseAdminClient = (): SupabaseClientType => {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  ) as unknown as SupabaseClientType;
};

// getSupabaseUserSession reste async et attend createSupabaseServerClient
export async function getSupabaseUserSession() {
  // Appel avec await car createSupabaseServerClient est async
  const supabase = await createSupabaseServerClient();

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error(
      "Erreur lors de la récupération de la session Supabase:",
      error.message,
    );
    return null;
  }

  return session;
}
