/**
 * Tests for Address Zustand Store
 */

import useAddressStore from "../addressStore";
import { Address } from "@/types";

// Mock address data
const mockAddress1: Address = {
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

const mockAddress2: Address = {
  id: "addr-2",
  user_id: "user-123",
  first_name: "Jane",
  last_name: "Smith",
  address_line1: "456 Elm St",
  address_line2: "Apt 2B",
  city: "Lyon",
  state: "Rhône",
  postal_code: "69001",
  country: "France",
  phone: "+33987654321",
  address_type: "billing",
  is_default: false,
  created_at: "2024-01-02",
  updated_at: "2024-01-02",
};

const mockAddress3: Address = {
  id: "addr-3",
  user_id: "user-123",
  first_name: "Bob",
  last_name: "Johnson",
  address_line1: "789 Oak Ave",
  address_line2: null,
  city: "Marseille",
  state: "Bouches-du-Rhône",
  postal_code: "13001",
  country: "France",
  phone: "+33555555555",
  address_type: "shipping",
  is_default: false,
  created_at: "2024-01-03",
  updated_at: "2024-01-03",
};

describe("addressStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    useAddressStore.setState({
      addresses: [],
      shippingAddress: null,
      billingAddress: null,
      isLoading: false,
      error: null,
    });
  });

  describe("setAddresses", () => {
    it("should set multiple addresses and auto-detect shipping/billing", () => {
      const { setAddresses } = useAddressStore.getState();

      setAddresses([mockAddress1, mockAddress2, mockAddress3]);

      const state = useAddressStore.getState();
      expect(state.addresses).toHaveLength(3);
      expect(state.shippingAddress).toEqual(mockAddress1); // First shipping address
      expect(state.billingAddress).toEqual(mockAddress2); // First billing address
    });

    it("should clear addresses with empty array", () => {
      const { setAddresses } = useAddressStore.getState();

      setAddresses([mockAddress1]);
      setAddresses([]);

      const state = useAddressStore.getState();
      expect(state.addresses).toHaveLength(0);
      expect(state.shippingAddress).toBeNull();
      expect(state.billingAddress).toBeNull();
    });
  });

  describe("addAddress", () => {
    it("should add a new address", () => {
      const { addAddress } = useAddressStore.getState();

      addAddress(mockAddress1);

      const state = useAddressStore.getState();
      expect(state.addresses).toHaveLength(1);
      expect(state.addresses[0]).toEqual(mockAddress1);
      expect(state.shippingAddress).toEqual(mockAddress1);
    });

    it("should add multiple addresses and update shipping/billing", () => {
      const { addAddress } = useAddressStore.getState();

      addAddress(mockAddress1);
      addAddress(mockAddress2);

      const state = useAddressStore.getState();
      expect(state.addresses).toHaveLength(2);
      expect(state.shippingAddress).toEqual(mockAddress1);
      expect(state.billingAddress).toEqual(mockAddress2);
    });
  });

  describe("updateAddress", () => {
    it("should update an existing address", () => {
      const { setAddresses, updateAddress } = useAddressStore.getState();

      setAddresses([mockAddress1, mockAddress2]);
      const updatedAddress = { ...mockAddress1, address_line1: "789 New St" };
      updateAddress("addr-1", updatedAddress);

      const state = useAddressStore.getState();
      expect(state.addresses[0].address_line1).toBe("789 New St");
      expect(state.shippingAddress?.address_line1).toBe("789 New St");
    });

    it("should update shipping/billing references when type changes", () => {
      const { setAddresses, updateAddress } = useAddressStore.getState();

      setAddresses([mockAddress1, mockAddress2]);
      const updatedAddress = { ...mockAddress1, address_type: "billing" as const };
      updateAddress("addr-1", updatedAddress);

      const state = useAddressStore.getState();
      expect(state.billingAddress?.id).toBe("addr-1");
    });
  });

  describe("removeAddress", () => {
    it("should remove an address by id", () => {
      const { setAddresses, removeAddress } = useAddressStore.getState();

      setAddresses([mockAddress1, mockAddress2]);
      removeAddress("addr-1");

      const state = useAddressStore.getState();
      expect(state.addresses).toHaveLength(1);
      expect(state.addresses[0].id).toBe("addr-2");
      expect(state.shippingAddress).toBeNull(); // Was removed
    });

    it("should clear shipping address if removed", () => {
      const { setAddresses, removeAddress } = useAddressStore.getState();

      setAddresses([mockAddress1, mockAddress2]);
      removeAddress("addr-1");

      const state = useAddressStore.getState();
      expect(state.shippingAddress).toBeNull();
      expect(state.billingAddress).toEqual(mockAddress2); // Unchanged
    });

    it("should clear billing address if removed", () => {
      const { setAddresses, removeAddress } = useAddressStore.getState();

      setAddresses([mockAddress1, mockAddress2]);
      removeAddress("addr-2");

      const state = useAddressStore.getState();
      expect(state.billingAddress).toBeNull();
      expect(state.shippingAddress).toEqual(mockAddress1); // Unchanged
    });
  });

  describe("setShippingAddress", () => {
    it("should set shipping address", () => {
      const { setShippingAddress } = useAddressStore.getState();

      setShippingAddress(mockAddress1);
      expect(useAddressStore.getState().shippingAddress).toEqual(mockAddress1);

      setShippingAddress(null);
      expect(useAddressStore.getState().shippingAddress).toBeNull();
    });
  });

  describe("setBillingAddress", () => {
    it("should set billing address", () => {
      const { setBillingAddress } = useAddressStore.getState();

      setBillingAddress(mockAddress2);
      expect(useAddressStore.getState().billingAddress).toEqual(mockAddress2);

      setBillingAddress(null);
      expect(useAddressStore.getState().billingAddress).toBeNull();
    });
  });

  describe("clearAddresses", () => {
    it("should clear all addresses and reset state", () => {
      const { setAddresses, setError, clearAddresses } = useAddressStore.getState();

      setAddresses([mockAddress1, mockAddress2]);
      setError("Some error");

      clearAddresses();

      const state = useAddressStore.getState();
      expect(state.addresses).toHaveLength(0);
      expect(state.shippingAddress).toBeNull();
      expect(state.billingAddress).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  describe("loading and error states", () => {
    it("should set loading state", () => {
      const { setIsLoading } = useAddressStore.getState();

      setIsLoading(true);
      expect(useAddressStore.getState().isLoading).toBe(true);

      setIsLoading(false);
      expect(useAddressStore.getState().isLoading).toBe(false);
    });

    it("should set error state", () => {
      const { setError } = useAddressStore.getState();

      setError("Test error");
      expect(useAddressStore.getState().error).toBe("Test error");

      setError(null);
      expect(useAddressStore.getState().error).toBeNull();
    });
  });

  describe("persistence", () => {
    it("should maintain state across operations", () => {
      const { setAddresses, addAddress, updateAddress, setShippingAddress } =
        useAddressStore.getState();

      setAddresses([mockAddress1]);
      addAddress(mockAddress2);
      const updatedAddress = { ...mockAddress1, city: "Nice" };
      updateAddress("addr-1", updatedAddress);
      setShippingAddress(mockAddress3);

      const state = useAddressStore.getState();
      expect(state.addresses).toHaveLength(2);
      expect(state.addresses[0].city).toBe("Nice");
      expect(state.shippingAddress).toEqual(mockAddress3);
    });
  });
});
