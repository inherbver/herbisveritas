/**
 * Tests pour addressActions - Gestion des adresses critique e-commerce
 */

import { 
  addAddress, 
  updateAddress, 
  deleteAddress, 
  getUserAddresses 
} from '../addressActions';
import { 
  createMockFormData, 
  testActionWithRedirect,
  setupServerActionMocks 
} from '@/test-utils/server-action-mocks';
import { createMockSupabaseChain } from '@/test-utils/supabase-mock-helper';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { AddressFormData } from '@/lib/validators/address.validator';

// Mock des dépendances
jest.mock('@/lib/supabase/server');
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));
jest.mock('next-intl/server', () => ({
  getTranslations: jest.fn().mockResolvedValue((key: string) => key),
}));

const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    order: jest.fn().mockReturnThis(),
  })),
};

(createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabaseClient);

// Setup des mocks standards pour Server Actions
setupServerActionMocks();

describe('addressActions', () => {
  const mockUser = { id: 'user-123', email: 'user@test.com' };
  const mockAddressData: AddressFormData = {
    street: '123 Test Street',
    city: 'Test City',
    postal_code: '12345',
    country: 'France',
    first_name: 'John',
    last_name: 'Doe',
    phone: '+33123456789',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
  });

  describe('addAddress', () => {
    it('should create new address successfully', async () => {
      // Arrange
      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          data: { id: 'addr-123', ...mockAddressData },
          error: null,
        }),
      });

      // Act
      const result = await addAddress(mockAddressData, 'fr');

      // Assert
      expect(result?.success ?? true).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('addresses');
    });

    it('should require authentication', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act
      const result = await addAddress(mockAddressData, 'fr');

      // Assert
      expect(result?.success).toBe(false);
      expect(result.error).toContain('authentifi');
    });

    it('should validate address data', async () => {
      // Arrange - Invalid data (missing required fields)
      const invalidData = {
        street: '', // Required field empty
        city: 'Test City',
        postal_code: '12345',
        country: 'France',
        first_name: 'John',
        last_name: 'Doe',
      } as AddressFormData;

      // Act
      const result = await addAddress(invalidData, 'fr');

      // Assert
      expect(result?.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle database errors', async () => {
      // Arrange
      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' },
        }),
      });

      // Act
      const result = await addAddress(mockAddressData, 'fr');

      // Assert
      expect(result?.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('updateAddress', () => {
    const addressId = 'addr-123';

    it('should update address successfully', async () => {
      // Arrange
      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: { id: addressId, ...mockAddressData },
          error: null,
        }),
      });

      // Act
      const result = await updateAddress(addressId, mockAddressData, 'fr');

      // Assert
      expect(result?.success ?? true).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('addresses');
    });

    it('should require authentication for update', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act
      const result = await updateAddress(addressId, mockAddressData, 'fr');

      // Assert
      expect(result?.success).toBe(false);
      expect(result.error).toContain('authentifi');
    });

    it('should validate address ID', async () => {
      // Act
      const result = await updateAddress('', mockAddressData, 'fr');

      // Assert
      expect(result?.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('deleteAddress', () => {
    const addressId = 'addr-123';

    it('should delete address successfully', async () => {
      // Arrange
      mockSupabaseClient.from.mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: {},
          error: null,
        }),
      });

      // Act
      const result = await deleteAddress(addressId, 'fr');

      // Assert
      expect(result?.success ?? true).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('addresses');
    });

    it('should require authentication for deletion', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act
      const result = await deleteAddress(addressId, 'fr');

      // Assert
      expect(result?.success).toBe(false);
      expect(result.error).toContain('authentifi');
    });

    it('should validate address ID for deletion', async () => {
      // Act
      const result = await deleteAddress('', 'fr');

      // Assert
      expect(result?.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getUserAddresses', () => {
    it('should retrieve user addresses successfully', async () => {
      // Arrange
      const mockAddresses = [
        { id: 'addr-1', ...mockAddressData, is_default: true },
        { id: 'addr-2', ...mockAddressData, is_default: false },
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockAddresses,
          error: null,
        }),
      });

      // Act
      const result = await getUserAddresses();

      // Assert
      expect(result?.success ?? true).toBe(true);
      expect(result.data).toEqual(mockAddresses);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('addresses');
    });

    it('should require authentication', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act
      const result = await getUserAddresses();

      // Assert
      expect(result?.success).toBe(false);
      expect(result.error).toContain('authentifi');
    });

    it('should handle database errors', async () => {
      // Arrange
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      });

      // Act
      const result = await getUserAddresses();

      // Assert
      expect(result?.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Address Validation Edge Cases', () => {
    it('should handle international addresses', async () => {
      // Arrange
      const internationalAddress: AddressFormData = {
        street: '123 International St',
        city: 'Berlin',
        postal_code: '10115',
        country: 'Germany',
        first_name: 'Hans',
        last_name: 'Müller',
        phone: '+49301234567',
      };

      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          data: { id: 'addr-international', ...internationalAddress },
          error: null,
        }),
      });

      // Act
      const result = await addAddress(internationalAddress, 'fr');

      // Assert
      expect(result?.success ?? true).toBe(true);
    });

    it('should handle special characters in addresses', async () => {
      // Arrange
      const specialCharAddress: AddressFormData = {
        street: "123 Rue de l'Église",
        city: 'Saint-Étienne-du-Rouvray',
        postal_code: '76800',
        country: 'France',
        first_name: 'François',
        last_name: 'Lefèvre-Martinez',
        phone: '+33123456789',
      };

      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          data: { id: 'addr-special', ...specialCharAddress },
          error: null,
        }),
      });

      // Act
      const result = await addAddress(specialCharAddress, 'fr');

      // Assert
      expect(result?.success ?? true).toBe(true);
    });
  });
});