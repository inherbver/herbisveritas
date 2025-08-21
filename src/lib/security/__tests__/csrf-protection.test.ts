/**
 * Tests pour la protection CSRF
 * PRIORITÉ: CRITIQUE - Protection contre les attaques CSRF
 */

import {
  generateCSRFToken,
  validateCSRFToken,
  getCSRFToken,
  rotateCSRFToken,
  cleanupExpiredTokens,
} from "@/lib/security/csrf-protection";
import { cookies } from "next/headers";
import crypto from "crypto";

// Mocks
jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

jest.mock("crypto", () => ({
  ...jest.requireActual("crypto"),
  randomBytes: jest.fn(),
}));

describe("CSRF Protection", () => {
  let mockCookies: any;
  const CSRF_COOKIE_NAME = "csrf-token";
  const CSRF_HEADER_NAME = "x-csrf-token";

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock cookies
    mockCookies = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };
    (cookies as jest.Mock).mockResolvedValue(mockCookies);

    // Mock crypto
    (crypto.randomBytes as jest.Mock).mockReturnValue(
      Buffer.from("mock-random-token-bytes-here"),
    );
  });

  describe("generateCSRFToken", () => {
    it("should generate a unique token", async () => {
      // Act
      const token = await generateCSRFToken();

      // Assert
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(32);
    });

    it("should store token in secure cookie", async () => {
      // Act
      const token = await generateCSRFToken();

      // Assert
      expect(mockCookies.set).toHaveBeenCalledWith(
        CSRF_COOKIE_NAME,
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: "strict",
          path: "/",
          maxAge: 3600, // 1 heure
        }),
      );
    });

    it("should include timestamp in token for expiry check", async () => {
      // Act
      const token = await generateCSRFToken();

      // Assert - Le token devrait contenir un timestamp encodé
      const decoded = Buffer.from(token, "base64").toString();
      expect(decoded).toContain(":");

      const [, timestamp] = decoded.split(":");
      expect(parseInt(timestamp)).toBeCloseTo(Date.now(), -2);
    });

    it("should sign token with secret key", async () => {
      // Arrange
      process.env.CSRF_SECRET = "test-secret-key";

      // Act
      const token = await generateCSRFToken();

      // Assert
      const decoded = Buffer.from(token, "base64").toString();
      expect(decoded).toContain(":");

      const parts = decoded.split(":");
      expect(parts.length).toBe(3); // value:timestamp:signature
    });
  });

  describe("validateCSRFToken", () => {
    it("should validate a valid token from header", async () => {
      // Arrange
      const token = "valid-token:" + Date.now() + ":signature";
      const encodedToken = Buffer.from(token).toString("base64");

      mockCookies.get.mockReturnValue({ value: encodedToken });

      const request = {
        headers: new Headers({
          [CSRF_HEADER_NAME]: encodedToken,
        }),
      };

      // Act
      const isValid = await validateCSRFToken(request);

      // Assert
      expect(isValid).toBe(true);
    });

    it("should reject missing token", async () => {
      // Arrange
      mockCookies.get.mockReturnValue(undefined);

      const request = {
        headers: new Headers(),
      };

      // Act
      const isValid = await validateCSRFToken(request);

      // Assert
      expect(isValid).toBe(false);
    });

    it("should reject mismatched tokens", async () => {
      // Arrange
      const cookieToken = Buffer.from("cookie-token:" + Date.now()).toString(
        "base64",
      );
      const headerToken = Buffer.from("header-token:" + Date.now()).toString(
        "base64",
      );

      mockCookies.get.mockReturnValue({ value: cookieToken });

      const request = {
        headers: new Headers({
          [CSRF_HEADER_NAME]: headerToken,
        }),
      };

      // Act
      const isValid = await validateCSRFToken(request);

      // Assert
      expect(isValid).toBe(false);
    });

    it("should reject expired tokens", async () => {
      // Arrange
      const expiredTimestamp = Date.now() - 2 * 60 * 60 * 1000; // 2 heures
      const token = "token:" + expiredTimestamp + ":signature";
      const encodedToken = Buffer.from(token).toString("base64");

      mockCookies.get.mockReturnValue({ value: encodedToken });

      const request = {
        headers: new Headers({
          [CSRF_HEADER_NAME]: encodedToken,
        }),
      };

      // Act
      const isValid = await validateCSRFToken(request);

      // Assert
      expect(isValid).toBe(false);
    });

    it("should reject tokens with invalid signature", async () => {
      // Arrange
      process.env.CSRF_SECRET = "correct-secret";

      const token = "token:" + Date.now() + ":wrong-signature";
      const encodedToken = Buffer.from(token).toString("base64");

      mockCookies.get.mockReturnValue({ value: encodedToken });

      const request = {
        headers: new Headers({
          [CSRF_HEADER_NAME]: encodedToken,
        }),
      };

      // Act
      const isValid = await validateCSRFToken(request);

      // Assert
      expect(isValid).toBe(false);
    });

    it("should handle token from form data", async () => {
      // Arrange
      const token = "valid-token:" + Date.now() + ":signature";
      const encodedToken = Buffer.from(token).toString("base64");

      mockCookies.get.mockReturnValue({ value: encodedToken });

      const formData = new FormData();
      formData.append("csrf_token", encodedToken);

      const request = {
        headers: new Headers(),
        formData: async () => formData,
      };

      // Act
      const isValid = await validateCSRFToken(request);

      // Assert
      expect(isValid).toBe(true);
    });
  });

  describe("getCSRFToken", () => {
    it("should return existing valid token", async () => {
      // Arrange
      const existingToken = "token:" + Date.now() + ":signature";
      const encodedToken = Buffer.from(existingToken).toString("base64");

      mockCookies.get.mockReturnValue({ value: encodedToken });

      // Act
      const token = await getCSRFToken();

      // Assert
      expect(token).toBe(encodedToken);
      expect(mockCookies.set).not.toHaveBeenCalled();
    });

    it("should generate new token if none exists", async () => {
      // Arrange
      mockCookies.get.mockReturnValue(undefined);

      // Act
      const token = await getCSRFToken();

      // Assert
      expect(token).toBeDefined();
      expect(mockCookies.set).toHaveBeenCalled();
    });

    it("should regenerate expired token", async () => {
      // Arrange
      const expiredTimestamp = Date.now() - 2 * 60 * 60 * 1000;
      const expiredToken = "token:" + expiredTimestamp + ":signature";
      const encodedToken = Buffer.from(expiredToken).toString("base64");

      mockCookies.get.mockReturnValue({ value: encodedToken });

      // Act
      const token = await getCSRFToken();

      // Assert
      expect(token).not.toBe(encodedToken);
      expect(mockCookies.set).toHaveBeenCalled();
    });
  });

  describe("rotateCSRFToken", () => {
    it("should generate new token and invalidate old one", async () => {
      // Arrange
      const oldToken = "old-token:" + Date.now() + ":signature";
      const encodedOldToken = Buffer.from(oldToken).toString("base64");

      mockCookies.get.mockReturnValue({ value: encodedOldToken });

      // Act
      const newToken = await rotateCSRFToken();

      // Assert
      expect(newToken).not.toBe(encodedOldToken);
      expect(mockCookies.set).toHaveBeenCalledWith(
        CSRF_COOKIE_NAME,
        expect.any(String),
        expect.any(Object),
      );
    });

    it("should maintain grace period for old token", async () => {
      // Arrange
      const oldToken = "old-token:" + Date.now() + ":signature";
      const encodedOldToken = Buffer.from(oldToken).toString("base64");

      mockCookies.get.mockReturnValue({ value: encodedOldToken });

      // Act
      const newToken = await rotateCSRFToken();

      // Assert - L'ancien token devrait rester valide pendant une période de grâce
      expect(mockCookies.set).toHaveBeenCalledWith(
        "csrf-token-old",
        encodedOldToken,
        expect.objectContaining({
          maxAge: 60, // 1 minute de grâce
        }),
      );
    });
  });

  describe("Double Submit Cookie Pattern", () => {
    it("should implement double submit pattern correctly", async () => {
      // Le token doit être présent à la fois dans le cookie et dans la requête
      const token = await generateCSRFToken();

      // Simuler une requête avec double submit
      mockCookies.get.mockReturnValue({ value: token });

      const request = {
        headers: new Headers({
          [CSRF_HEADER_NAME]: token,
          cookie: `${CSRF_COOKIE_NAME}=${token}`,
        }),
      };

      // Act
      const isValid = await validateCSRFToken(request);

      // Assert
      expect(isValid).toBe(true);
    });
  });

  describe("Origin Verification", () => {
    it("should verify origin header for state-changing requests", async () => {
      // Arrange
      const token = "valid-token:" + Date.now() + ":signature";
      const encodedToken = Buffer.from(token).toString("base64");

      mockCookies.get.mockReturnValue({ value: encodedToken });

      const validOrigins = [
        "https://herbisveritas.com",
        "https://www.herbisveritas.com",
      ];

      for (const origin of validOrigins) {
        const request = {
          headers: new Headers({
            [CSRF_HEADER_NAME]: encodedToken,
            origin: origin,
          }),
          url: "https://herbisveritas.com/api/cart/add",
        };

        // Act
        const isValid = await validateCSRFToken(request);

        // Assert
        expect(isValid).toBe(true);
      }
    });

    it("should reject requests from invalid origins", async () => {
      // Arrange
      const token = "valid-token:" + Date.now() + ":signature";
      const encodedToken = Buffer.from(token).toString("base64");

      mockCookies.get.mockReturnValue({ value: encodedToken });

      const invalidOrigins = [
        "https://evil-site.com",
        "http://herbisveritas.com", // Non-HTTPS
        "https://herbisveritas.evil.com",
      ];

      for (const origin of invalidOrigins) {
        const request = {
          headers: new Headers({
            [CSRF_HEADER_NAME]: encodedToken,
            origin: origin,
          }),
          url: "https://herbisveritas.com/api/cart/add",
        };

        // Act
        const isValid = await validateCSRFToken(request);

        // Assert
        expect(isValid).toBe(false);
      }
    });
  });

  describe("Safe Methods Exemption", () => {
    it("should skip CSRF validation for safe methods", async () => {
      const safeMethods = ["GET", "HEAD", "OPTIONS"];

      for (const method of safeMethods) {
        const request = {
          method,
          headers: new Headers(),
        };

        // Act
        const isValid = await validateCSRFToken(request);

        // Assert
        expect(isValid).toBe(true); // Safe methods should always pass
      }
    });

    it("should require CSRF validation for state-changing methods", async () => {
      const unsafeMethods = ["POST", "PUT", "DELETE", "PATCH"];

      for (const method of unsafeMethods) {
        mockCookies.get.mockReturnValue(undefined);

        const request = {
          method,
          headers: new Headers(),
        };

        // Act
        const isValid = await validateCSRFToken(request);

        // Assert
        expect(isValid).toBe(false); // Should fail without token
      }
    });
  });

  describe("Performance", () => {
    it("should validate tokens quickly", async () => {
      // Arrange
      const token = "valid-token:" + Date.now() + ":signature";
      const encodedToken = Buffer.from(token).toString("base64");

      mockCookies.get.mockReturnValue({ value: encodedToken });

      const request = {
        headers: new Headers({
          [CSRF_HEADER_NAME]: encodedToken,
        }),
      };

      // Act
      const start = Date.now();
      await validateCSRFToken(request);
      const duration = Date.now() - start;

      // Assert
      expect(duration).toBeLessThan(10); // Should be very fast
    });

    it("should cache validation results for same token", async () => {
      // Arrange
      const token = "valid-token:" + Date.now() + ":signature";
      const encodedToken = Buffer.from(token).toString("base64");

      mockCookies.get.mockReturnValue({ value: encodedToken });

      const request = {
        headers: new Headers({
          [CSRF_HEADER_NAME]: encodedToken,
        }),
      };

      // Act - Validate same token multiple times
      await validateCSRFToken(request);
      await validateCSRFToken(request);
      await validateCSRFToken(request);

      // Assert - Cookie should only be read once (cached)
      expect(mockCookies.get).toHaveBeenCalledTimes(1);
    });
  });
});
