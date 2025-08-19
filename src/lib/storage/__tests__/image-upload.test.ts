/**
 * Tests pour image-upload - Service critique de gestion des images
 */

import {
  uploadProductImageCore,
  uploadMagazineImageCore,
  validateImageFile,
  generateImageFileName,
} from '../image-upload';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Mock des dépendances
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/auth/admin-service', () => ({
  checkUserPermission: jest.fn(),
}));

const mockSupabaseClient = {
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(),
      remove: jest.fn(),
      getPublicUrl: jest.fn(),
    })),
  },
};

(createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabaseClient);

describe('Image Upload Service', () => {
  const mockFile = new File(['test content'], 'test-image.jpg', {
    type: 'image/jpeg',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const { checkUserPermission } = require('@/lib/auth/admin-service');
    checkUserPermission.mockResolvedValue(true);
  });

  describe('File Validation', () => {
    it('should validate supported image formats', () => {
      // Arrange
      const validFormats = [
        new File([''], 'test.jpg', { type: 'image/jpeg' }),
        new File([''], 'test.png', { type: 'image/png' }),
        new File([''], 'test.webp', { type: 'image/webp' }),
        new File([''], 'test.gif', { type: 'image/gif' }),
      ];

      // Act & Assert
      validFormats.forEach(file => {
        expect(validateImageFile(file).isValid).toBe(true);
      });
    });

    it('should reject unsupported formats', () => {
      // Arrange
      const invalidFormats = [
        new File([''], 'test.bmp', { type: 'image/bmp' }),
        new File([''], 'test.tiff', { type: 'image/tiff' }),
        new File([''], 'test.txt', { type: 'text/plain' }),
        new File([''], 'test.pdf', { type: 'application/pdf' }),
      ];

      // Act & Assert
      invalidFormats.forEach(file => {
        expect(validateImageFile(file).isValid).toBe(false);
      });
    });

    it('should validate file size limits', () => {
      // Arrange
      const validSize = new File(['x'.repeat(1024 * 1024)], 'small.jpg', { type: 'image/jpeg' }); // 1MB
      const oversizedFile = new File(['x'.repeat(5 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' }); // 5MB

      // Act & Assert
      expect(validateImageFile(validSize).isValid).toBe(true);
      expect(validateImageFile(oversizedFile).isValid).toBe(false);
      expect(validateImageFile(oversizedFile).error).toContain('4MB');
    });

    it('should handle empty files', () => {
      // Arrange
      const emptyFile = new File([''], 'empty.jpg', { type: 'image/jpeg' });

      // Act
      const result = validateImageFile(emptyFile);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('empty');
    });
  });

  describe('File Name Generation', () => {
    it('should generate sanitized file names', () => {
      // Arrange
      const dirtyFileName = 'My Ũser Photo (2024)!@#$.jpg';

      // Act
      const result = generateImageFileName(dirtyFileName, 'user123');

      // Assert
      expect(result).toMatch(/^user123-my-user-photo-2024-\d+\.jpg$/);
      expect(result).not.toContain(' ');
      expect(result).not.toContain('(');
      expect(result).not.toContain('!');
    });

    it('should handle special characters', () => {
      // Arrange
      const specialChars = 'éàç_file-name.jpg';

      // Act
      const result = generateImageFileName(specialChars, 'test');

      // Assert
      expect(result).toMatch(/^test-eac-file-name-\d+\.jpg$/);
    });

    it('should preserve file extensions', () => {
      // Arrange
      const extensions = ['test.jpg', 'test.PNG', 'test.webP', 'test.GIF'];

      // Act & Assert
      extensions.forEach(fileName => {
        const result = generateImageFileName(fileName, 'user');
        const expectedExt = fileName.split('.').pop()?.toLowerCase();
        expect(result).toMatch(new RegExp(`\\.${expectedExt}$`));
      });
    });

    it('should handle long file names', () => {
      // Arrange
      const longName = 'a'.repeat(100) + '.jpg';

      // Act
      const result = generateImageFileName(longName, 'user');

      // Assert
      expect(result.length).toBeLessThan(150); // Should be truncated reasonably
    });
  });

  describe('Product Image Upload', () => {
    it('should upload product image successfully', async () => {
      // Arrange
      mockSupabaseClient.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: { path: 'products/test-image-123.jpg' },
          error: null,
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/image.jpg' },
        }),
      });

      // Act
      const result = await uploadProductImageCore(mockFile, 'user-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.publicUrl).toBeTruthy();
      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('products');
    });

    it('should require products:update permission', async () => {
      // Arrange
      const { checkUserPermission } = require('@/lib/auth/admin-service');
      checkUserPermission.mockResolvedValue(false);

      // Act
      const result = await uploadProductImageCore(mockFile, 'user-123');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');
    });

    it('should handle storage errors', async () => {
      // Arrange
      mockSupabaseClient.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Storage quota exceeded' },
        }),
      });

      // Act
      const result = await uploadProductImageCore(mockFile, 'user-123');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Storage quota exceeded');
    });
  });

  describe('Magazine Image Upload', () => {
    it('should upload magazine image successfully', async () => {
      // Arrange
      mockSupabaseClient.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: { path: 'magazine/article-image-456.jpg' },
          error: null,
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/magazine.jpg' },
        }),
      });

      // Act
      const result = await uploadMagazineImageCore(mockFile, 'editor-456');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.publicUrl).toBeTruthy();
      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('magazine');
    });

    it('should require content:create permission', async () => {
      // Arrange
      const { checkUserPermission } = require('@/lib/auth/admin-service');
      checkUserPermission.mockResolvedValue(false);

      // Act
      const result = await uploadMagazineImageCore(mockFile, 'user-456');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      // Arrange
      mockSupabaseClient.storage.from.mockImplementation(() => {
        throw new Error('Network error');
      });

      // Act
      const result = await uploadProductImageCore(mockFile, 'user-123');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should handle invalid user ID', async () => {
      // Act
      const result = await uploadProductImageCore(mockFile, '');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('user');
    });

    it('should handle corrupted file uploads', async () => {
      // Arrange
      mockSupabaseClient.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'File appears to be corrupted' },
        }),
      });

      // Act
      const result = await uploadProductImageCore(mockFile, 'user-123');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('corrupted');
    });
  });

  describe('Edge Cases', () => {
    it('should handle files with no extension', () => {
      // Arrange
      const noExtFile = new File(['content'], 'filename_no_extension', {
        type: 'image/jpeg',
      });

      // Act
      const result = validateImageFile(noExtFile);

      // Assert
      expect(result.isValid).toBe(true); // Should rely on MIME type
    });

    it('should handle files with misleading extensions', () => {
      // Arrange
      const misleadingFile = new File(['content'], 'image.jpg', {
        type: 'text/plain', // Wrong MIME type
      });

      // Act
      const result = validateImageFile(misleadingFile);

      // Assert
      expect(result.isValid).toBe(false); // Should validate MIME type
    });

    it('should handle very small valid files', () => {
      // Arrange
      const tinyFile = new File(['x'], 'tiny.jpg', { type: 'image/jpeg' });

      // Act
      const result = validateImageFile(tinyFile);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should handle concurrent uploads', async () => {
      // Arrange
      mockSupabaseClient.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: { path: 'concurrent-upload.jpg' },
          error: null,
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/concurrent.jpg' },
        }),
      });

      // Act - Multiple concurrent uploads
      const uploads = [
        uploadProductImageCore(mockFile, 'user-1'),
        uploadProductImageCore(mockFile, 'user-2'),
        uploadProductImageCore(mockFile, 'user-3'),
      ];

      const results = await Promise.all(uploads);

      // Assert
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });
});