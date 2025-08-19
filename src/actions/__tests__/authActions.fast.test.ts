/**
 * Tests rapides pour authActions
 * Version optimisée avec nouveaux utilitaires
 */

import { loginAction, signUpAction } from '../authActions';
import { 
  testServerAction, 
  createFormData, 
  setupFastTest,
  setupAutoCleanup 
} from '@/test-utils';

// Setup automatique du cleanup
setupAutoCleanup();

describe('authActions - Fast Tests', () => {
  describe('loginAction', () => {
    it('should login successfully with valid credentials', async () => {
      // Arrange
      const { supabase } = setupFastTest({
        user: { id: 'user-1', email: 'test@test.com' }
      });
      
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: 'user-1' }, session: {} },
        error: null
      });

      // Act
      const result = await testServerAction(loginAction).call({
        email: 'test@test.com',
        password: 'validpassword'
      });

      // Assert
      expect(result.success).toBe(true);
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'validpassword'
      });
    });

    it('should fail with invalid credentials', async () => {
      // Arrange
      setupFastTest({ failAuth: true });

      // Act
      const result = await testServerAction(loginAction).call({
        email: 'invalid@test.com',
        password: 'wrongpassword'
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('connexion');
    });

    it('should validate required fields', async () => {
      // Act
      const result = await testServerAction(loginAction).call({
        email: '',
        password: ''
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.fieldErrors).toBeDefined();
      expect(result.fieldErrors?.email).toContain('adresse email');
    });
  });

  describe('signUpAction', () => {
    it('should register user successfully', async () => {
      // Arrange
      const { supabase } = setupFastTest();
      
      supabase.auth.signUp.mockResolvedValue({
        data: { user: { id: 'new-user' }, session: null },
        error: null
      });

      // Act
      const result = await testServerAction(signUpAction).call({
        email: 'newuser@test.com',
        password: 'strongpassword123',
        confirmPassword: 'strongpassword123'
      });

      // Assert
      expect(result.success).toBe(true);
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'newuser@test.com',
        password: 'strongpassword123'
      });
    });

    it('should fail when passwords do not match', async () => {
      // Act
      const result = await testServerAction(signUpAction).call({
        email: 'test@test.com',
        password: 'password123',
        confirmPassword: 'different123'
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('correspondent');
    });
  });
});