/**
 * Tests for Auth Actions
 */

import {
  loginAction,
  signUpAction,
  requestPasswordResetAction,
  updatePasswordAction,
  resendConfirmationEmailAction,
  logoutAction,
} from "../authActions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { migrateAndGetCart } from "@/actions/cartActions";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

// Mock dependencies
jest.mock("@/lib/supabase/server");
jest.mock("@/actions/cartActions");
jest.mock("next/navigation");
jest.mock("next-intl/server");
jest.mock("@/lib/core/logger", () => ({
  LogUtils: {
    createUserActionContext: jest.fn(() => ({ userId: "user-123" })),
    logOperationStart: jest.fn(),
    logOperationSuccess: jest.fn(),
    logOperationError: jest.fn(),
  },
}));

const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    resetPasswordForEmail: jest.fn(),
    updateUser: jest.fn(),
    resend: jest.fn(),
    signOut: jest.fn(),
  },
  from: jest.fn(() => mockSupabaseClient),
  insert: jest.fn(),
};

(createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabaseClient);
(getTranslations as jest.Mock).mockImplementation(() => Promise.resolve((key: string) => key));
(redirect as jest.Mock).mockImplementation(() => {
  throw new Error("NEXT_REDIRECT");
});
(migrateAndGetCart as jest.Mock).mockResolvedValue({ success: true });

// Mock FormData
const createFormData = (data: Record<string, string>): FormData => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });
  return formData;
};

describe("authActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_BASE_URL = "https://example.com";
  });

  describe("loginAction", () => {
    it("should login user successfully", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
      });
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        error: null,
      });

      const formData = createFormData({
        email: "test@example.com",
        password: "password123",
      });

      try {
        await loginAction(undefined, formData);
      } catch (error) {
        // Expected redirect
        expect(error).toEqual(new Error("NEXT_REDIRECT"));
      }

      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
      expect(redirect).toHaveBeenCalledWith("/fr/profile/account");
    });

    it("should handle login validation errors", async () => {
      const formData = createFormData({
        email: "invalid-email",
        password: "short",
      });

      const result = await loginAction(undefined, formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Données de connexion invalides");
    });

    it("should handle authentication errors", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
      });
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        error: { message: "Invalid login credentials" },
      });

      const formData = createFormData({
        email: "test@example.com",
        password: "wrongpassword",
      });

      const result = await loginAction(undefined, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Veuillez vous connecter pour continuer");
    });

    it("should migrate cart for guest users", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "guest-123", is_anonymous: true } },
      });
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        error: null,
      });

      const formData = createFormData({
        email: "test@example.com",
        password: "password123",
      });

      try {
        await loginAction(undefined, formData);
      } catch (error) {
        // Expected redirect
      }

      expect(migrateAndGetCart).toHaveBeenCalledWith({ guestUserId: "guest-123" });
    });
  });

  describe("signUpAction", () => {
    it("should signup user successfully", async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      });
      mockSupabaseClient.insert.mockResolvedValue({ error: null });

      const formData = createFormData({
        email: "test@example.com",
        password: "Password123!",
        confirmPassword: "Password123!",
        locale: "fr",
      });

      const result = await signUpAction(undefined, formData);

      expect(result.success).toBe(true);
      expect(result.message).toContain("Inscription réussie");
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "Password123!",
        options: {
          emailRedirectTo: "https://example.com/fr/auth/callback?type=signup&next=/fr/shop",
        },
      });
    });

    it("should handle signup validation errors", async () => {
      const formData = createFormData({
        email: "invalid-email",
        password: "short",
        confirmPassword: "different",
        locale: "fr",
      });

      const result = await signUpAction(undefined, formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Données d'inscription invalides");
    });

    it("should handle existing user error", async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        error: { message: "User already registered" },
      });

      const formData = createFormData({
        email: "existing@example.com",
        password: "password123",
        confirmPassword: "password123",
        locale: "fr",
      });

      const result = await signUpAction(undefined, formData);

      expect(result.success).toBe(false);
    });
  });

  describe("requestPasswordResetAction", () => {
    it("should send password reset email", async () => {
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        error: null,
      });

      const formData = createFormData({
        email: "test@example.com",
        locale: "fr",
      });

      const result = await requestPasswordResetAction(undefined, formData);

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        "test@example.com",
        { redirectTo: "https://example.com/fr/update-password" }
      );
    });

    it("should handle invalid email", async () => {
      const formData = createFormData({
        email: "invalid-email",
        locale: "fr",
      });

      const result = await requestPasswordResetAction(undefined, formData);

      expect(result.success).toBe(false);
    });
  });

  describe("updatePasswordAction", () => {
    it("should update password successfully", async () => {
      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        error: null,
      });

      const formData = createFormData({
        password: "NewPassword123!",
        confirmPassword: "NewPassword123!",
        locale: "fr",
      });

      const result = await updatePasswordAction(undefined, formData);

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({
        password: "NewPassword123!",
      });
    });

    it("should handle password validation errors", async () => {
      const formData = createFormData({
        password: "short",
        confirmPassword: "different",
        locale: "fr",
      });

      const result = await updatePasswordAction(undefined, formData);

      expect(result.success).toBe(false);
    });
  });

  describe("resendConfirmationEmailAction", () => {
    it("should resend confirmation email", async () => {
      mockSupabaseClient.auth.resend.mockResolvedValue({
        error: null,
      });

      const result = await resendConfirmationEmailAction("test@example.com");

      expect(result.success).toBe(true);
      expect(result.message).toContain("Email de confirmation renvoyé");
      expect(mockSupabaseClient.auth.resend).toHaveBeenCalledWith({
        type: "signup",
        email: "test@example.com",
      });
    });

    it("should handle resend errors", async () => {
      mockSupabaseClient.auth.resend.mockResolvedValue({
        error: { message: "Error sending email" },
      });

      const result = await resendConfirmationEmailAction("test@example.com");

      expect(result.success).toBe(false);
    });
  });

  describe("logoutAction", () => {
    it("should logout successfully", async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null,
      });

      try {
        await logoutAction();
      } catch (error) {
        // Expected redirect
        expect(error).toEqual(new Error("NEXT_REDIRECT"));
      }

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
      expect(redirect).toHaveBeenCalledWith("/?logged_out=true");
    });

    it("should handle logout errors", async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: { message: "Logout failed" },
      });

      try {
        await logoutAction();
      } catch (error) {
        // Expected redirect
        expect(error).toEqual(new Error("NEXT_REDIRECT"));
      }

      expect(redirect).toHaveBeenCalledWith("/?logout_error=true&message=Logout%20failed");
    });
  });
});
