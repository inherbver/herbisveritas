import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import ContactPage from "../page";
import { getNextUpcomingMarket, getAllUpcomingMarkets } from "@/lib/market-utils";
import { MarketInfo } from "@/types/market";

// Mock the server-side next-intl functions
jest.mock("next-intl/server", () => ({
  setRequestLocale: jest.fn(),
  getTranslations: jest.fn().mockResolvedValue((key: string) => `ContactPage.${key}`),
}));

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

    // Act: Render the component
    // We need to resolve the promise returned by the async component
    const PageComponent = await ContactPage({ params: { locale: "en" } });
    render(PageComponent);

    // Assert: Check for default hero content
    expect(screen.getByText("ContactPage.defaultHeroHeading")).toBeInTheDocument();
    expect(screen.getByText("ContactPage.defaultHeroSubheading")).toBeInTheDocument();
    // Check that the MarketAgenda shows the empty message
    expect(screen.getByText("ContactPage.noUpcomingMarketsForFilter")).toBeInTheDocument();
  });

  it("should render the hero with next market details when a market is upcoming", async () => {
    // Arrange: One upcoming market
    mockedGetNextUpcomingMarket.mockResolvedValue(mockSingleMarket);
    mockedGetAllUpcomingMarkets.mockResolvedValue([mockSingleMarket]);

    // Act
    const PageComponent = await ContactPage({ params: { locale: "en" } });
    render(PageComponent);

    // Assert: Check for hero content specific to the next market
    expect(screen.getByText("ContactPage.nextMarketHeroHeading")).toBeInTheDocument();
    expect(screen.getByText("ContactPage.nextMarketHeroSubheading")).toBeInTheDocument();
    // Check that the MarketAgenda renders the market name
    expect(screen.getByText("Capital City Market")).toBeInTheDocument();
  });

  it("should render all static sections correctly", async () => {
    // Arrange
    mockedGetNextUpcomingMarket.mockResolvedValue(null);
    mockedGetAllUpcomingMarkets.mockResolvedValue([]);

    // Act
    const PageComponent = await ContactPage({ params: { locale: "en" } });
    render(PageComponent);

    // Assert
    expect(screen.getByText("ContactPage.coordinatesTitle")).toBeInTheDocument();
    expect(screen.getByText("ContactPage.socialMediaTitle")).toBeInTheDocument();
    expect(screen.getByText("ContactPage.marketsAgendaTitle")).toBeInTheDocument();
    expect(screen.getByText("ContactPage.partnerShopsTitle")).toBeInTheDocument();
  });
});
