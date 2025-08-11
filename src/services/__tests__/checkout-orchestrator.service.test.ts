/**
 * Tests for CheckoutOrchestrator Service
 */

import {
  CheckoutOrchestrator,
  CheckoutSessionParams,
  CheckoutSessionResult,
  CheckoutBusinessError,
  CheckoutErrorCode,
} from "../checkout.service";
import { ActionResult } from "@/lib/core/result";
import { LogUtils } from "@/lib/core/logger";
import { Address } from "@/types";

// Mock dependencies
const mockStripeService = {
  createCheckoutSession: jest.fn(),
};

const mockProductValidationService = {
  validateCartProducts: jest.fn(),
};

const mockAddressValidationService = {
  validateAddresses: jest.fn(),
};

const mockLogger = {
  createUserActionContext: jest.fn(),
  logOperationStart: jest.fn(),
  logOperationSuccess: jest.fn(),
  logOperationError: jest.fn(),
};

// Mock data
const mockAddress: Address = {
  id: "addr-123",
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

const mockCheckoutParams: CheckoutSessionParams = {
  shippingAddress: mockAddress,
  billingAddress: { ...mockAddress, id: "addr-124", address_type: "billing" },
  shippingMethodId: "shipping-1",
  cartId: "cart-123",
  userId: "user-123",
};

const mockCheckoutResult: CheckoutSessionResult = {
  sessionUrl: "https://checkout.stripe.com/test",
  sessionId: "cs_test_123",
};

describe("CheckoutOrchestrator", () => {
  let orchestrator: CheckoutOrchestrator;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mocks
    mockLogger.createUserActionContext.mockReturnValue({
      userId: "user-123",
      action: "process_checkout",
      resource: "stripe",
    });

    orchestrator = new CheckoutOrchestrator(
      mockStripeService,
      mockProductValidationService,
      mockAddressValidationService,
      mockLogger as any
    );
  });

  describe("processCheckout", () => {
    it("should process checkout successfully", async () => {
      // Setup successful validation
      jest
        .spyOn(orchestrator as any, "validateCheckoutRequest")
        .mockResolvedValue(ActionResult.ok(undefined));

      jest
        .spyOn(orchestrator as any, "createStripeCheckoutSession")
        .mockResolvedValue(ActionResult.ok(mockCheckoutResult));

      jest.spyOn(orchestrator as any, "saveCheckoutSessionMetadata").mockResolvedValue(undefined);

      const result = await orchestrator.processCheckout(mockCheckoutParams);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCheckoutResult);
      expect(mockLogger.logOperationStart).toHaveBeenCalledWith(
        "process_checkout",
        expect.any(Object)
      );
      expect(mockLogger.logOperationSuccess).toHaveBeenCalledWith(
        "process_checkout",
        expect.objectContaining({ sessionId: "cs_test_123" })
      );
    });

    it("should handle validation failure", async () => {
      const validationError = ActionResult.error("Validation failed");
      jest.spyOn(orchestrator as any, "validateCheckoutRequest").mockResolvedValue(validationError);

      const result = await orchestrator.processCheckout(mockCheckoutParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Validation failed");
      expect(mockLogger.logOperationStart).toHaveBeenCalled();
    });

    it("should handle session creation failure", async () => {
      jest
        .spyOn(orchestrator as any, "validateCheckoutRequest")
        .mockResolvedValue(ActionResult.ok(undefined));

      const sessionError = ActionResult.error("Stripe session creation failed");
      jest
        .spyOn(orchestrator as any, "createStripeCheckoutSession")
        .mockResolvedValue(sessionError);

      const result = await orchestrator.processCheckout(mockCheckoutParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Stripe session creation failed");
    });

    it("should handle unexpected errors", async () => {
      jest
        .spyOn(orchestrator as any, "validateCheckoutRequest")
        .mockRejectedValue(new Error("Unexpected error"));

      const result = await orchestrator.processCheckout(mockCheckoutParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Erreur inattendue lors du checkout");
      expect(mockLogger.logOperationError).toHaveBeenCalled();
    });

    it("should handle business errors", async () => {
      const businessError = new CheckoutBusinessError(
        CheckoutErrorCode.INVALID_ADDRESS,
        "Invalid address provided"
      );

      jest.spyOn(orchestrator as any, "validateCheckoutRequest").mockRejectedValue(businessError);

      const result = await orchestrator.processCheckout(mockCheckoutParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Une erreur technique s'est produite. Veuillez réessayer.");
    });

    it("should use guest context when userId not provided", async () => {
      const guestParams = { ...mockCheckoutParams, userId: undefined };

      jest
        .spyOn(orchestrator as any, "validateCheckoutRequest")
        .mockResolvedValue(ActionResult.ok(undefined));

      jest
        .spyOn(orchestrator as any, "createStripeCheckoutSession")
        .mockResolvedValue(ActionResult.ok(mockCheckoutResult));

      await orchestrator.processCheckout(guestParams);

      expect(mockLogger.createUserActionContext).toHaveBeenCalledWith(
        "guest",
        "process_checkout",
        "stripe"
      );
    });
  });

  describe("validateCheckoutRequest", () => {
    it("should validate complete checkout request successfully", async () => {
      const result = await (orchestrator as any).validateCheckoutRequest(mockCheckoutParams);

      expect(result.success).toBe(true);
    });

    it("should reject missing shipping address", async () => {
      const invalidParams = { ...mockCheckoutParams, shippingAddress: null };

      await expect((orchestrator as any).validateCheckoutRequest(invalidParams)).rejects.toThrow(
        CheckoutBusinessError
      );

      await expect((orchestrator as any).validateCheckoutRequest(invalidParams)).rejects.toThrow(
        "Les adresses de livraison et facturation sont requises"
      );
    });

    it("should reject missing billing address", async () => {
      const invalidParams = { ...mockCheckoutParams, billingAddress: null };

      await expect((orchestrator as any).validateCheckoutRequest(invalidParams)).rejects.toThrow(
        CheckoutBusinessError
      );
    });

    it("should reject missing shipping method", async () => {
      const invalidParams = { ...mockCheckoutParams, shippingMethodId: "" };

      await expect((orchestrator as any).validateCheckoutRequest(invalidParams)).rejects.toThrow(
        CheckoutBusinessError
      );

      await expect((orchestrator as any).validateCheckoutRequest(invalidParams)).rejects.toThrow(
        "La méthode de livraison est requise"
      );
    });

    it("should reject undefined shipping method", async () => {
      const invalidParams = { ...mockCheckoutParams };
      delete (invalidParams as any).shippingMethodId;

      await expect((orchestrator as any).validateCheckoutRequest(invalidParams)).rejects.toThrow(
        CheckoutBusinessError
      );
    });
  });

  describe("createStripeCheckoutSession", () => {
    it("should throw implementation error", async () => {
      await expect(
        (orchestrator as any).createStripeCheckoutSession(mockCheckoutParams)
      ).rejects.toThrow("Implémentation en cours - Phase 2");
    });
  });

  describe("saveCheckoutSessionMetadata", () => {
    it("should complete without errors", async () => {
      await expect(
        (orchestrator as any).saveCheckoutSessionMetadata(mockCheckoutResult, mockCheckoutParams)
      ).resolves.toBeUndefined();
    });
  });
});

describe("CheckoutBusinessError", () => {
  it("should create error with correct properties", () => {
    const error = new CheckoutBusinessError(
      CheckoutErrorCode.INVALID_CART_DATA,
      "Cart data is invalid",
      { cartId: "cart-123" }
    );

    expect(error.name).toBe("CheckoutBusinessError");
    expect(error.code).toBe(CheckoutErrorCode.INVALID_CART_DATA);
    expect(error.message).toBe("Cart data is invalid");
    expect(error.context).toEqual({ cartId: "cart-123" });
  });

  it("should create error without context", () => {
    const error = new CheckoutBusinessError(CheckoutErrorCode.EMPTY_CART, "Cart is empty");

    expect(error.name).toBe("CheckoutBusinessError");
    expect(error.code).toBe(CheckoutErrorCode.EMPTY_CART);
    expect(error.message).toBe("Cart is empty");
    expect(error.context).toBeUndefined();
  });
});

describe("CheckoutErrorCode enum", () => {
  it("should have all expected error codes", () => {
    expect(CheckoutErrorCode.INVALID_CART_DATA).toBe("INVALID_CART_DATA");
    expect(CheckoutErrorCode.EMPTY_CART).toBe("EMPTY_CART");
    expect(CheckoutErrorCode.INVALID_ADDRESS).toBe("INVALID_ADDRESS");
    expect(CheckoutErrorCode.PRODUCT_NOT_FOUND).toBe("PRODUCT_NOT_FOUND");
    expect(CheckoutErrorCode.PRODUCT_UNAVAILABLE).toBe("PRODUCT_UNAVAILABLE");
    expect(CheckoutErrorCode.INSUFFICIENT_STOCK).toBe("INSUFFICIENT_STOCK");
    expect(CheckoutErrorCode.INVALID_SHIPPING_METHOD).toBe("INVALID_SHIPPING_METHOD");
    expect(CheckoutErrorCode.STRIPE_SESSION_CREATION_FAILED).toBe("STRIPE_SESSION_CREATION_FAILED");
  });
});
