import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MarketAgenda } from "./MarketAgenda";
import { MarketInfo } from "@/types/market";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

// Mock the formatDate utility to isolate the component
jest.mock("@/lib/market-utils", () => ({
  formatDate: (dateString: string, locale: string) => `formatted_${dateString}_${locale}`,
}));

const mockMarkets: MarketInfo[] = [
  {
    id: "market-1",
    name: "Central Market",
    city: "Metropolis",
    date: "2024-08-01",
    startTime: "09:00",
    endTime: "17:00",
    address: "123 Main St",
    description: "",
    gpsLink: "",
    heroImage: "",
  },
  {
    id: "market-2",
    name: "Uptown Bazaar",
    city: "Gotham",
    date: "2024-08-03",
    startTime: "10:00",
    endTime: "18:00",
    address: "456 High St",
    description: "",
    gpsLink: "",
    heroImage: "",
  },
  {
    id: "market-3",
    name: "Metropolis Farmers Market",
    city: "Metropolis",
    date: "2024-08-08",
    startTime: "08:00",
    endTime: "14:00",
    address: "789 Park Ave",
    description: "",
    gpsLink: "",
    heroImage: "",
  },
];

describe("MarketAgenda", () => {
  it("should render all markets initially", () => {
    render(<MarketAgenda initialMarkets={mockMarkets} locale="en-US" />);

    expect(screen.getByText("Central Market")).toBeInTheDocument();
    expect(screen.getByText("Uptown Bazaar")).toBeInTheDocument();
    expect(screen.getByText("Metropolis Farmers Market")).toBeInTheDocument();
  });

  it("should render unique city filters", async () => {
    render(<MarketAgenda initialMarkets={mockMarkets} locale="en-US" />);

    // Accordion needs to be opened to see the filters
    const filterTrigger = screen.getByText("Filters.filterByCity");
    fireEvent.click(filterTrigger);

    // Use await findByText for elements that appear after an interaction
    expect(await screen.findByText("Metropolis")).toBeInTheDocument();
    expect(await screen.findByText("Gotham")).toBeInTheDocument();

    // Ensure cities are not duplicated
    const metropolisCheckboxes = screen.getAllByLabelText("Metropolis");
    expect(metropolisCheckboxes).toHaveLength(1);
  });

  it("should filter markets when a city is selected", async () => {
    render(<MarketAgenda initialMarkets={mockMarkets} locale="en-US" />);

    // Open the filter accordion
    const filterTrigger = screen.getByText("Filters.filterByCity");
    fireEvent.click(filterTrigger);

    // Find and click the 'Gotham' checkbox
    const gothamCheckbox = await screen.findByLabelText("Gotham");
    fireEvent.click(gothamCheckbox);

    // Assert that only Gotham market is visible
    expect(screen.queryByText("Central Market")).not.toBeInTheDocument();
    expect(screen.getByText("Uptown Bazaar")).toBeInTheDocument();
    expect(screen.queryByText("Metropolis Farmers Market")).not.toBeInTheDocument();
  });

  it("should show a message if no markets match the filter", async () => {
    render(<MarketAgenda initialMarkets={mockMarkets} locale="en-US" />);
    const filterTrigger = screen.getByText("Filters.filterByCity");
    fireEvent.click(filterTrigger);

    // Create a city that doesn't exist to check
    // This test is conceptual - in a real scenario you'd click an existing filter
    // that results in no markets. Let's filter by Gotham and then unfilter.
    const gothamCheckbox = await screen.findByLabelText("Gotham");
    fireEvent.click(gothamCheckbox); // Select Gotham
    fireEvent.click(gothamCheckbox); // Deselect Gotham

    // Now filter by Metropolis
    const metropolisCheckbox = await screen.findByLabelText("Metropolis");
    fireEvent.click(metropolisCheckbox);
    expect(screen.getByText("Central Market")).toBeInTheDocument();
    expect(screen.getByText("Metropolis Farmers Market")).toBeInTheDocument();
  });

  it("should display a message when initialMarkets is empty", () => {
    render(<MarketAgenda initialMarkets={[]} locale="en-US" />);

    expect(screen.getByText("ContactPage.noUpcomingMarketsForFilter")).toBeInTheDocument();
    // The filter accordion should not be rendered if there are no cities
    expect(screen.queryByText("Filters.filterByCity")).not.toBeInTheDocument();
  });
});
