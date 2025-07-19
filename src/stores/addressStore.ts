"use client";

import { create } from "zustand";
import { Address } from "@/types";

interface AddressState {
  addresses: Address[];
  shippingAddress: Address | null;
  billingAddress: Address | null;
  isLoading: boolean;
  error: string | null;
}

interface AddressActions {
  setAddresses: (addresses: Address[]) => void;
  addAddress: (address: Address) => void;
  updateAddress: (addressId: string, updatedAddress: Address) => void;
  removeAddress: (addressId: string) => void;
  setShippingAddress: (address: Address | null) => void;
  setBillingAddress: (address: Address | null) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearAddresses: () => void;
}

type AddressStore = AddressState & AddressActions;

const useAddressStore = create<AddressStore>((set, get) => ({
  // État initial
  addresses: [],
  shippingAddress: null,
  billingAddress: null,
  isLoading: false,
  error: null,

  // Actions
  setAddresses: (addresses) => {
    const shippingAddr = addresses.find((addr) => addr.address_type === "shipping") || null;
    const billingAddr = addresses.find((addr) => addr.address_type === "billing") || null;

    set({
      addresses,
      shippingAddress: shippingAddr,
      billingAddress: billingAddr,
    });
  },

  addAddress: (address) => {
    const currentAddresses = get().addresses;
    const newAddresses = [...currentAddresses, address];

    set({
      addresses: newAddresses,
      ...(address.address_type === "shipping" && { shippingAddress: address }),
      ...(address.address_type === "billing" && { billingAddress: address }),
    });
  },

  updateAddress: (addressId, updatedAddress) => {
    const currentAddresses = get().addresses;
    const newAddresses = currentAddresses.map((addr) =>
      addr.id === addressId ? updatedAddress : addr
    );

    set({
      addresses: newAddresses,
      ...(updatedAddress.address_type === "shipping" && { shippingAddress: updatedAddress }),
      ...(updatedAddress.address_type === "billing" && { billingAddress: updatedAddress }),
    });
  },

  removeAddress: (addressId) => {
    const currentAddresses = get().addresses;
    const addressToRemove = currentAddresses.find((addr) => addr.id === addressId);
    const newAddresses = currentAddresses.filter((addr) => addr.id !== addressId);

    set({
      addresses: newAddresses,
      ...(addressToRemove?.address_type === "shipping" && { shippingAddress: null }),
      ...(addressToRemove?.address_type === "billing" && { billingAddress: null }),
    });
  },

  setShippingAddress: (address) => set({ shippingAddress: address }),
  setBillingAddress: (address) => set({ billingAddress: address }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  clearAddresses: () =>
    set({
      addresses: [],
      shippingAddress: null,
      billingAddress: null,
      error: null,
    }),
}));

// Sélecteurs pour optimiser les re-renders
export const selectAddresses = (state: AddressStore) => state.addresses;
export const selectShippingAddress = (state: AddressStore) => state.shippingAddress;
export const selectBillingAddress = (state: AddressStore) => state.billingAddress;
export const selectIsLoading = (state: AddressStore) => state.isLoading;
export const selectError = (state: AddressStore) => state.error;

export default useAddressStore;
