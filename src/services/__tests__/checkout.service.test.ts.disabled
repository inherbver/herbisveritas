/**
 * Tests for Checkout Service
 */

import {
  createCheckoutSession,
  processCheckoutPayment,
  validateCheckoutData,
  calculateShipping,
  calculateTaxes,
  applyDiscountCode,
} from "../checkout.service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Stripe from "stripe";

// Mock dependencies
jest.mock("@/lib/supabase/server");
jest.mock("stripe");

const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(() => mockSupabaseClient),
  select: jest.fn(() => mockSupabaseClient),
  eq: jest.fn(() => mockSupabaseClient),
  single: jest.fn(),
  insert: jest.fn(() => mockSupabaseClient),
  update: jest.fn(() => mockSupabaseClient),
};

const mockStripe = {
  checkout: {
    sessions: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
  },
  paymentIntents: {
    create: jest.fn(),
    confirm: jest.fn(),
  },
};

(createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabaseClient);
(Stripe as unknown as jest.Mock).mockImplementation(() => mockStripe);

// Mock data
const mockCart = {
  id: "cart-123",
  items: [
    {
      id: "item-1",
      product_id: "prod-1",
      quantity: 2,
      price: 29.99,
      product: {
        name: "Product 1",
        weight: 500,
      },
    },
    {
      id: "item-2",
      product_id: "prod-2",
      quantity: 1,
      price: 49.99,
      product: {
        name: "Product 2",
        weight: 1000,
      },
    },
  ],
};

const mockAddress = {
  id: "addr-123",
  first_name: "John",
  last_name: "Doe",
  address_line1: "123 Main St",
  city: "Paris",
  postal_code: "75001",
  country: "France",
  phone: "+33123456789",
};

const mockCheckoutData = {
  cartId: "cart-123",
  shippingAddressId: "addr-123",
  billingAddressId: "addr-123",
  shippingMethod: "standard",
  paymentMethod: "card",
  email: "test@example.com",
};

