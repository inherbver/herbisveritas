import { renderHook, act } from '@testing-library/react';
import { useAddressStore } from '../addressStore';

// Mock Supabase
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn()
    },
    from: jest.fn()
  }))
}));

describe('AddressStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useAddressStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('Initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useAddressStore());
      
      expect(result.current.addresses).toEqual([]);
      expect(result.current.selectedShippingAddress).toBeNull();
      expect(result.current.selectedBillingAddress).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Address management', () => {
    const mockAddress = {
      id: '1',
      user_id: 'user123',
      name: 'John Doe',
      line1: '123 Main St',
      line2: null,
      city: 'Paris',
      postal_code: '75001',
      country: 'FR',
      phone: '+33612345678',
      is_default: true,
      type: 'both' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    it('should set addresses', () => {
      const { result } = renderHook(() => useAddressStore());
      
      act(() => {
        result.current.setAddresses([mockAddress]);
      });
      
      expect(result.current.addresses).toHaveLength(1);
      expect(result.current.addresses[0]).toEqual(mockAddress);
    });

    it('should add a new address', () => {
      const { result } = renderHook(() => useAddressStore());
      const newAddress = { ...mockAddress, id: '2', name: 'Jane Doe' };
      
      act(() => {
        result.current.setAddresses([mockAddress]);
        result.current.addAddress(newAddress);
      });
      
      expect(result.current.addresses).toHaveLength(2);
      expect(result.current.addresses[1]).toEqual(newAddress);
    });

    it('should update an existing address', () => {
      const { result } = renderHook(() => useAddressStore());
      const updatedAddress = { ...mockAddress, name: 'John Updated' };
      
      act(() => {
        result.current.setAddresses([mockAddress]);
        result.current.updateAddress('1', updatedAddress);
      });
      
      expect(result.current.addresses).toHaveLength(1);
      expect(result.current.addresses[0].name).toBe('John Updated');
    });

    it('should not update non-existent address', () => {
      const { result } = renderHook(() => useAddressStore());
      const updatedAddress = { ...mockAddress, name: 'Should not update' };
      
      act(() => {
        result.current.setAddresses([mockAddress]);
        result.current.updateAddress('non-existent', updatedAddress);
      });
      
      expect(result.current.addresses).toHaveLength(1);
      expect(result.current.addresses[0].name).toBe('John Doe');
    });

    it('should remove an address', () => {
      const { result } = renderHook(() => useAddressStore());
      const address2 = { ...mockAddress, id: '2' };
      
      act(() => {
        result.current.setAddresses([mockAddress, address2]);
        result.current.removeAddress('1');
      });
      
      expect(result.current.addresses).toHaveLength(1);
      expect(result.current.addresses[0].id).toBe('2');
    });

    it('should not remove non-existent address', () => {
      const { result } = renderHook(() => useAddressStore());
      
      act(() => {
        result.current.setAddresses([mockAddress]);
        result.current.removeAddress('non-existent');
      });
      
      expect(result.current.addresses).toHaveLength(1);
    });
  });

  describe('Address selection', () => {
    const shippingAddress = {
      id: '1',
      user_id: 'user123',
      name: 'Shipping Address',
      line1: '123 Shipping St',
      line2: null,
      city: 'Paris',
      postal_code: '75001',
      country: 'FR',
      phone: null,
      is_default: false,
      type: 'shipping' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const billingAddress = {
      id: '2',
      user_id: 'user123',
      name: 'Billing Address',
      line1: '456 Billing Ave',
      line2: null,
      city: 'Lyon',
      postal_code: '69001',
      country: 'FR',
      phone: null,
      is_default: false,
      type: 'billing' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    it('should select shipping address', () => {
      const { result } = renderHook(() => useAddressStore());
      
      act(() => {
        result.current.setSelectedShippingAddress(shippingAddress);
      });
      
      expect(result.current.selectedShippingAddress).toEqual(shippingAddress);
      expect(result.current.selectedBillingAddress).toBeNull();
    });

    it('should select billing address', () => {
      const { result } = renderHook(() => useAddressStore());
      
      act(() => {
        result.current.setSelectedBillingAddress(billingAddress);
      });
      
      expect(result.current.selectedBillingAddress).toEqual(billingAddress);
      expect(result.current.selectedShippingAddress).toBeNull();
    });

    it('should select both addresses independently', () => {
      const { result } = renderHook(() => useAddressStore());
      
      act(() => {
        result.current.setSelectedShippingAddress(shippingAddress);
        result.current.setSelectedBillingAddress(billingAddress);
      });
      
      expect(result.current.selectedShippingAddress).toEqual(shippingAddress);
      expect(result.current.selectedBillingAddress).toEqual(billingAddress);
    });

    it('should clear selected addresses', () => {
      const { result } = renderHook(() => useAddressStore());
      
      act(() => {
        result.current.setSelectedShippingAddress(shippingAddress);
        result.current.setSelectedBillingAddress(billingAddress);
        result.current.setSelectedShippingAddress(null);
        result.current.setSelectedBillingAddress(null);
      });
      
      expect(result.current.selectedShippingAddress).toBeNull();
      expect(result.current.selectedBillingAddress).toBeNull();
    });
  });

  describe('Default address handling', () => {
    const addresses = [
      {
        id: '1',
        user_id: 'user123',
        name: 'Address 1',
        line1: '123 Street',
        line2: null,
        city: 'Paris',
        postal_code: '75001',
        country: 'FR',
        phone: null,
        is_default: false,
        type: 'both' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '2',
        user_id: 'user123',
        name: 'Default Address',
        line1: '456 Avenue',
        line2: null,
        city: 'Lyon',
        postal_code: '69001',
        country: 'FR',
        phone: null,
        is_default: true,
        type: 'both' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    it('should get default address', () => {
      const { result } = renderHook(() => useAddressStore());
      
      act(() => {
        result.current.setAddresses(addresses);
      });
      
      const defaultAddress = result.current.getDefaultAddress();
      expect(defaultAddress).toBeDefined();
      expect(defaultAddress?.id).toBe('2');
      expect(defaultAddress?.is_default).toBe(true);
    });

    it('should return null if no default address', () => {
      const { result } = renderHook(() => useAddressStore());
      const noDefaultAddresses = addresses.map(a => ({ ...a, is_default: false }));
      
      act(() => {
        result.current.setAddresses(noDefaultAddresses);
      });
      
      const defaultAddress = result.current.getDefaultAddress();
      expect(defaultAddress).toBeNull();
    });

    it('should get addresses by type', () => {
      const { result } = renderHook(() => useAddressStore());
      const mixedAddresses = [
        { ...addresses[0], type: 'shipping' as const },
        { ...addresses[1], type: 'billing' as const }
      ];
      
      act(() => {
        result.current.setAddresses(mixedAddresses);
      });
      
      const shippingAddresses = result.current.getAddressesByType('shipping');
      const billingAddresses = result.current.getAddressesByType('billing');
      const bothAddresses = result.current.getAddressesByType('both');
      
      expect(shippingAddresses).toHaveLength(1);
      expect(billingAddresses).toHaveLength(1);
      expect(bothAddresses).toHaveLength(0);
    });
  });

  describe('Loading and error states', () => {
    it('should set loading state', () => {
      const { result } = renderHook(() => useAddressStore());
      
      act(() => {
        result.current.setLoading(true);
      });
      
      expect(result.current.isLoading).toBe(true);
      
      act(() => {
        result.current.setLoading(false);
      });
      
      expect(result.current.isLoading).toBe(false);
    });

    it('should set error state', () => {
      const { result } = renderHook(() => useAddressStore());
      const errorMessage = 'Failed to load addresses';
      
      act(() => {
        result.current.setError(errorMessage);
      });
      
      expect(result.current.error).toBe(errorMessage);
      
      act(() => {
        result.current.setError(null);
      });
      
      expect(result.current.error).toBeNull();
    });
  });

  describe('Reset functionality', () => {
    it('should reset all state', () => {
      const { result } = renderHook(() => useAddressStore());
      const address = {
        id: '1',
        user_id: 'user123',
        name: 'Test Address',
        line1: '123 Test St',
        line2: null,
        city: 'Paris',
        postal_code: '75001',
        country: 'FR',
        phone: null,
        is_default: true,
        type: 'both' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      act(() => {
        result.current.setAddresses([address]);
        result.current.setSelectedShippingAddress(address);
        result.current.setSelectedBillingAddress(address);
        result.current.setLoading(true);
        result.current.setError('Some error');
        result.current.reset();
      });
      
      expect(result.current.addresses).toEqual([]);
      expect(result.current.selectedShippingAddress).toBeNull();
      expect(result.current.selectedBillingAddress).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Address validation helpers', () => {
    it('should check if address is complete', () => {
      const { result } = renderHook(() => useAddressStore());
      
      const completeAddress = {
        id: '1',
        user_id: 'user123',
        name: 'John Doe',
        line1: '123 Main St',
        line2: null,
        city: 'Paris',
        postal_code: '75001',
        country: 'FR',
        phone: '+33612345678',
        is_default: true,
        type: 'both' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const incompleteAddress = {
        ...completeAddress,
        line1: '',
        city: ''
      };
      
      expect(result.current.isAddressComplete(completeAddress)).toBe(true);
      expect(result.current.isAddressComplete(incompleteAddress)).toBe(false);
      expect(result.current.isAddressComplete(null)).toBe(false);
    });

    it('should check if addresses can be used for shipping/billing', () => {
      const { result } = renderHook(() => useAddressStore());
      
      const shippingOnly = {
        id: '1',
        user_id: 'user123',
        name: 'Shipping',
        line1: '123 Ship St',
        line2: null,
        city: 'Paris',
        postal_code: '75001',
        country: 'FR',
        phone: null,
        is_default: false,
        type: 'shipping' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const billingOnly = { ...shippingOnly, id: '2', type: 'billing' as const };
      const both = { ...shippingOnly, id: '3', type: 'both' as const };
      
      expect(result.current.canUseForShipping(shippingOnly)).toBe(true);
      expect(result.current.canUseForShipping(billingOnly)).toBe(false);
      expect(result.current.canUseForShipping(both)).toBe(true);
      
      expect(result.current.canUseForBilling(shippingOnly)).toBe(false);
      expect(result.current.canUseForBilling(billingOnly)).toBe(true);
      expect(result.current.canUseForBilling(both)).toBe(true);
    });
  });
});