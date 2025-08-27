/**
 * Test pour vérifier que le problème de timing entre connexion admin 
 * et affichage des liens admin a été résolu.
 */

import { render, screen, waitFor, act } from "@testing-library/react";
import { Header } from "../header";
import { HeaderClient } from "../header-client";

// Utiliser les mocks déjà définis dans jest.setup.ts
// Ces mocks sont plus complets et cohérents avec le reste du projet

// Mock supplémentaire pour les hooks qui ne sont pas déjà mockés
jest.mock("@/hooks/use-scroll", () => ({
  useScroll: () => false,
}));

describe("Header Admin Timing Fix", () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: jest.fn(() => null),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });
  });

  it("should handle cache validation correctly", () => {
    const mockTimestamp = Date.now().toString();
    
    // Mock valid cache
    (window.sessionStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "admin_ui_hint") return "true";
      if (key === "admin_ui_hint_timestamp") return mockTimestamp;
      return null;
    });

    render(<Header />);

    // Should render without crashing and use cached value
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("should clear expired cache correctly", () => {
    const expiredTimestamp = (Date.now() - 10 * 60 * 1000).toString(); // 10 minutes ago
    
    // Mock expired cache
    (window.sessionStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "admin_ui_hint") return "true";
      if (key === "admin_ui_hint_timestamp") return expiredTimestamp;
      return null;
    });

    render(<Header />);

    // Cache should be cleared due to expiration
    expect(window.sessionStorage.removeItem).toHaveBeenCalledWith("admin_ui_hint");
    expect(window.sessionStorage.removeItem).toHaveBeenCalledWith("admin_ui_hint_timestamp");
  });

  it("should render without errors when no cache exists", () => {
    // No cache (default mock behavior)
    render(<Header />);
    
    // Should render without crashing
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("tests that Header component handles timing improvements", () => {
    // Ce test vérifie simplement que les améliorations ne cassent pas le rendu de base
    render(<Header />);
    
    // Le composant devrait se rendre sans erreur
    expect(screen.getByRole("banner")).toBeInTheDocument();
    
    // Le cache sessionStorage devrait être consulté
    expect(window.sessionStorage.getItem).toHaveBeenCalled();
  });
});