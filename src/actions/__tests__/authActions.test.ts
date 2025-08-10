import {
  signInAction,
  signUpAction,
  signOutAction,
  forgotPasswordAction,
  resetPasswordAction,
  updatePasswordAction,
} from "../authActions";
import { mockSupabaseClient, mockUser } from "@/test-utils/mocks";

// Mock Supabase
jest.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: jest.fn(() => mockSupabaseClient),
}));

// Mock Next.js
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
  revalidatePath: jest.fn(),
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn(() => ({
    set: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
  })),
}));

describe("authActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("signInAction", () => {
    it("should successfully sign in a user", async () => {
      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "password123");

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: mockUser,
          session: { access_token: "token", refresh_token: "refresh" },
        },
        error: null,
      });

      const result = await signInAction(undefined, formData);

      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
      expect(result.success).toBe(true);
    });

    it("should handle invalid credentials", async () => {
      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "wrongpassword");

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid login credentials" },
      });

      const result = await signInAction(undefined, formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid login credentials");
    });

    it("should validate email format", async () => {
      const formData = new FormData();
      formData.append("email", "invalid-email");
      formData.append("password", "password123");

      const result = await signInAction(undefined, formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("email");
      expect(mockSupabaseClient.auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it("should validate password minimum length", async () => {
      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "123");

      const result = await signInAction(undefined, formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("password");
      expect(mockSupabaseClient.auth.signInWithPassword).not.toHaveBeenCalled();
    });
  });

  describe("signUpAction", () => {
    it("should successfully register a new user", async () => {
      const formData = new FormData();
      formData.append("email", "newuser@example.com");
      formData.append("password", "SecurePass123!");
      formData.append("confirmPassword", "SecurePass123!");
      formData.append("firstName", "John");
      formData.append("lastName", "Doe");

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: {
          user: { ...mockUser, email: "newuser@example.com" },
          session: null,
        },
        error: null,
      });

      const result = await signUpAction(undefined, formData);

      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: "newuser@example.com",
        password: "SecurePass123!",
        options: {
          data: {
            first_name: "John",
            last_name: "Doe",
          },
        },
      });
      expect(result.success).toBe(true);
    });

    it("should validate password confirmation", async () => {
      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "SecurePass123!");
      formData.append("confirmPassword", "DifferentPass123!");
      formData.append("firstName", "John");
      formData.append("lastName", "Doe");

      const result = await signUpAction(undefined, formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("passwords");
      expect(mockSupabaseClient.auth.signUp).not.toHaveBeenCalled();
    });

    it("should handle duplicate email registration", async () => {
      const formData = new FormData();
      formData.append("email", "existing@example.com");
      formData.append("password", "SecurePass123!");
      formData.append("confirmPassword", "SecurePass123!");
      formData.append("firstName", "John");
      formData.append("lastName", "Doe");

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "User already registered" },
      });

      const result = await signUpAction(undefined, formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("already registered");
    });
  });

  describe("signOutAction", () => {
    it("should successfully sign out a user", async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null,
      });

      const result = await signOutAction();

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it("should handle sign out errors", async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: { message: "Failed to sign out" },
      });

      const result = await signOutAction();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to sign out");
    });
  });

  describe("forgotPasswordAction", () => {
    it("should send password reset email", async () => {
      const formData = new FormData();
      formData.append("email", "test@example.com");

      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
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

      const result = await forgotPasswordAction(undefined, formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("email");
      expect(mockSupabaseClient.auth.resetPasswordForEmail).not.toHaveBeenCalled();
    });

    it("should handle non-existent email gracefully", async () => {
      const formData = new FormData();
      formData.append("email", "nonexistent@example.com");

      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null, // Supabase doesn't reveal if email exists
      });

      const result = await forgotPasswordAction(undefined, formData);

      expect(result.success).toBe(true); // Should appear successful for security
      expect(result.message).toContain("email");
    });
  });

  describe("updatePasswordAction", () => {
    it("should update user password", async () => {
      const formData = new FormData();
      formData.append("password", "NewSecurePass123!");
      formData.append("confirmPassword", "NewSecurePass123!");

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

      const result = await updatePasswordAction(undefined, formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("match");
      expect(mockSupabaseClient.auth.updateUser).not.toHaveBeenCalled();
    });

    it("should enforce password strength requirements", async () => {
      const formData = new FormData();
      formData.append("password", "weak");
      formData.append("confirmPassword", "weak");

      const result = await updatePasswordAction(undefined, formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("password");
      expect(mockSupabaseClient.auth.updateUser).not.toHaveBeenCalled();
    });
  });

  describe("resetPasswordAction", () => {
    it("should reset password with valid token", async () => {
      const formData = new FormData();
      formData.append("currentPassword", "OldPass123!");
      formData.append("newPassword", "NewPass123!");
      formData.append("confirmPassword", "NewPass123!");

      // Mock user is logged in
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock password verification
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: {} },
        error: null,
      });

      // Mock password update
      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await resetPasswordAction(undefined, formData);

      expect(result.success).toBe(true);
    });

    it("should reject incorrect current password", async () => {
      const formData = new FormData();
      formData.append("currentPassword", "WrongPass123!");
      formData.append("newPassword", "NewPass123!");
      formData.append("confirmPassword", "NewPass123!");

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid password" },
      });

      const result = await resetPasswordAction(undefined, formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("password");
    });
  });
});
