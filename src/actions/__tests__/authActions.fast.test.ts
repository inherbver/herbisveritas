/**
 * Tests rapides pour authActions
 * Version optimisée avec helpers standards
 */

import { loginAction, signUpAction } from '../authActions';
import { 
  createMockFormData, 
  testActionWithRedirect,
  setupServerActionMocks 
} from '@/test-utils/server-action-mocks';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { migrateAndGetCart } from '@/actions/cartActions';

// Mock dependencies
jest.mock('@/lib/supabase/server');
jest.mock('@/actions/cartActions');
jest.mock('next/navigation');
jest.mock('next-intl/server');

// Setup des mocks standards pour Server Actions
setupServerActionMocks();

describe('authActions - Fast Tests', () => {
  let mockSupabase: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default Supabase mock
    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ 
          data: { user: null }, 
          error: null 
        }),
        signInWithPassword: jest.fn(),
        signUp: jest.fn(),
        resetPasswordForEmail: jest.fn(),
        updateUser: jest.fn(),
      },
      from: jest.fn(),
    };
    
    (createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabase);
    (migrateAndGetCart as jest.Mock).mockResolvedValue({ success: true });
  });
  
  describe('loginAction', () => {
    it('should login successfully with valid credentials', async () => {
      // Arrange
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@test.com' }, session: {} },
        error: null
      });

      const formData = createMockFormData({
        email: 'test@test.com',
        password: 'validpassword'
      });

      // Act
      const result = await loginAction(undefined, formData);

      // Assert
      expect(result?.success ?? true).toBe(true);
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'validpassword'
      });
    });

    it('should fail with invalid credentials', async () => {
      // Arrange
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        error: { message: 'Invalid login credentials' }
      });

      const formData = createMockFormData({
        email: 'invalid@test.com',
        password: 'wrongpassword'
      });

      // Act
      const result = await loginAction(undefined, formData);

      // Assert
      expect(result?.success).toBe(false);
      expect(result?.error).toBeDefined();
    });

    it('should validate required fields', async () => {
      // Arrange
      const formData = createMockFormData({
        email: '',
        password: ''
      });

      // Act
      const result = await loginAction(undefined, formData);

      // Assert
      expect(result?.success).toBe(false);
      expect(result?.error).toBeDefined();
    });
    
    it('should handle email validation', async () => {
      // Arrange
      const formData = createMockFormData({
        email: 'invalid-email',
        password: 'password123'
      });

      // Act
      const result = await loginAction(undefined, formData);

      // Assert
      expect(result?.success).toBe(false);
      expect(result?.error).toBeDefined();
    });
  });

  describe('signUpAction', () => {
    it('should register user successfully', async () => {
      // Arrange
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: { id: 'new-user', email: 'newuser@test.com' }, session: null },
        error: null
      });
      
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null })
      });

      const formData = createMockFormData({
        email: 'newuser@test.com',
        password: 'StrongPassword123!',
        confirmPassword: 'StrongPassword123!',
        locale: 'fr'
      });

      // Act
      const result = await signUpAction(undefined, formData);

      // Assert
      expect(result?.success ?? true).toBe(true);
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newuser@test.com',
          password: 'StrongPassword123!'
        })
      );
    });

    it('should fail when passwords do not match', async () => {
      // Arrange
      const formData = createMockFormData({
        email: 'newuser@test.com',
        password: 'password123',
        confirmPassword: 'different123',
        locale: 'fr'
      });

      // Act
      const result = await signUpAction(undefined, formData);

      // Assert
      expect(result?.success).toBe(false);
      expect(result?.error).toBeDefined();
    });
    
    it('should validate password strength', async () => {
      // Arrange
      const formData = createMockFormData({
        email: 'newuser@test.com',
        password: 'weak',
        confirmPassword: 'weak',
        locale: 'fr'
      });

      // Act
      const result = await signUpAction(undefined, formData);

      // Assert
      expect(result?.success).toBe(false);
      expect(result?.error).toBeDefined();
    });
    
    it('should handle existing user error', async () => {
      // Arrange
      mockSupabase.auth.signUp.mockResolvedValue({
        error: { message: 'User already registered' }
      });

      const formData = createMockFormData({
        email: 'existing@test.com',
        password: 'StrongPassword123!',
        confirmPassword: 'StrongPassword123!',
        locale: 'fr'
      });

      // Act
      const result = await signUpAction(undefined, formData);

      // Assert
      expect(result?.success).toBe(false);
      expect(result?.error).toBeDefined();
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle network errors gracefully', async () => {
      // Arrange
      mockSupabase.auth.signInWithPassword.mockRejectedValue(
        new Error('Network error')
      );

      const formData = createMockFormData({
        email: 'test@test.com',
        password: 'password123'
      });

      // Act
      const result = await loginAction(undefined, formData);

      // Assert
      expect(result?.success).toBe(false);
      expect(result?.error).toBeDefined();
    });
    
    it('should migrate guest cart on successful login', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'guest-123', is_anonymous: true } },
        error: null
      });
      
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: 'user-1' }, session: {} },
        error: null
      });

      const formData = createMockFormData({
        email: 'test@test.com',
        password: 'password123'
      });

      // Act
      await loginAction(undefined, formData);

      // Assert
      expect(migrateAndGetCart).toHaveBeenCalledWith({
        guestUserId: 'guest-123'
      });
    });
  });
});