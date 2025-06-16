// src/lib/__tests__/market-utils.test.ts
import { RecurringMarketInfo } from "@/types/market";

// Mock the source of recurringMarketsData
// The path @/data/markets.json needs to be resolvable by Jest (moduleNameMapper in jest.config.js)
// virtual: true is important for jest.doMock to work correctly when the file actually exists.
jest.mock("@/data/markets.json", () => [], { virtual: true });

describe("getNextUpcomingMarket", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Ensure the mock is reset for each test if not using jest.resetModules() inside tests
    // For this strategy, we rely on jest.resetModules() inside each test before importing.
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Helper function to set mock data and re-import the module under test
  const setupTestEnvironment = async (recurringData: RecurringMarketInfo[], systemTime: string) => {
    jest.setSystemTime(new Date(systemTime));

    // This is the key: mock the data source *before* the module using it is imported.
    jest.doMock("@/data/markets.json", () => recurringData, { virtual: true });

    // Reset modules to ensure market-utils is re-evaluated with the new mock
    jest.resetModules();
    const { getNextUpcomingMarket } = await import("../market-utils");
    return getNextUpcomingMarket;
  };

  it("should return the soonest upcoming market when multiple exist", async () => {
    const recurringData: RecurringMarketInfo[] = [
      {
        id: "rm1",
        name: "Market Far Away",
        startDate: "2024-07-15",
        endDate: "2024-07-15",
        dayOfWeek: 1, // Monday for 2024-07-15
        startTime: "09:00",
        endTime: "18:00",
        city: "City A",
        address: "",
        description: "",
        gpsLink: "",
        heroImage: "", // Ensure all fields for RecurringMarketInfo
      },
      {
        id: "rm2",
        name: "Market Sooner",
        startDate: "2024-07-05",
        endDate: "2024-07-05",
        dayOfWeek: 5, // Friday for 2024-07-05
        startTime: "10:00",
        endTime: "17:00",
        city: "City B",
        address: "",
        description: "",
        gpsLink: "",
        heroImage: "",
      },
      {
        id: "rm3",
        name: "Market Past",
        startDate: "2024-06-20",
        endDate: "2024-06-20",
        dayOfWeek: 4, // Thursday for 2024-06-20
        startTime: "09:00",
        endTime: "18:00",
        city: "City C",
        address: "",
        description: "",
        gpsLink: "",
        heroImage: "",
      },
    ];

    const getNextUpcomingMarket = await setupTestEnvironment(recurringData, "2024-07-01T10:00:00Z");
    const nextMarket = await getNextUpcomingMarket();

    expect(nextMarket).not.toBeNull();
    expect(nextMarket?.id).toBe("rm2-2024-07-05");
    expect(nextMarket?.name).toBe("Market Sooner");
  });

  it("should return null if no upcoming markets exist (all markets in the past)", async () => {
    const recurringData: RecurringMarketInfo[] = [
      {
        id: "rm1",
        name: "Past Market",
        startDate: "2024-07-15",
        endDate: "2024-07-15",
        dayOfWeek: 1, // Monday for 2024-07-15
        startTime: "09:00",
        endTime: "18:00",
        city: "City A",
        address: "",
        description: "",
        gpsLink: "",
        heroImage: "",
      },
    ];
    const getNextUpcomingMarket = await setupTestEnvironment(recurringData, "2024-08-01T10:00:00Z");
    const nextMarket = await getNextUpcomingMarket();
    expect(nextMarket).toBeNull();
  });

  it("should return null if market data is empty", async () => {
    const recurringData: RecurringMarketInfo[] = [];
    const getNextUpcomingMarket = await setupTestEnvironment(recurringData, "2024-07-01T10:00:00Z");
    const nextMarket = await getNextUpcomingMarket();
    expect(nextMarket).toBeNull();
  });

  it('should correctly handle markets ending at "00:00"', async () => {
    const recurringData: RecurringMarketInfo[] = [
      {
        id: "rm-midnight",
        name: "Midnight Market",
        startDate: "2024-07-02",
        endDate: "2024-07-02",
        dayOfWeek: 2, // Tuesday for 2024-07-02
        startTime: "18:00",
        endTime: "00:00", // Ends at midnight, so effectively start of July 3rd
        city: "City Midnight",
        address: "",
        description: "",
        gpsLink: "",
        heroImage: "",
      },
    ];
    // Current time is July 2nd, 23:00. Market should still be upcoming.
    const getNextUpcomingMarket = await setupTestEnvironment(recurringData, "2024-07-02T23:00:00Z");
    let nextMarket = await getNextUpcomingMarket();
    expect(nextMarket).not.toBeNull();
    expect(nextMarket?.id).toBe("rm-midnight-2024-07-02");

    // Current time is July 3rd, 00:30. Market should now be past.
    const getNextUpcomingMarketPast = await setupTestEnvironment(
      recurringData,
      "2024-07-03T00:30:00Z"
    );
    nextMarket = await getNextUpcomingMarketPast();
    expect(nextMarket).toBeNull();
  });

  // TODO: Add more tests for:
  // - Sorting logic with multiple markets on the same day but different start times
  // - Recurring markets that generate multiple instances, ensuring correct selection
  // - Edge cases for date comparisons (e.g. market ends exactly now)
});

