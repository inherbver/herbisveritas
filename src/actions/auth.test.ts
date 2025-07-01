"use server";

import * as authModule from "./auth";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { migrateAndGetCart } from "@/actions/cartActions";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { revalidateTag } from "next/cache";
import { createSuccessResult, createGeneralErrorResult } from "@/lib/cart-helpers";

// Accès aux fonctions via le module
const { loginAction, signUpAction, logoutAction } = authModule;

// Mock des schémas de validation avec messages en français
jest.mock("@/lib/validators/auth.validator", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { z } = require("zod");

  return {
    createPasswordSchema: jest.fn(() =>
      z.string().min(8, { message: "Le mot de passe doit contenir au moins 8 caractères." })
    ),
    createSignupSchema: jest.fn(() =>
      z
        .object({
          email: z.string().email({ message: "L'adresse email n'est pas valide." }),
          password: z
            .string()
            .min(8, { message: "Le mot de passe doit contenir au moins 8 caractères." }),
          confirmPassword: z.string(),
        })
        .refine(
          (data: { password: string; confirmPassword: string }) =>
            data.password === data.confirmPassword,
          {
            message: "Les mots de passe ne correspondent pas.",
            path: ["confirmPassword"],
          }
        )
    ),
  };
});

// Mock des dépendances
jest.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: jest.fn(),
}));

