/**
 * Static validation schemas for authentication
 * These are used for testing and places where translations aren't available
 */

import { z } from "zod";

// Base password validation
const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères")
  .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule")
  .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre")
  .regex(/[^A-Za-z0-9]/, "Le mot de passe doit contenir au moins un caractère spécial");

// Login schema
export const loginSchema = z.object({
  email: z.string().email("Email invalide").trim().toLowerCase(),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});

// Signup schema
export const signupSchema = z
  .object({
    email: z.string().email("Email invalide").trim().toLowerCase(),
    password: passwordSchema,
    confirmPassword: z.string(),
    firstName: z.string().min(1, "Le prénom est requis").trim(),
    lastName: z.string().min(1, "Le nom est requis").trim(),
    phone: z
      .string()
      .optional()
      .refine(
        (val) => !val || val.length >= 10,
        "Le numéro de téléphone doit contenir au moins 10 chiffres"
      ),
    acceptTerms: z
      .boolean()
      .refine((val) => val === true, "Vous devez accepter les conditions d'utilisation"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: z.string().email("Email invalide").trim().toLowerCase(),
});

// Reset password schema (with current password)
export const resetPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Le mot de passe actuel est requis"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

// Update password schema (without current password)
export const updatePasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

// Profile update schema
export const profileUpdateSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis").trim().optional(),
  lastName: z.string().min(1, "Le nom est requis").trim().optional(),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.length >= 10,
      "Le numéro de téléphone doit contenir au moins 10 chiffres"
    ),
  language: z.enum(["fr", "en", "de", "es"]).optional(),
  newsletter: z.boolean().optional(),
});
