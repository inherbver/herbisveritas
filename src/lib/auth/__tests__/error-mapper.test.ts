import { AuthErrorMapper } from "../error-mapper";
import type { AuthError } from "@supabase/supabase-js";

describe("AuthErrorMapper", () => {
  describe("mapLoginError", () => {
    it("should map invalid credentials error correctly", () => {
      const mockError = {
        message: "Invalid login credentials",
      } as AuthError;

      const result = AuthErrorMapper.mapLoginError(mockError);

      expect(result).toBe("errors.login.invalidCredentials");
    });

    it("should map email not confirmed error correctly", () => {
      const mockError = {
        message: "Email not confirmed",
      } as AuthError;

      const result = AuthErrorMapper.mapLoginError(mockError);

      expect(result).toBe("errors.login.emailNotConfirmed");
    });

    it("should map too many requests error correctly", () => {
      const mockError = {
        message: "Too many requests",
      } as AuthError;

      const result = AuthErrorMapper.mapLoginError(mockError);

      expect(result).toBe("errors.login.tooManyRequests");
    });

    it("should map network error correctly", () => {
      const mockError = {
        message: "Failed to fetch",
      } as AuthError;

      const result = AuthErrorMapper.mapLoginError(mockError);

      expect(result).toBe("errors.login.networkError");
    });

    it("should return generic error for unknown messages", () => {
      const mockError = {
        message: "Some unknown error",
      } as AuthError;

      const result = AuthErrorMapper.mapLoginError(mockError);

      expect(result).toBe("errors.login.generic");
    });
  });

  describe("mapSignupError", () => {
    it("should map user already registered error correctly", () => {
      const mockError = {
        message: "User already registered",
      } as AuthError;

      const result = AuthErrorMapper.mapSignupError(mockError);

      expect(result).toBe("errors.signup.emailAlreadyRegistered");
    });

    it("should map weak password error correctly", () => {
      const mockError = {
        message: "Password is too weak",
      } as AuthError;

      const result = AuthErrorMapper.mapSignupError(mockError);

      expect(result).toBe("errors.signup.weakPassword");
    });

    it("should return generic error for unknown messages", () => {
      const mockError = {
        message: "Some unknown signup error",
      } as AuthError;

      const result = AuthErrorMapper.mapSignupError(mockError);

      expect(result).toBe("errors.signup.generic");
    });
  });

  describe("isTemporaryError", () => {
    it("should identify network errors as temporary", () => {
      const mockError = {
        message: "Network error occurred",
      } as AuthError;

      const result = AuthErrorMapper.isTemporaryError(mockError);

      expect(result).toBe(true);
    });

    it("should identify rate limit errors as temporary", () => {
      const mockError = {
        message: "Too many requests",
      } as AuthError;

      const result = AuthErrorMapper.isTemporaryError(mockError);

      expect(result).toBe(true);
    });

    it("should identify credential errors as permanent", () => {
      const mockError = {
        message: "Invalid login credentials",
      } as AuthError;

      const result = AuthErrorMapper.isTemporaryError(mockError);

      expect(result).toBe(false);
    });
  });

  describe("getActionSuggestion", () => {
    it("should suggest resend confirmation for unconfirmed email", () => {
      const mockError = {
        message: "Email not confirmed",
      } as AuthError;

      const result = AuthErrorMapper.getActionSuggestion(mockError);

      expect(result).toBe("resendConfirmation");
    });

    it("should suggest create account for user not found", () => {
      const mockError = {
        message: "User not found",
      } as AuthError;

      const result = AuthErrorMapper.getActionSuggestion(mockError);

      expect(result).toBe("createAccount");
    });

    it("should suggest retry for temporary errors", () => {
      const mockError = {
        message: "Network error",
      } as AuthError;

      const result = AuthErrorMapper.getActionSuggestion(mockError);

      expect(result).toBe("retry");
    });

    it("should return null for errors with no specific action", () => {
      const mockError = {
        message: "Invalid login credentials",
      } as AuthError;

      const result = AuthErrorMapper.getActionSuggestion(mockError);

      expect(result).toBe(null);
    });
  });
});
