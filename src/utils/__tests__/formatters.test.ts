/**
 * Tests for Formatter Utilities
 */

import {
  formatPrice,
  formatDate,
  formatPhoneNumber,
  formatOrderNumber,
  truncateText,
  capitalizeFirst,
  formatFileSize,
  formatPercentage,
  formatCurrency,
  formatRelativeTime,
} from "../formatters";

describe("Formatter Utilities", () => {
  describe("formatPrice", () => {
    it("should format price with EUR currency", () => {
      // Note: Using non-breaking space (nbsp) in expected values
      expect(formatPrice(29.99)).toContain("29,99");
      expect(formatPrice(29.99)).toContain("€");
      expect(formatPrice(1000)).toMatch(/1[\s ]000,00/);
      expect(formatPrice(0)).toContain("0,00");
    });

    it("should handle different currencies", () => {
      // Parameters are in wrong order - should be (price, locale, currency)
      expect(formatPrice(29.99, "fr-FR", "USD")).toContain("$");
      expect(formatPrice(29.99, "fr-FR", "GBP")).toContain("£");
    });

    it("should handle different locales", () => {
      expect(formatPrice(1234.56, "en-US", "EUR")).toContain("1,234.56");
      expect(formatPrice(1234.56, "de-DE", "EUR")).toMatch(/1\.234,56/);
    });

    it("should handle negative values", () => {
      expect(formatPrice(-29.99)).toContain("-29,99");
    });

    it("should handle very large numbers", () => {
      const result = formatPrice(1000000);
      expect(result).toMatch(/1[\s ]000[\s ]000,00/);
    });
  });

  describe("formatDate", () => {
    it("should format date in French by default", () => {
      const date = new Date("2024-01-15T10:30:00");
      expect(formatDate(date)).toMatch(/15 janvier 2024/);
    });

    it("should handle different date formats", () => {
      const date = new Date("2024-01-15T10:30:00");
      expect(formatDate(date, "short")).toMatch(/15\/01\/2024/);
      expect(formatDate(date, "long")).toMatch(/15 janvier 2024/);
      expect(formatDate(date, "time")).toMatch(/10:30/);
    });

    it("should handle string dates", () => {
      expect(formatDate("2024-01-15")).toMatch(/15 janvier 2024/);
      expect(formatDate("2024-01-15T10:30:00")).toMatch(/15 janvier 2024/);
    });

    it("should handle different locales", () => {
      const date = new Date("2024-01-15");
      expect(formatDate(date, "default", "en-US")).toMatch(/January 15, 2024/);
      expect(formatDate(date, "default", "de-DE")).toMatch(/15\. Januar 2024/);
    });

    it("should handle invalid dates", () => {
      expect(formatDate("invalid")).toBe("Date invalide");
      expect(formatDate(null)).toBe("");
    });
  });

  describe("formatPhoneNumber", () => {
    it("should format French phone numbers", () => {
      expect(formatPhoneNumber("+33612345678")).toBe("+33 6 12 34 56 78");
      expect(formatPhoneNumber("0612345678")).toBe("06 12 34 56 78");
      expect(formatPhoneNumber("33612345678")).toBe("+33 6 12 34 56 78");
    });

    it("should handle international numbers", () => {
      expect(formatPhoneNumber("+14155552671")).toBe("+1 415 555 2671");
      expect(formatPhoneNumber("+442079460958")).toBe("+44 20 7946 0958");
    });

    it("should handle invalid phone numbers", () => {
      expect(formatPhoneNumber("123")).toBe("123");
      expect(formatPhoneNumber("notaphone")).toBe("notaphone");
      expect(formatPhoneNumber("")).toBe("");
    });

    it("should preserve formatting for already formatted numbers", () => {
      expect(formatPhoneNumber("+33 6 12 34 56 78")).toBe("+33 6 12 34 56 78");
    });
  });

  describe("formatOrderNumber", () => {
    it("should format order numbers with prefix", () => {
      expect(formatOrderNumber("123")).toBe("CMD-000123");
      expect(formatOrderNumber("1234567")).toBe("CMD-1234567");
      expect(formatOrderNumber(456)).toBe("CMD-000456");
    });

    it("should handle existing prefix", () => {
      expect(formatOrderNumber("CMD-000123")).toBe("CMD-000123");
      expect(formatOrderNumber("ORDER-123")).toBe("ORDER-123");
    });

    it("should handle empty input", () => {
      expect(formatOrderNumber("")).toBe("CMD-000000");
      expect(formatOrderNumber(0)).toBe("CMD-000000");
    });
  });

  describe("truncateText", () => {
    it("should truncate long text", () => {
      const longText = "This is a very long text that needs to be truncated";
      expect(truncateText(longText, 20)).toBe("This is a very long ...");
      expect(truncateText(longText, 10)).toBe("This is a ...");
    });

    it("should not truncate short text", () => {
      const shortText = "Short text";
      expect(truncateText(shortText, 20)).toBe("Short text");
      expect(truncateText(shortText, 100)).toBe("Short text");
    });

    it("should handle custom suffix", () => {
      const text = "This is a long text";
      expect(truncateText(text, 10, " [...]")).toBe("This is a  [...]");
      expect(truncateText(text, 10, "")).toBe("This is a ");
    });

    it("should handle edge cases", () => {
      expect(truncateText("", 10)).toBe("");
      expect(truncateText("test", 0)).toBe("...");
      expect(truncateText("test", -1)).toBe("...");
    });
  });

  describe("capitalizeFirst", () => {
    it("should capitalize first letter", () => {
      expect(capitalizeFirst("hello")).toBe("Hello");
      expect(capitalizeFirst("hello world")).toBe("Hello world");
      expect(capitalizeFirst("HELLO")).toBe("Hello");
    });

    it("should handle edge cases", () => {
      expect(capitalizeFirst("")).toBe("");
      expect(capitalizeFirst("a")).toBe("A");
      expect(capitalizeFirst("123")).toBe("123");
      expect(capitalizeFirst(" hello")).toBe(" hello");
    });

    it("should handle accented characters", () => {
      expect(capitalizeFirst("école")).toBe("École");
      expect(capitalizeFirst("été")).toBe("Été");
    });
  });

  describe("formatFileSize", () => {
    it("should format bytes to human readable", () => {
      expect(formatFileSize(0)).toBe("0 B");
      expect(formatFileSize(1024)).toBe("1.0 KB");
      expect(formatFileSize(1048576)).toBe("1.0 MB");
      expect(formatFileSize(1073741824)).toBe("1.0 GB");
    });

    it("should handle decimal places", () => {
      expect(formatFileSize(1536)).toBe("1.5 KB");
      expect(formatFileSize(1536000)).toBe("1.5 MB");
      expect(formatFileSize(2621440)).toBe("2.5 MB");
    });

    it("should handle large files", () => {
      expect(formatFileSize(1099511627776)).toBe("1.0 TB");
      expect(formatFileSize(5368709120)).toBe("5.0 GB");
    });

    it("should handle negative values", () => {
      expect(formatFileSize(-1024)).toBe("-1.0 KB");
    });
  });

  describe("formatPercentage", () => {
    it("should format percentages", () => {
      expect(formatPercentage(0.5)).toBe("50%");
      expect(formatPercentage(0.25)).toBe("25%");
      expect(formatPercentage(1)).toBe("100%");
      expect(formatPercentage(0)).toBe("0%");
    });

    it("should handle decimals", () => {
      expect(formatPercentage(0.333, 1)).toBe("33.3%");
      expect(formatPercentage(0.3333, 2)).toBe("33.33%");
      expect(formatPercentage(0.12345, 2)).toBe("12.35%");
    });

    it("should handle values over 100%", () => {
      expect(formatPercentage(1.5)).toBe("150%");
      expect(formatPercentage(2)).toBe("200%");
    });

    it("should handle negative percentages", () => {
      expect(formatPercentage(-0.25)).toBe("-25%");
    });
  });

  describe("formatCurrency", () => {
    it("should format with currency symbol", () => {
      expect(formatCurrency(29.99, "€")).toBe("€ 29.99");
      expect(formatCurrency(29.99, "$")).toBe("$ 29.99");
      expect(formatCurrency(29.99, "£")).toBe("£ 29.99");
    });

    it("should handle position option", () => {
      expect(formatCurrency(29.99, "€", "before")).toBe("€ 29.99");
      expect(formatCurrency(29.99, "€", "after")).toBe("29.99 €");
    });

    it("should handle decimal places", () => {
      expect(formatCurrency(29.999, "€", "after", 2)).toBe("30.00 €");
      expect(formatCurrency(29.999, "€", "after", 3)).toBe("29.999 €");
      expect(formatCurrency(29, "€", "after", 0)).toBe("29 €");
    });
  });

  describe("formatRelativeTime", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2024-01-15T12:00:00"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should format past times", () => {
      expect(formatRelativeTime(new Date("2024-01-15T11:59:00"))).toContain("minute");
      expect(formatRelativeTime(new Date("2024-01-15T11:00:00"))).toContain("heure");
      expect(formatRelativeTime(new Date("2024-01-14T12:00:00"))).toContain("hier");
      expect(formatRelativeTime(new Date("2024-01-08T12:00:00"))).toContain("semaine");
    });

    it("should format future times", () => {
      expect(formatRelativeTime(new Date("2024-01-15T12:01:00"))).toContain("minute");
      expect(formatRelativeTime(new Date("2024-01-15T13:00:00"))).toContain("heure");
      expect(formatRelativeTime(new Date("2024-01-16T12:00:00"))).toContain("demain");
    });

    it("should handle just now", () => {
      expect(formatRelativeTime(new Date("2024-01-15T12:00:00"))).toBe("à l'instant");
      // For times very close to now
      const almostNow = new Date("2024-01-15T11:59:45");
      expect(formatRelativeTime(almostNow)).toBe("à l'instant");
    });

    it("should handle different locales", () => {
      expect(formatRelativeTime(new Date("2024-01-14T12:00:00"), "en-US")).toContain("yesterday");
      expect(formatRelativeTime(new Date("2024-01-16T12:00:00"), "en-US")).toContain("tomorrow");
    });
  });
});
