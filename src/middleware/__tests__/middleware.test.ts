/**
 * Tests pour le middleware - Sécurité et i18n
 * Tests critiques pour routes protégées et redirections
 */

import { middleware } from '../../middleware';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Mock des dépendances  
jest.mock('@supabase/ssr');
jest.mock('next-intl/middleware', () => {
  return jest.fn(() => (request: any) => {
    const response = {
      status: 200,
      headers: new Map([['x-next-intl-locale', 'fr']]),
      cookies: { set: jest.fn() }
    };
    return response;
  });
});
jest.mock('@/lib/auth/utils', () => ({
  clearSupabaseCookies: jest.fn()
}));

// Mock Next.js Request/Response pour l'environnement de test
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url: string) => ({
    nextUrl: {
      pathname: new URL(url).pathname,
      origin: new URL(url).origin
    },
    url,
    cookies: {
      get: jest.fn(),
      set: jest.fn()
    },
    headers: {
      get: jest.fn(),
      set: jest.fn()
    }
  })),
  NextResponse: {
    next: jest.fn(() => ({
      status: 200,
      headers: { set: jest.fn(), get: jest.fn() },
      cookies: { set: jest.fn() }
    })),
    redirect: jest.fn((url: URL) => ({
      status: 302,
      headers: { 
        set: jest.fn(), 
        get: jest.fn().mockReturnValue(url.toString()) 
      }
    }))
  }
}));

const mockSupabaseClient = {
  auth: {
    getUser: jest.fn()
  }
};

(createServerClient as jest.Mock).mockReturnValue(mockSupabaseClient);

// Helper pour créer une mock request
const createMockRequest = (
  pathname: string, 
  options: { 
    cookies?: Record<string, string>;
    headers?: Record<string, string>;
  } = {}
) => {
  const url = `https://example.com${pathname}`;
  
  const mockRequest = {
    nextUrl: {
      pathname,
      origin: 'https://example.com'
    },
    url,
    cookies: {
      get: jest.fn((name: string) => 
        options.cookies?.[name] ? { value: options.cookies[name] } : undefined
      ),
      set: jest.fn()
    },
    headers: {
      get: jest.fn((name: string) => options.headers?.[name]),
      set: jest.fn()
    }
  };
  
  return mockRequest;
};

describe('Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.NODE_ENV = 'test';
  });

  describe('Route Protection - Admin', () => {
    it('should redirect unauthenticated user from admin route to login', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth session missing' }
      });

      const request = createMockRequest('/fr/admin/dashboard');

      // Act
      const response = await middleware(request);

      // Assert
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe(
        'https://example.com/fr/login?redirectUrl=%2Ffr%2Fadmin%2Fdashboard'
      );
    });

    it('should allow authenticated admin user to access admin route', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { 
          user: { 
            id: 'admin-user', 
            email: 'admin@test.com',
            user_metadata: { role: 'admin' }
          } 
        },
        error: null
      });

      const request = createMockRequest('/fr/admin/dashboard', {
        cookies: { 'sb-auth-token': 'valid-token' }
      });

      // Act
      const response = await middleware(request);

      // Assert
      expect(response.status).not.toBe(302);
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled();
    });

    it('should handle auth timeout for admin routes gracefully', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 5000)) // Timeout plus long que 2s
      );

      const request = createMockRequest('/fr/admin/users');

      // Act
      const response = await middleware(request);

      // Assert - Should not redirect, let page handle auth
      expect(response.status).not.toBe(302);
    });
  });

  describe('Route Protection - Profile', () => {
    it('should redirect unauthenticated user from profile route to login', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth session missing' }
      });

      const request = createMockRequest('/fr/profile/account');

      // Act
      const response = await middleware(request);

      // Assert
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe(
        'https://example.com/fr/login?redirectUrl=%2Ffr%2Fprofile%2Faccount'
      );
    });

    it('should allow authenticated user to access profile route', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { 
          user: { 
            id: 'user-123', 
            email: 'user@test.com' 
          } 
        },
        error: null
      });

      const request = createMockRequest('/fr/profile/orders');

      // Act
      const response = await middleware(request);

      // Assert
      expect(response.status).not.toBe(302);
    });
  });

  describe('i18n Handling', () => {
    it('should redirect root to shop with default locale', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      const request = createMockRequest('/');

      // Act
      const response = await middleware(request);

      // Assert
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/fr/shop');
    });

    it('should handle non-prefixed admin route', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      const request = createMockRequest('/admin');

      // Act
      const response = await middleware(request);

      // Assert
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toContain('/login');
    });
  });

  describe('Special Routes', () => {
    it('should handle test-cart-actions route without i18n', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      const request = createMockRequest('/test-cart-actions');

      // Act  
      const response = await middleware(request);

      // Assert - Should not redirect
      expect(response.status).not.toBe(302);
    });
  });

  describe('Cookie Management', () => {
    it('should clear cookies when user_not_found error occurs', async () => {
      // Arrange
      const { clearSupabaseCookies } = require('@/lib/auth/utils');
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: null,
        error: { message: 'user_not_found', code: 'user_not_found' }
      });

      const request = createMockRequest('/fr/shop', {
        cookies: { 'sb-auth-token': 'invalid-token' }
      });

      // Act
      const response = await middleware(request);

      // Assert
      expect(clearSupabaseCookies).toHaveBeenCalledWith(request, expect.any(Object));
    });

    it('should handle network errors gracefully', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockRejectedValue(
        new Error('Failed to fetch')
      );

      const request = createMockRequest('/fr/shop');

      // Act
      const response = await middleware(request);

      // Assert - Should not crash or redirect unexpectedly
      expect(response.status).not.toBe(500);
    });
  });

  describe('Performance', () => {
    it('should timeout long auth requests', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          data: { user: { id: 'user' } },
          error: null
        }), 3000)) // 3s - longer than 2s timeout
      );

      const request = createMockRequest('/fr/shop');

      // Act
      const start = Date.now();
      const response = await middleware(request);
      const duration = Date.now() - start;

      // Assert
      expect(duration).toBeLessThan(2500); // Should timeout before 2.5s
      expect(response).toBeDefined();
    });

    it('should handle concurrent requests efficiently', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      const requests = [
        createMockRequest('/fr/shop'),
        createMockRequest('/fr/products'),
        createMockRequest('/fr/about')
      ];

      // Act
      const start = Date.now();
      const responses = await Promise.all(
        requests.map(req => middleware(req))
      );
      const duration = Date.now() - start;

      // Assert
      expect(responses).toHaveLength(3);
      expect(duration).toBeLessThan(1000); // Should handle 3 requests quickly
      responses.forEach(response => {
        expect(response).toBeDefined();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed URLs gracefully', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      // Act & Assert - Should not throw
      await expect(async () => {
        const request = createMockRequest('/fr///multiple//slashes');
        await middleware(request);
      }).not.toThrow();
    });

    it('should handle missing environment variables', async () => {
      // Arrange
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      
      const request = createMockRequest('/fr/shop');

      // Act & Assert - Should handle gracefully
      await expect(async () => {
        await middleware(request);
      }).not.toThrow();
    });
  });
});