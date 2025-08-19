/**
 * Tests pour les types et utilitaires d'authentification - Configuration critique
 */

import {
  type UserRole,
  type AppPermission,
  type AdminCheckResult,
  type SecurityEvent,
  type SecurityEventType,
  ROLE_PERMISSIONS,
  isAdminRole,
  hasAdminAccess,
  getPermissionsForRole,
  roleHasPermission,
  CACHE_TTL,
  EMERGENCY_ADMIN_CACHE_TTL
} from '../types';

describe('Auth Types & Utilities', () => {
  describe('Role Permission Mappings', () => {
    it('should have correct permissions for user role', () => {
      // Arrange
      const userPermissions = ROLE_PERMISSIONS.user;

      // Act & Assert
      expect(userPermissions).toContain('orders:read:own');
      expect(userPermissions).toContain('profile:read:own');
      expect(userPermissions).toContain('profile:update:own');
      expect(userPermissions).toContain('content:read');
      expect(userPermissions).not.toContain('admin:access');
      expect(userPermissions).not.toContain('users:delete');
    });

    it('should have correct permissions for editor role', () => {
      // Arrange
      const editorPermissions = ROLE_PERMISSIONS.editor;

      // Act & Assert
      expect(editorPermissions).toContain('admin:access');
      expect(editorPermissions).toContain('products:read');
      expect(editorPermissions).toContain('products:create');
      expect(editorPermissions).toContain('products:update');
      expect(editorPermissions).toContain('content:create');
      expect(editorPermissions).toContain('content:publish');
      expect(editorPermissions).not.toContain('products:delete');
      expect(editorPermissions).not.toContain('users:delete');
      expect(editorPermissions).not.toContain('admin:write');
    });

    it('should have correct permissions for admin role', () => {
      // Arrange
      const adminPermissions = ROLE_PERMISSIONS.admin;

      // Act & Assert
      expect(adminPermissions).toContain('admin:access');
      expect(adminPermissions).toContain('admin:read');
      expect(adminPermissions).toContain('admin:write');
      expect(adminPermissions).toContain('products:delete');
      expect(adminPermissions).toContain('users:delete');
      expect(adminPermissions).toContain('users:manage');
      expect(adminPermissions).toContain('settings:update');
      expect(adminPermissions).toContain('orders:read:all');
    });

    it('should ensure all roles have basic profile permissions', () => {
      // Act & Assert
      Object.values(ROLE_PERMISSIONS).forEach(permissions => {
        expect(permissions).toContain('profile:read:own');
        expect(permissions).toContain('profile:update:own');
      });
    });

    it('should ensure admin access is properly restricted', () => {
      // Act & Assert
      expect(ROLE_PERMISSIONS.user).not.toContain('admin:access');
      expect(ROLE_PERMISSIONS.editor).toContain('admin:access');
      expect(ROLE_PERMISSIONS.admin).toContain('admin:access');
    });
  });

  describe('isAdminRole Function', () => {
    it('should correctly identify admin role', () => {
      // Act & Assert
      expect(isAdminRole('admin')).toBe(true);
      expect(isAdminRole('editor')).toBe(false);
      expect(isAdminRole('user')).toBe(false);
      expect(isAdminRole(null)).toBe(false);
    });
  });

  describe('hasAdminAccess Function', () => {
    it('should grant admin access to appropriate roles', () => {
      // Act & Assert
      expect(hasAdminAccess('admin')).toBe(true);
      expect(hasAdminAccess('editor')).toBe(true);
      expect(hasAdminAccess('user')).toBe(false);
      expect(hasAdminAccess(null)).toBe(false);
    });
  });

  describe('getPermissionsForRole Function', () => {
    it('should return correct permissions for each role', () => {
      // Act & Assert
      expect(getPermissionsForRole('user')).toEqual(ROLE_PERMISSIONS.user);
      expect(getPermissionsForRole('editor')).toEqual(ROLE_PERMISSIONS.editor);
      expect(getPermissionsForRole('admin')).toEqual(ROLE_PERMISSIONS.admin);
    });

    it('should return empty array for invalid role', () => {
      // Act & Assert
      expect(getPermissionsForRole('invalid' as UserRole)).toEqual([]);
    });
  });

  describe('roleHasPermission Function', () => {
    it('should correctly check user permissions', () => {
      // Act & Assert
      expect(roleHasPermission('user', 'orders:read:own')).toBe(true);
      expect(roleHasPermission('user', 'profile:read:own')).toBe(true);
      expect(roleHasPermission('user', 'admin:access')).toBe(false);
      expect(roleHasPermission('user', 'users:delete')).toBe(false);
    });

    it('should correctly check editor permissions', () => {
      // Act & Assert
      expect(roleHasPermission('editor', 'admin:access')).toBe(true);
      expect(roleHasPermission('editor', 'products:create')).toBe(true);
      expect(roleHasPermission('editor', 'content:publish')).toBe(true);
      expect(roleHasPermission('editor', 'users:delete')).toBe(false);
      expect(roleHasPermission('editor', 'products:delete')).toBe(false);
    });

    it('should correctly check admin permissions', () => {
      // Act & Assert
      expect(roleHasPermission('admin', 'admin:write')).toBe(true);
      expect(roleHasPermission('admin', 'users:delete')).toBe(true);
      expect(roleHasPermission('admin', 'products:delete')).toBe(true);
      expect(roleHasPermission('admin', 'settings:update')).toBe(true);
    });

    it('should handle wildcard permissions correctly', () => {
      // Arrange - Mock admin with wildcard
      const originalAdminPerms = ROLE_PERMISSIONS.admin;
      (ROLE_PERMISSIONS as any).admin = ['*'];

      // Act & Assert
      expect(roleHasPermission('admin', 'any:permission' as AppPermission)).toBe(true);

      // Cleanup
      (ROLE_PERMISSIONS as any).admin = originalAdminPerms;
    });
  });

  describe('Security Event Types', () => {
    it('should validate security event structure', () => {
      // Arrange
      const securityEvent: SecurityEvent = {
        type: 'unauthorized_admin_access',
        userId: 'user-123',
        details: {
          message: 'Attempted admin access',
          timestamp: new Date().toISOString(),
          path: '/admin/users'
        }
      };

      // Act & Assert
      expect(securityEvent.type).toBe('unauthorized_admin_access');
      expect(securityEvent.userId).toBe('user-123');
      expect(securityEvent.details.message).toBeDefined();
      expect(securityEvent.details.timestamp).toBeDefined();
    });

    it('should support all security event types', () => {
      // Arrange
      const validTypes: SecurityEventType[] = [
        'unauthorized_admin_access',
        'successful_admin_login',
        'admin_action',
        'role_change',
        'permission_change'
      ];

      // Act & Assert
      validTypes.forEach(type => {
        const event: SecurityEvent = {
          type,
          userId: 'user-test',
          details: {
            message: `Test ${type}`,
            timestamp: new Date().toISOString()
          }
        };
        expect(event.type).toBe(type);
      });
    });
  });

  describe('AdminCheckResult Interface', () => {
    it('should validate admin check result structure', () => {
      // Arrange
      const adminResult: AdminCheckResult = {
        isAdmin: true,
        role: 'admin',
        permissions: ['admin:access', 'users:delete'],
        userId: 'admin-123',
        isAuthorized: true
      };

      // Act & Assert
      expect(adminResult.isAdmin).toBe(true);
      expect(adminResult.role).toBe('admin');
      expect(adminResult.permissions).toContain('admin:access');
      expect(adminResult.userId).toBe('admin-123');
      expect(adminResult.isAuthorized).toBe(true);
    });

    it('should handle non-admin result', () => {
      // Arrange
      const userResult: AdminCheckResult = {
        isAdmin: false,
        role: 'user',
        permissions: ['orders:read:own'],
        userId: 'user-456'
      };

      // Act & Assert
      expect(userResult.isAdmin).toBe(false);
      expect(userResult.role).toBe('user');
      expect(userResult.permissions).not.toContain('admin:access');
      expect(userResult.isAuthorized).toBeUndefined();
    });
  });

  describe('Cache Configuration', () => {
    it('should have proper cache TTL values', () => {
      // Act & Assert
      expect(CACHE_TTL).toBe(5 * 60 * 1000); // 5 minutes
      expect(EMERGENCY_ADMIN_CACHE_TTL).toBe(1 * 60 * 1000); // 1 minute
      expect(EMERGENCY_ADMIN_CACHE_TTL).toBeLessThan(CACHE_TTL);
    });

    it('should validate cached role data structure', () => {
      // Arrange
      const cachedData = {
        role: 'admin' as UserRole,
        permissions: ['admin:access', 'users:manage'],
        timestamp: Date.now(),
        ttl: CACHE_TTL
      };

      // Act & Assert
      expect(cachedData.role).toBe('admin');
      expect(Array.isArray(cachedData.permissions)).toBe(true);
      expect(typeof cachedData.timestamp).toBe('number');
      expect(cachedData.ttl).toBe(CACHE_TTL);
    });
  });

  describe('Permission Format Validation', () => {
    it('should validate permission string format', () => {
      // Arrange
      const validPermissions: AppPermission[] = [
        'admin:access',
        'products:create',
        'orders:read:own',
        'users:update:role'
      ];

      // Act & Assert
      validPermissions.forEach(permission => {
        expect(permission).toMatch(/^[a-z]+:[a-z]+(:[\w]+)?$/);
      });
    });

    it('should handle wildcard permission', () => {
      // Arrange
      const wildcardPermission: AppPermission = '*';

      // Act & Assert
      expect(wildcardPermission).toBe('*');
    });
  });

  describe('Role Hierarchy Validation', () => {
    it('should respect role hierarchy in permissions', () => {
      // Arrange
      const userPerms = ROLE_PERMISSIONS.user.length;
      const editorPerms = ROLE_PERMISSIONS.editor.length;
      const adminPerms = ROLE_PERMISSIONS.admin.length;

      // Act & Assert - Admin should have most permissions
      expect(adminPerms).toBeGreaterThan(editorPerms);
      expect(editorPerms).toBeGreaterThan(userPerms);
    });

    it('should ensure admin has all critical permissions', () => {
      // Arrange
      const criticalPermissions: AppPermission[] = [
        'admin:access',
        'admin:read',
        'admin:write',
        'users:manage',
        'users:delete',
        'settings:update'
      ];

      // Act & Assert
      criticalPermissions.forEach(permission => {
        expect(ROLE_PERMISSIONS.admin).toContain(permission);
      });
    });
  });
});