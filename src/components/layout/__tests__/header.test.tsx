import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Header } from "../header";
import { createClient } from "@/lib/supabase/client";
import type { AuthChangeEvent } from "@supabase/supabase-js";


import { setupServerActionMocks } from '@/test-utils/server-action-mocks';// Mock des dépendances
jest.mock("@/lib/supabase/client");
jest.mock("../header-client", () => ({
  HeaderClient: ({
    isAdmin,
    isLoading,
  }: {
    isAdmin: boolean;
    isLoading: boolean;
  }) => (
    <div data-testid="header-client">
      {isLoading && <span data-testid="loading">Loading...</span>}
      {!isLoading && isAdmin && <span data-testid="admin-link">Admin</span>}
      {!isLoading && !isAdmin && <span data-testid="user-content">User</span>}
    </div>
  ),
}));

// Mock sessionStorage
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, "sessionStorage", {
  value: mockSessionStorage,
});

// Setup des mocks standards pour Server Actions
setupServerActionMocks();

describe("Header Component", () => {
  const mockSupabaseClient = {
    auth: {
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
    from: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionStorage.getItem.mockReturnValue(null);
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);

    // Mock par défaut pour onAuthStateChange
    mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: jest.fn(),
        },
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Initial Rendering", () => {
    it("should show loading state initially when no cache exists", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      render(<Header />);

      expect(screen.getByTestId("loading")).toBeInTheDocument();

      // Attendre que le loading se termine
      await waitFor(() => {
        expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      });
    });

    it("should use sessionStorage cache for immediate display", async () => {
      mockSessionStorage.getItem.mockReturnValue("true");

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "123" } },
        error: null,
      });

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: "admin", status: "active" },
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockFrom);

      render(<Header />);

      // Le cache sessionStorage devrait être lu
      expect(mockSessionStorage.getItem).toHaveBeenCalledWith("admin_ui_hint");
      
      // Attendre que le composant se mette à jour
      await waitFor(() => {
        expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      });
      
      // Vérifier que l'admin link est affiché
      await waitFor(() => {
        expect(screen.getByTestId("admin-link")).toBeInTheDocument();
      });
    });
  });

  describe("Admin Detection", () => {
    it("should detect admin role and show admin links", async () => {
      const mockUser = { id: "123", email: "admin@test.com" };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: "admin", status: "active" },
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockFrom);

      render(<Header />);

      await waitFor(() => {
        expect(screen.getByTestId("admin-link")).toBeInTheDocument();
      });

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        "admin_ui_hint",
        "true",
      );
    });

    it("should not show admin links for regular users", async () => {
      const mockUser = { id: "456", email: "user@test.com" };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: "user", status: "active" },
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockFrom);

      render(<Header />);

      await waitFor(() => {
        expect(screen.getByTestId("user-content")).toBeInTheDocument();
      });

      expect(screen.queryByTestId("admin-link")).not.toBeInTheDocument();
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        "admin_ui_hint",
      );
    });

    it("should not show admin links for suspended accounts", async () => {
      const mockUser = { id: "789", email: "suspended@test.com" };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: "admin", status: "suspended" },
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockFrom);

      render(<Header />);

      await waitFor(() => {
        expect(screen.getByTestId("user-content")).toBeInTheDocument();
      });

      expect(screen.queryByTestId("admin-link")).not.toBeInTheDocument();
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        "admin_ui_hint",
      );
    });
  });

  describe("Auth State Changes", () => {
    it("should update when user signs in", async () => {
      const mockUser = { id: "123", email: "admin@test.com" };
      let authChangeCallback:
        | ((event: AuthChangeEvent, session: any) => void)
        | null = null;

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      mockSupabaseClient.auth.onAuthStateChange.mockImplementation(
        (callback) => {
          authChangeCallback = callback;
          return {
            data: {
              subscription: {
                unsubscribe: jest.fn(),
              },
            },
          };
        },
      );

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: "admin", status: "active" },
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockFrom);

      render(<Header />);

      // Simuler la connexion
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      await act(async () => {
        authChangeCallback?.("SIGNED_IN", { user: mockUser });
      });

      await waitFor(() => {
        expect(screen.getByTestId("admin-link")).toBeInTheDocument();
      });
    });

    it("should clear cache on sign out", async () => {
      let authChangeCallback:
        | ((event: AuthChangeEvent, session: any) => void)
        | null = null;

      mockSessionStorage.getItem.mockReturnValue("true");

      mockSupabaseClient.auth.onAuthStateChange.mockImplementation(
        (callback) => {
          authChangeCallback = callback;
          return {
            data: {
              subscription: {
                unsubscribe: jest.fn(),
              },
            },
          };
        },
      );

      render(<Header />);

      await act(async () => {
        authChangeCallback?.("SIGNED_OUT", null);
      });

      await waitFor(() => {
        expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
          "admin_ui_hint",
        );
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle auth errors gracefully", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error("Auth error"),
      });

      render(<Header />);

      await waitFor(() => {
        expect(screen.getByTestId("user-content")).toBeInTheDocument();
      });

      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        "admin_ui_hint",
      );
    });

    it("should handle profile fetch errors", async () => {
      const mockUser = { id: "123", email: "admin@test.com" };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: new Error("Profile not found"),
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockFrom);

      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      render(<Header />);

      await waitFor(() => {
        expect(screen.getByTestId("user-content")).toBeInTheDocument();
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Header: Could not fetch profile",
        "Profile not found",
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe("Security", () => {
    it("should not trust manipulated sessionStorage without server verification", async () => {
      // User manipule le sessionStorage
      mockSessionStorage.getItem.mockReturnValue("true");

      // Mais le serveur dit que ce n'est pas un admin
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "456", email: "hacker@test.com" } },
        error: null,
      });

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: "user", status: "active" },
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockFrom);

      render(<Header />);

      // Initialement, affiche admin à cause du cache (temporairement)
      // mais le composant va rapidement vérifier avec le serveur

      // Après vérification serveur, ne doit pas afficher les liens admin
      await waitFor(() => {
        expect(screen.getByTestId("user-content")).toBeInTheDocument();
      });

      expect(screen.queryByTestId("admin-link")).not.toBeInTheDocument();
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        "admin_ui_hint",
      );
    });
  });
});
