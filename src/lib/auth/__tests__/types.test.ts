/**
 * Tests pour les types et utilitaires centralisés
 */

import {
  UserRole,
  AppPermission,
  ROLE_PERMISSIONS,
  isAdminRole,
  hasAdminAccess,
  getPermissionsForRole,
  roleHasPermission,
  CACHE_TTL,
  EMERGENCY_ADMIN_CACHE_TTL,
} from "../types";

describe("Types Centralisés", () => {
  describe("isAdminRole", () => {
    it("should return true for admin role", () => {
      expect(isAdminRole("admin")).toBe(true);
    });

    it("should return false for non-admin roles", () => {
      expect(isAdminRole("user")).toBe(false);
      expect(isAdminRole("editor")).toBe(false);
      expect(isAdminRole(null)).toBe(false);
    });
  });

  describe("hasAdminAccess", () => {
    it("should return true for roles with admin access", () => {
      expect(hasAdminAccess("admin")).toBe(true);
      expect(hasAdminAccess("editor")).toBe(true);
    });

    it("should return false for roles without admin access", () => {
      expect(hasAdminAccess("user")).toBe(false);
      expect(hasAdminAccess(null)).toBe(false);
    });
  });

  describe("getPermissionsForRole", () => {
    it("should return correct permissions for user role", () => {
      const permissions = getPermissionsForRole("user");

      expect(permissions).toContain("orders:read:own");
      expect(permissions).toContain("profile:read:own");
      expect(permissions).toContain("profile:update:own");
      expect(permissions).toContain("content:read");
      expect(permissions).not.toContain("admin:access");
    });

    it("should return correct permissions for editor role", () => {
      const permissions = getPermissionsForRole("editor");

      expect(permissions).toContain("admin:access");
      expect(permissions).toContain("products:read");
      expect(permissions).toContain("products:create");
      expect(permissions).toContain("products:update");
      expect(permissions).not.toContain("users:delete");
    });

    it("should return correct permissions for admin role", () => {
      const permissions = getPermissionsForRole("admin");

      expect(permissions).toContain("admin:access");
      expect(permissions).toContain("users:read:all");
      expect(permissions).toContain("users:update:role");
      expect(permissions).toContain("products:delete");
      expect(permissions).toContain("settings:update");
    });
  });

  describe("roleHasPermission", () => {
    it("should return true for valid role-permission combinations", () => {
      expect(roleHasPermission("admin", "users:read:all")).toBe(true);
      expect(roleHasPermission("editor", "products:create")).toBe(true);
      expect(roleHasPermission("user", "profile:read:own")).toBe(true);
    });

    it("should return false for invalid role-permission combinations", () => {
      expect(roleHasPermission("user", "admin:access")).toBe(false);
      expect(roleHasPermission("editor", "users:delete")).toBe(false);
      expect(roleHasPermission("user", "products:delete")).toBe(false);
    });
  });

  describe("ROLE_PERMISSIONS mapping", () => {
    it("should have all required roles defined", () => {
      const requiredRoles: UserRole[] = ["user", "editor", "admin"];

      requiredRoles.forEach((role) => {
        expect(ROLE_PERMISSIONS).toHaveProperty(role);
        expect(Array.isArray(ROLE_PERMISSIONS[role])).toBe(true);
      });
    });

    it("should ensure admin has more permissions than editor", () => {
      const adminPermissions = ROLE_PERMISSIONS.admin;
      const editorPermissions = ROLE_PERMISSIONS.editor;

      expect(adminPermissions.length).toBeGreaterThan(editorPermissions.length);

      // Vérifier que l'admin a toutes les permissions de l'editor
      editorPermissions.forEach((permission) => {
        expect(adminPermissions).toContain(permission);
      });
    });

    it("should ensure editor has more permissions than user", () => {
      const editorPermissions = ROLE_PERMISSIONS.editor;
      const userPermissions = ROLE_PERMISSIONS.user;

      expect(editorPermissions.length).toBeGreaterThan(userPermissions.length);

      // Vérifier que l'editor a les permissions de base du user
      expect(editorPermissions).toContain("profile:read:own");
      expect(editorPermissions).toContain("content:read");
    });

    it("should ensure only admin has critical permissions", () => {
      const criticalPermissions: AppPermission[] = [
        "users:update:role",
        "users:manage",
        "settings:update",
      ];

      criticalPermissions.forEach((permission) => {
        expect(ROLE_PERMISSIONS.admin).toContain(permission);
        expect(ROLE_PERMISSIONS.editor).not.toContain(permission);
        expect(ROLE_PERMISSIONS.user).not.toContain(permission);
      });
    });
  });

  describe("Constants", () => {
    it("should have reasonable cache TTL values", () => {
      expect(CACHE_TTL).toBe(5 * 60 * 1000); // 5 minutes
      expect(EMERGENCY_ADMIN_CACHE_TTL).toBe(1 * 60 * 1000); // 1 minute
      expect(EMERGENCY_ADMIN_CACHE_TTL).toBeLessThan(CACHE_TTL);
    });
  });

  describe("Type Safety", () => {
    it("should enforce UserRole type constraints", () => {
      const validRoles: UserRole[] = ["user", "editor", "admin"];

      // Vérifier que tous les rôles sont valides
      validRoles.forEach((role) => {
        expect(typeof role).toBe("string");
        expect(["user", "editor", "admin"]).toContain(role);
      });
    });

    it("should enforce AppPermission format", () => {
      const samplePermissions: AppPermission[] = [
        "admin:access",
        "products:read",
        "users:update:role",
        "profile:read:own",
      ];

      samplePermissions.forEach((permission) => {
        expect(typeof permission).toBe("string");
        expect(permission).toMatch(/^[a-z]+:[a-z]+(:.*)?$|^\*$/);
      });
    });
  });

  describe("Permission Inheritance", () => {
    it("should ensure proper permission hierarchy", () => {
      // Les rôles de niveau supérieur doivent inclure les permissions des niveaux inférieurs
      const editorPerms = new Set(ROLE_PERMISSIONS.editor);
      const adminPerms = new Set(ROLE_PERMISSIONS.admin);

      // Vérifier que l'editor inclut les permissions de base
      expect(editorPerms.has("profile:read:own")).toBe(true);
      expect(editorPerms.has("content:read")).toBe(true);

      // Vérifier que l'admin inclut les permissions d'editor importantes
      expect(adminPerms.has("admin:access")).toBe(true);
      expect(adminPerms.has("products:read")).toBe(true);
      expect(adminPerms.has("content:create")).toBe(true);
    });
  });
});