jest.mock("@/actions/cartActions", () => ({
  migrateAndGetCart: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

jest.mock("next/headers", () => ({
  headers: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
}));

// Cast des mocks pour le typage
const mockedCreateSupabaseServerClient = createSupabaseServerClient as jest.Mock;
const mockedMigrateAndGetCart = migrateAndGetCart as jest.Mock;
const mockedRedirect = redirect as unknown as jest.Mock;
const mockedHeaders = headers as jest.Mock;
const mockedRevalidateTag = revalidateTag as jest.Mock;

// --- Données de test ---
const VALID_EMAIL = "test@example.com";
const VALID_PASSWORD = "password123";
const GUEST_USER_ID = "guest-user-id";

describe("Auth Actions", () => {
  let mockSupabaseClient: {
    auth: {
      getUser: jest.Mock;
      signInWithPassword: jest.Mock;
      signUp: jest.Mock;
      signOut: jest.Mock;
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock de base du client Supabase
    mockSupabaseClient = {
      auth: {
        getUser: jest.fn(),
        signInWithPassword: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
      },
    };
    mockedCreateSupabaseServerClient.mockResolvedValue(mockSupabaseClient);

    // Mock de base pour les headers
    const mockHeaderMap = new Map();
    mockHeaderMap.set("host", "localhost:3000");
    mockedHeaders.mockReturnValue(mockHeaderMap);

    // AJOUT CRITIQUE
    process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";
  });

  // --- Tests pour loginAction ---
  describe("loginAction", () => {
    it("should return validation errors for invalid data", async () => {
      const formData = new FormData();
      formData.append("email", "invalid-email");
      formData.append("password", "short");

      const result = await loginAction(undefined, formData);

      expect(result.success).toBe(false);
      expect(result.fieldErrors).toBeDefined();
      expect(result.fieldErrors?.email).toContain("L'adresse email n'est pas valide.");
      expect(result.fieldErrors?.password).toContain(
        "Le mot de passe doit contenir au moins 8 caractères."
      );
    });

    it("should return an error for incorrect credentials", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: null } });
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        error: { message: "Invalid login credentials" },
      });

      const formData = new FormData();
      formData.append("email", VALID_EMAIL);
      formData.append("password", VALID_PASSWORD);

      const result = await loginAction(undefined, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("L'email ou le mot de passe est incorrect.");
    });

    it("should successfully log in and attempt to migrate cart if guest user exists", async () => {
      // 1. L'utilisateur est d'abord un invité
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: GUEST_USER_ID, is_anonymous: true } },
      });
      // 2. La connexion réussit
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({ error: null });
      // 3. La migration du panier réussit
      mockedMigrateAndGetCart.mockResolvedValue(createSuccessResult(null, "Migration réussie"));

      const formData = new FormData();
      formData.append("email", VALID_EMAIL);
      formData.append("password", VALID_PASSWORD);

      await loginAction(undefined, formData);

      expect(mockedMigrateAndGetCart).toHaveBeenCalledWith({ guestUserId: GUEST_USER_ID });
      expect(mockedRedirect).toHaveBeenCalledWith("/fr/profile/account");
    });

    it("should redirect even if cart migration fails", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: GUEST_USER_ID, is_anonymous: true } },
      });
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({ error: null });
      // La migration échoue
      mockedMigrateAndGetCart.mockResolvedValue(createGeneralErrorResult("Migration failed"));

      const formData = new FormData();
      formData.append("email", VALID_EMAIL);
      formData.append("password", VALID_PASSWORD);

      await loginAction(undefined, formData);

      expect(mockedMigrateAndGetCart).toHaveBeenCalledTimes(1);
      expect(mockedRedirect).toHaveBeenCalledWith("/fr/profile/account"); // La redirection a quand même lieu
    });
  });

  // --- Tests pour signUpAction ---
  describe("signUpAction", () => {
    it("should return validation errors for invalid email and password length", async () => {
      const formData = new FormData();
      formData.append("email", "invalid-email");
      formData.append("password", "short");
      formData.append("confirmPassword", "short");

      const result = await signUpAction(undefined, formData);

      expect(result.success).toBe(false);
      expect(result.fieldErrors).toBeDefined();
      expect(result.fieldErrors?.email).toContain("L'adresse email n'est pas valide.");
      expect(result.fieldErrors?.password).toContain(
        "Le mot de passe doit contenir au moins 8 caractères."
      );
    });

    it("should return a validation error if passwords do not match", async () => {
      const formData = new FormData();
      formData.append("email", VALID_EMAIL);
      formData.append("password", VALID_PASSWORD);
      formData.append("confirmPassword", "another_valid_password");

      const result = await signUpAction(undefined, formData);

      expect(result.success).toBe(false);
      expect(result.fieldErrors).toBeDefined();
      expect(result.fieldErrors?.confirmPassword).toContain(
        "Les mots de passe ne correspondent pas."
      );
    });

    it("should return a success message on successful sign-up", async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: { id: "new-user-id" }, session: null },
        error: null,
      });

      const formData = new FormData();
      formData.append("email", VALID_EMAIL);
      formData.append("password", VALID_PASSWORD);
      formData.append("confirmPassword", VALID_PASSWORD);

      const result = await signUpAction(undefined, formData);

      expect(result.success).toBe(true);
      expect(result.message).toBe(
        "Inscription réussie ! Veuillez vérifier votre boîte de réception pour confirmer votre adresse email."
      );
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledTimes(1);
    });

    it("should return an error if the user already exists", async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "User already registered" },
      });

      const formData = new FormData();
      formData.append("email", VALID_EMAIL);
      formData.append("password", VALID_PASSWORD);
      formData.append("confirmPassword", VALID_PASSWORD);

      const result = await signUpAction(undefined, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Un compte existe déjà avec cette adresse email.");
    });

    it("should return a generic error on other sign-up failures", async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "A different error" },
      });

      const formData = new FormData();
      formData.append("email", VALID_EMAIL);
      formData.append("password", VALID_PASSWORD);
      formData.append("confirmPassword", VALID_PASSWORD);

      const result = await signUpAction(undefined, formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Une erreur est survenue lors de l'inscription. Veuillez réessayer."
      );
    });
  });

  // --- Tests pour logoutAction ---
  describe("logoutAction", () => {
    it("should sign out the user and redirect to home on success", async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      // ✅ Mock redirect pour lancer une erreur spécifique que nous pouvons capturer
      const redirectError = new Error("NEXT_REDIRECT");
      mockedRedirect.mockImplementation(() => {
        throw redirectError;
      });

      try {
        await logoutAction();
        fail("Expected redirect() to throw an error");
      } catch (error) {
        expect(error).toBe(redirectError);
      }

      // ✅ Vérifier que les fonctions ont été appelées correctement selon le vrai code
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalledTimes(1);
      expect(mockedRedirect).toHaveBeenCalledWith("/?logged_out=true");

      // ✅ revalidateTag n'est PAS appelé dans le vrai code de logoutAction
      expect(mockedRevalidateTag).not.toHaveBeenCalled();
    });

    it("should redirect with an error if sign out fails", async () => {
      const signOutError = { message: "Sign out failed" };
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: signOutError });

      // ✅ Mock redirect pour lancer une erreur spécifique
      const redirectError = new Error("NEXT_REDIRECT");
      mockedRedirect.mockImplementation(() => {
        throw redirectError;
      });

      try {
        await logoutAction();
        fail("Expected redirect() to throw an error");
      } catch (error) {
        expect(error).toBe(redirectError);
      }

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalledTimes(1);
      // ✅ En cas d'échec de signOut, revalidateTag ne devrait PAS être appelé
      expect(mockedRevalidateTag).not.toHaveBeenCalled();
      expect(mockedRedirect).toHaveBeenCalledWith(
        "/?logout_error=true&message=Sign%20out%20failed"
      );
    });
  });
});
