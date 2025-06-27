import { hasPermission, hasRole } from '../utils';
import { AppRole, AppPermission, permissionsByRole } from '@/config/permissions';

// Mock the permissions config to isolate the test
jest.mock('@/config/permissions', () => ({
  __esModule: true,
  permissionsByRole: {
    user: ['orders:read:own', 'profile:update:own'],
    editor: ['user', 'products:read', 'products:update', 'orders:read'],
    admin: ['editor', 'products:create', 'products:delete', 'users:read', 'users:update:role', 'orders:read:all'],
    dev: ['admin'],
  },
}));

describe('hasRole', () => {
  // Basic checks
  test('should return true for a direct role match', () => {
    expect(hasRole('admin', 'admin')).toBe(true);
  });

  test('should return false for a non-matching role', () => {
    expect(hasRole('user', 'admin')).toBe(false);
  });

  test('should handle undefined user role gracefully', () => {
    expect(hasRole(undefined, 'admin')).toBe(false);
  });

  // Inheritance checks
  test('dev should have admin role', () => {
    expect(hasRole('dev', 'admin')).toBe(true);
  });

  test('dev should have editor role through admin', () => {
    expect(hasRole('dev', 'editor')).toBe(true);
  });

  test('dev should have user role through admin and editor', () => {
    expect(hasRole('dev', 'user')).toBe(true);
  });

  test('admin should have editor role', () => {
    expect(hasRole('admin', 'editor')).toBe(true);
  });

  test('admin should have user role through editor', () => {
    expect(hasRole('admin', 'user')).toBe(true);
  });

  test('editor should have user role', () => {
    expect(hasRole('editor', 'user')).toBe(true);
  });

  // Negative inheritance checks
  test('user should not have admin role', () => {
    expect(hasRole('user', 'admin')).toBe(false);
  });

  test('admin should not have dev role', () => {
    expect(hasRole('admin', 'dev')).toBe(false);
  });
});

describe('hasPermission', () => {
  // Test cases for the 'user' role
  test('user should have permission to read their own orders', () => {
    expect(hasPermission('user', 'orders:read:own')).toBe(true);
  });

  test('user should not have permission to read all orders', () => {
    expect(hasPermission('user', 'orders:read')).toBe(false);
  });

  // Test cases for the 'editor' role
  test('editor should have permission to update products', () => {
    expect(hasPermission('editor', 'products:update')).toBe(true);
  });

  test('editor should inherit user permissions', () => {
    expect(hasPermission('editor', 'profile:update:own')).toBe(true);
  });

  test('editor should not have permission to delete products', () => {
    expect(hasPermission('editor', 'products:delete')).toBe(false);
  });

  // Test cases for the 'admin' role
  test('admin should have permission to create products', () => {
    expect(hasPermission('admin', 'products:create')).toBe(true);
  });

  test('admin should inherit editor and user permissions', () => {
    expect(hasPermission('admin', 'products:update')).toBe(true);
    expect(hasPermission('admin', 'profile:update:own')).toBe(true);
  });

  test('admin should have permission to read all orders', () => {
    expect(hasPermission('admin', 'orders:read:all')).toBe(true);
  });

  // Test cases for the 'dev' role
  test('dev should have all admin permissions', () => {
    expect(hasPermission('dev', 'users:update:role')).toBe(true);
    expect(hasPermission('dev', 'products:delete')).toBe(true);
  });

  // Test wildcard permissions
  test('admin should have wildcard permission for products', () => {
    // Let's adjust the mock for this specific test
    require('@/config/permissions').permissionsByRole.admin = ['editor', 'products:*'];
    expect(hasPermission('admin', 'products:create')).toBe(true);
    expect(hasPermission('admin', 'products:read')).toBe(true);
    expect(hasPermission('admin', 'products:customAction')).toBe(true);
    // Reset mock after test
    require('@/config/permissions').permissionsByRole.admin = ['editor', 'products:create', 'products:delete', 'users:read', 'users:update:role', 'orders:read:all'];
  });

  // Edge cases
  test('should return false for an unknown role', () => {
    expect(hasPermission('guest' as AppRole, 'products:read')).toBe(false);
  });

  test('should return false for an unknown permission', () => {
    expect(hasPermission('admin', 'unknown:permission' as AppPermission)).toBe(false);
  });

  test('should return false for a null or undefined role', () => {
    expect(hasPermission(null as any, 'products:read')).toBe(false);
    expect(hasPermission(undefined as any, 'products:read')).toBe(false);
  });

  it('should return true if the user\'s role has the required permission', () => {
    const userRole: AppRole = 'admin';
    const requiredPermission: AppPermission = 'orders:read:all';
    expect(hasPermission(userRole, requiredPermission)).toBe(true);
  });
});
