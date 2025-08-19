/**
 * Tests simples pour adminActions - Actions d'administration critiques
 */

import { checkAdminRole, createAdminUser } from '../adminActions';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Mock des dépendances
jest.mock('@/lib/supabase/server');
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
  })),
};

(createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabaseClient);

describe('adminActions - Simple Tests', () => {
  const mockAdminUser = { id: 'admin-123', email: 'admin@test.com' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdminUser },
      error: null,
    });
  });

  describe('Authentication Checks', () => {
    it('should require authentication for checkAdminRole', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act
      const result = await checkAdminRole();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('authentifi');
    });

    it('should require authentication for createAdminUser', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act
      const result = await createAdminUser('new-admin@test.com', 'NewAdmin123!');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('authentifi');
    });
  });

  describe('Admin Role Checking', () => {
    it('should check admin role in database', async () => {
      // Arrange
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: 'admin' },
          error: null,
        }),
      });

      // Act
      const result = await checkAdminRole();

      // Assert
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_profiles');
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' },
        }),
      });

      // Act
      const result = await checkAdminRole();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Admin User Creation', () => {
    it('should validate email format', async () => {
      // Act
      const result = await createAdminUser('invalid-email', 'Password123!');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate password strength', async () => {
      // Act  
      const result = await createAdminUser('valid@email.com', 'weak');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should call database operations', async () => {
      // Arrange
      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          data: { id: 'new-admin-123' },
          error: null,
        }),
      });

      // Act
      await createAdminUser('new@admin.com', 'ValidPass123!');

      // Assert
      expect(mockSupabaseClient.from).toHaveBeenCalled();
    });
  });
});