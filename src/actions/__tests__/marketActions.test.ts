/**
 * Market Actions Tests
 * 
 * Tests for market CRUD server actions to verify functionality with new types
 */

import { createMarket, updateMarket, deleteMarket } from '../marketActions';
import { validateMarketForm } from '@/lib/validators/market';

// Mock the dependencies
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/auth/admin-service');
jest.mock('next/cache');

describe('Market Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateMarketForm', () => {
    it('should validate valid market form data', () => {
      const formData = new FormData();
      formData.append('name', 'Test Market');
      formData.append('start_date', '2025-07-01');
      formData.append('end_date', '2025-08-31');
      formData.append('day_of_week', '0');
      formData.append('start_time', '18:00');
      formData.append('end_time', '22:00');
      formData.append('city', 'Test City');
      formData.append('address', 'Test Address');
      formData.append('description', 'Test Description');
      formData.append('is_active', 'true');

      const result = validateMarketForm(formData);
      
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Test Market');
      expect(result?.city).toBe('Test City');
      expect(result?.address).toBe('Test Address');
      expect(result?.day_of_week).toBe(0);
      expect(result?.is_active).toBe(true);
    });

    it('should reject invalid market form data', () => {
      const formData = new FormData();
      formData.append('name', ''); // Empty name should fail
      
      const result = validateMarketForm(formData);
      
      expect(result).toBeNull();
    });

    it('should handle optional fields correctly', () => {
      const formData = new FormData();
      formData.append('name', 'Test Market');
      formData.append('start_date', '2025-07-01');
      formData.append('end_date', '2025-08-31');
      formData.append('day_of_week', '0');
      formData.append('start_time', '18:00');
      formData.append('end_time', '22:00');
      formData.append('city', 'Test City');
      formData.append('address', 'Test Address');
      // No description - should be undefined
      formData.append('hero_image_url', '');
      formData.append('image_url', '');

      const result = validateMarketForm(formData);
      
      expect(result).not.toBeNull();
      expect(result?.description).toBeUndefined();
      expect(result?.hero_image_url).toBeUndefined();
      expect(result?.image_url).toBeUndefined();
    });
  });

  describe('createMarket', () => {
    it('should require authentication', async () => {
      // Mock unauthenticated user
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null } })
        }
      };
      
      require('@/lib/supabase/server').createSupabaseServerClient = jest.fn().mockResolvedValue(mockSupabase);

      const formData = new FormData();
      const result = await createMarket(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Non authentifié');
    });

    it('should require admin role', async () => {
      // Mock authenticated non-admin user
      const mockUser = { id: 'user-123' };
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: mockUser } })
        }
      };
      
      require('@/lib/supabase/server').createSupabaseServerClient = jest.fn().mockResolvedValue(mockSupabase);
      require('@/lib/auth/admin-service').checkAdminRole = jest.fn().mockResolvedValue(false);

      const formData = new FormData();
      const result = await createMarket(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Accès non autorisé');
    });
  });

  describe('updateMarket', () => {
    it('should require authentication', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null } })
        }
      };
      
      require('@/lib/supabase/server').createSupabaseServerClient = jest.fn().mockResolvedValue(mockSupabase);

      const formData = new FormData();
      const result = await updateMarket('market-id', formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Non authentifié');
    });
  });

  describe('deleteMarket', () => {
    it('should require authentication', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null } })
        }
      };
      
      require('@/lib/supabase/server').createSupabaseServerClient = jest.fn().mockResolvedValue(mockSupabase);

      const result = await deleteMarket('market-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Non authentifié');
    });

    it('should validate market ID', async () => {
      const mockUser = { id: 'user-123' };
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: mockUser } })
        }
      };
      
      require('@/lib/supabase/server').createSupabaseServerClient = jest.fn().mockResolvedValue(mockSupabase);
      require('@/lib/auth/admin-service').checkAdminRole = jest.fn().mockResolvedValue(true);

      // Test with invalid ID
      const result = await deleteMarket('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('ID de marché invalide');
    });
  });
});