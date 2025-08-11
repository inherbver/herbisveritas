/**
 * Tests for Stripe Utility Functions
 */

import {
  formatStripeAmount,
  toStripeAmount,
  validateWebhookSignature,
  getStripeSession,
  createStripeCustomer,
  updateStripeCustomer,
  getStripeCustomerByEmail,
  createStripeRefund,
  getPaymentIntent,
  createPaymentMethod,
  validateCardDetails,
  getCardBrand,
  formatCardNumber,
  maskCardNumber,
  formatStripeError,
  requiresAuthentication,
  getSupportedPaymentMethods,
} from "../utils";
import { stripe } from "../index";
import Stripe from "stripe";

// Mock Stripe client
jest.mock("../index", () => ({
  stripe: {
    webhooks: {
      constructEvent: jest.fn(),
    },
    checkout: {
      sessions: {
        retrieve: jest.fn(),
      },
    },
    customers: {
      create: jest.fn(),
      update: jest.fn(),
      list: jest.fn(),
    },
    refunds: {
      create: jest.fn(),
    },
    paymentIntents: {
      retrieve: jest.fn(),
    },
    paymentMethods: {
      create: jest.fn(),
      attach: jest.fn(),
    },
  },
}));

const mockStripe = stripe as any;

describe("Stripe Utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("formatStripeAmount", () => {
    it("should convert cents to decimal amount", () => {
      expect(formatStripeAmount(2999)).toBe(29.99);
      expect(formatStripeAmount(100)).toBe(1.0);
      expect(formatStripeAmount(50)).toBe(0.5);
      expect(formatStripeAmount(0)).toBe(0);
    });

    it("should handle different currencies", () => {
      expect(formatStripeAmount(2999, "eur")).toBe(29.99);
      expect(formatStripeAmount(2999, "usd")).toBe(29.99);
      expect(formatStripeAmount(2999, "gbp")).toBe(29.99);
    });
  });

  describe("toStripeAmount", () => {
    it("should convert decimal to cents", () => {
      expect(toStripeAmount(29.99)).toBe(2999);
      expect(toStripeAmount(1.0)).toBe(100);
      expect(toStripeAmount(0.5)).toBe(50);
      expect(toStripeAmount(0)).toBe(0);
    });

    it("should round to nearest cent", () => {
      expect(toStripeAmount(29.999)).toBe(3000);
      expect(toStripeAmount(29.994)).toBe(2999);
      expect(toStripeAmount(1.005)).toBe(100); // Banker's rounding: 100.5 rounds to 100
    });
  });

  describe("validateWebhookSignature", () => {
    it("should validate webhook signature successfully", () => {
      const mockEvent = { id: "evt_test", type: "test" } as Stripe.Event;
      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      const result = validateWebhookSignature("body", "signature", "secret");

      expect(result).toBe(mockEvent);
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        "body",
        "signature",
        "secret"
      );
    });

    it("should throw error for invalid signature", () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      expect(() => {
        validateWebhookSignature("body", "invalid", "secret");
      }).toThrow("Invalid signature");
    });
  });

  describe("getStripeSession", () => {
    it("should retrieve checkout session with expanded data", async () => {
      const mockSession = { id: "cs_test", status: "complete" };
      mockStripe.checkout.sessions.retrieve.mockResolvedValue(mockSession);

      const result = await getStripeSession("cs_test");

      expect(result).toBe(mockSession);
      expect(mockStripe.checkout.sessions.retrieve).toHaveBeenCalledWith("cs_test", {
        expand: ["line_items", "payment_intent"],
      });
    });

    it("should handle session retrieval error", async () => {
      mockStripe.checkout.sessions.retrieve.mockRejectedValue(new Error("Session not found"));

      await expect(getStripeSession("invalid")).rejects.toThrow("Session not found");
    });
  });

  describe("createStripeCustomer", () => {
    it("should create customer with all parameters", async () => {
      const mockCustomer = { id: "cus_test", email: "test@example.com" };
      mockStripe.customers.create.mockResolvedValue(mockCustomer);

      const result = await createStripeCustomer({
        email: "test@example.com",
        name: "John Doe",
        phone: "+33123456789",
        metadata: { userId: "123" },
      });

      expect(result).toBe(mockCustomer);
      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: "test@example.com",
        name: "John Doe",
        phone: "+33123456789",
        metadata: { userId: "123" },
      });
    });

    it("should create customer with minimal parameters", async () => {
      const mockCustomer = { id: "cus_test", email: "test@example.com" };
      mockStripe.customers.create.mockResolvedValue(mockCustomer);

      const result = await createStripeCustomer({
        email: "test@example.com",
      });

      expect(result).toBe(mockCustomer);
      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: "test@example.com",
        name: undefined,
        phone: undefined,
        metadata: {},
      });
    });
  });

  describe("updateStripeCustomer", () => {
    it("should update customer successfully", async () => {
      const mockCustomer = { id: "cus_test", email: "updated@example.com" };
      mockStripe.customers.update.mockResolvedValue(mockCustomer);

      const result = await updateStripeCustomer("cus_test", {
        email: "updated@example.com",
        name: "Jane Doe",
      });

      expect(result).toBe(mockCustomer);
      expect(mockStripe.customers.update).toHaveBeenCalledWith("cus_test", {
        email: "updated@example.com",
        name: "Jane Doe",
      });
    });
  });

  describe("getStripeCustomerByEmail", () => {
    it("should find customer by email", async () => {
      const mockCustomer = { id: "cus_test", email: "test@example.com" };
      mockStripe.customers.list.mockResolvedValue({
        data: [mockCustomer],
      });

      const result = await getStripeCustomerByEmail("test@example.com");

      expect(result).toBe(mockCustomer);
      expect(mockStripe.customers.list).toHaveBeenCalledWith({
        email: "test@example.com",
        limit: 1,
      });
    });

    it("should return null if customer not found", async () => {
      mockStripe.customers.list.mockResolvedValue({
        data: [],
      });

      const result = await getStripeCustomerByEmail("notfound@example.com");

      expect(result).toBeNull();
    });
  });

  describe("createStripeRefund", () => {
    it("should create refund successfully", async () => {
      const mockRefund = { id: "re_test", amount: 2999 };
      mockStripe.refunds.create.mockResolvedValue(mockRefund);

      const result = await createStripeRefund({
        paymentIntentId: "pi_test",
        amount: 2999,
        reason: "requested_by_customer",
        metadata: { orderId: "123" },
      });

      expect(result).toBe(mockRefund);
      expect(mockStripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: "pi_test",
        amount: 2999,
        reason: "requested_by_customer",
        metadata: { orderId: "123" },
      });
    });

    it("should create full refund without amount", async () => {
      const mockRefund = { id: "re_test" };
      mockStripe.refunds.create.mockResolvedValue(mockRefund);

      const result = await createStripeRefund({
        paymentIntentId: "pi_test",
      });

      expect(result).toBe(mockRefund);
      expect(mockStripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: "pi_test",
        amount: undefined,
        reason: undefined,
        metadata: {},
      });
    });
  });

  describe("getPaymentIntent", () => {
    it("should retrieve payment intent", async () => {
      const mockPaymentIntent = { id: "pi_test", status: "succeeded" };
      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);

      const result = await getPaymentIntent("pi_test");

      expect(result).toBe(mockPaymentIntent);
      expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledWith("pi_test");
    });
  });

  describe("createPaymentMethod", () => {
    it("should create payment method and attach to customer", async () => {
      const mockPaymentMethod = { id: "pm_test", type: "card" };
      mockStripe.paymentMethods.create.mockResolvedValue(mockPaymentMethod);
      mockStripe.paymentMethods.attach.mockResolvedValue(mockPaymentMethod);

      const result = await createPaymentMethod({
        type: "card",
        card: { number: "4242424242424242" } as any,
        customerId: "cus_test",
      });

      expect(result).toBe(mockPaymentMethod);
      expect(mockStripe.paymentMethods.create).toHaveBeenCalledWith({
        type: "card",
        card: { number: "4242424242424242" },
      });
      expect(mockStripe.paymentMethods.attach).toHaveBeenCalledWith("pm_test", {
        customer: "cus_test",
      });
    });

    it("should create payment method without attaching", async () => {
      const mockPaymentMethod = { id: "pm_test", type: "card" };
      mockStripe.paymentMethods.create.mockResolvedValue(mockPaymentMethod);

      const result = await createPaymentMethod({
        type: "card",
      });

      expect(result).toBe(mockPaymentMethod);
      expect(mockStripe.paymentMethods.attach).not.toHaveBeenCalled();
    });
  });

  describe("validateCardDetails", () => {
    it("should validate correct card details", () => {
      const result = validateCardDetails({
        number: "4242424242424242",
        exp_month: 12,
        exp_year: 2025,
        cvc: "123",
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect invalid card number", () => {
      const result = validateCardDetails({
        number: "123",
        exp_month: 12,
        exp_year: 2025,
        cvc: "123",
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Invalid card number length");
    });

    it("should detect invalid expiry month", () => {
      const result = validateCardDetails({
        number: "4242424242424242",
        exp_month: 13,
        exp_year: 2025,
        cvc: "123",
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Invalid expiry month");
    });

    it("should detect expired card", () => {
      const result = validateCardDetails({
        number: "4242424242424242",
        exp_month: 12,
        exp_year: 2020,
        cvc: "123",
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Invalid expiry year");
    });

    it("should detect invalid CVC", () => {
      const result = validateCardDetails({
        number: "4242424242424242",
        exp_month: 12,
        exp_year: 2025,
        cvc: "12",
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Invalid CVC");
    });
  });

  describe("getCardBrand", () => {
    it("should detect Visa cards", () => {
      expect(getCardBrand("4242424242424242")).toBe("visa");
      expect(getCardBrand("4000000000000002")).toBe("visa");
    });

    it("should detect Mastercard", () => {
      expect(getCardBrand("5555555555554444")).toBe("mastercard");
      expect(getCardBrand("2223003122003222")).toBe("mastercard");
    });

    it("should detect American Express", () => {
      expect(getCardBrand("378282246310005")).toBe("amex");
      expect(getCardBrand("371449635398431")).toBe("amex");
    });

    it("should detect Discover", () => {
      expect(getCardBrand("6011111111111117")).toBe("discover");
    });

    it("should return unknown for unrecognized cards", () => {
      expect(getCardBrand("1234567890123456")).toBe("unknown");
      expect(getCardBrand("9999999999999999")).toBe("unknown");
    });

    it("should handle formatted card numbers", () => {
      expect(getCardBrand("4242 4242 4242 4242")).toBe("visa");
      expect(getCardBrand("5555-5555-5555-4444")).toBe("mastercard");
    });
  });

  describe("formatCardNumber", () => {
    it("should format card number with spaces", () => {
      expect(formatCardNumber("4242424242424242")).toBe("4242 4242 4242 4242");
      expect(formatCardNumber("5555555555554444")).toBe("5555 5555 5555 4444");
    });

    it("should handle already formatted numbers", () => {
      expect(formatCardNumber("4242 4242 4242 4242")).toBe("4242 4242 4242 4242");
    });

    it("should handle numbers with non-digit characters", () => {
      expect(formatCardNumber("4242-4242-4242-4242")).toBe("4242 4242 4242 4242");
    });
  });

  describe("maskCardNumber", () => {
    it("should mask card number showing only last 4 digits", () => {
      expect(maskCardNumber("4242424242424242")).toBe("**** **** **** 4242");
      expect(maskCardNumber("5555555555554444")).toBe("**** **** **** 4444");
    });

    it("should handle short card numbers", () => {
      expect(maskCardNumber("123")).toBe("***");
      expect(maskCardNumber("12")).toBe("**");
    });

    it("should handle empty input", () => {
      expect(maskCardNumber("")).toBe("");
    });
  });

  describe("formatStripeError", () => {
    it("should format common Stripe errors in French", () => {
      expect(formatStripeError({ code: "card_declined" } as Stripe.StripeError)).toContain(
        "carte a été refusée"
      );

      expect(formatStripeError({ code: "insufficient_funds" } as Stripe.StripeError)).toContain(
        "Fonds insuffisants"
      );

      expect(formatStripeError({ code: "expired_card" } as Stripe.StripeError)).toContain(
        "carte a expiré"
      );

      expect(formatStripeError({ code: "incorrect_cvc" } as Stripe.StripeError)).toContain(
        "code de sécurité"
      );
    });

    it("should handle unknown error codes", () => {
      expect(formatStripeError({ code: "unknown_error" } as any)).toContain("erreur de paiement");
    });
  });

  describe("requiresAuthentication", () => {
    it("should detect when authentication is required", () => {
      expect(
        requiresAuthentication({
          status: "requires_action",
        } as Stripe.PaymentIntent)
      ).toBe(true);

      expect(
        requiresAuthentication({
          status: "requires_source_action",
        } as Stripe.PaymentIntent)
      ).toBe(true);
    });

    it("should detect when authentication is not required", () => {
      expect(
        requiresAuthentication({
          status: "succeeded",
        } as Stripe.PaymentIntent)
      ).toBe(false);

      expect(
        requiresAuthentication({
          status: "processing",
        } as Stripe.PaymentIntent)
      ).toBe(false);
    });
  });

  describe("getSupportedPaymentMethods", () => {
    it("should return country-specific payment methods", () => {
      expect(getSupportedPaymentMethods("FR")).toContain("sepa_debit");
      expect(getSupportedPaymentMethods("FR")).toContain("bancontact");
      expect(getSupportedPaymentMethods("DE")).toContain("sofort");
      expect(getSupportedPaymentMethods("DE")).toContain("giropay");
      expect(getSupportedPaymentMethods("NL")).toContain("ideal");
      expect(getSupportedPaymentMethods("US")).toContain("us_bank_account");
      expect(getSupportedPaymentMethods("GB")).toContain("bacs_debit");
    });

    it("should always include card payment method", () => {
      expect(getSupportedPaymentMethods("FR")).toContain("card");
      expect(getSupportedPaymentMethods("US")).toContain("card");
      expect(getSupportedPaymentMethods("XX")).toContain("card");
    });

    it("should handle unknown countries", () => {
      const methods = getSupportedPaymentMethods("XX");
      expect(methods).toEqual(["card"]);
    });

    it("should handle lowercase country codes", () => {
      expect(getSupportedPaymentMethods("fr")).toContain("sepa_debit");
      expect(getSupportedPaymentMethods("de")).toContain("sofort");
    });
  });
});
