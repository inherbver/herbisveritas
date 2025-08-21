/**
 * Tests critiques pour le middleware d'authentification et de routing
 * PRIORITÉ: CRITIQUE - Sécurité et protection des routes
 */

import { NextRequest, NextResponse } from "next/server";
import { middleware } from "@/middleware";
import { createClient } from "@/lib/supabase/server";

// Mock des modules
jest.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: jest.fn(),
}));

jest.mock("@/lib/security/csrf-protection", () => ({
  validateCSRFToken: jest.fn(),
}));

describe("Authentication Middleware", () => {
  let mockRequest: Partial<NextRequest>;
  let mockSupabaseClient: any;

  beforeEach(() => {
    // Reset tous les mocks
    jest.clearAllMocks();

    // Configuration du mock Supabase
    mockSupabaseClient = {
      auth: {
        getUser: jest.fn(),
        getSession: jest.fn(),
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
      })),
    };

    (createSupabaseServerClient as jest.Mock).mockResolvedValue(
      mockSupabaseClient,
    );

    // Configuration de base de la requête
    mockRequest = {
      nextUrl: {
        pathname: "/",
        searchParams: new URLSearchParams(),
        clone: jest.fn(() => mockRequest.nextUrl),
      },
      headers: new Headers({
        "accept-language": "fr-FR,fr;q=0.9,en;q=0.8",
      }),
      cookies: {
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
      },
      url: "http://localhost:3000/",
    };
  });

  describe("Protection des routes admin", () => {
    test("should redirect non-authenticated users from admin routes to login", async () => {
      // Arrange
      mockRequest.nextUrl!.pathname = "/fr/admin/products";
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act
      const response = await middleware(mockRequest as NextRequest);

      // Assert
      expect(response).toBeInstanceOf(NextResponse);
      expect(response?.status).toBe(302);
      expect(response?.headers.get("location")).toContain("/login");
    });

    test("should deny access to admin routes for non-admin users", async () => {
      // Arrange
      mockRequest.nextUrl!.pathname = "/fr/admin/users";
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            email: "user@example.com",
          },
        },
        error: null,
      });

      // Mock du profil utilisateur sans rôle admin
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: "customer" },
              error: null,
            }),
          }),
        }),
      });

      // Act
      const response = await middleware(mockRequest as NextRequest);

      // Assert
      expect(response).toBeInstanceOf(NextResponse);
      expect(response?.status).toBe(403);
      expect(response?.headers.get("location")).toContain("/unauthorized");
    });

    test("should allow admin users to access admin routes", async () => {
      // Arrange
      mockRequest.nextUrl!.pathname = "/fr/admin/dashboard";
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "admin-123",
            email: "admin@example.com",
          },
        },
        error: null,
      });

      // Mock du profil admin
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: "admin" },
              error: null,
            }),
          }),
        }),
      });

      // Act
      const response = await middleware(mockRequest as NextRequest);

      // Assert
      expect(response).not.toBeInstanceOf(NextResponse);
      // Le middleware laisse passer la requête
    });
  });

  describe("Protection des routes profile", () => {
    test("should redirect unauthenticated users from profile to login", async () => {
      // Arrange
      mockRequest.nextUrl!.pathname = "/fr/profile/orders";
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act
      const response = await middleware(mockRequest as NextRequest);

      // Assert
      expect(response).toBeInstanceOf(NextResponse);
      expect(response?.headers.get("location")).toContain("/login");
    });

    test("should allow authenticated users to access profile", async () => {
      // Arrange
      mockRequest.nextUrl!.pathname = "/fr/profile/account";
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            email: "user@example.com",
          },
        },
        error: null,
      });

      // Act
      const response = await middleware(mockRequest as NextRequest);

      // Assert
      expect(response).not.toBeInstanceOf(NextResponse);
    });
  });

  describe("Gestion des sessions expirées", () => {
    test("should handle expired sessions gracefully", async () => {
      // Arrange
      mockRequest.nextUrl!.pathname = "/fr/admin/products";
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Session expired", status: 401 },
      });

      // Act
      const response = await middleware(mockRequest as NextRequest);

      // Assert
      expect(response).toBeInstanceOf(NextResponse);
      expect(response?.headers.get("location")).toContain("/login");
      expect(response?.cookies?.delete).toHaveBeenCalledWith(
        "supabase-auth-token",
      );
    });

    test("should refresh token if close to expiry", async () => {
      // Arrange
      const mockSession = {
        expires_at: Date.now() / 1000 + 300, // Expire dans 5 minutes
        access_token: "old-token",
        refresh_token: "refresh-token",
      };

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: {
          session: {
            ...mockSession,
            access_token: "new-token",
            expires_at: Date.now() / 1000 + 3600,
          },
        },
        error: null,
      });

      // Act
      await middleware(mockRequest as NextRequest);

      // Assert
      expect(mockSupabaseClient.auth.refreshSession).toHaveBeenCalledWith({
        refresh_token: "refresh-token",
      });
    });
  });

  describe("Gestion de l'internationalisation", () => {
    test("should redirect root to default locale", async () => {
      // Arrange
      mockRequest.nextUrl!.pathname = "/";

      // Act
      const response = await middleware(mockRequest as NextRequest);

      // Assert
      expect(response).toBeInstanceOf(NextResponse);
      expect(response?.headers.get("location")).toBe("/fr");
    });

    test("should detect and use browser preferred language", async () => {
      // Arrange
      mockRequest.nextUrl!.pathname = "/";
      mockRequest.headers = new Headers({
        "accept-language": "en-US,en;q=0.9,fr;q=0.8",
      });

      // Act
      const response = await middleware(mockRequest as NextRequest);

      // Assert
      expect(response).toBeInstanceOf(NextResponse);
      expect(response?.headers.get("location")).toBe("/en");
    });

    test("should handle unsupported locales", async () => {
      // Arrange
      mockRequest.nextUrl!.pathname = "/zh/shop";

      // Act
      const response = await middleware(mockRequest as NextRequest);

      // Assert
      expect(response).toBeInstanceOf(NextResponse);
      expect(response?.status).toBe(404);
    });
  });

  describe("Protection CSRF", () => {
    test("should validate CSRF token on mutations", async () => {
      // Arrange
      mockRequest.method = "POST";
      mockRequest.nextUrl!.pathname = "/api/cart/add";
      mockRequest.headers = new Headers({
        "x-csrf-token": "invalid-token",
      });

      const { validateCSRFToken } = require("@/lib/security/csrf-protection");
      validateCSRFToken.mockReturnValue(false);

      // Act
      const response = await middleware(mockRequest as NextRequest);

      // Assert
      expect(response).toBeInstanceOf(NextResponse);
      expect(response?.status).toBe(403);
      expect(response?.statusText).toContain("CSRF");
    });

    test("should allow requests with valid CSRF token", async () => {
      // Arrange
      mockRequest.method = "POST";
      mockRequest.nextUrl!.pathname = "/api/cart/update";
      mockRequest.headers = new Headers({
        "x-csrf-token": "valid-token",
      });

      const { validateCSRFToken } = require("@/lib/security/csrf-protection");
      validateCSRFToken.mockReturnValue(true);

      // Act
      const response = await middleware(mockRequest as NextRequest);

      // Assert
      expect(response).not.toBeInstanceOf(NextResponse);
    });

    test("should skip CSRF validation for safe methods", async () => {
      // Arrange
      mockRequest.method = "GET";
      mockRequest.nextUrl!.pathname = "/api/products";

      // Act
      const response = await middleware(mockRequest as NextRequest);

      // Assert
      const { validateCSRFToken } = require("@/lib/security/csrf-protection");
      expect(validateCSRFToken).not.toHaveBeenCalled();
    });
  });

  describe("Logging et monitoring", () => {
    test("should log security events for unauthorized access", async () => {
      // Arrange
      const logSpy = jest.spyOn(console, "error").mockImplementation();
      mockRequest.nextUrl!.pathname = "/fr/admin/users";
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            email: "hacker@example.com",
          },
        },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: "customer" },
              error: null,
            }),
          }),
        }),
      });

      // Act
      await middleware(mockRequest as NextRequest);

      // Assert
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("[Security]"),
        expect.objectContaining({
          userId: "user-123",
          path: "/fr/admin/users",
          email: "hacker@example.com",
        }),
      );

      logSpy.mockRestore();
    });

    test("should track response times for monitoring", async () => {
      // Arrange
      const startTime = Date.now();
      mockRequest.nextUrl!.pathname = "/fr/shop";

      // Act
      const response = await middleware(mockRequest as NextRequest);

      // Assert
      const endTime = Date.now();
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100); // Le middleware doit être rapide
    });
  });

  describe("Gestion des erreurs", () => {
    test("should handle database errors gracefully", async () => {
      // Arrange
      mockRequest.nextUrl!.pathname = "/fr/admin/products";
      mockSupabaseClient.auth.getUser.mockRejectedValue(
        new Error("Database connection failed"),
      );

      // Act
      const response = await middleware(mockRequest as NextRequest);

      // Assert
      expect(response).toBeInstanceOf(NextResponse);
      expect(response?.status).toBe(500);
      expect(response?.headers.get("location")).toContain("/error");
    });

    test("should handle network timeouts", async () => {
      // Arrange
      mockRequest.nextUrl!.pathname = "/fr/profile";
      mockSupabaseClient.auth.getUser.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10000)),
      );

      // Act avec timeout
      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve("timeout"), 100),
      );
      const middlewarePromise = middleware(mockRequest as NextRequest);
      const result = await Promise.race([middlewarePromise, timeoutPromise]);

      // Assert
      expect(result).toBe("timeout");
    });
  });
});
