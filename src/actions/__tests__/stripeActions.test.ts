/**
 * Tests for Stripe Actions
 */

import { createStripeCheckoutSession } from "../stripeActions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCart } from "@/lib/cartReader";
import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { Address } from "@/types";
import { ProductValidationService } from "@/services/product-validation.service";
import { AddressValidationService } from "@/services/address-validation.service";

// Mock dependencies
jest.mock("@/lib/supabase/server");
jest.mock("@/lib/cartReader");
jest.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
  },
}));
jest.mock("next/headers");
jest.mock("next/cache");
jest.mock("@/services/product-validation.service");
jest.mock("@/services/address-validation.service");
jest.mock("@/lib/core/logger", () => ({
  LogUtils: {
    createUserActionContext: jest.fn(() => ({ userId: "user-123" })),
    logOperationStart: jest.fn(),
    logOperationSuccess: jest.fn(),
    logOperationError: jest.fn(),
  },
}));

const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(() => mockSupabaseClient),
  select: jest.fn(() => mockSupabaseClient),
  eq: jest.fn(() => mockSupabaseClient),
  single: jest.fn(),
};

// Get the mocked stripe instance
const mockStripe = require("@/lib/stripe").stripe;

const mockHeaders = {
  get: jest.fn(),
};

const mockProductValidationService = {
  validateCartProducts: jest.fn(),
};

const mockAddressValidationService = {
  validateAndProcessAddresses: jest.fn(),
};

// Mock data
const mockShippingAddress: Address = {
  id: "addr-1",
  user_id: "user-123",
  first_name: "John",
  last_name: "Doe",
  address_line1: "123 Main St",
  address_line2: null,
  city: "Paris",
  state: "Île-de-France",
  postal_code: "75001",
  country: "France",
  phone: "+33123456789",
  address_type: "shipping",
  is_default: true,
  created_at: "2024-01-01",
  updated_at: "2024-01-01",
};

const mockBillingAddress: Address = {
  ...mockShippingAddress,
  id: "addr-2",
  address_type: "billing",
};

const mockCart = {
  id: "cart-123",
  user_id: "user-123",
  items: [
    {
      id: "item-1",
      productId: "prod-1",
      quantity: 2,
      product: {
        id: "prod-1",
        name: "Test Product",
        price: 29.99,
        image_url: "/images/test.jpg",
      },
    },
  ],
  totalAmount: 59.98,
};

const mockShippingMethod = {
  id: "shipping-1",
  name: "Standard Delivery",
  price: 5.99,
  is_active: true,
};

const mockValidatedCart = {
  items: [
    {
      productId: "prod-1",
      name: "Test Product",
      price: 29.99,
      quantity: 2,
    },
  ],
  totalAmount: 59.98,
};

const mockProcessedAddresses = {
  shippingAddressId: "addr-1",
  billingAddressId: "addr-2",
  isGuestCheckout: false,
};

describe("stripeActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    (createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabaseClient);
    (getCart as jest.Mock).mockResolvedValue({
      success: true,
      data: mockCart,
    });
    (headers as jest.Mock).mockResolvedValue(mockHeaders);

    // Reset and configure stripe mocks
    mockStripe.checkout.sessions.create = jest.fn().mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.com/test",
    });

    (ProductValidationService as jest.Mock).mockImplementation(() => mockProductValidationService);
    (AddressValidationService as jest.Mock).mockImplementation(() => mockAddressValidationService);

    // Mock environment variables
    process.env.NEXT_PUBLIC_BASE_URL = "https://example.com";
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com";

    mockHeaders.get.mockReturnValue("fr");
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
    });

    // Mock validation services
    mockAddressValidationService.validateAndProcessAddresses.mockResolvedValue({
      success: true,
      data: mockProcessedAddresses,
    });

    mockProductValidationService.validateCartProducts.mockResolvedValue({
      success: true,
      data: mockValidatedCart,
    });

    // Mock shipping method query
    mockSupabaseClient.single.mockResolvedValue({
      data: mockShippingMethod,
      error: null,
    });
  });

  describe("createStripeCheckoutSession", () => {
    it("should create checkout session successfully for authenticated user", async () => {
      const result = await createStripeCheckoutSession(
        mockShippingAddress,
        mockBillingAddress,
        "shipping-1"
      );

      expect(result.success).toBe(true);
      expect(result.data?.sessionId).toBe("cs_test_123");
      expect(result.data?.sessionUrl).toBe("https://checkout.stripe.com/test");

      // Verify Stripe session was created with correct parameters
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_method_types: ["card", "paypal"],
          mode: "payment",
          line_items: expect.arrayContaining([
            expect.objectContaining({
              price_data: expect.objectContaining({
                currency: "eur",
                unit_amount: 2999, // 29.99 * 100
              }),
              quantity: 2,
            }),
          ]),
          customer_email: "test@example.com",
          metadata: expect.objectContaining({
            cartId: "cart-123",
            userId: "user-123",
          }),
        })
      );
    });

    it("should handle empty cart", async () => {
      (getCart as jest.Mock).mockResolvedValue({
        success: true,
        data: { ...mockCart, items: [] },
      });

      const result = await createStripeCheckoutSession(
        mockShippingAddress,
        mockBillingAddress,
        "shipping-1"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("panier est vide");
    });

    it("should handle invalid shipping method", async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: "Shipping method not found" },
      });

      const result = await createStripeCheckoutSession(
        mockShippingAddress,
        mockBillingAddress,
        "invalid-shipping"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("méthode de livraison");
    });

    it("should handle address validation failure", async () => {
      mockAddressValidationService.validateAndProcessAddresses.mockResolvedValue({
        success: false,
        message: "Invalid address format",
      });

      const result = await createStripeCheckoutSession(
        mockShippingAddress,
        mockBillingAddress,
        "shipping-1"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid address format");
    });

    it("should handle product validation failure", async () => {
      mockProductValidationService.validateCartProducts.mockResolvedValue({
        success: false,
        message: "Product out of stock",
      });

      const result = await createStripeCheckoutSession(
        mockShippingAddress,
        mockBillingAddress,
        "shipping-1"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Product out of stock");
    });

    it("should handle Stripe session creation failure", async () => {
      mockStripe.checkout.sessions.create.mockRejectedValue(new Error("Stripe API error"));

      const result = await createStripeCheckoutSession(
        mockShippingAddress,
        mockBillingAddress,
        "shipping-1"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("inattendue");
    });

    it("should include shipping costs in session", async () => {
      await createStripeCheckoutSession(mockShippingAddress, mockBillingAddress, "shipping-1");

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          shipping_options: [
            expect.objectContaining({
              shipping_rate_data: expect.objectContaining({
                type: "fixed_amount",
                fixed_amount: {
                  amount: 599, // 5.99 * 100
                  currency: "eur",
                },
                display_name: "Standard Delivery",
              }),
            }),
          ],
        })
      );
    });

    it("should set correct success and cancel URLs with locale", async () => {
      await createStripeCheckoutSession(mockShippingAddress, mockBillingAddress, "shipping-1");

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: "https://example.com/fr/checkout/success?session_id={CHECKOUT_SESSION_ID}",
          cancel_url: "https://example.com/fr/checkout",
        })
      );
    });

    it("should revalidate paths when addresses are processed", async () => {
      await createStripeCheckoutSession(mockShippingAddress, mockBillingAddress, "shipping-1");

      expect(revalidatePath).toHaveBeenCalledWith("/[locale]/profile/addresses");
      expect(revalidatePath).toHaveBeenCalledWith("/[locale]/checkout");
    });
  });
});
