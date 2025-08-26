/**
 * Tests pour le hook useAuth - Authentification critique
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '../use-auth';
import { createClient } from '@/lib/supabase/client';
import { hasPermission } from '@/lib/auth/utils';


import { setupServerActionMocks } from '@/test-utils/server-action-mocks';// Mock des dépendances
jest.mock('@/lib/supabase/client');
jest.mock('@/lib/auth/utils');

const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
    onAuthStateChange: jest.fn()
  }
};

const mockSubscription = {
  unsubscribe: jest.fn()
};

(createClient as jest.Mock).mockReturnValue(mockSupabaseClient);
(hasPermission as jest.Mock).mockImplementation((role, permission) => {
  // Mock simple: admin a tous les droits, user basique a les droits de base
  if (role === 'admin') return true;
  if (role === 'user' && permission === 'products:view') return true;
  return false;
});

// Setup des mocks standards pour Server Actions
setupServerActionMocks();

describe('useAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: mockSubscription }
    });
  });

  describe('Initial State', () => {
    it('should start with loading state', () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );

      // Act
      const { result } = renderHook(() => useAuth());

      // Assert
      expect(result.current.isLoading).toBe(true);
      expect(result.current.user).toBe(null);
      expect(result.current.role).toBe(null);
    });
  });

  describe('User Authentication', () => {
    it('should set user when authenticated', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'user@test.com',
        user_metadata: { role: 'user' }
      };
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Act
      const { result } = renderHook(() => useAuth());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.role).toBe('user');
    });

    it('should handle unauthenticated state', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth session missing' }
      });

      // Act
      const { result } = renderHook(() => useAuth());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.user).toBe(null);
      expect(result.current.role).toBe(null);
    });

    it('should handle admin user with role', async () => {
      // Arrange
      const mockAdminUser = {
        id: 'admin-123',
        email: 'admin@test.com',
        user_metadata: { role: 'admin' }
      };
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockAdminUser },
        error: null
      });

      // Act
      const { result } = renderHook(() => useAuth());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.user).toEqual(mockAdminUser);
      expect(result.current.role).toBe('admin');
    });
  });

  describe('Auth State Changes', () => {
    it('should listen to auth state changes', () => {
      // Arrange & Act
      renderHook(() => useAuth());

      // Assert
      expect(mockSupabaseClient.auth.onAuthStateChange).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('should update state when auth changes', async () => {
      // Arrange
      let authCallback: Function;
      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        authCallback = callback;
        return { data: { subscription: mockSubscription } };
      });
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      // Act
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate sign in
      const mockUser = {
        id: 'user-456', 
        email: 'new@test.com',
        user_metadata: { role: 'user' }
      };
      
      act(() => {
        authCallback('SIGNED_IN', { user: mockUser });
      });

      // Assert
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.role).toBe('user');
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle sign out', async () => {
      // Arrange
      let authCallback: Function;
      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        authCallback = callback;
        return { data: { subscription: mockSubscription } };
      });
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      // Act
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.user).toBeTruthy();
      });

      // Simulate sign out
      act(() => {
        authCallback('SIGNED_OUT', null);
      });

      // Assert
      expect(result.current.user).toBe(null);
      expect(result.current.role).toBe(null);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Permission Checking', () => {
    it('should check permissions for authenticated user', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        user_metadata: { role: 'user' }
      };
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Act
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.checkPermission('products:view')).toBe(true);
      expect(result.current.checkPermission('users:manage')).toBe(false);
    });

    it('should deny permissions during loading', () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );

      // Act
      const { result } = renderHook(() => useAuth());

      // Assert
      expect(result.current.isLoading).toBe(true);
      expect(result.current.checkPermission('products:view')).toBe(false);
    });

    it('should deny permissions without role', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      // Act
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.checkPermission('products:view')).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle auth timeout gracefully', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth_Timeout')), 100)
        )
      );

      // Act
      const { result } = renderHook(() => useAuth());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.user).toBe(null);
      expect(result.current.role).toBe(null);
    });

    it('should handle network errors gracefully', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockRejectedValue(
        new Error('Failed to fetch')
      );

      // Act
      const { result } = renderHook(() => useAuth());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.user).toBe(null);
      expect(result.current.role).toBe(null);
    });

    it('should handle unknown errors', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockRejectedValue(
        new Error('Unknown database error')
      );

      // Act
      const { result } = renderHook(() => useAuth());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.user).toBe(null);
      expect(result.current.role).toBe(null);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup subscription on unmount', () => {
      // Act
      const { unmount } = renderHook(() => useAuth());
      unmount();

      // Assert
      expect(mockSubscription.unsubscribe).toHaveBeenCalled();
    });
  });
});