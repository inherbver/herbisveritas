// src/lib/supabase/server.ts
import { createClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/supabase";
import type { SupabaseClientType } from "@/lib/supabase/types";

// createSupabaseServerClient avec gestion sécurisée pour le build statique
export async function createSupabaseServerClient(): Promise<SupabaseClientType> {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          try {
            const cookieStore = await cookies();
            return cookieStore.get(name)?.value;
          } catch (_error) {
            // Échec lors du build statique - retourner undefined
            return undefined;
          }
        },
        async set(name: string, value: string, options: CookieOptions) {
          try {
            const cookieStore = await cookies();
            cookieStore.set({ name, value, ...options });
          } catch (_error) {
            // Le bloc `set` peut échouer si appelé depuis une Server Component
            // ou lors du build statique - c'est attendu
          }
        },
        async remove(name: string, options: CookieOptions) {
          try {
            const cookieStore = await cookies();
            cookieStore.delete({ name, ...options });
          } catch (_error) {
            // Le bloc `delete` peut échouer si appelé depuis une Server Component
            // ou lors du build statique - c'est attendu
          }
        },
      },
    }
  ) as unknown as SupabaseClientType;
}

export const createSupabaseAdminClient = (): SupabaseClientType => {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
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
    console.error("Erreur lors de la récupération de la session Supabase:", error.message);
    return null;
  }

  return session;
}
