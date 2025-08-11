/**
 * Tests for Stripe Client Initialization
 */

import { stripe } from "../index";
import Stripe from "stripe";

// Mock environment variables
const originalEnv = process.env;

describe("Stripe Client", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("initialization", () => {
    it("should initialize Stripe client with correct configuration", () => {
      process.env.STRIPE_SECRET_KEY = "sk_test_123456789";

      expect(stripe).toBeDefined();
      // Note: stripe is mocked in jest.setup.ts, so we test that it exists
      expect(typeof stripe).toBe("object");
    });

    it("should throw error if STRIPE_SECRET_KEY is not set", () => {
      delete process.env.STRIPE_SECRET_KEY;

      expect(() => {
        jest.isolateModules(() => {
          require("../index");
        });
      }).toThrow("STRIPE_SECRET_KEY is not set in the environment variables");
    });

    it("should use TypeScript configuration", () => {
      process.env.STRIPE_SECRET_KEY = "sk_test_123456789";

      // Check TypeScript is enabled by verifying type safety features
      expect(stripe.getApiField("typescript")).toBe(true);
    });
  });

  describe("API version", () => {
    it("should use the latest supported Stripe API version", () => {
      process.env.STRIPE_SECRET_KEY = "sk_test_123456789";

      expect(stripe.getApiField("version")).toBe("2025-06-30.basil");
    });
  });

  describe("client configuration", () => {
    it("should have correct timeout settings", () => {
      process.env.STRIPE_SECRET_KEY = "sk_test_123456789";

      // Stripe client should have reasonable timeout
      const config = stripe.getApiField("timeout");
      expect(typeof config).toBe("number");
      expect(config).toBeGreaterThan(0);
    });

    it("should have proper retry configuration", () => {
      process.env.STRIPE_SECRET_KEY = "sk_test_123456789";

      // Stripe should have retry logic enabled
      const maxRetries = stripe.getMaxNetworkRetries();
      expect(maxRetries).toBeGreaterThan(0);
    });
  });
});
