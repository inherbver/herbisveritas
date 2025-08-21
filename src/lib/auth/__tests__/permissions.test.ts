/**
 * Tests critiques pour le système de permissions
 * PRIORITÉ: CRITIQUE - Sécurité et contrôle d'accès
 */

import {
  checkPermission,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} from "@/lib/auth/permissions";
import { UserFactory } from "@/test-utils/factories/UserFactory";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logSecurityEvent } from "@/lib/auth/admin-service";
import type { AppPermission } from "@/lib/auth/types";

// Mocks
jest.mock("@/lib/supabase/server");
jest.mock("@/lib/auth/admin-service");

describe("Permission System", () => {
  const mockSupabase = {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe("checkPermission", () => {
    it("should deny access for unauthenticated users", async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act
      const result = await checkPermission("products:create" as AppPermission);

      // Assert
      expect(result).toBe(false);
      expect(logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "permission_denied",
          details: expect.objectContaining({
            permission: "products:create",
            reason: "unauthenticated",
          }),
        }),
      );
    });

    it("should deny access for suspended accounts", async () => {
      // Arrange
      const user = UserFactory.authenticated();
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                role: "customer",
                status: "suspended",
                permissions: [],
              },
              error: null,
            }),
          }),
        }),
      });

      // Act
      const result = await checkPermission("orders:read:own" as AppPermission);

      // Assert
      expect(result).toBe(false);
      expect(logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "permission_denied",
          userId: user.user.id,
          details: expect.objectContaining({
            reason: "account_suspended",
          }),
        }),
      );
    });

    it("should allow super admin to access any permission", async () => {
      // Arrange
      const admin = UserFactory.admin();
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: admin.user },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                role: "super_admin",
                status: "active",
                permissions: ["*"],
              },
              error: null,
            }),
          }),
        }),
      });

      // Act
      const result = await checkPermission("users:delete" as AppPermission);

      // Assert
      expect(result).toBe(true);
      expect(logSecurityEvent).not.toHaveBeenCalled();
    });

    it("should check specific permissions for regular users", async () => {
      // Arrange
      const user = UserFactory.authenticated();
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: user.user },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                role: "customer",
                status: "active",
                permissions: ["orders:read:own", "orders:create"],
              },
              error: null,
            }),
          }),
        }),
      });

      // Act & Assert
      expect(await checkPermission("orders:read:own" as AppPermission)).toBe(
        true,
      );
      expect(await checkPermission("orders:read:all" as AppPermission)).toBe(
        false,
      );
      expect(await checkPermission("products:delete" as AppPermission)).toBe(
        false,
      );
    });

    it("should handle database errors gracefully", async () => {
      // Arrange
      const user = UserFactory.authenticated();
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: user.user },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: "Database connection failed" },
            }),
          }),
        }),
      });

      // Act
      const result = await checkPermission("orders:read:own" as AppPermission);

      // Assert
      expect(result).toBe(false);
      expect(logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "permission_check_error",
          details: expect.objectContaining({
            error: "Database connection failed",
          }),
        }),
      );
    });
  });

  describe("hasPermission", () => {
    it("should return true if user has the exact permission", () => {
      // Arrange
      const permissions: AppPermission[] = ["products:read", "products:create"];

      // Act & Assert
      expect(hasPermission(permissions, "products:read" as AppPermission)).toBe(
        true,
      );
      expect(
        hasPermission(permissions, "products:update" as AppPermission),
      ).toBe(false);
    });

    it("should handle wildcard permissions correctly", () => {
      // Arrange
      const permissions: AppPermission[] = ["products:*", "orders:read:*"];

      // Act & Assert
      expect(
        hasPermission(permissions, "products:create" as AppPermission),
      ).toBe(true);
      expect(
        hasPermission(permissions, "products:delete" as AppPermission),
      ).toBe(true);
      expect(
        hasPermission(permissions, "orders:read:own" as AppPermission),
      ).toBe(true);
      expect(
        hasPermission(permissions, "orders:read:all" as AppPermission),
      ).toBe(true);
      expect(hasPermission(permissions, "orders:create" as AppPermission)).toBe(
        false,
      );
    });

    it("should handle super admin wildcard", () => {
      // Arrange
      const permissions: AppPermission[] = ["*"];

      // Act & Assert
      expect(
        hasPermission(permissions, "any:permission:here" as AppPermission),
      ).toBe(true);
    });
  });

  describe("hasAnyPermission", () => {
    it("should return true if user has any of the required permissions", () => {
      // Arrange
      const userPermissions: AppPermission[] = [
        "products:read",
        "orders:read:own",
      ];
      const requiredPermissions: AppPermission[] = [
        "products:update",
        "orders:read:own",
      ];

      // Act & Assert
      expect(hasAnyPermission(userPermissions, requiredPermissions)).toBe(true);
    });

    it("should return false if user has none of the required permissions", () => {
      // Arrange
      const userPermissions: AppPermission[] = ["products:read"];
      const requiredPermissions: AppPermission[] = [
        "products:update",
        "products:delete",
      ];

      // Act & Assert
      expect(hasAnyPermission(userPermissions, requiredPermissions)).toBe(
        false,
      );
    });
  });

  describe("hasAllPermissions", () => {
    it("should return true only if user has all required permissions", () => {
      // Arrange
      const userPermissions: AppPermission[] = [
        "products:read",
        "products:create",
        "products:update",
      ];

      // Act & Assert
      expect(
        hasAllPermissions(userPermissions, [
          "products:read",
          "products:create",
        ]),
      ).toBe(true);
      expect(
        hasAllPermissions(userPermissions, [
          "products:read",
          "products:delete",
        ]),
      ).toBe(false);
    });

    it("should handle wildcards in all permissions check", () => {
      // Arrange
      const userPermissions: AppPermission[] = ["products:*"];

      // Act & Assert
      expect(
        hasAllPermissions(userPermissions, [
          "products:read",
          "products:create",
        ]),
      ).toBe(true);
    });
  });

  describe("Permission Hierarchy", () => {
    it("should respect role-based permission inheritance", async () => {
      // Test des différents rôles et leurs permissions implicites
      const rolePermissions = {
        customer: ["orders:read:own", "orders:create", "profile:*:own"],
        moderator: ["content:*", "comments:moderate"],
        admin: ["users:read:all", "users:update", "products:*", "orders:*"],
        super_admin: ["*"],
      };

      for (const [role, permissions] of Object.entries(rolePermissions)) {
        const user = UserFactory.authenticated();
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: user.user },
          error: null,
        });

        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  role,
                  status: "active",
                  permissions: permissions as AppPermission[],
                },
                error: null,
              }),
            }),
          }),
        });

        // Vérifier que les permissions du rôle sont correctement appliquées
        if (role === "super_admin") {
          expect(await checkPermission("any:permission" as AppPermission)).toBe(
            true,
          );
        } else if (role === "admin") {
          expect(
            await checkPermission("products:delete" as AppPermission),
          ).toBe(true);
          expect(await checkPermission("system:config" as AppPermission)).toBe(
            false,
          );
        } else if (role === "customer") {
          expect(
            await checkPermission("orders:read:own" as AppPermission),
          ).toBe(true);
          expect(
            await checkPermission("orders:read:all" as AppPermission),
          ).toBe(false);
        }
      }
    });
  });

  describe("Security Event Logging", () => {
    it("should log all permission denials with context", async () => {
      // Arrange
      const user = UserFactory.authenticated();
      const requestContext = {
        ip: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        path: "/api/admin/users",
        method: "DELETE",
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: user.user },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                role: "customer",
                status: "active",
                permissions: [],
              },
              error: null,
            }),
          }),
        }),
      });

      // Act
      await checkPermission("users:delete" as AppPermission, requestContext);

      // Assert
      expect(logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "permission_denied",
          userId: user.user.id,
          details: expect.objectContaining({
            permission: "users:delete",
            userRole: "customer",
            context: requestContext,
          }),
        }),
      );
    });

    it("should track permission escalation attempts", async () => {
      // Arrange
      const user = UserFactory.authenticated();
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: user.user },
        error: null,
      });

      // Simuler une tentative d'escalade de privilèges
      const maliciousPermissions = ["*", "system:*", "admin:*"];

      for (const permission of maliciousPermissions) {
        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  role: "customer",
                  status: "active",
                  permissions: [permission],
                },
                error: null,
              }),
            }),
          }),
        });

        // Act
        await checkPermission("system:config" as AppPermission);

        // Assert
        expect(logSecurityEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "privilege_escalation_attempt",
            severity: "CRITICAL",
            userId: user.user.id,
            details: expect.objectContaining({
              suspiciousPermission: permission,
            }),
          }),
        );
      }
    });
  });
});
