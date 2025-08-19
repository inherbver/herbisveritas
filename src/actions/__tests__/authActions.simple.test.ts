/**
 * Tests simplifiés pour authActions - version qui fonctionne
 */

import { loginAction, signUpAction } from '../authActions';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { migrateAndGetCart } from '@/actions/cartActions';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

// Mock des dépendances
jest.mock('@/lib/supabase/server');
jest.mock('@/actions/cartActions');
jest.mock('next/navigation');
jest.mock('next-intl/server');

const mockSupabaseClient = {
  auth: {
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
  },
  from: jest.fn(() => ({
    insert: jest.fn().mockResolvedValue({ data: {}, error: null })
  }))
};

(createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabaseClient);
(getTranslations as jest.Mock).mockResolvedValue((key: string) => key);
(redirect as jest.Mock).mockImplementation(() => {
  throw new Error('NEXT_REDIRECT');
});
(migrateAndGetCart as jest.Mock).mockResolvedValue({ success: true });

// Helper pour créer FormData
const createFormData = (data: Record<string, string>): FormData => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });
  return formData;
};

describe('authActions - Simple Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loginAction', () => {
    it('should handle successful login', async () => {
      // Arrange
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: 'user-1' }, session: {} },
        error: null
      });

      const formData = createFormData({
        email: 'test@test.com',
        password: 'validpassword'
      });

      // Act - Call avec prevState undefined (first call)
      try {
        await loginAction(undefined, formData);
      } catch (error: any) {
        // Expect redirect error
        expect(error.message).toBe('NEXT_REDIRECT');
      }

      // Assert
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'validpassword'
      });
    });

    it('should handle login failure', async () => {
      // Arrange
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials' }
      });

      const formData = createFormData({
        email: 'invalid@test.com',
        password: 'wrongpassword'
      });

      // Act
      const result = await loginAction(undefined, formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate required fields', async () => {
      // Arrange
      const formData = createFormData({
        email: '',
        password: ''
      });

      // Act
      const result = await loginAction(undefined, formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.fieldErrors).toBeDefined();
    });
  });

  describe('signUpAction', () => {
    it('should handle successful signup', async () => {
      // Arrange
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: { id: 'new-user' }, session: null },
        error: null
      });

      const formData = createFormData({
        email: 'newuser@test.com',
        password: 'strongpassword123',
        confirmPassword: 'strongpassword123'
      });

      // Act
      const result = await signUpAction(undefined, formData);

      // Assert
      expect(result.success).toBe(true);
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: 'newuser@test.com',
        password: 'strongpassword123'
      });
    });

    it('should fail when passwords do not match', async () => {
      // Arrange
      const formData = createFormData({
        email: 'test@test.com',
        password: 'password123',
        confirmPassword: 'different123'
      });

      // Act
      const result = await signUpAction(undefined, formData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('correspondent');
    });
  });
});