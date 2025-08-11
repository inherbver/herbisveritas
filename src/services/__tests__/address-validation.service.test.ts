/**
 * Tests for Address Validation Service
 */

import { AddressValidationService } from "../address-validation.service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Address } from "@/types";

// Mock dependencies
jest.mock("@/lib/supabase/server");
jest.mock("@/lib/core/logger", () => ({
  LogUtils: {
    createUserActionContext: jest.fn(() => ({ userId: "user-123" })),
    logOperationStart: jest.fn(),
    logOperationSuccess: jest.fn(),
    logOperationError: jest.fn(),
  },
}));

const mockSupabaseClient = {
  from: jest.fn(() => mockSupabaseClient),
  select: jest.fn(() => mockSupabaseClient),
  eq: jest.fn(() => mockSupabaseClient),
  single: jest.fn(),
  insert: jest.fn(() => mockSupabaseClient),
  order: jest.fn(() => mockSupabaseClient),
};

// Mock data
const mockValidShippingAddress: Address = {
  id: "addr-1",
  user_id: "user-123",
  first_name: "John",
  last_name: "Doe",
  address_line1: "123 Main St", // mapped to "street" field
  address_line2: null,
  city: "Paris",
  state: "Île-de-France",
  postal_code: "75001",
  country: "FR",
  phone: "+33123456789",
  address_type: "shipping",
  is_default: true,
  created_at: "2024-01-01",
  updated_at: "2024-01-01",
} as Address & { street: string };

const mockValidBillingAddress: Address = {
  ...mockValidShippingAddress,
  id: "addr-2",
  address_type: "billing",
  email: "test@example.com",
} as Address & { street: string; email: string };

// Fix the type issue by adding the missing "street" field
const createAddressWithStreet = (address: Address): Address & { street: string } => ({
  ...address,
  street: address.address_line1 || "",
});

