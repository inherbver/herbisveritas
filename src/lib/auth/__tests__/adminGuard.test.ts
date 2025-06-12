import { checkAdminAccess } from "../adminGuard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

jest.mock("@/lib/supabase/server");
const mockCreateSupabaseServerClient = createSupabaseServerClient as jest.Mock;

describe("checkAdminAccess", () => {
  let mockSupabase: {
    auth: { getUser: jest.Mock };
    from: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "info").mockImplementation(() => {});

    mockSupabase = {
      auth: { getUser: jest.fn() },
      from: jest.fn().mockReturnThis(), // Important pour chaîner .select().eq().single()
    };
    mockCreateSupabaseServerClient.mockResolvedValue(mockSupabase);
  });

  describe("Authentication Failures", () => {
    it("should deny access when auth.getUser fails", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Auth failed" },
      });

      const result = await checkAdminAccess();

      expect(result.isAuthorized).toBe(false);
      expect(result.error).toBe("Authentication failed");
      expect(console.warn).toHaveBeenCalledWith("[Security] Auth error: Auth failed");
    });

    it("should deny access when no user is authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await checkAdminAccess();

      expect(result.isAuthorized).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });
  });

  describe("Profile Failures", () => {
    const mockUser = { id: "user-123", email: "test@example.com" };

    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
    });

    it("should deny access when profile query fails", async () => {
      const mockQueryChaining = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        }),
      };
      mockSupabase.from.mockReturnValue(mockQueryChaining);

      const result = await checkAdminAccess();

      expect(result.isAuthorized).toBe(false);
      expect(result.error).toBe("Profile access failed");
      expect(console.warn).toHaveBeenCalledWith(
        "[Security] Profile query error for user user-123: Database error"
      );
    });

    it("should deny access when profile is not found", async () => {
      const mockQueryChaining = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
      mockSupabase.from.mockReturnValue(mockQueryChaining);

      const result = await checkAdminAccess();

      expect(result.isAuthorized).toBe(false);
      expect(result.error).toBe("Profile not found");
      expect(console.warn).toHaveBeenCalledWith("[Security] No profile found for user user-123");
    });
  });

  describe("Role Validation", () => {
    const mockUser = { id: "user-123", email: "test@example.com" };

    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
    });

    it("should deny access for invalid role", async () => {
      const mockQueryChaining = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: "hacker" }, // Role invalide
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValue(mockQueryChaining);

      const result = await checkAdminAccess();

      expect(result.isAuthorized).toBe(false);
      expect(result.error).toBe("Invalid role");
      expect(console.error).toHaveBeenCalledWith(
        '[Security] Invalid role detected: "hacker" for user user-123'
      );
    });

    it.each(["user", "editor", "dev"])('should deny access for role "%s"', async (role) => {
      const mockQueryChaining = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { role }, error: null }),
      };
      mockSupabase.from.mockReturnValue(mockQueryChaining);

      const result = await checkAdminAccess();

      expect(result.isAuthorized).toBe(false);
      expect(result.role).toBe(role);
      expect(result.error).toBe("Insufficient privileges");
      expect(console.warn).toHaveBeenCalledWith(
        `[Security] Access denied - role "${role}" for user user-123`
      );
    });

    it("should grant access for admin role", async () => {
      const mockQueryChaining = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: "admin" },
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValue(mockQueryChaining);

      const result = await checkAdminAccess();

      expect(result.isAuthorized).toBe(true);
      expect(result.user).toEqual(mockUser); // Utiliser toEqual pour comparer des objets
      expect(result.role).toBe("admin");
      expect(console.info).toHaveBeenCalledWith("[Security] Admin access granted to user user-123");
    });
  });

  describe("Error Handling", () => {
    it("should handle unexpected errors gracefully", async () => {
      // Simuler une erreur lors de la création du client Supabase
      mockCreateSupabaseServerClient.mockRejectedValue(new Error("Connection failed"));

      const result = await checkAdminAccess();

      expect(result.isAuthorized).toBe(false);
      expect(result.error).toBe("System error");
      expect(console.error).toHaveBeenCalledWith(
        "[Security] Unexpected error in admin check:",
        expect.any(Error)
      );
    });
  });
});
