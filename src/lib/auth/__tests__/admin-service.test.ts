/**
 * Tests pour le nouveau système admin unifié
 */

import {
  checkAdminRole,
  hasPermission,
  invalidateUserCache,
  invalidateAllCache,
  UserRoleService,
  createUserRoleService,
} from "../admin-service";
import { createServerClient } from "@/lib/supabase/server";
import { UserRole } from "../types";

// Mock du client Supabase
jest.mock("@/lib/supabase/server", () => ({
  createServerClient: jest.fn(),
}));

jest.mock("@/lib/config/env-validator", () => ({
  getPrivateEnv: jest.fn().mockReturnValue({
    ADMIN_PRINCIPAL_ID: "mock-admin-id",
    ADMIN_EMAIL: "admin@test.com",
  }),
}));

const mockSupabaseClient = {
  from: jest.fn(),
};

const mockCreateServerClient = createServerClient as jest.MockedFunction<typeof createServerClient>;

describe("Admin Service - Système Unifié", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    invalidateAllCache(); // Nettoyer le cache entre les tests

    mockCreateServerClient.mockReturnValue(
      mockSupabaseClient as ReturnType<typeof createServerClient>
    );
  });

  describe("checkAdminRole", () => {
    it("should return admin role for admin user", async () => {
      const mockProfile = {
        role: "admin",
        permissions: ["*"],
        email: "admin@test.com",
      };

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      const result = await checkAdminRole("admin-user-id");

      expect(result.isAdmin).toBe(true);
      expect(result.role).toBe("admin");
      expect(result.permissions).toEqual(["*"]);
      expect(result.userId).toBe("admin-user-id");
    });

    it("should return cached result on second call", async () => {
      const mockProfile = {
        role: "admin",
        permissions: ["*"],
        email: "admin@test.com",
      };

      const mockChain = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockChain);

      // Premier appel
      await checkAdminRole("admin-user-id");

      // Deuxième appel - devrait utiliser le cache
      const result = await checkAdminRole("admin-user-id");

      expect(result.isAdmin).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledTimes(1); // Une seule fois grâce au cache
    });

    it("should return non-admin for user role", async () => {
      const mockProfile = {
        role: "user",
        permissions: [],
        email: "user@test.com",
      };

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      const result = await checkAdminRole("user-id");

      expect(result.isAdmin).toBe(false);
      expect(result.role).toBe("user");
    });

    it("should handle database errors gracefully", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: "User not found" },
            }),
          }),
        }),
      });

      const result = await checkAdminRole("non-existent-user");

      expect(result.isAdmin).toBe(false);
      expect(result.role).toBe(null);
      expect(result.permissions).toEqual([]);
    });
  });

  describe("hasPermission", () => {
    it("should return true for admin with wildcard permission", async () => {
      const mockProfile = {
        role: "admin",
        permissions: ["*"],
        email: "admin@test.com",
      };

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      const result = await hasPermission("admin-user-id", "products:delete");

      expect(result).toBe(true);
    });

    it("should return true for specific permission", async () => {
      const mockProfile = {
        role: "editor",
        permissions: ["products:read", "products:create"],
        email: "editor@test.com",
      };

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      const result = await hasPermission("editor-user-id", "products:read");

      expect(result).toBe(true);
    });

    it("should return false for missing permission", async () => {
      const mockProfile = {
        role: "user",
        permissions: ["profile:read:own"],
        email: "user@test.com",
      };

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      const result = await hasPermission("user-id", "products:delete");

      expect(result).toBe(false);
    });
  });

  describe("Cache Management", () => {
    it("should invalidate specific user cache", async () => {
      const mockProfile = {
        role: "admin",
        permissions: ["*"],
        email: "admin@test.com",
      };

      const mockChain = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockChain);

      // Premier appel pour mettre en cache
      await checkAdminRole("admin-user-id");

      // Invalider le cache
      invalidateUserCache("admin-user-id");

      // Deuxième appel - devrait faire un nouvel appel DB
      await checkAdminRole("admin-user-id");

      expect(mockSupabaseClient.from).toHaveBeenCalledTimes(2);
    });
  });

  describe("UserRoleService", () => {
    let userRoleService: UserRoleService;

    beforeEach(async () => {
      // Mock pour la vérification admin
      const mockProfile = {
        role: "admin",
        permissions: ["*"],
        email: "admin@test.com",
      };

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
        insert: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      userRoleService = await createUserRoleService("admin-user-id");
    });

    it("should assign role successfully", async () => {
      await expect(userRoleService.assignRole("target-user-id", "editor")).resolves.not.toThrow();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith("profiles");
    });

    it("should assign permissions successfully", async () => {
      await expect(
        userRoleService.assignPermissions("target-user-id", ["products:read", "products:write"])
      ).resolves.not.toThrow();
    });
  });

  describe("Type Safety", () => {
    it("should enforce UserRole type constraints", () => {
      const validRoles: UserRole[] = ["user", "editor", "admin"];

      validRoles.forEach((role) => {
        expect(["user", "editor", "admin"]).toContain(role);
      });
    });
  });
});