describe("AddressValidationService", () => {
  let service: AddressValidationService;

  beforeEach(() => {
    jest.clearAllMocks();
    (createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabaseClient);
    service = new AddressValidationService();
  });

  describe("validateAndProcessAddresses", () => {
    it("should validate and process addresses for authenticated user", async () => {
      // Create addresses without existing IDs to force creation
      const shippingAddress = createAddressWithStreet({
        ...mockValidShippingAddress,
        id: undefined as any, // Force creation
      });
      const billingAddress = createAddressWithStreet({
        ...mockValidBillingAddress,
        id: undefined as any, // Force creation
      });

      // Mock address insertion - note that we need to mock the select().single() chain
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: { id: "new-shipping-1" }, error: null })
        .mockResolvedValueOnce({ data: { id: "new-billing-1" }, error: null });

      const result = await service.validateAndProcessAddresses(
        shippingAddress,
        billingAddress,
        "user-123",
        { allowGuestAddresses: true }
      );

      expect(result.success).toBe(true);
      expect(result.data?.shippingAddressId).toBe("new-shipping-1");
      expect(result.data?.billingAddressId).toBe("new-billing-1");
      expect(result.data?.isGuestCheckout).toBe(false);
    });

    it("should process guest addresses", async () => {
      const shippingAddress = createAddressWithStreet(mockValidShippingAddress);
      const billingAddress = createAddressWithStreet(mockValidBillingAddress);

      const result = await service.validateAndProcessAddresses(
        shippingAddress,
        billingAddress,
        undefined,
        { allowGuestAddresses: true }
      );

      expect(result.success).toBe(true);
      expect(result.data?.shippingAddressId).toBe(null);
      expect(result.data?.billingAddressId).toBe(null);
      expect(result.data?.isGuestCheckout).toBe(true);
    });

    it("should reject guest checkout when not allowed", async () => {
      const shippingAddress = createAddressWithStreet(mockValidShippingAddress);
      const billingAddress = createAddressWithStreet(mockValidBillingAddress);

      const result = await service.validateAndProcessAddresses(
        shippingAddress,
        billingAddress,
        undefined,
        { allowGuestAddresses: false }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Checkout invité non autorisé");
    });

    it("should validate required address fields", async () => {
      const invalidAddress = createAddressWithStreet({
        ...mockValidShippingAddress,
        first_name: "", // Missing required field
      });
      const billingAddress = createAddressWithStreet(mockValidBillingAddress);

      const result = await service.validateAndProcessAddresses(
        invalidAddress,
        billingAddress,
        "user-123"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Champ manquant");
    });

    it("should validate French postal codes", async () => {
      const invalidAddress = createAddressWithStreet({
        ...mockValidShippingAddress,
        postal_code: "ABC123", // Invalid French postal code
        country: "FR",
      });
      const billingAddress = createAddressWithStreet(mockValidBillingAddress);

      const result = await service.validateAndProcessAddresses(
        invalidAddress,
        billingAddress,
        "user-123"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Format de code postal français invalide");
    });

    it("should validate email format in billing address", async () => {
      const shippingAddress = createAddressWithStreet(mockValidShippingAddress);
      const invalidBillingAddress = createAddressWithStreet({
        ...mockValidBillingAddress,
        email: "invalid-email",
      });

      const result = await service.validateAndProcessAddresses(
        shippingAddress,
        invalidBillingAddress,
        "user-123"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Format d'email invalide");
    });

    it("should validate allowed countries", async () => {
      const shippingAddress = createAddressWithStreet({
        ...mockValidShippingAddress,
        country: "XX", // Not in allowed countries
      });
      const billingAddress = createAddressWithStreet(mockValidBillingAddress);

      const result = await service.validateAndProcessAddresses(
        shippingAddress,
        billingAddress,
        "user-123",
        { allowedCountries: ["FR", "DE", "ES"] }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Livraison non disponible pour le pays");
    });

    it("should use existing address IDs", async () => {
      const existingShipping = createAddressWithStreet({
        ...mockValidShippingAddress,
        id: "existing-shipping-123",
      });
      const existingBilling = createAddressWithStreet({
        ...mockValidBillingAddress,
        id: "existing-billing-123",
      });

      const result = await service.validateAndProcessAddresses(
        existingShipping,
        existingBilling,
        "user-123"
      );

      expect(result.success).toBe(true);
      expect(result.data?.shippingAddressId).toBe("existing-shipping-123");
      expect(result.data?.billingAddressId).toBe("existing-billing-123");
      expect(mockSupabaseClient.insert).not.toHaveBeenCalled();
    });
  });

  describe("getAvailableShippingMethods", () => {
    it("should return available shipping methods", async () => {
      const mockShippingMethods = [
        { id: "standard", name: "Standard Delivery", price: 5.99 },
        { id: "express", name: "Express Delivery", price: 9.99 },
      ];

      // Reset the mockSupabaseClient for this specific test
      const freshMockClient = {
        from: jest.fn(() => freshMockClient),
        select: jest.fn(() => freshMockClient),
        eq: jest.fn(() => freshMockClient),
        order: jest.fn(() => freshMockClient),
      };

      freshMockClient.from.mockReturnValue(freshMockClient);
      freshMockClient.select.mockReturnValue(freshMockClient);
      freshMockClient.eq.mockReturnValue(freshMockClient);
      freshMockClient.order.mockResolvedValue({
        data: mockShippingMethods,
        error: null,
      });

      (createSupabaseServerClient as jest.Mock).mockResolvedValue(freshMockClient);

      const address = createAddressWithStreet(mockValidShippingAddress);
      const result = await service.getAvailableShippingMethods(address);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockShippingMethods);
      expect(freshMockClient.eq).toHaveBeenCalledWith("is_active", true);
      expect(freshMockClient.order).toHaveBeenCalledWith("price", { ascending: true });
    });

    it("should handle shipping methods query error", async () => {
      const freshMockClient = {
        from: jest.fn(() => freshMockClient),
        select: jest.fn(() => freshMockClient),
        eq: jest.fn(() => freshMockClient),
        order: jest.fn(() => freshMockClient),
      };

      freshMockClient.order.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      (createSupabaseServerClient as jest.Mock).mockResolvedValue(freshMockClient);

      const address = createAddressWithStreet(mockValidShippingAddress);
      const result = await service.getAvailableShippingMethods(address);

      expect(result.success).toBe(false);
      expect(result.error).toContain("récupération des méthodes de livraison");
    });
  });
});
