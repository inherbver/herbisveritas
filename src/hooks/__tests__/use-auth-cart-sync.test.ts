/**
 * Tests pour le hook useAuthCartSync - Synchronisation critique panier/auth
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuthCartSync } from '../use-auth-cart-sync';
import { useCartStore } from '@/stores/cartStore';
import { createClient } from '@/lib/supabase/client';
import { getCart } from '@/actions/cartActions';


import { setupServerActionMocks } from '@/test-utils/server-action-mocks';// Mock des dépendances
jest.mock('@/lib/supabase/client');
jest.mock('@/actions/cartActions');
jest.mock('@/stores/cartStore');

const mockSupabaseClient = {
  auth: {
    onAuthStateChange: jest.fn()
  }
};

const mockCartStore = {
  clearCart: jest.fn(),
  _setItems: jest.fn(),
  _setIsLoading: jest.fn(),
  items: [],
  forceReloadFromServer: jest.fn()
};

const mockSubscription = {
  unsubscribe: jest.fn()
};

(createClient as jest.Mock).mockReturnValue(mockSupabaseClient);
(useCartStore as unknown as jest.Mock).mockImplementation((selector) => {
  if (selector === undefined) return mockCartStore;
  return selector(mockCartStore);
});
(getCart as jest.Mock).mockResolvedValue({
  success: true,
  data: { items: [{ id: '1', productId: 'prod-1', quantity: 1 }] }
});

// Setup des mocks standards pour Server Actions
setupServerActionMocks();

describe('useAuthCartSync Hook', () => {
  let authCallback: Function;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
      authCallback = callback;
      return { data: { subscription: mockSubscription } };
    });
  });

  describe('Initialization', () => {
    it('should setup auth state change listener', () => {
      // Act
      renderHook(() => useAuthCartSync());

      // Assert
      expect(mockSupabaseClient.auth.onAuthStateChange).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });
  });

  describe('Sign Out Handling', () => {
    it('should clear cart on SIGNED_OUT event', async () => {
      // Arrange
      renderHook(() => useAuthCartSync());

      // Act
      await act(async () => {
        authCallback('SIGNED_OUT', null);
      });

      // Assert
      expect(mockCartStore.clearCart).toHaveBeenCalled();
    });

    it('should clear cart when session ends', async () => {
      // Arrange
      renderHook(() => useAuthCartSync());

      // Act
      await act(async () => {
        authCallback('TOKEN_REFRESH_FAILED', null);
      });

      // Assert
      expect(mockCartStore.clearCart).toHaveBeenCalled();
    });
  });

  describe('Sign In Handling', () => {
    it('should force reload cart on SIGNED_IN event', async () => {
      // Arrange
      const mockSession = {
        user: { id: 'user-123', email: 'test@test.com' }
      };
      
      renderHook(() => useAuthCartSync());

      // Act
      await act(async () => {
        authCallback('SIGNED_IN', mockSession);
      });

      // Assert - Attendre le setTimeout de 100ms
      await waitFor(() => {
        expect(mockCartStore.forceReloadFromServer).toHaveBeenCalled();
      }, { timeout: 200 });
    });
  });

  describe('Token Refresh Handling', () => {
    it('should reload cart on TOKEN_REFRESHED if cart is empty', async () => {
      // Arrange
      mockCartStore.items = []; // Cart vide
      const mockSession = {
        user: { id: 'user-123' }
      };
      
      renderHook(() => useAuthCartSync());

      // Act
      await act(async () => {
        authCallback('TOKEN_REFRESHED', mockSession);
      });

      // Assert
      await waitFor(() => {
        expect(mockCartStore._setIsLoading).toHaveBeenCalledWith(true);
        expect(getCart).toHaveBeenCalled();
      });
    });

    it('should not reload cart on TOKEN_REFRESHED if cart has items', async () => {
      // Arrange
      mockCartStore.items = [{ id: '1', productId: 'prod-1', quantity: 1 }]; // Cart avec items
      const mockSession = {
        user: { id: 'user-123' }
      };
      
      renderHook(() => useAuthCartSync());

      // Act
      await act(async () => {
        authCallback('TOKEN_REFRESHED', mockSession);
      });

      // Assert
      expect(getCart).not.toHaveBeenCalled();
    });
  });

  describe('Initial Session Handling', () => {
    it('should load cart on INITIAL_SESSION if cart is empty', async () => {
      // Arrange
      mockCartStore.items = []; // Cart vide
      const mockSession = {
        user: { id: 'user-123' }
      };
      
      renderHook(() => useAuthCartSync());

      // Act
      await act(async () => {
        authCallback('INITIAL_SESSION', mockSession);
      });

      // Assert - Attendre le setTimeout de 500ms
      await waitFor(() => {
        expect(getCart).toHaveBeenCalled();
      }, { timeout: 600 });
    });

    it('should not load cart on INITIAL_SESSION if cart has items', async () => {
      // Arrange
      mockCartStore.items = [{ id: '1' }]; // Cart avec items
      const mockSession = {
        user: { id: 'user-123' }
      };
      
      renderHook(() => useAuthCartSync());

      // Act
      await act(async () => {
        authCallback('INITIAL_SESSION', mockSession);
      });

      // Assert - Attendre pour s'assurer que getCart n'est pas appelé
      await new Promise(resolve => setTimeout(resolve, 600));
      expect(getCart).not.toHaveBeenCalled();
    });
  });

  describe('Cart Loading', () => {
    it('should handle successful cart loading', async () => {
      // Arrange
      const mockCartData = {
        items: [
          { id: '1', productId: 'prod-1', quantity: 2 },
          { id: '2', productId: 'prod-2', quantity: 1 }
        ]
      };
      
      (getCart as jest.Mock).mockResolvedValue({
        success: true,
        data: mockCartData
      });

      renderHook(() => useAuthCartSync());

      // Act
      await act(async () => {
        authCallback('TOKEN_REFRESHED', { user: { id: 'user-123' } });
      });

      // Assert
      await waitFor(() => {
        expect(mockCartStore._setItems).toHaveBeenCalledWith(mockCartData.items);
        expect(mockCartStore._setIsLoading).toHaveBeenCalledWith(false);
      });
    });

    it('should handle cart loading failure', async () => {
      // Arrange
      (getCart as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Failed to load cart'
      });

      renderHook(() => useAuthCartSync());

      // Act
      await act(async () => {
        authCallback('TOKEN_REFRESHED', { user: { id: 'user-123' } });
      });

      // Assert
      await waitFor(() => {
        expect(mockCartStore._setItems).toHaveBeenCalledWith([]);
        expect(mockCartStore._setIsLoading).toHaveBeenCalledWith(false);
      });
    });

    it('should handle cart loading error', async () => {
      // Arrange
      (getCart as jest.Mock).mockRejectedValue(new Error('Network error'));

      renderHook(() => useAuthCartSync());

      // Act
      await act(async () => {
        authCallback('TOKEN_REFRESHED', { user: { id: 'user-123' } });
      });

      // Assert
      await waitFor(() => {
        expect(mockCartStore._setIsLoading).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('Cleanup', () => {
    it('should cleanup subscription on unmount', () => {
      // Act
      const { unmount } = renderHook(() => useAuthCartSync());
      unmount();

      // Assert
      expect(mockSubscription.unsubscribe).toHaveBeenCalled();
    });
  });
});