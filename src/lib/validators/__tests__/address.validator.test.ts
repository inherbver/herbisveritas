import {
  addressSchema,
  AddressFormData,
  AddressFormTranslations,
  AddressFormProps,
  createAddressSchema,
  updateAddressSchema,
} from '../address.validator';

describe('Address Validator', () => {
  describe('addressSchema', () => {
    it('should validate complete valid address', () => {
      const validAddress = {
        address_type: 'shipping' as const,
        first_name: 'Jean',
        last_name: 'Dupont',
        email: 'jean.dupont@example.com',
        phone_number: '+33612345678',
        company_name: 'Entreprise SAS',
        street_number: '123',
        address_line1: 'rue de la Paix',
        address_line2: 'Appartement 4B',
        city: 'Paris',
        state_province_region: 'Île-de-France',
        postal_code: '75001',
        country_code: 'FR',
      };

      const result = addressSchema.safeParse(validAddress);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validAddress);
      }
    });

    it('should validate minimal required fields', () => {
      const minimalAddress = {
        address_type: 'billing' as const,
        first_name: 'Marie',
        last_name: 'Martin',
        address_line1: '456 avenue Victor Hugo',
        city: 'Lyon',
        postal_code: '69000',
        country_code: 'FR',
      };

      const result = addressSchema.safeParse(minimalAddress);
      expect(result.success).toBe(true);
    });

    it('should reject invalid address type', () => {
      const invalidAddress = {
        address_type: 'invalid' as any,
        first_name: 'Test',
        last_name: 'User',
        address_line1: '123 rue Test',
        city: 'Paris',
        postal_code: '75001',
        country_code: 'FR',
      };

      const result = addressSchema.safeParse(invalidAddress);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('address_type');
      }
    });

    it('should reject invalid email', () => {
      const addressWithInvalidEmail = {
        address_type: 'shipping' as const,
        first_name: 'Jean',
        last_name: 'Dupont',
        email: 'invalid-email',
        address_line1: '123 rue de la Paix',
        city: 'Paris',
        postal_code: '75001',
        country_code: 'FR',
      };

      const result = addressSchema.safeParse(addressWithInvalidEmail);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('email');
      }
    });

    it('should allow empty email string', () => {
      const addressWithEmptyEmail = {
        address_type: 'shipping' as const,
        first_name: 'Jean',
        last_name: 'Dupont',
        email: '',
        address_line1: '123 rue de la Paix',
        city: 'Paris',
        postal_code: '75001',
        country_code: 'FR',
      };

      const result = addressSchema.safeParse(addressWithEmptyEmail);
      expect(result.success).toBe(true);
    });

    it('should validate French postal code', () => {
      const address = {
        address_type: 'shipping' as const,
        first_name: 'Test',
        last_name: 'User',
        address_line1: '123 rue Test',
        city: 'Paris',
        postal_code: '75001',
        country_code: 'FR',
      };

      const result = addressSchema.safeParse(address);
      expect(result.success).toBe(true);
    });

    it('should reject too short names', () => {
      const shortNameAddress = {
        address_type: 'shipping' as const,
        first_name: 'A',
        last_name: 'B',
        address_line1: '123 rue Test',
        city: 'Paris',
        postal_code: '75001',
        country_code: 'FR',
      };

      const result = addressSchema.safeParse(shortNameAddress);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errorPaths = result.error.errors.map(e => e.path[0]);
        expect(errorPaths).toContain('first_name');
        expect(errorPaths).toContain('last_name');
      }
    });

    it('should reject empty required fields', () => {
      const emptyAddress = {
        address_type: 'shipping' as const,
        first_name: '',
        last_name: '',
        address_line1: '',
        city: '',
        postal_code: '',
        country_code: '',
      };

      const result = addressSchema.safeParse(emptyAddress);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errorPaths = result.error.errors.map(e => e.path[0]);
        expect(errorPaths).toContain('first_name');
        expect(errorPaths).toContain('last_name');
        expect(errorPaths).toContain('address_line1');
        expect(errorPaths).toContain('city');
        expect(errorPaths).toContain('postal_code');
        expect(errorPaths).toContain('country_code');
      }
    });

    it('should handle international addresses', () => {
      const usAddress = {
        address_type: 'shipping' as const,
        first_name: 'John',
        last_name: 'Doe',
        street_number: '123',
        address_line1: 'Main St',
        address_line2: 'Apt 4B',
        city: 'New York',
        state_province_region: 'NY',
        postal_code: '10001',
        country_code: 'US',
      };

      const result = addressSchema.safeParse(usAddress);
      expect(result.success).toBe(true);
    });

    it('should transform country code to uppercase', () => {
      const addressWithLowerCountry = {
        address_type: 'billing' as const,
        first_name: 'Jean',
        last_name: 'Dupont',
        address_line1: '123 rue de la Paix',
        city: 'Paris',
        postal_code: '75001',
        country_code: 'fr',
      };

      const result = addressSchema.safeParse(addressWithLowerCountry);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.country_code).toBe('FR');
      }
    });

    it('should validate country code format', () => {
      const invalidCountryCode = {
        address_type: 'shipping' as const,
        first_name: 'Test',
        last_name: 'User',
        address_line1: '123 rue Test',
        city: 'Paris',
        postal_code: '75001',
        country_code: 'FRA', // Too long
      };

      const result = addressSchema.safeParse(invalidCountryCode);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('country_code');
      }
    });

    it('should allow null for optional fields', () => {
      const addressWithNulls = {
        address_type: 'billing' as const,
        first_name: 'Test',
        last_name: 'User',
        company_name: null,
        street_number: null,
        address_line1: '123 rue Test',
        address_line2: null,
        city: 'Paris',
        postal_code: '75001',
        country_code: 'FR',
        state_province_region: null,
        phone_number: null,
      };

      const result = addressSchema.safeParse(addressWithNulls);
      expect(result.success).toBe(true);
    });

    it('should validate phone number format', () => {
      const validPhones = [
        '+33612345678',
        '+33 6 12 34 56 78',
        '06-12-34-56-78',
        '(06) 12 34 56 78',
        '+1-555-555-5555',
      ];

      validPhones.forEach(phone_number => {
        const address = {
          address_type: 'shipping' as const,
          first_name: 'Test',
          last_name: 'User',
          address_line1: '123 rue Test',
          city: 'Paris',
          postal_code: '75001',
          country_code: 'FR',
          phone_number,
        };

        const result = addressSchema.safeParse(address);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid phone number', () => {
      const addressWithInvalidPhone = {
        address_type: 'shipping' as const,
        first_name: 'Test',
        last_name: 'User',
        address_line1: '123 rue Test',
        city: 'Paris',
        postal_code: '75001',
        country_code: 'FR',
        phone_number: 'invalid phone!@#',
      };

      const result = addressSchema.safeParse(addressWithInvalidPhone);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('phone_number');
      }
    });

    it('should enforce max lengths', () => {
      const tooLongAddress = {
        address_type: 'shipping' as const,
        first_name: 'A'.repeat(51),
        last_name: 'B'.repeat(51),
        company_name: 'C'.repeat(101),
        street_number: 'D'.repeat(21),
        address_line1: 'E'.repeat(201),
        address_line2: 'F'.repeat(201),
        city: 'G'.repeat(101),
        postal_code: 'H'.repeat(21),
        country_code: 'FR',
        state_province_region: 'I'.repeat(101),
        phone_number: '0'.repeat(31),
      };

      const result = addressSchema.safeParse(tooLongAddress);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.length).toBeGreaterThan(5);
      }
    });
  });

  describe('createAddressSchema', () => {
    it('should validate address for creation', () => {
      const newAddress = {
        address_type: 'shipping' as const,
        first_name: 'Marie',
        last_name: 'Martin',
        phone_number: '+33612345678',
        address_line1: '789 boulevard Saint-Germain',
        city: 'Paris',
        postal_code: '75006',
        country_code: 'FR',
      };

      const result = createAddressSchema.safeParse(newAddress);
      expect(result.success).toBe(true);
    });

    it('should be identical to base addressSchema', () => {
      // createAddressSchema should be the same as addressSchema
      expect(createAddressSchema).toBe(addressSchema);
    });
  });

  describe('updateAddressSchema', () => {
    it('should validate address for update', () => {
      const updatedAddress = {
        address_type: 'billing' as const,
        first_name: 'Pierre',
        last_name: 'Durand',
        company_name: 'Tech Corp',
        address_line1: '456 avenue des Champs',
        city: 'Lyon',
        postal_code: '69001',
        country_code: 'FR',
      };

      const result = updateAddressSchema.safeParse(updatedAddress);
      expect(result.success).toBe(true);
    });

    it('should be identical to base addressSchema', () => {
      // updateAddressSchema should be the same as addressSchema
      expect(updateAddressSchema).toBe(addressSchema);
    });
  });

  describe('TypeScript types', () => {
    it('should correctly type AddressFormData', () => {
      const typedAddress: AddressFormData = {
        address_type: 'shipping',
        first_name: 'Jean',
        last_name: 'Dupont',
        address_line1: '123 rue de la Paix',
        city: 'Paris',
        postal_code: '75001',
        country_code: 'FR',
      };

      expect(typedAddress.address_type).toBe('shipping');
    });

    it('should enforce address_type enum values', () => {
      const shippingAddress: AddressFormData = {
        address_type: 'shipping',
        first_name: 'Test',
        last_name: 'User',
        address_line1: '123 rue Test',
        city: 'Paris',
        postal_code: '75001',
        country_code: 'FR',
      };

      const billingAddress: AddressFormData = {
        address_type: 'billing',
        first_name: 'Test',
        last_name: 'User',
        address_line1: '123 rue Test',
        city: 'Paris',
        postal_code: '75001',
        country_code: 'FR',
      };

      expect(shippingAddress.address_type).toBe('shipping');
      expect(billingAddress.address_type).toBe('billing');
    });
  });

  describe('AddressFormTranslations interface', () => {
    it('should have correct structure', () => {
      const mockTranslations: AddressFormTranslations = {
        formTitle: (addressType, isEditing) => 
          isEditing ? `Edit ${addressType}` : `Add ${addressType}`,
        recipientSectionTitle: 'Recipient',
        addressSectionTitle: 'Address',
        contactSectionTitle: 'Contact',
        fieldLabels: {
          first_name: 'First Name',
          last_name: 'Last Name',
          email: 'Email',
          company_name: 'Company',
          street_number: 'Street Number',
          address_line1: 'Address Line 1',
          address_line2: 'Address Line 2',
          postal_code: 'Postal Code',
          city: 'City',
          country_code: 'Country',
          state_province_region: 'State/Province',
          phoneNumber: 'Phone',
        },
        placeholders: {
          first_name: 'Enter first name',
        },
        buttons: {
          save: 'Save',
          saving: 'Saving...',
          cancel: 'Cancel',
          showOptionalFields: 'Show optional fields',
        },
        serverActions: {
          validationError: 'Validation error',
          success: 'Success',
          error: 'Error',
        },
      };

      expect(mockTranslations.formTitle('shipping', false)).toBe('Add shipping');
      expect(mockTranslations.formTitle('billing', true)).toBe('Edit billing');
    });
  });

  describe('AddressFormProps interface', () => {
    it('should have correct structure', () => {
      const mockProps: AddressFormProps = {
        translations: {} as AddressFormTranslations,
        addressType: 'shipping',
        existingAddress: {
          id: '123',
          address_type: 'shipping',
          first_name: 'Test',
          last_name: 'User',
        },
        onCancel: () => {},
        onSuccess: () => {},
        locale: 'fr',
      };

      expect(mockProps.addressType).toBe('shipping');
      expect(mockProps.locale).toBe('fr');
      expect(mockProps.existingAddress?.id).toBe('123');
    });
  });
});