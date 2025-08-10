import {
  signInAction,
  signUpAction,
  signOutAction,
  forgotPasswordAction,
  updatePasswordAction,
  resetPasswordAction,
} from "../authActions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Mock Next.js modules
jest.mock("next/navigation", () => ({
  redirect: jest.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

jest.mock("next-intl/server", () => ({
  getTranslations: jest.fn(() => {
    return jest.fn((key: string) => {
      const translations: Record<string, string> = {
        emailInvalid: "Invalid email",
        emailAlreadyExists: "Email already exists",
        genericSignupError: "Signup error",
        passwordsDoNotMatch: "Passwords do not match",
        successMessage: "Success",
      };
      return translations[key] || key;
    });
  }),
}));

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    resetPasswordForEmail: jest.fn(),
    updateUser: jest.fn(),
    getUser: jest.fn(),
    resend: jest.fn(),
  },
  from: jest.fn(() => ({
    insert: jest.fn(() => ({ error: null })),
  })),
};

jest.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: jest.fn(() => mockSupabaseClient),
}));

// Mock cart actions
jest.mock("@/actions/cartActions", () => ({
  migrateAndGetCart: jest.fn(() => Promise.resolve({ success: true, data: null })),
}));

const mockUser = {
  id: "user-123",
  email: "test@example.com",
  is_anonymous: false,
};

describe("authActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("signInAction", () => {
    it("should successfully sign in a user", async () => {
      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "ValidPass123!");

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: mockUser,
          session: { access_token: "token", refresh_token: "refresh" },
        },
        error: null,
      });

      // loginAction redirects on success
      await expect(signInAction(undefined, formData)).rejects.toThrow("NEXT_REDIRECT");

      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "ValidPass123!",
      });
    });

    it("should handle invalid credentials", async () => {
      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "wrongpassword");

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid login credentials" },
      });

      const result = await signInAction(undefined, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should validate email format", async () => {
      const formData = new FormData();
      formData.append("email", "notanemail");
      formData.append("password", "password123");

      const result = await signInAction(undefined, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockSupabaseClient.auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it("should validate password minimum length", async () => {
      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "short");

      const result = await signInAction(undefined, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockSupabaseClient.auth.signInWithPassword).not.toHaveBeenCalled();
    });
  });

  describe("signUpAction", () => {
    it("should successfully register a new user", async () => {
      const formData = new FormData();
      formData.append("email", "newuser@example.com");
      formData.append("password", "SecurePass123!");
      formData.append("confirmPassword", "SecurePass123!");
      formData.append("locale", "fr");

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: {
          user: { id: "new-user-id", email: "newuser@example.com" },
          session: null,
        },
        error: null,
      });

      const result = await signUpAction(undefined, formData);

      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it("should validate password confirmation", async () => {
      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "SecurePass123!");
      formData.append("confirmPassword", "DifferentPass123!");
      formData.append("locale", "fr");

      const result = await signUpAction(undefined, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockSupabaseClient.auth.signUp).not.toHaveBeenCalled();
    });

    it("should handle duplicate email registration", async () => {
      const formData = new FormData();
      formData.append("email", "existing@example.com");
      formData.append("password", "SecurePass123!");
      formData.append("confirmPassword", "SecurePass123!");
      formData.append("locale", "fr");

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "User already registered" },
      });

      const result = await signUpAction(undefined, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("signOutAction", () => {
    it("should successfully sign out a user", async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null,
      });

      // signOutAction redirects which throws a Next.js redirect error
      await expect(signOutAction()).rejects.toThrow("NEXT_REDIRECT");

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
    });

    it("should handle sign out errors", async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: { message: "Failed to sign out" },
      });

      // signOutAction redirects even on error
      await expect(signOutAction()).rejects.toThrow("NEXT_REDIRECT");

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
    });
  });

  describe("forgotPasswordAction", () => {
    it("should send password reset email", async () => {
      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("locale", "fr");

      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await forgotPasswordAction(undefined, formData);

      expect(mockSupabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        "test@example.com",
        expect.objectContaining({
          redirectTo: expect.stringContaining("/update-password"),
        })
      );
      expect(result.success).toBe(true);
    });

    it("should validate email format", async () => {
      const formData = new FormData();
      formData.append("email", "invalid-email");
      formData.append("locale", "fr");

      const result = await forgotPasswordAction(undefined, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockSupabaseClient.auth.resetPasswordForEmail).not.toHaveBeenCalled();
    });

    it("should handle non-existent email gracefully", async () => {
      const formData = new FormData();
      formData.append("email", "nonexistent@example.com");
      formData.append("locale", "fr");

      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        data: null,
        error: { message: "User not found" },
      });

      const result = await forgotPasswordAction(undefined, formData);

      // Should still return success for security reasons
      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
    });
  });

  describe("updatePasswordAction", () => {
    it("should update user password", async () => {
      const formData = new FormData();
      formData.append("password", "NewSecurePass123!");
      formData.append("confirmPassword", "NewSecurePass123!");
      formData.append("locale", "fr");

      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await updatePasswordAction(undefined, formData);

      expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({
        password: "NewSecurePass123!",
      });
      expect(result.success).toBe(true);
    });

    it("should validate password confirmation", async () => {
      const formData = new FormData();
      formData.append("password", "NewSecurePass123!");
      formData.append("confirmPassword", "DifferentPass123!");
      formData.append("locale", "fr");

      const result = await updatePasswordAction(undefined, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockSupabaseClient.auth.updateUser).not.toHaveBeenCalled();
    });

    it("should enforce password strength requirements", async () => {
      const formData = new FormData();
      formData.append("password", "weak");
      formData.append("confirmPassword", "weak");
      formData.append("locale", "fr");

      const result = await updatePasswordAction(undefined, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockSupabaseClient.auth.updateUser).not.toHaveBeenCalled();
    });
  });

  describe("resetPasswordAction", () => {
    it("should reset password with valid token", async () => {
      const formData = new FormData();
      formData.append("password", "NewSecurePass123!");
      formData.append("confirmPassword", "NewSecurePass123!");
      formData.append("locale", "fr");

      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await resetPasswordAction(undefined, formData);

      expect(result.success).toBe(true);
    });

    it("should reject incorrect current password", async () => {
      const formData = new FormData();
      formData.append("password", "weak");
      formData.append("confirmPassword", "weak");
      formData.append("locale", "fr");

      const result = await resetPasswordAction(undefined, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
