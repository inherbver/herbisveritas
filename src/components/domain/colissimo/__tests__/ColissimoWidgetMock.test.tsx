// src/components/domain/colissimo/__tests__/ColissimoWidgetMock.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import ColissimoWidgetMock from "../ColissimoWidgetMock";

describe("ColissimoWidgetMock", () => {
  const mockOnSelect = jest.fn();
  const mockOnError = jest.fn();

  const defaultProps = {
    token: "test_token_123",
    onSelect: mockOnSelect,
    onError: mockOnError,
  };

  const testAddress = {
    address: "123 Avenue des Champs-Élysées",
    zipCode: "75008",
    city: "Paris",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render the widget with title and default points", () => {
      render(<ColissimoWidgetMock {...defaultProps} />);

      expect(
        screen.getByText("🎭 Mode Simulation - Sélection Point de Retrait")
      ).toBeInTheDocument();
      expect(screen.getByText("La Poste Champs-Élysées")).toBeInTheDocument();
      expect(screen.getByText("Relay Point Franklin Roosevelt")).toBeInTheDocument();
      expect(screen.getByText("Monoprix George V")).toBeInTheDocument();
      expect(screen.getByText("Consigne Pickup Station Opéra")).toBeInTheDocument();
    });

    it("should display default address when provided", () => {
      render(<ColissimoWidgetMock {...defaultProps} defaultAddress={testAddress} />);

      expect(
        screen.getByText(
          `Points près de : ${testAddress.address}, ${testAddress.zipCode} ${testAddress.city}`
        )
      ).toBeInTheDocument();
    });

    it("should show token information in details element", () => {
      render(<ColissimoWidgetMock {...defaultProps} />);

      const tokenSummary = screen.getByText("Token utilisé");
      expect(tokenSummary).toBeInTheDocument();

      // Token should be visible in the details
      expect(screen.getByText(defaultProps.token)).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      const { container } = render(
        <ColissimoWidgetMock {...defaultProps} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });

  describe("Point Selection", () => {
    it("should call onSelect when a point is clicked", async () => {
      const user = userEvent.setup();
      render(<ColissimoWidgetMock {...defaultProps} />);

      const firstPoint = screen.getByText("La Poste Champs-Élysées").closest("article");
      expect(firstPoint).toBeInTheDocument();

      await user.click(firstPoint!);

      expect(mockOnSelect).toHaveBeenCalledTimes(1);
      expect(mockOnSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "POST_75008_001",
          name: "La Poste Champs-Élysées",
          address: "52 Avenue des Champs-Élysées",
          zipCode: "75008",
          city: "Paris",
          distance: 150,
        })
      );
    });

    it("should handle keyboard navigation (Enter key)", async () => {
      const user = userEvent.setup();
      render(<ColissimoWidgetMock {...defaultProps} />);

      const secondPoint = screen.getByText("Relay Point Franklin Roosevelt").closest("article");
      expect(secondPoint).toBeInTheDocument();

      secondPoint!.focus();
      await user.keyboard("{Enter}");

      expect(mockOnSelect).toHaveBeenCalledTimes(1);
      expect(mockOnSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "RELAY_75008_002",
          name: "Relay Point Franklin Roosevelt",
        })
      );
    });

    it("should handle keyboard navigation (Space key)", async () => {
      const user = userEvent.setup();
      render(<ColissimoWidgetMock {...defaultProps} />);

      const thirdPoint = screen.getByText("Monoprix George V").closest("article");
      expect(thirdPoint).toBeInTheDocument();

      thirdPoint!.focus();
      await user.keyboard("{ }");

      expect(mockOnSelect).toHaveBeenCalledTimes(1);
      expect(mockOnSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "PICKUP_75008_003",
          name: "Monoprix George V",
        })
      );
    });

    it("should visually indicate selected point", async () => {
      const user = userEvent.setup();
      render(<ColissimoWidgetMock {...defaultProps} />);

      const firstPoint = screen.getByText("La Poste Champs-Élysées").closest("article");
      expect(firstPoint).toBeInTheDocument();

      // Initially not selected
      expect(firstPoint).not.toHaveClass("border-blue-500", "bg-blue-50");

      await user.click(firstPoint!);

      // Should be selected
      expect(firstPoint).toHaveClass("border-blue-500", "bg-blue-50");
      expect(screen.getByText("✅ Point sélectionné")).toBeInTheDocument();
    });

    it("should change selection when clicking different points", async () => {
      const user = userEvent.setup();
      render(<ColissimoWidgetMock {...defaultProps} />);

      const firstPoint = screen.getByText("La Poste Champs-Élysées").closest("article");
      const secondPoint = screen.getByText("Relay Point Franklin Roosevelt").closest("article");

      // Select first point
      await user.click(firstPoint!);
      expect(firstPoint).toHaveClass("border-blue-500", "bg-blue-50");
      expect(mockOnSelect).toHaveBeenCalledTimes(1);

      // Select second point
      await user.click(secondPoint!);
      expect(secondPoint).toHaveClass("border-blue-500", "bg-blue-50");
      expect(firstPoint).not.toHaveClass("border-blue-500", "bg-blue-50");
      expect(mockOnSelect).toHaveBeenCalledTimes(2);
    });
  });

  describe("Point Information Display", () => {
    it("should display all point information correctly", () => {
      render(<ColissimoWidgetMock {...defaultProps} />);

      // Check La Poste point
      expect(screen.getByText("La Poste Champs-Élysées")).toBeInTheDocument();
      expect(screen.getByText("Bureau de Poste")).toBeInTheDocument();
      expect(
        screen.getByText(
          (content, element) => element?.textContent === "52 Avenue des Champs-Élysées75008 Paris"
        )
      ).toBeInTheDocument();
      expect(screen.getByText("150m")).toBeInTheDocument();
      expect(screen.getByText("📅 Lun-Ven 9h-19h, Sam 9h-17h")).toBeInTheDocument();

      // Check Pickup point (there are multiple, so use getAllByText)
      expect(screen.getAllByText("Point Pickup")).toHaveLength(2);
      expect(screen.getByText("280m")).toBeInTheDocument();

      // Check Locker point
      expect(screen.getByText("Consigne automatique")).toBeInTheDocument();
      expect(screen.getByText("📅 24h/24, 7j/7")).toBeInTheDocument();
      expect(screen.getByText("850m")).toBeInTheDocument();
    });

    it("should display correct icons for different point types", () => {
      render(<ColissimoWidgetMock {...defaultProps} />);

      const articles = screen.getAllByRole("button");

      // Should have the right number of point articles
      expect(articles).toHaveLength(4);

      // Check that icons are present (emojis are in the DOM)
      expect(screen.getByText("🏢")).toBeInTheDocument(); // Bureau de Poste
      expect(screen.getAllByText("🏪")).toHaveLength(2); // Point Pickup (2 instances)
      expect(screen.getByText("📦")).toBeInTheDocument(); // Consigne
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA attributes", () => {
      render(<ColissimoWidgetMock {...defaultProps} />);

      // Main section should have aria-label
      expect(screen.getByLabelText("Simulation widget Colissimo")).toBeInTheDocument();

      // Points should be buttons with proper roles
      const pointButtons = screen.getAllByRole("button");
      expect(pointButtons).toHaveLength(4);

      pointButtons.forEach((button) => {
        expect(button).toHaveAttribute("tabIndex", "0");
        expect(button).toHaveAttribute("aria-pressed", "false");
      });
    });

    it("should update aria-pressed when point is selected", async () => {
      const user = userEvent.setup();
      render(<ColissimoWidgetMock {...defaultProps} />);

      const firstPoint = screen.getAllByRole("button")[0];
      expect(firstPoint).toHaveAttribute("aria-pressed", "false");

      await user.click(firstPoint);

      expect(firstPoint).toHaveAttribute("aria-pressed", "true");
    });

    it("should have semantic HTML structure", () => {
      render(<ColissimoWidgetMock {...defaultProps} />);

      // Should use semantic elements
      expect(screen.getByRole("main")).toBeInTheDocument();

      // Check for header and footer elements (there might be multiple headers)
      const headers = document.querySelectorAll("header");
      expect(headers.length).toBeGreaterThan(0);

      expect(screen.getByRole("contentinfo")).toBeInTheDocument(); // footer

      // Address elements should be marked up correctly
      const addresses = document.querySelectorAll("address");
      expect(addresses).toHaveLength(4);
    });
  });

  describe("Console Logging", () => {
    it("should log selected point information", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
      const user = userEvent.setup();

      render(<ColissimoWidgetMock {...defaultProps} />);

      const firstPoint = screen.getByText("La Poste Champs-Élysées").closest("article");
      await user.click(firstPoint!);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Point de retrait sélectionné (simulation):",
        expect.objectContaining({
          id: "POST_75008_001",
          name: "La Poste Champs-Élysées",
        })
      );

      consoleSpy.mockRestore();
    });
  });
});
