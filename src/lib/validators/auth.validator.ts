import { z } from "zod";
import { useTranslations } from "next-intl";

// Schéma de base pour un mot de passe robuste, réutilisable
export const createPasswordSchema = (t: ReturnType<typeof useTranslations>) =>
  z
    .string()
    .min(8, { message: t("length", { min: 8 }) })
    .regex(/[A-Z]/, { message: t("uppercase") })
    .regex(/[0-9]/, { message: t("number") })
    .regex(/[^A-Za-z0-9]/, { message: t("specialChar") });

// Schéma complet pour le formulaire d'inscription
export const createSignupSchema = (
  tPassword: ReturnType<typeof useTranslations>,
  tAuth: ReturnType<typeof useTranslations>
) =>
  z
    .object({
      email: z.string().email({ message: tAuth("emailInvalid") }),
      password: createPasswordSchema(tPassword), // Utilisation du schéma de mot de passe robuste
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: tAuth("passwordsDoNotMatch"),
      path: ["confirmPassword"],
    });

// Schéma complet pour le formulaire de changement de mot de passe du profil
export const createProfilePasswordChangeSchema = (
  tPassword: ReturnType<typeof useTranslations>,
  tProfile: ReturnType<typeof useTranslations>
) =>
  z
    .object({
      currentPassword: z.string().min(1, tProfile("currentPasswordRequired")),
      newPassword: createPasswordSchema(tPassword), // Ré-utilisation du schéma de mot de passe
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: tProfile("passwordsDoNotMatch"),
      path: ["confirmPassword"],
    });

// Schéma pour le formulaire de réinitialisation de mot de passe (ou changement sans mdp actuel)
export const createResetPasswordSchema = (
  tPassword: ReturnType<typeof useTranslations>,
  tAuth: ReturnType<typeof useTranslations>
) =>
  z
    .object({
      newPassword: createPasswordSchema(tPassword), // Ré-utilisation du schéma de mot de passe
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: tAuth("passwordsDoNotMatch"),
      path: ["confirmPassword"],
    });
