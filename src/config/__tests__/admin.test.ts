/**
 * Tests pour la configuration admin obsolète - Migration critique
 */

import { ADMIN_CONFIG, isAuthorizedAdmin } from '../admin';

// Mock des variables d'environnement
const originalEnv = process.env;

describe('Deprecated Admin Configuration', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('ADMIN_CONFIG', () => {
    it('should use environment variables correctly', () => {
      // Arrange
      process.env.ADMIN_PRINCIPAL_ID = 'test-admin-id';
      process.env.ADMIN_EMAIL = 'test@admin.com';

      // Act
      const config = require('../admin').ADMIN_CONFIG;

      // Assert
      expect(config.ADMIN_PRINCIPAL_ID).toBe('test-admin-id');
      expect(config.ADMIN_EMAIL).toBe('test@admin.com');
      expect(config.CHECK_INTERVAL).toBe(2 * 60 * 1000); // 2 minutes
    });

    it('should fallback to default email when not provided', () => {
      // Arrange
      delete process.env.ADMIN_EMAIL;

      // Act
      const config = require('../admin').ADMIN_CONFIG;

      // Assert
      expect(config.ADMIN_EMAIL).toBe('admin@example.com');
    });

    it('should handle missing ADMIN_PRINCIPAL_ID', () => {
      // Arrange
      delete process.env.ADMIN_PRINCIPAL_ID;

      // Act
      const config = require('../admin').ADMIN_CONFIG;

      // Assert
      expect(config.ADMIN_PRINCIPAL_ID).toBeUndefined();
    });
  });

  describe('isAuthorizedAdmin (deprecated)', () => {
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      // Spy on console.error to verify error logging
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it('should return true for authorized admin', () => {
      // Arrange
      const originalValue = process.env.ADMIN_PRINCIPAL_ID;
      process.env.ADMIN_PRINCIPAL_ID = 'authorized-admin-123';

      // Act
      // Re-require to get updated environment
      jest.resetModules();
      const { isAuthorizedAdmin: testFunction } = require('../admin');
      const result = testFunction('authorized-admin-123');

      // Assert
      expect(result).toBe(true);

      // Cleanup
      process.env.ADMIN_PRINCIPAL_ID = originalValue;
    });

    it('should return false for unauthorized user', () => {
      // Arrange
      const originalValue = process.env.ADMIN_PRINCIPAL_ID;
      process.env.ADMIN_PRINCIPAL_ID = 'authorized-admin-123';

      // Act
      jest.resetModules();
      const { isAuthorizedAdmin: testFunction } = require('../admin');
      const result = testFunction('unauthorized-user-456');

      // Assert
      expect(result).toBe(false);

      // Cleanup
      process.env.ADMIN_PRINCIPAL_ID = originalValue;
    });

    it('should return false and log error when ADMIN_PRINCIPAL_ID is missing', () => {
      // Arrange
      const originalValue = process.env.ADMIN_PRINCIPAL_ID;
      delete process.env.ADMIN_PRINCIPAL_ID;

      // Act
      jest.resetModules();
      const { isAuthorizedAdmin: testFunction } = require('../admin');
      const result = testFunction('any-user-id');

      // Assert
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('ADMIN_PRINCIPAL_ID non configuré !');

      // Cleanup
      process.env.ADMIN_PRINCIPAL_ID = originalValue;
    });

    it('should handle empty string userId', () => {
      // Arrange
      const originalValue = process.env.ADMIN_PRINCIPAL_ID;
      process.env.ADMIN_PRINCIPAL_ID = 'admin-123';

      // Act
      jest.resetModules();
      const { isAuthorizedAdmin: testFunction } = require('../admin');
      const result = testFunction('');

      // Assert
      expect(result).toBe(false);

      // Cleanup
      process.env.ADMIN_PRINCIPAL_ID = originalValue;
    });

    it('should handle null/undefined ADMIN_PRINCIPAL_ID gracefully', () => {
      // Arrange
      const originalValue = process.env.ADMIN_PRINCIPAL_ID;
      process.env.ADMIN_PRINCIPAL_ID = '';

      // Act
      jest.resetModules();
      const { isAuthorizedAdmin: testFunction } = require('../admin');
      const result = testFunction('admin-123');

      // Assert
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('ADMIN_PRINCIPAL_ID non configuré !');

      // Cleanup
      process.env.ADMIN_PRINCIPAL_ID = originalValue;
    });
  });

  describe('Configuration Constants', () => {
    it('should have reasonable check interval', () => {
      // Act & Assert
      expect(ADMIN_CONFIG.CHECK_INTERVAL).toBe(2 * 60 * 1000);
      expect(ADMIN_CONFIG.CHECK_INTERVAL).toBeGreaterThan(30 * 1000); // At least 30 seconds
      expect(ADMIN_CONFIG.CHECK_INTERVAL).toBeLessThan(10 * 60 * 1000); // Less than 10 minutes
    });

    it('should be marked as const (readonly)', () => {
      // Act & Assert - TypeScript enforces readonly at compile time
      // At runtime, we can check if the object is properly configured
      expect(ADMIN_CONFIG.CHECK_INTERVAL).toBe(2 * 60 * 1000);
      expect(typeof ADMIN_CONFIG.CHECK_INTERVAL).toBe('number');
      
      // Verify object structure is as expected for const assertion
      expect(Object.keys(ADMIN_CONFIG)).toContain('CHECK_INTERVAL');
      expect(Object.keys(ADMIN_CONFIG)).toContain('ADMIN_EMAIL');
    });
  });

  describe('Migration Warnings', () => {
    it('should indicate deprecated status in JSDoc', () => {
      // Act - Read the source file to check for deprecation warnings
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, '..', 'admin.ts');
      const fileContent = fs.readFileSync(filePath, 'utf-8');

      // Assert
      expect(fileContent).toContain('@deprecated');
      expect(fileContent).toContain('système basé sur les rôles en base de données');
      expect(fileContent).toContain('@/lib/auth/admin-service');
    });
  });
});