// Minimal test for getAllUpcomingMarkets to ensure similar setup works
describe("getAllUpcomingMarkets", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const setupTestEnvironment = async (recurringData: RecurringMarketInfo[], systemTime: string) => {
    jest.setSystemTime(new Date(systemTime));
    jest.doMock("@/data/markets.json", () => recurringData, { virtual: true });
    jest.resetModules();
    const { getAllUpcomingMarkets } = await import("../market-utils");
    return getAllUpcomingMarkets;
  };

  it("should return all markets that are upcoming", async () => {
    const recurringData: RecurringMarketInfo[] = [
      {
        id: "rm-upcoming1",
        name: "Upcoming Market 1",
        startDate: "2024-07-10",
        endDate: "2024-07-10",
        dayOfWeek: 3, // Wednesday
        startTime: "10:00",
        endTime: "18:00",
        city: "City U1",
        address: "",
        description: "",
        gpsLink: "",
        heroImage: "",
      },
      {
        id: "rm-past1",
        name: "Past Market 1",
        startDate: "2024-06-01",
        endDate: "2024-06-01",
        dayOfWeek: 6, // Saturday
        startTime: "10:00",
        endTime: "18:00",
        city: "City P1",
        address: "",
        description: "",
        gpsLink: "",
        heroImage: "",
      },
      {
        id: "rm-upcoming2",
        name: "Upcoming Market 2",
        startDate: "2024-07-05",
        endDate: "2024-07-05",
        dayOfWeek: 5, // Friday
        startTime: "12:00",
        endTime: "20:00",
        city: "City U2",
        address: "",
        description: "",
        gpsLink: "",
        heroImage: "",
      },
    ];

    const getAllUpcomingMarkets = await setupTestEnvironment(recurringData, "2024-07-01T00:00:00Z");
    const upcomingMarkets = await getAllUpcomingMarkets();

    expect(upcomingMarkets).toHaveLength(2);
    expect(upcomingMarkets.map((m) => m.id)).toEqual(
      expect.arrayContaining(["rm-upcoming2-2024-07-05", "rm-upcoming1-2024-07-10"])
    );
    // Check sort order (soonest first)
    expect(upcomingMarkets[0].id).toBe("rm-upcoming2-2024-07-05");
    expect(upcomingMarkets[1].id).toBe("rm-upcoming1-2024-07-10");
  });
});

describe("formatDate", () => {
  // This function is pure and doesn't depend on mocks or timers,
  // so we can test it more directly.
  let formatDate: (dateString: string, locale?: string) => string;

  beforeAll(async () => {
    // We still reset modules to ensure we get a completely fresh version,
    // consistent with how other tests in this file are structured.
    jest.resetModules();
    const utils = await import("../market-utils");
    formatDate = utils.formatDate;
  });

  it("should format a date correctly in French (fr-FR) by default", () => {
    const dateString = "2024-07-20"; // A Saturday
    // The output depends on the Node ICU data. This is a common format.
    expect(formatDate(dateString)).toBe("samedi 20 juillet 2024");
  });

  it("should format a date correctly in US English (en-US)", () => {
    const dateString = "2024-07-20"; // A Saturday
    expect(formatDate(dateString, "en-US")).toBe("Saturday, July 20, 2024");
  });

  it("should format a different date correctly in British English (en-GB)", () => {
    const dateString = "2025-01-01"; // A Wednesday
    expect(formatDate(dateString, "en-GB")).toBe("Wednesday, 1 January 2025");
  });

  it("should handle ISO strings with time component", () => {
    const dateString = "2024-08-15T10:00:00.000Z";
    expect(formatDate(dateString, "de-DE")).toBe("Donnerstag, 15. August 2024");
  });

  it("should return a string indicating an invalid date for invalid input", () => {
    // The exact output for invalid dates can be implementation-dependent.
    // In Node.js, `new Date('invalid').toLocaleDateString()` returns 'Invalid Date'.
    expect(formatDate("not-a-date")).toBe("Invalid Date");
  });
});
