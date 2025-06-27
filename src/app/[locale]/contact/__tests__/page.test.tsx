// src/app/[locale]/contact/__tests__/page.test.tsx - Version corrigée pour Next.js 15
import { render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import ContactPage from "../page";
import { getNextUpcomingMarket, getAllUpcomingMarkets } from "@/lib/market-utils";
import { MarketInfo } from "@/types/market";

// Mock the market utility functions
jest.mock("@/lib/market-utils", () => ({
  ...jest.requireActual("@/lib/market-utils"), // Keep actual formatDate
  getNextUpcomingMarket: jest.fn(),
  getAllUpcomingMarkets: jest.fn(),
}));

// Type assertion for the mocked functions
const mockedGetNextUpcomingMarket = getNextUpcomingMarket as jest.Mock;
const mockedGetAllUpcomingMarkets = getAllUpcomingMarkets as jest.Mock;

const mockSingleMarket: MarketInfo = {
  id: "market-1",
  name: "Capital City Market",
  city: "Capital City",
  date: "2024-09-01",
  startTime: "09:00",
  endTime: "17:00",
  address: "123 Capitol Ave",
  description: "A great market",
  gpsLink: "",
  heroImage: "/images/hero/market-1.jpg",
};

describe("ContactPage Integration", () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockedGetNextUpcomingMarket.mockClear();
    mockedGetAllUpcomingMarkets.mockClear();
  });

  it("should render the default hero when no upcoming market exists", async () => {
    // Arrange: No upcoming markets
    mockedGetNextUpcomingMarket.mockResolvedValue(null);
    mockedGetAllUpcomingMarkets.mockResolvedValue([]);

    // Act: Render the component with Promise params for Next.js 15
    await act(async () => {
      const PageComponent = await ContactPage({ 
        params: Promise.resolve({ locale: "en" }) 
      });
      render(PageComponent);
    });

    // Assert: Check for default hero content using waitFor to handle async updates
    await waitFor(
      () => {
        expect(screen.getByText("Contactez-nous")).toBeInTheDocument();
        expect(screen.getByText("Nous sommes là pour vous aider")).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Check that the MarketAgenda shows the empty message
    await waitFor(
      () => {
        expect(screen.getByText("Aucun marché à venir")).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it("should render the hero with next market details when a market is upcoming", async () => {
    // Arrange: One upcoming market
    mockedGetNextUpcomingMarket.mockResolvedValue(mockSingleMarket);
    mockedGetAllUpcomingMarkets.mockResolvedValue([mockSingleMarket]);

    // Act
    await act(async () => {
      const PageComponent = await ContactPage({ 
        params: Promise.resolve({ locale: "en" }) 
      });
      render(PageComponent);
    });

    // Assert: Check for hero content specific to the next market
    await waitFor(
      () => {
        expect(screen.getByText("Prochain marché")).toBeInTheDocument();
        expect(screen.getByText("Retrouvez-nous bientôt")).toBeInTheDocument();
        // Check that the MarketAgenda renders the market name
        expect(screen.getByText("Capital City Market")).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it("should render all static sections correctly", async () => {
    // Arrange
    mockedGetNextUpcomingMarket.mockResolvedValue(null);
    mockedGetAllUpcomingMarkets.mockResolvedValue([]);

    // Act
    await act(async () => {
      const PageComponent = await ContactPage({ 
        params: Promise.resolve({ locale: "en" }) 
      });
      render(PageComponent);
    });

    // Assert: Vérifier les sections statiques avec les vraies traductions
    await waitFor(
      () => {
        expect(screen.getByText("Nos coordonnées")).toBeInTheDocument();
        expect(screen.getByText("Réseaux sociaux")).toBeInTheDocument();
        expect(screen.getByText("Agenda des marchés")).toBeInTheDocument();
        expect(screen.getByText("Boutiques partenaires")).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Vérifier que les coordonnées de contact sont présentes
    await waitFor(() => {
      expect(screen.getByText("Email")).toBeInTheDocument();
      expect(screen.getByText("Téléphone")).toBeInTheDocument();
      expect(screen.getByText("inherbisveritas@gmail.com")).toBeInTheDocument();
      expect(screen.getByText("06 38 89 53 24")).toBeInTheDocument();
    });
  });

  it("should handle loading states gracefully", async () => {
    // Arrange: Simuler un délai dans les fonctions utilitaires
    mockedGetNextUpcomingMarket.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(null), 100))
    );
    mockedGetAllUpcomingMarkets.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve([]), 100))
    );

    // Act
    await act(async () => {
      const PageComponent = await ContactPage({ 
        params: Promise.resolve({ locale: "en" }) 
      });
      render(PageComponent);
    });

    // Assert: Le composant doit s'afficher même avec des délais
    await waitFor(
      () => {
        expect(screen.getByText("Contactez-nous")).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  // Test supplémentaire pour vérifier que les params async fonctionnent
  it("should handle different locales correctly", async () => {
    // Arrange
    mockedGetNextUpcomingMarket.mockResolvedValue(null);
    mockedGetAllUpcomingMarkets.mockResolvedValue([]);

    // Act: Tester avec une locale française
    await act(async () => {
      const PageComponent = await ContactPage({ 
        params: Promise.resolve({ locale: "fr" }) 
      });
      render(PageComponent);
    });

    // Assert: Le composant doit se rendre sans erreur
    await waitFor(
      () => {
        expect(screen.getByText("Contactez-nous")).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });
});