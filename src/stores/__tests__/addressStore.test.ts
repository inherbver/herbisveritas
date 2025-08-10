/**
 * Tests for Address Zustand Store
 */

import { addressStore } from "../addressStore";
import type { Address } from "@/types/address";

// Mock address data
const mockAddress1: Address = {
  id: "addr-1",
  user_id: "user-123",
  name: "Home",
  street: "123 Main St",
  city: "Paris",
  state: "Île-de-France",
  postal_code: "75001",
  country: "France",
  is_default: true,
  is_billing: false,
  is_shipping: true,
  phone: "+33612345678",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const mockAddress2: Address = {
  id: "addr-2",
  user_id: "user-123",
  name: "Office",
  street: "456 Work Ave",
  city: "Lyon",
  state: "Auvergne-Rhône-Alpes",
  postal_code: "69001",
  country: "France",
  is_default: false,
  is_billing: true,
  is_shipping: false,
  phone: "+33687654321",
  created_at: "2024-01-02T00:00:00Z",
  updated_at: "2024-01-02T00:00:00Z",
};

describe("addressStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    addressStore.setState({
      addresses: [],
      selectedAddressId: null,
      isLoading: false,
      error: null,
    });
  });

  describe("setAddresses", () => {
    it("should set multiple addresses", () => {
      const { setAddresses } = addressStore.getState();

      setAddresses([mockAddress1, mockAddress2]);

      const state = addressStore.getState();
      expect(state.addresses).toHaveLength(2);
      expect(state.addresses[0]).toEqual(mockAddress1);
      expect(state.addresses[1]).toEqual(mockAddress2);
    });

    it("should clear addresses with empty array", () => {
      const { setAddresses } = addressStore.getState();

      setAddresses([mockAddress1]);
      setAddresses([]);

      const state = addressStore.getState();
      expect(state.addresses).toHaveLength(0);
    });
  });

  describe("addAddress", () => {
    it("should add a new address", () => {
      const { addAddress } = addressStore.getState();

      addAddress(mockAddress1);

      const state = addressStore.getState();
      expect(state.addresses).toHaveLength(1);
      expect(state.addresses[0]).toEqual(mockAddress1);
    });

    it("should add multiple addresses", () => {
      const { addAddress } = addressStore.getState();

      addAddress(mockAddress1);
      addAddress(mockAddress2);

      const state = addressStore.getState();
      expect(state.addresses).toHaveLength(2);
    });
  });

  describe("updateAddress", () => {
    it("should update an existing address", () => {
      const { setAddresses, updateAddress } = addressStore.getState();

      setAddresses([mockAddress1, mockAddress2]);
      updateAddress("addr-1", { name: "Updated Home", street: "789 New St" });

      const state = addressStore.getState();
      expect(state.addresses[0].name).toBe("Updated Home");
      expect(state.addresses[0].street).toBe("789 New St");
      expect(state.addresses[0].city).toBe("Paris"); // Unchanged
    });

    it("should not update non-existent address", () => {
      const { setAddresses, updateAddress } = addressStore.getState();

      setAddresses([mockAddress1]);
      updateAddress("non-existent", { name: "Test" });

      const state = addressStore.getState();
      expect(state.addresses[0]).toEqual(mockAddress1);
    });
  });

  describe("removeAddress", () => {
    it("should remove an address by id", () => {
      const { setAddresses, removeAddress } = addressStore.getState();

      setAddresses([mockAddress1, mockAddress2]);
      removeAddress("addr-1");

      const state = addressStore.getState();
      expect(state.addresses).toHaveLength(1);
      expect(state.addresses[0].id).toBe("addr-2");
    });

    it("should clear selected address if removed", () => {
      const { setAddresses, setSelectedAddressId, removeAddress } = addressStore.getState();

      setAddresses([mockAddress1, mockAddress2]);
      setSelectedAddressId("addr-1");
      removeAddress("addr-1");

      const state = addressStore.getState();
      expect(state.selectedAddressId).toBeNull();
    });

    it("should not clear selected address if different address removed", () => {
      const { setAddresses, setSelectedAddressId, removeAddress } = addressStore.getState();

      setAddresses([mockAddress1, mockAddress2]);
      setSelectedAddressId("addr-1");
      removeAddress("addr-2");

      const state = addressStore.getState();
      expect(state.selectedAddressId).toBe("addr-1");
    });
  });

  describe("setDefaultAddress", () => {
    it("should set an address as default", () => {
      const { setAddresses, setDefaultAddress } = addressStore.getState();

      setAddresses([mockAddress1, mockAddress2]);
      setDefaultAddress("addr-2");

      const state = addressStore.getState();
      expect(state.addresses[0].is_default).toBe(false);
      expect(state.addresses[1].is_default).toBe(true);
    });

    it("should only have one default address", () => {
      const { setAddresses, setDefaultAddress } = addressStore.getState();

      setAddresses([
        { ...mockAddress1, is_default: true },
        { ...mockAddress2, is_default: true },
      ]);

      setDefaultAddress("addr-2");

      const state = addressStore.getState();
      const defaultAddresses = state.addresses.filter((a) => a.is_default);
      expect(defaultAddresses).toHaveLength(1);
      expect(defaultAddresses[0].id).toBe("addr-2");
    });
  });

  describe("setSelectedAddressId", () => {
    it("should set selected address id", () => {
      const { setSelectedAddressId } = addressStore.getState();

      setSelectedAddressId("addr-1");
      expect(addressStore.getState().selectedAddressId).toBe("addr-1");

      setSelectedAddressId(null);
      expect(addressStore.getState().selectedAddressId).toBeNull();
    });
  });

  describe("clearAddresses", () => {
    it("should clear all addresses and reset state", () => {
      const { setAddresses, setSelectedAddressId, clearAddresses } = addressStore.getState();

      setAddresses([mockAddress1, mockAddress2]);
      setSelectedAddressId("addr-1");
      addressStore.setState({ error: "Some error" });

      clearAddresses();

      const state = addressStore.getState();
      expect(state.addresses).toHaveLength(0);
      expect(state.selectedAddressId).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  describe("computed getters", () => {
    it("should get default address", () => {
      const { setAddresses, getDefaultAddress } = addressStore.getState();

      expect(getDefaultAddress()).toBeUndefined();

      setAddresses([mockAddress1, mockAddress2]);
      expect(getDefaultAddress()?.id).toBe("addr-1");
    });

    it("should get selected address", () => {
      const { setAddresses, setSelectedAddressId, getSelectedAddress } = addressStore.getState();

      expect(getSelectedAddress()).toBeUndefined();

      setAddresses([mockAddress1, mockAddress2]);
      setSelectedAddressId("addr-2");
      expect(getSelectedAddress()?.id).toBe("addr-2");
    });

    it("should get billing addresses", () => {
      const { setAddresses, getBillingAddresses } = addressStore.getState();

      setAddresses([mockAddress1, mockAddress2]);
      const billingAddresses = getBillingAddresses();

      expect(billingAddresses).toHaveLength(1);
      expect(billingAddresses[0].id).toBe("addr-2");
    });

    it("should get shipping addresses", () => {
      const { setAddresses, getShippingAddresses } = addressStore.getState();

      setAddresses([mockAddress1, mockAddress2]);
      const shippingAddresses = getShippingAddresses();

      expect(shippingAddresses).toHaveLength(1);
      expect(shippingAddresses[0].id).toBe("addr-1");
    });
  });

  describe("loading and error states", () => {
    it("should set loading state", () => {
      const { setLoading } = addressStore.getState();

      setLoading(true);
      expect(addressStore.getState().isLoading).toBe(true);

      setLoading(false);
      expect(addressStore.getState().isLoading).toBe(false);
    });

    it("should set error state", () => {
      const { setError } = addressStore.getState();

      setError("Test error");
      expect(addressStore.getState().error).toBe("Test error");

      setError(null);
      expect(addressStore.getState().error).toBeNull();
    });
  });

  describe("persistence", () => {
    it("should maintain state across operations", () => {
      const { setAddresses, addAddress, updateAddress, setSelectedAddressId } =
        addressStore.getState();

      setAddresses([mockAddress1]);
      addAddress(mockAddress2);
      updateAddress("addr-1", { name: "Updated" });
      setSelectedAddressId("addr-2");

      const state = addressStore.getState();
      expect(state.addresses).toHaveLength(2);
      expect(state.addresses[0].name).toBe("Updated");
      expect(state.selectedAddressId).toBe("addr-2");
    });
  });
});
