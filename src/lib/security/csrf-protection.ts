/**
 * Protection CSRF pour Server Actions et API Routes
 * Implémentation sécurisée sans ajout de complexité
 */

import { NextRequest } from "next/server";
import { cookies, headers } from "next/headers";

export class CSRFProtection {
  private static readonly TOKEN_HEADER = "x-csrf-token";
  private static readonly TOKEN_COOKIE = "csrf-token";
  private static readonly TOKEN_LENGTH = 32;

  /**
   * Génère un token CSRF cryptographiquement sûr
   */
  static generateToken(): string {
    // Utilise crypto.randomUUID() pour générer un token sûr
    return crypto.randomUUID().replace(/-/g, "");
  }

  /**
   * Valide le token CSRF dans une requête
   */
  static async validateToken(request: NextRequest): Promise<boolean> {
    try {
      // Récupération du token depuis les headers
      const headerToken = request.headers.get(this.TOKEN_HEADER);

      // Récupération du token depuis les cookies
      const cookieStore = cookies();
      const cookieToken = cookieStore.get(this.TOKEN_COOKIE)?.value;

      // Validation : les deux tokens doivent exister et être identiques
      if (!headerToken || !cookieToken) {
        return false;
      }

      // Comparaison sécurisée des tokens
      return this.secureCompare(headerToken, cookieToken);
    } catch (error) {
      console.error("[CSRF] Erreur validation token:", error);
      return false;
    }
  }

  /**
   * Définit le cookie CSRF pour le client
   */
  static setCSRFCookie(): string {
    const token = this.generateToken();
    const cookieStore = cookies();

    cookieStore.set(this.TOKEN_COOKIE, token, {
      httpOnly: false, // Doit être accessible côté client pour les headers
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 3600, // 1 heure
      path: "/",
    });

    return token;
  }

  /**
   * Récupère le token CSRF actuel
   */
  static getCurrentToken(): string | null {
    try {
      const cookieStore = cookies();
      return cookieStore.get(this.TOKEN_COOKIE)?.value || null;
    } catch (error) {
      console.error("[CSRF] Erreur récupération token:", error);
      return null;
    }
  }

  /**
   * Vérifie si une requête est un Server Action
   */
  static isServerAction(request: NextRequest): boolean {
    const nextAction = request.headers.get("next-action");
    return nextAction !== null;
  }

  /**
   * Vérifie si une route nécessite une protection CSRF
   */
  static requiresCSRFProtection(pathname: string): boolean {
    // Routes API sensibles
    const apiRoutes = ["/api/auth/", "/api/stripe-webhook", "/api/admin/"];

    // Server Actions (toutes protégées)
    if (pathname.includes("/_next/static/chunks/")) {
      return false; // Assets statiques
    }

    // Vérifier les routes API sensibles
    return apiRoutes.some((route) => pathname.startsWith(route));
  }

  /**
   * Comparaison sécurisée des tokens (timing attack resistant)
   */
  private static secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Middleware pour validation automatique CSRF
   */
  static async middleware(request: NextRequest): Promise<Response | null> {
    const pathname = request.nextUrl.pathname;

    // Vérifier si la protection CSRF est requise
    if (
      !this.isServerAction(request) &&
      !this.requiresCSRFProtection(pathname)
    ) {
      return null; // Pas de protection requise
    }

    // Exclure les GET requests (pas de modification d'état)
    if (request.method === "GET") {
      return null;
    }

    // Valider le token CSRF
    const isValidCSRF = await this.validateToken(request);

    if (!isValidCSRF) {
      console.warn(`[CSRF] Token invalide pour ${pathname}`);

      return new Response(
        JSON.stringify({
          error: "CSRF token invalid",
          code: "CSRF_INVALID",
        }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    return null; // Validation réussie, continuer
  }
}

/**
 * Hook client pour récupérer le token CSRF
 */
export function getCSRFToken(): string | null {
  if (typeof window === "undefined") {
    return null; // Server-side
  }

  // Récupérer depuis les cookies côté client
  const cookies = document.cookie.split(";");
  const csrfCookie = cookies.find((cookie) =>
    cookie.trim().startsWith(`${CSRFProtection["TOKEN_COOKIE"]}=`),
  );

  if (!csrfCookie) {
    return null;
  }

  return csrfCookie.split("=")[1];
}

/**
 * Utilitaire pour ajouter le token CSRF aux requêtes fetch
 */
export function withCSRF(init: RequestInit = {}): RequestInit {
  const token = getCSRFToken();

  if (!token) {
    console.warn("[CSRF] Aucun token disponible pour la requête");
    return init;
  }

  return {
    ...init,
    headers: {
      ...init.headers,
      [CSRFProtection["TOKEN_HEADER"]]: token,
    },
  };
}
