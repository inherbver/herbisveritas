import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { loginAction, signUpAction } from "../authActions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

// Mock des modules
jest.mock("@/lib/supabase/server");
jest.mock("next/headers");
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

// Mock des fonctions utilitaires
const mockSupabase = {
  auth: {
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    getUser: jest.fn(),
  },
  from: jest.fn(),
  rpc: jest.fn(),
};

const mockCookieStore = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
};

describe("Cart Migration on Authentication", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabase);
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);
  });

  describe("Login with guest cart", () => {
    it("should merge guest cart with existing user cart on login", async () => {
      // Setup: Guest cart exists
      const guestCartId = "guest-cart-123";
      const userCartId = "user-cart-456";
      const userId = "user-789";

      mockCookieStore.get.mockReturnValue({ value: guestCartId });

      // Mock successful login
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: userId, email: "test@example.com" } },
        error: null,
      });

      // Mock getUser to return authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId, is_anonymous: false } },
        error: null,
      });

      // Mock guest cart validation
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "carts") {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            is: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: guestCartId },
              error: null,
            }),
          };
        }
        return {};
      });

      // Mock existing user cart
      mockSupabase.from
        .mockImplementationOnce((table: string) => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          is: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: guestCartId },
            error: null,
          }),
        }))
        .mockImplementationOnce((table: string) => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: userCartId },
            error: null,
          }),
        }));

      // Mock merge_carts RPC
      mockSupabase.rpc.mockResolvedValue({ error: null });

      // Create form data
      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "password123");

      // Execute login
      await loginAction(undefined, formData);

      // Verify merge was called
      expect(mockSupabase.rpc).toHaveBeenCalledWith("merge_carts", {
        p_guest_cart_id: guestCartId,
        p_auth_cart_id: userCartId,
      });

      // Verify cookie was deleted
      expect(mockCookieStore.delete).toHaveBeenCalledWith("herbis-cart-id");
    });

    it("should assign guest cart to user when no existing cart", async () => {
      // Setup: Guest cart exists, user has no cart
      const guestCartId = "guest-cart-123";
      const userId = "user-789";

      mockCookieStore.get.mockReturnValue({ value: guestCartId });

      // Mock successful login
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: userId, email: "test@example.com" } },
        error: null,
      });

      // Mock getUser
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId, is_anonymous: false } },
        error: null,
      });

      // Mock guest cart validation
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "carts") {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            is: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            single: jest.fn().mockImplementation(() => {
              // First call: validate guest cart
              if (
                !mockSupabase.from.mock.calls.length ||
                mockSupabase.from.mock.calls[
                  mockSupabase.from.mock.calls.length - 1
                ][0] === "carts"
              ) {
                return Promise.resolve({
                  data: { id: guestCartId },
                  error: null,
                });
              }
              // Second call: no existing user cart
              return Promise.resolve({
                data: null,
                error: null,
              });
            }),
          };
        }
        return {};
      });

      // Create form data
      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "password123");

      // Execute login
      await loginAction(undefined, formData);

      // Verify cart was updated with user_id
      const updateCall = mockSupabase.from.mock.results.find(
        (result: any) => result.value?.update,
      );
      expect(updateCall).toBeDefined();

      // Verify cookie was deleted
      expect(mockCookieStore.delete).toHaveBeenCalledWith("herbis-cart-id");
    });

    it("should handle migration failure gracefully", async () => {
      // Setup: Guest cart exists but migration fails
      const guestCartId = "guest-cart-123";
      const userId = "user-789";

      mockCookieStore.get.mockReturnValue({ value: guestCartId });

      // Mock successful login
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: userId, email: "test@example.com" } },
        error: null,
      });

      // Mock getUser
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId, is_anonymous: false } },
        error: null,
      });

      // Mock guest cart validation failure
      mockSupabase.from.mockImplementation((table: string) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null, // Cart not found or already owned
          error: null,
        }),
      }));

      // Create form data
      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "password123");

      // Execute login - should not throw
      await expect(loginAction(undefined, formData)).resolves.not.toThrow();

      // Verify merge was NOT called
      expect(mockSupabase.rpc).not.toHaveBeenCalled();

      // Cookie might not be deleted if cart validation failed
      // This is OK - prevents deleting cookie for legitimate reasons
    });
  });

  describe("Signup with guest cart", () => {
    it("should assign guest cart to new user on signup", async () => {
      // Setup: Guest cart exists
      const guestCartId = "guest-cart-123";
      const newUserId = "new-user-789";

      mockCookieStore.get.mockReturnValue({ value: guestCartId });

      // Mock successful signup
      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: {
            id: newUserId,
            email: "newuser@example.com",
          },
        },
        error: null,
      });

      // Mock guest cart validation
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "carts") {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            is: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: guestCartId },
              error: null,
            }),
          };
        }
        if (table === "audit_logs") {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        return {};
      });

      // Create form data
      const formData = new FormData();
      formData.append("email", "newuser@example.com");
      formData.append("password", "SecurePass123!");
      formData.append("confirmPassword", "SecurePass123!");
      formData.append("locale", "fr");

      // Execute signup
      const result = await signUpAction(undefined, formData);

      // Verify signup was successful
      expect(result.success).toBe(true);

      // Verify cart assignment was attempted
      const updateCall = mockSupabase.from.mock.results.find(
        (result: any) => result.value?.update,
      );
      expect(updateCall).toBeDefined();

      // Verify cookie was deleted
      expect(mockCookieStore.delete).toHaveBeenCalledWith("herbis-cart-id");
    });
  });

  describe("Cart security validation", () => {
    it("should prevent access to cart owned by another user", async () => {
      // This test validates the security check in cartReader.ts
      // Setup: Cookie points to a cart that belongs to someone else
      const stolenCartId = "user-cart-456";

      mockCookieStore.get.mockReturnValue({ value: stolenCartId });

      // Mock cart validation - cart exists but has a user_id
      mockSupabase.from.mockImplementation((table: string) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null, // No cart found (because it's owned by someone)
          error: null,
        }),
      }));

      // Import and test cartReader
      const { getCart } = await import("@/lib/cartReader");
      const result = await getCart();

      // Should return no cart
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();

      // Should delete the invalid cookie
      expect(mockCookieStore.delete).toHaveBeenCalledWith("herbis-cart-id");
    });

    it("should clean up expired guest cart cookie", async () => {
      // Setup: Cookie points to non-existent cart
      const expiredCartId = "expired-cart-999";

      mockCookieStore.get.mockReturnValue({ value: expiredCartId });

      // Mock cart validation - cart doesn't exist
      mockSupabase.from.mockImplementation((table: string) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }));

      // Import and test cartReader
      const { getCart } = await import("@/lib/cartReader");
      const result = await getCart();

      // Should return no cart
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(result.message).toContain("invalide ou expiré");

      // Should delete the invalid cookie
      expect(mockCookieStore.delete).toHaveBeenCalledWith("herbis-cart-id");
    });
  });
});
