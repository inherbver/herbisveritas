import { z } from "zod";

// Schema de validation pour les variables d'environnement
const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("SUPABASE_URL doit être une URL valide"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "SUPABASE_ANON_KEY est requis"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY est requis"),

  // Stripe
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z
    .string()
    .startsWith("pk_", "La clé Stripe publique doit commencer par pk_"),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_", "La clé Stripe secrète doit commencer par sk_"),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .startsWith("whsec_", "Le secret webhook Stripe doit commencer par whsec_"),

  // Application
  NEXT_PUBLIC_BASE_URL: z.string().url("BASE_URL doit être une URL valide"),

  // Admin (temporaire - sera déplacé en base)
  ADMIN_PRINCIPAL_ID: z.string().uuid("ADMIN_PRINCIPAL_ID doit être un UUID valide"),
  INTERNAL_FUNCTION_SECRET: z
    .string()
    .min(20, "INTERNAL_FUNCTION_SECRET doit faire au moins 20 caractères"),

  // Optionnels
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

type EnvVars = z.infer<typeof envSchema>;

/**
 * Valide et exporte les variables d'environnement de manière sécurisée
 * Lance une erreur si des variables requises sont manquantes ou invalides
 */
function validateEnv(): EnvVars {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    ADMIN_PRINCIPAL_ID: process.env.ADMIN_PRINCIPAL_ID,
    INTERNAL_FUNCTION_SECRET: process.env.INTERNAL_FUNCTION_SECRET,
    NODE_ENV: process.env.NODE_ENV,
  };

  try {
    return envSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((err) => `${err.path}: ${err.message}`);
      throw new Error(
        `❌ Configuration d'environnement invalide:\n${missingVars.join("\n")}\n\n` +
          `Vérifiez votre fichier .env.local et assurez-vous que toutes les variables requises sont définies.`
      );
    }
    throw error;
  }
}

// Valider au moment de l'import
const env = validateEnv();

// Exporter de manière sécurisée
export const ENV = {
  // Variables publiques (exposées côté client)
  PUBLIC: {
    SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    STRIPE_PUBLISHABLE_KEY: env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    BASE_URL: env.NEXT_PUBLIC_BASE_URL,
  },

  // Variables privées (serveur uniquement)
  PRIVATE: {
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
    STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET,
    ADMIN_PRINCIPAL_ID: env.ADMIN_PRINCIPAL_ID,
    INTERNAL_FUNCTION_SECRET: env.INTERNAL_FUNCTION_SECRET,
  },

  // Meta
  NODE_ENV: env.NODE_ENV,
  IS_PRODUCTION: env.NODE_ENV === "production",
  IS_DEVELOPMENT: env.NODE_ENV === "development",
  IS_TEST: env.NODE_ENV === "test",
} as const;

/**
 * Utilitaire pour vérifier qu'on est dans un contexte serveur
 * avant d'accéder aux variables privées
 */
export function ensureServerContext(context: string) {
  if (typeof window !== "undefined") {
    throw new Error(
      `🚨 Tentative d'accès aux variables privées côté client dans: ${context}\n` +
        `Les variables privées ne doivent être utilisées que côté serveur (API routes, Server Components, middleware)`
    );
  }
}

/**
 * Helper pour accéder aux variables privées de manière sécurisée
 */
export function getPrivateEnv(context: string) {
  ensureServerContext(context);
  return ENV.PRIVATE;
}

// Types pour TypeScript
export type PublicEnv = typeof ENV.PUBLIC;
export type PrivateEnv = typeof ENV.PRIVATE;
