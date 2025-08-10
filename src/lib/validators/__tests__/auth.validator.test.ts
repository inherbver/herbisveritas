/**
 * Tests for Auth Validators
 */

import {
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updatePasswordSchema,
  profileUpdateSchema,
} from "../auth.schemas";

describe("Auth Validators", () => {
  describe("loginSchema", () => {
    it("should validate correct login data", () => {
      const validData = {
        email: "test@example.com",
        password: "Password123!",
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject invalid email", () => {
      const invalidData = {
        email: "notanemail",
        password: "Password123!",
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("email");
      }
    });

    it("should reject short password", () => {
      const invalidData = {
        email: "test@example.com",
        password: "short",
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("password");
      }
    });

    it("should trim email", () => {
      const dataWithSpaces = {
        email: "  test@example.com  ",
        password: "Password123!",
      };

      const result = loginSchema.safeParse(dataWithSpaces);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("test@example.com");
      }
    });

    it("should lowercase email", () => {
      const dataWithUppercase = {
        email: "Test@Example.COM",
        password: "Password123!",
      };

      const result = loginSchema.safeParse(dataWithUppercase);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("test@example.com");
      }
    });
  });

  describe("signupSchema", () => {
    it("should validate correct signup data", () => {
      const validData = {
        email: "test@example.com",
        password: "Password123!",
        confirmPassword: "Password123!",
        firstName: "John",
        lastName: "Doe",
        acceptTerms: true,
      };

      const result = signupSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject mismatched passwords", () => {
      const invalidData = {
        email: "test@example.com",
        password: "Password123!",
        confirmPassword: "DifferentPassword123!",
        firstName: "John",
        lastName: "Doe",
        acceptTerms: true,
      };

      const result = signupSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("correspondent");
      }
    });

    it("should reject if terms not accepted", () => {
      const invalidData = {
        email: "test@example.com",
        password: "Password123!",
        confirmPassword: "Password123!",
        firstName: "John",
        lastName: "Doe",
        acceptTerms: false,
      };

      const result = signupSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("conditions");
      }
    });

    it("should validate optional phone number", () => {
      const dataWithPhone = {
        email: "test@example.com",
        password: "Password123!",
        confirmPassword: "Password123!",
        firstName: "John",
        lastName: "Doe",
        phone: "+33612345678",
        acceptTerms: true,
      };

      const result = signupSchema.safeParse(dataWithPhone);
      expect(result.success).toBe(true);
    });

    it("should reject invalid phone format", () => {
      const dataWithInvalidPhone = {
        email: "test@example.com",
        password: "Password123!",
        confirmPassword: "Password123!",
        firstName: "John",
        lastName: "Doe",
        phone: "123", // Too short
        acceptTerms: true,
      };

      const result = signupSchema.safeParse(dataWithInvalidPhone);
      expect(result.success).toBe(false);
    });
  });

  describe("forgotPasswordSchema", () => {
    it("should validate correct email", () => {
      const validData = {
        email: "test@example.com",
      };

      const result = forgotPasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject invalid email format", () => {
      const invalidData = {
        email: "notanemail",
      };

      const result = forgotPasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should handle email normalization", () => {
      const dataWithUppercase = {
        email: "  TEST@EXAMPLE.COM  ",
      };

      const result = forgotPasswordSchema.safeParse(dataWithUppercase);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("test@example.com");
      }
    });
  });

  describe("resetPasswordSchema", () => {
    it("should validate correct reset data", () => {
      const validData = {
        currentPassword: "OldPassword123!",
        newPassword: "NewPassword123!",
        confirmPassword: "NewPassword123!",
      };

      const result = resetPasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject if new passwords don't match", () => {
      const invalidData = {
        currentPassword: "OldPassword123!",
        newPassword: "NewPassword123!",
        confirmPassword: "DifferentPassword123!",
      };

      const result = resetPasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject weak password", () => {
      const weakPasswordData = {
        currentPassword: "OldPassword123!",
        newPassword: "weak",
        confirmPassword: "weak",
      };

      const result = resetPasswordSchema.safeParse(weakPasswordData);
      expect(result.success).toBe(false);
    });
  });

  describe("updatePasswordSchema", () => {
    it("should validate correct update data", () => {
      const validData = {
        password: "NewPassword123!",
        confirmPassword: "NewPassword123!",
      };

      const result = updatePasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should enforce password strength", () => {
      const weakData = {
        password: "12345678", // No uppercase, no special char
        confirmPassword: "12345678",
      };

      const result = updatePasswordSchema.safeParse(weakData);
      expect(result.success).toBe(false);
    });
  });

  describe("profileUpdateSchema", () => {
    it("should validate complete profile data", () => {
      const validData = {
        firstName: "John",
        lastName: "Doe",
        phone: "+33612345678",
        language: "fr",
        newsletter: true,
      };

      const result = profileUpdateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should allow partial updates", () => {
      const partialData = {
        firstName: "Jane",
      };

      const result = profileUpdateSchema.safeParse(partialData);
      expect(result.success).toBe(true);
    });

    it("should validate language enum", () => {
      const invalidLanguage = {
        language: "invalid",
      };

      const result = profileUpdateSchema.safeParse(invalidLanguage);
      expect(result.success).toBe(false);
    });

    it("should validate phone format when provided", () => {
      const invalidPhone = {
        phone: "not-a-phone",
      };

      const result = profileUpdateSchema.safeParse(invalidPhone);
      expect(result.success).toBe(false);
    });

    it("should trim string fields", () => {
      const dataWithSpaces = {
        firstName: "  John  ",
        lastName: "  Doe  ",
      };

      const result = profileUpdateSchema.safeParse(dataWithSpaces);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.firstName).toBe("John");
        expect(result.data.lastName).toBe("Doe");
      }
    });
  });
});
