/**
 * Utilitaire pour gérer les URLs Supabase de manière dynamique
 * Remplace les URLs hardcodées par la variable d'environnement
 */

/**
 * Remplace l'URL Supabase hardcodée par la variable d'environnement
 */
export function normalizeSupabaseUrl(url: string | undefined | null): string {
  if (!url) return "";

  // Pattern pour détecter les anciennes URLs Supabase hardcodées
  const hardcodedPattern = /https:\/\/esgirafriwoildqcwtjm\.supabase\.co/g;

  // Remplacer par la variable d'environnement
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://esgirafriwoildqcwtjm.supabase.co";

  return url.replace(hardcodedPattern, supabaseUrl);
}

/**
 * Génère une URL de storage Supabase
 */
export function getSupabaseStorageUrl(path: string): string {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://esgirafriwoildqcwtjm.supabase.co";

  // Enlever le slash initial si présent
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;

  return `${supabaseUrl}/storage/v1/object/public/${cleanPath}`;
}

/**
 * Normalise un objet avec des URLs Supabase
 */
export function normalizeSupabaseUrls<T extends Record<string, any>>(
  obj: T,
): T {
  const normalized = { ...obj };

  Object.keys(normalized).forEach((key) => {
    const value = normalized[key];

    if (typeof value === "string" && value.includes("supabase.co")) {
      normalized[key] = normalizeSupabaseUrl(value);
    } else if (typeof value === "object" && value !== null) {
      normalized[key] = normalizeSupabaseUrls(value);
    }
  });

  return normalized;
}

/**
 * Normalise un tableau d'objets avec des URLs Supabase
 */
export function normalizeSupabaseUrlsInArray<T extends Record<string, any>>(
  array: T[],
): T[] {
  return array.map((item) => normalizeSupabaseUrls(item));
}