describe("CheckoutService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createCheckoutSession", () => {
    it("should create a checkout session successfully", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      });

      // Mock cart fetch
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockCart,
        error: null,
      });

      // Mock address fetch
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockAddress,
        error: null,
      });

      // Mock Stripe session creation
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: "cs_test_123",
        url: "https://checkout.stripe.com/test",
      });

      const result = await createCheckoutSession(mockCheckoutData);

      expect(result.success).toBe(true);
      expect(result.data?.sessionId).toBe("cs_test_123");
      expect(result.data?.url).toContain("stripe.com");
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalled();
    });

    it("should handle empty cart", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      // Mock empty cart
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { ...mockCart, items: [] },
        error: null,
      });

      const result = await createCheckoutSession(mockCheckoutData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("panier vide");
    });

    it("should validate required fields", async () => {
      const invalidData = {
        cartId: "",
        shippingAddressId: "",
        billingAddressId: "",
        shippingMethod: "",
        paymentMethod: "",
        email: "",
      };

      const result = await createCheckoutSession(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("requis");
    });

    it("should handle Stripe errors", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockCart,
        error: null,
      });

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockAddress,
        error: null,
      });

      mockStripe.checkout.sessions.create.mockRejectedValue(new Error("Stripe error"));

      const result = await createCheckoutSession(mockCheckoutData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("paiement");
    });
  });

  describe("processCheckoutPayment", () => {
    it("should process payment successfully", async () => {
      const paymentData = {
        sessionId: "cs_test_123",
        paymentIntentId: "pi_test_123",
      };

      mockStripe.paymentIntents.confirm.mockResolvedValue({
        id: "pi_test_123",
        status: "succeeded",
      });

      // Mock order creation
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: "order-123", order_number: "ORD-000001" },
        error: null,
      });

      const result = await processCheckoutPayment(paymentData);

      expect(result.success).toBe(true);
      expect(result.data?.orderId).toBe("order-123");
      expect(result.data?.orderNumber).toBe("ORD-000001");
    });

    it("should handle payment failure", async () => {
      const paymentData = {
        sessionId: "cs_test_123",
        paymentIntentId: "pi_test_123",
      };

      mockStripe.paymentIntents.confirm.mockResolvedValue({
        id: "pi_test_123",
        status: "failed",
      });

      const result = await processCheckoutPayment(paymentData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("échoué");
    });
  });

  describe("validateCheckoutData", () => {
    it("should validate complete checkout data", async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockCart,
        error: null,
      });

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockAddress,
        error: null,
      });

      const result = await validateCheckoutData(mockCheckoutData);

      expect(result.success).toBe(true);
      expect(result.data?.isValid).toBe(true);
    });

    it("should detect invalid cart", async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116" },
      });

      const result = await validateCheckoutData(mockCheckoutData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("panier");
    });

    it("should detect invalid address", async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockCart,
        error: null,
      });

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116" },
      });

      const result = await validateCheckoutData(mockCheckoutData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("adresse");
    });
  });

  describe("calculateShipping", () => {
    it("should calculate standard shipping", () => {
      const result = calculateShipping(mockCart.items, "standard", "FR");

      expect(result.success).toBe(true);
      expect(result.data?.amount).toBeGreaterThan(0);
      expect(result.data?.method).toBe("standard");
      expect(result.data?.estimatedDays).toBeGreaterThan(0);
    });

    it("should calculate express shipping", () => {
      const result = calculateShipping(mockCart.items, "express", "FR");

      expect(result.success).toBe(true);
      expect(result.data?.amount).toBeGreaterThan(
        calculateShipping(mockCart.items, "standard", "FR").data?.amount || 0
      );
      expect(result.data?.method).toBe("express");
    });

    it("should handle free shipping threshold", () => {
      const largeCart = {
        items: [
          {
            ...mockCart.items[0],
            quantity: 10,
            price: 50,
          },
        ],
      };

      const result = calculateShipping(largeCart.items, "standard", "FR");

      expect(result.success).toBe(true);
      expect(result.data?.amount).toBe(0); // Free shipping over threshold
      expect(result.data?.isFree).toBe(true);
    });

    it("should handle international shipping", () => {
      const result = calculateShipping(mockCart.items, "standard", "US");

      expect(result.success).toBe(true);
      expect(result.data?.amount).toBeGreaterThan(
        calculateShipping(mockCart.items, "standard", "FR").data?.amount || 0
      );
      expect(result.data?.isInternational).toBe(true);
    });
  });

  describe("calculateTaxes", () => {
    it("should calculate French VAT", () => {
      const subtotal = 100;
      const result = calculateTaxes(subtotal, "FR");

      expect(result.success).toBe(true);
      expect(result.data?.amount).toBe(20); // 20% VAT
      expect(result.data?.rate).toBe(0.2);
      expect(result.data?.type).toBe("VAT");
    });

    it("should handle other EU countries", () => {
      const subtotal = 100;
      const result = calculateTaxes(subtotal, "DE");

      expect(result.success).toBe(true);
      expect(result.data?.amount).toBe(19); // 19% German VAT
      expect(result.data?.rate).toBe(0.19);
    });

    it("should handle non-EU countries", () => {
      const subtotal = 100;
      const result = calculateTaxes(subtotal, "US");

      expect(result.success).toBe(true);
      expect(result.data?.amount).toBe(0); // No VAT for non-EU
      expect(result.data?.rate).toBe(0);
      expect(result.data?.type).toBe("NONE");
    });
  });

  describe("applyDiscountCode", () => {
    it("should apply percentage discount", async () => {
      const code = "SAVE20";
      const subtotal = 100;

      // Mock discount code fetch
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          code: "SAVE20",
          type: "percentage",
          value: 20,
          is_active: true,
          valid_from: new Date(Date.now() - 86400000).toISOString(),
          valid_until: new Date(Date.now() + 86400000).toISOString(),
        },
        error: null,
      });

      const result = await applyDiscountCode(code, subtotal);

      expect(result.success).toBe(true);
      expect(result.data?.discountAmount).toBe(20);
      expect(result.data?.finalAmount).toBe(80);
    });

    it("should apply fixed discount", async () => {
      const code = "MINUS10";
      const subtotal = 100;

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          code: "MINUS10",
          type: "fixed",
          value: 10,
          is_active: true,
          valid_from: new Date(Date.now() - 86400000).toISOString(),
          valid_until: new Date(Date.now() + 86400000).toISOString(),
        },
        error: null,
      });

      const result = await applyDiscountCode(code, subtotal);

      expect(result.success).toBe(true);
      expect(result.data?.discountAmount).toBe(10);
      expect(result.data?.finalAmount).toBe(90);
    });

    it("should handle invalid discount code", async () => {
      const code = "INVALID";
      const subtotal = 100;

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116" },
      });

      const result = await applyDiscountCode(code, subtotal);

      expect(result.success).toBe(false);
      expect(result.error).toContain("invalide");
    });

    it("should handle expired discount code", async () => {
      const code = "EXPIRED";
      const subtotal = 100;

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          code: "EXPIRED",
          type: "percentage",
          value: 20,
          is_active: true,
          valid_from: new Date(Date.now() - 172800000).toISOString(),
          valid_until: new Date(Date.now() - 86400000).toISOString(), // Expired yesterday
        },
        error: null,
      });

      const result = await applyDiscountCode(code, subtotal);

      expect(result.success).toBe(false);
      expect(result.error).toContain("expiré");
    });

    it("should handle minimum amount requirement", async () => {
      const code = "MIN50";
      const subtotal = 30;

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          code: "MIN50",
          type: "percentage",
          value: 10,
          is_active: true,
          minimum_amount: 50,
          valid_from: new Date(Date.now() - 86400000).toISOString(),
          valid_until: new Date(Date.now() + 86400000).toISOString(),
        },
        error: null,
      });

      const result = await applyDiscountCode(code, subtotal);

      expect(result.success).toBe(false);
      expect(result.error).toContain("minimum");
    });
  });
});
