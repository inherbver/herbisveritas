/**
 * Tests simplifiés pour image-upload - Service critique de gestion des images
 * Teste uniquement via les actions exportées
 */

import {
  uploadProductImageCore,
  uploadMagazineImageCore,
} from '../image-upload';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import { setupServerActionMocks } from '@/test-utils/server-action-mocks';
import { createMockSupabaseChain } from '@/test-utils/supabase-mock-helper';
// Mock des dépendances
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/auth/server-auth', () => ({
  checkUserPermission: jest.fn(),
}));
jest.mock('@/lib/auth/server-actions-auth', () => ({
  withPermissionSafe: jest.fn((permission, fn) => fn),
}));

// Mock FormData pour l'environnement serveur
class MockFormData {
  private data: Map<string, any> = new Map();
  
  append(key: string, value: any) {
    this.data.set(key, value);
  }
  
  get(key: string) {
    return this.data.get(key) || null;
  }
  
  set(key: string, value: any) {
    this.data.set(key, value);
  }
  
  has(key: string) {
    return this.data.has(key);
  }
  
  delete(key: string) {
    this.data.delete(key);
  }
  
  entries() {
    return this.data.entries();
  }
}

const mockSupabaseClient = {
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn().mockResolvedValue({ error: null }),
      remove: jest.fn(),
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/test.jpg' },
      }),
    })),
  },
};

(createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabaseClient);

// Setup des mocks standards pour Server Actions
setupServerActionMocks();

describe('Image Upload Service - Simplified', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { checkUserPermission } = require('@/lib/auth/server-auth');
    checkUserPermission.mockResolvedValue({ isAuthorized: true });
    
    // Override global FormData if needed
    if (!global.FormData || typeof global.FormData === 'undefined') {
      global.FormData = MockFormData as any;
    }
  });

  describe('uploadProductImageCore', () => {
    it('should upload product image with valid data', async () => {
      // Arrange
      const formData = new MockFormData() as any;
      formData.set('file', new File(['test'], 'test.jpg', { type: 'image/jpeg' }));
      formData.set('fileName', 'test-product-image');

      // Act
      const result = await uploadProductImageCore(formData);

      // Assert
      expect(result?.success ?? true).toBe(true);
      expect(result.data?.url).toBe('https://example.com/test.jpg');
      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('products');
    });

    it('should reject invalid file format', async () => {
      // Arrange
      const formData = new MockFormData() as any;
      formData.set('file', new File(['test'], 'test.txt', { type: 'text/plain' }));
      formData.set('fileName', 'test-file');

      // Act
      const result = await uploadProductImageCore(formData);

      // Assert
      expect(result?.success).toBe(false);
      expect(result.message).toContain('format');
    });

    it('should reject oversized files', async () => {
      // Arrange
      const largeContent = new Array(5 * 1024 * 1024).fill('x').join(''); // 5MB
      const formData = new MockFormData() as any;
      formData.set('file', new File([largeContent], 'large.jpg', { type: 'image/jpeg' }));
      formData.set('fileName', 'large-image');

      // Act
      const result = await uploadProductImageCore(formData);

      // Assert
      expect(result?.success).toBe(false);
      expect(result.message).toContain('4M');
    });

    it('should handle permission denied', async () => {
      // Arrange
      const { checkUserPermission } = require('@/lib/auth/server-auth');
      checkUserPermission.mockResolvedValue({ isAuthorized: false });

      const formData = new MockFormData() as any;
      formData.set('file', new File(['test'], 'test.jpg', { type: 'image/jpeg' }));
      formData.set('fileName', 'test-image');

      // Act
      const result = await uploadProductImageCore(formData);

      // Assert
      expect(result?.success).toBe(false);
      expect(result.message).toContain('Permission');
    });

    it('should handle Supabase upload errors', async () => {
      // Arrange
      mockSupabaseClient.storage.from().upload.mockResolvedValueOnce({
        error: { message: 'Storage error' },
      });

      const formData = new MockFormData() as any;
      formData.set('file', new File(['test'], 'test.jpg', { type: 'image/jpeg' }));
      formData.set('fileName', 'test-image');

      // Act
      const result = await uploadProductImageCore(formData);

      // Assert
      expect(result?.success).toBe(false);
      expect(result.message).toContain('Storage error');
    });
  });

  describe('uploadMagazineImageCore', () => {
    it('should upload magazine image to correct bucket', async () => {
      // Arrange
      const formData = new MockFormData() as any;
      formData.set('file', new File(['test'], 'magazine.jpg', { type: 'image/jpeg' }));
      formData.set('fileName', 'magazine-cover');

      // Act
      const result = await uploadMagazineImageCore(formData);

      // Assert
      expect(result?.success ?? true).toBe(true);
      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('magazine');
    });

    it('should sanitize file names with special characters', async () => {
      // Arrange
      const formData = new MockFormData() as any;
      formData.set('file', new File(['test'], 'Image (2024) @#$.jpg', { type: 'image/jpeg' }));
      formData.set('fileName', 'Image (2024) @#$');

      mockSupabaseClient.storage.from().upload.mockImplementation(async (path, _file) => {
        // Vérifier que le nom est sanitizé
        expect(path).not.toMatch(/[()@#$]/);
        expect(path).toMatch(/^[a-z0-9\-]+\.jpg$/);
        return { error: null };
      });

      // Act
      const result = await uploadMagazineImageCore(formData);

      // Assert
      expect(result?.success ?? true).toBe(true);
    });
  });

  describe('File validation edge cases', () => {
    it('should reject empty files', async () => {
      // Arrange
      const formData = new MockFormData() as any;
      formData.set('file', new File([], 'empty.jpg', { type: 'image/jpeg' }));
      formData.set('fileName', 'empty-image');

      // Act
      const result = await uploadProductImageCore(formData);

      // Assert
      expect(result?.success).toBe(false);
      expect(result.message).toContain('vide');
    });

    it('should handle missing fileName', async () => {
      // Arrange
      const formData = new MockFormData() as any;
      formData.set('file', new File(['test'], 'test.jpg', { type: 'image/jpeg' }));

      // Act
      const result = await uploadProductImageCore(formData);

      // Assert
      expect(result?.success).toBe(false);
      expect(result.errors?.fileName).toBeDefined();
    });

    it('should handle missing file', async () => {
      // Arrange
      const formData = new MockFormData() as any;
      formData.set('fileName', 'test-image');

      // Act
      const result = await uploadProductImageCore(formData);

      // Assert
      expect(result?.success).toBe(false);
      expect(result.errors?.file).toBeDefined();
    });
  });
});