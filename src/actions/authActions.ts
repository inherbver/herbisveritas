// Indique que ce fichier contient des Server Actions
"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server"; // Importe le client Supabase côté serveur

import { migrateAndGetCart } from "@/actions/cartActions"; // AJOUT: Importer pour la migration du panier
import { isGeneralErrorResult, isValidationErrorResult } from "@/lib/cart-helpers"; // ✅ Corriger les noms d'imports
import { getTranslations } from "next-intl/server";
import { createPasswordSchema, createSignupSchema } from "@/lib/validators/auth.validator";

// New imports for Clean Architecture
import { ActionResult, FormActionResult } from "@/lib/core/result";
import { LogUtils } from "@/lib/core/logger";
import { 
  ValidationError, 
  AuthenticationError,
  ErrorUtils 
} from "@/lib/core/errors";
import { AuthErrorHandler } from "@/lib/auth/error-handler";

// --- Schéma Login ---
const loginSchema = z.object({
  email: z.string().email({ message: "L'adresse email n'est pas valide." }),
  password: z.string().min(8, { message: "Le mot de passe doit contenir au moins 8 caractères." }),
});

// --- Types d'Actions --- (Use ActionResult<T> or FormActionResult<T> from @/lib/core/result)

// --- Action de Connexion ---
export async function loginAction(
  prevState: FormActionResult<null> | null,
  formData: FormData
): Promise<FormActionResult<null>> {
  const context = LogUtils.createUserActionContext('unknown', 'login', 'auth');
  LogUtils.logOperationStart('login', context);

  try {
    const supabase = await createSupabaseServerClient();

    // 1. Valider les données
    const validatedFields = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!validatedFields.success) {
      return FormActionResult.fieldValidationError(
        validatedFields.error.flatten().fieldErrors
      );
    }

    const { email, password } = validatedFields.data;

    // 2. Récupérer l'utilisateur actuel (potentiellement anonyme) AVANT la connexion
    let guestUserId: string | undefined;
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (currentUser && currentUser.is_anonymous) {
      guestUserId = currentUser.id;
      context.guestUserId = guestUserId;
    }

    // 3. Essayer de connecter
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return AuthErrorHandler.handleSupabaseError(error, { email });
    }

    // 4. Si la connexion est réussie et qu'un utilisateur invité a été détecté, tenter la migration du panier
    if (guestUserId) {
      try {
        const migrationResult = await migrateAndGetCart([]);
        if (!migrationResult.success) {
          let errorDetails = "Détails de l'erreur de migration non disponibles.";
          if (isGeneralErrorResult(migrationResult)) {
            errorDetails = `Erreur générale: ${migrationResult.error}`;
          } else if (isValidationErrorResult(migrationResult)) {
            errorDetails = `Erreurs de validation: ${JSON.stringify(migrationResult.errors)}`;
          }
          LogUtils.logOperationError('cart_migration', new Error(errorDetails), context);
          // Ne pas bloquer la connexion si la migration échoue
        } else {
          LogUtils.logOperationSuccess('cart_migration', context);
        }
      } catch (migrationError) {
        LogUtils.logOperationError('cart_migration', migrationError, context);
        // Ne pas bloquer la connexion si la migration échoue
      }
    }

    LogUtils.logOperationSuccess('login', { ...context, email });
    redirect("/fr/profile/account");
  } catch (error) {
    LogUtils.logOperationError('login', error, context);
    
    // Si c'est une redirection Next.js, la relancer
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      typeof (error as { digest: unknown }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    
    if (error instanceof ValidationError && error.context?.validationErrors) {
      return FormActionResult.fieldValidationError(
        error.context.validationErrors as Record<string, string[]>
      );
    }
    
    return FormActionResult.error(
      ErrorUtils.isAppError(error) 
        ? ErrorUtils.formatForUser(error) 
        : "Une erreur inattendue est survenue lors de la connexion"
    );
  }
}

// --- Action d'Inscription ---
export async function signUpAction(
  prevState: FormActionResult<null> | null,
  formData: FormData
): Promise<FormActionResult<null>> {
  const locale = (formData.get("locale") as string) || "fr";
  const context = LogUtils.createUserActionContext('unknown', 'signup', 'auth', { locale });
  LogUtils.logOperationStart('signup', context);

  try {
    const supabase = await createSupabaseServerClient();

    // Charger les traductions nécessaires pour la validation
    const tPassword = await getTranslations({ locale, namespace: "PasswordPage.validation" });
    const tAuth = await getTranslations({ locale, namespace: "Auth.validation" });

    // Créer le schéma de validation avec les traductions
    const finalSignUpSchema = createSignupSchema(tPassword, tAuth);

    // 1. Valider les données
    const validatedFields = finalSignUpSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    if (!validatedFields.success) {
      return FormActionResult.fieldValidationError(
        validatedFields.error.flatten().fieldErrors
      );
    }

    const { email, password } = validatedFields.data;

    // 2. Construire l'URL de redirection
    const origin = process.env.NEXT_PUBLIC_BASE_URL;
    if (!origin) {
      return FormActionResult.error(
        "Configuration serveur incorrecte. Veuillez contacter l'administrateur."
      );
    }
    const redirectUrl = `${origin}/${locale}/auth/callback?type=signup&next=/${locale}/shop`;

    // 3. Essayer d'inscrire l'utilisateur
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      return AuthErrorHandler.handleSupabaseError(error, { email });
    }

    // 4. Audit the successful signup
    if (data.user) {
      context.userId = data.user.id;
      
      const { error: auditError } = await supabase.from("audit_logs").insert({
        user_id: data.user.id,
        event_type: "USER_REGISTERED",
        data: {
          email: data.user.email,
          user_id: data.user.id,
          status: "SUCCESS",
          registration_method: "email_password",
        },
        severity: "INFO",
      });

      if (auditError) {
        LogUtils.logOperationError('audit_signup', auditError, context);
        // Don't fail signup if audit fails
      }
    }

    LogUtils.logOperationSuccess('signup', { ...context, email });
    return FormActionResult.ok(null, "Inscription réussie ! Veuillez vérifier votre boîte de réception pour confirmer votre adresse email.");
  } catch (error) {
    LogUtils.logOperationError('signup', error, context);
    
    // Handle ValidationError with field errors
    if (error instanceof ValidationError && error.context?.validationErrors) {
      return FormActionResult.fieldValidationError(error.context.validationErrors as Record<string, string[]>);
    }
    
    return FormActionResult.error(
      ErrorUtils.isAppError(error) ? ErrorUtils.formatForUser(error) : 'Une erreur inattendue est survenue lors de l\'inscription'
    );
  }
}

// --- Mot de passe oublié ---
export async function requestPasswordResetAction(
  prevState: AuthActionResult | undefined,
  formData: FormData
): Promise<ActionResult<null>> {
  const locale = (formData.get("locale") as string) || "fr";
  const context = LogUtils.createUserActionContext('unknown', 'password_reset', 'auth', { locale });
  LogUtils.logOperationStart('password_reset', context);

  try {
    const supabase = await createSupabaseServerClient();
    const email = formData.get("email") as string;

    // 1. Valider l'email
    const t = await getTranslations({ locale, namespace: "Auth.validation" });
    const emailSchema = z.string().email({ message: t("emailInvalid") });
    const validatedEmail = emailSchema.safeParse(email);

    if (!validatedEmail.success) {
      throw new ValidationError('Email invalide', 'email');
    }

    // 2. Construire l'URL de redirection
    const origin = process.env.NEXT_PUBLIC_BASE_URL;
    if (!origin) {
      throw new Error("NEXT_PUBLIC_BASE_URL is not set.");
    }
    const redirectUrl = `${origin}/${locale}/update-password`;

    // 3. Appeler Supabase pour envoyer l'email
    const { error } = await supabase.auth.resetPasswordForEmail(validatedEmail.data, {
      redirectTo: redirectUrl,
    });

    if (error) {
      LogUtils.logOperationError('password_reset_email', error, { ...context, email: validatedEmail.data });
      // Ne pas révéler si l'email existe - retourner succès générique
    }

    // 4. Toujours renvoyer un message de succès pour des raisons de sécurité
    const tSuccess = await getTranslations({ locale, namespace: "Auth.ForgotPassword" });
    LogUtils.logOperationSuccess('password_reset', { ...context, email: validatedEmail.data });
    return ActionResult.ok(null, tSuccess("successMessage"));
  } catch (error) {
    LogUtils.logOperationError('password_reset', error, context);
    return ActionResult.error(
      ErrorUtils.isAppError(error) ? ErrorUtils.formatForUser(error) : 'Une erreur inattendue est survenue'
    );
  }
}

export async function updatePasswordAction(
  prevState: AuthActionResult | undefined,
  formData: FormData
): Promise<FormActionResult<null>> {
  const locale = (formData.get("locale") as string) || "fr";
  const context = LogUtils.createUserActionContext('unknown', 'update_password', 'auth', { locale });
  LogUtils.logOperationStart('update_password', context);

  try {
    const supabase = await createSupabaseServerClient();

    // 1. Valider les mots de passe
    const tValidation = await getTranslations({ locale, namespace: "PasswordPage.validation" });
    const tAuth = await getTranslations({ locale, namespace: "Auth" });

    const updatePasswordSchema = z
      .object({
        password: createPasswordSchema(tValidation),
        confirmPassword: z.string(),
      })
      .refine((data) => data.password === data.confirmPassword, {
        message: tAuth("passwordsDoNotMatch"),
        path: ["confirmPassword"],
      });

    const validatedFields = updatePasswordSchema.safeParse({
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    if (!validatedFields.success) {
      throw new ValidationError(
        'Mots de passe invalides',
        undefined,
        { validationErrors: validatedFields.error.flatten().fieldErrors }
      );
    }

    const { password } = validatedFields.data;

    // 2. Mettre à jour l'utilisateur dans Supabase
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      throw ErrorUtils.fromSupabaseError(error);
    }

    // 3. Succès
    const tSuccess = await getTranslations({ locale, namespace: "Auth.UpdatePassword" });
    LogUtils.logOperationSuccess('update_password', context);
    return FormActionResult.ok(null, tSuccess("successMessage"));
  } catch (error) {
    LogUtils.logOperationError('update_password', error, context);
    
    // Handle ValidationError with field errors
    if (error instanceof ValidationError && error.context?.validationErrors) {
      return FormActionResult.fieldValidationError(error.context.validationErrors as Record<string, string[]>);
    }
    
    return FormActionResult.error(
      ErrorUtils.isAppError(error) ? ErrorUtils.formatForUser(error) : 'Une erreur inattendue est survenue'
    );
  }
}

// --- Action pour renvoyer l'email de confirmation ---
export async function resendConfirmationEmailAction(email: string): Promise<ActionResult<null>> {
  const context = LogUtils.createUserActionContext('unknown', 'resend_confirmation', 'auth', { email });
  LogUtils.logOperationStart('resend_confirmation', context);

  try {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email,
    });

    if (error) {
      throw ErrorUtils.fromSupabaseError(error);
    }

    LogUtils.logOperationSuccess('resend_confirmation', context);
    return ActionResult.ok(null, "Email de confirmation renvoyé avec succès. Veuillez vérifier votre boîte de réception.");
  } catch (error) {
    LogUtils.logOperationError('resend_confirmation', error, context);
    return ActionResult.error('Une erreur est survenue lors du renvoi de l\'email.');
  }
}

// --- Logout Action ---
export async function logoutAction() {
  const context = LogUtils.createUserActionContext('unknown', 'logout', 'auth');
  LogUtils.logOperationStart('logout', context);

  try {
    const supabase = await createSupabaseServerClient();

    // Déconnexion avec gestion d'erreur
    const { error } = await supabase.auth.signOut();

    if (error) {
      LogUtils.logOperationError('logout', error, context);
      // En cas d'erreur de déconnexion Supabase, on redirige quand même
      redirect("/?logout_error=true&message=" + encodeURIComponent(error.message));
    } else {
      LogUtils.logOperationSuccess('logout', context);
      // Redirection avec paramètre pour signaler la déconnexion réussie
      redirect("/?logged_out=true");
    }
  } catch (error: unknown) {
    let errorMessage = "Unknown error during logout";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    // Si l'erreur est une redirection Next.js, la relancer pour que Next.js la gère
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      typeof (error as { digest: unknown }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }

    // Pour toutes les autres erreurs, loguer et rediriger vers une page d'erreur
    LogUtils.logOperationError('logout', error, context);
    redirect("/?logout_error=true&message=" + encodeURIComponent(errorMessage));
  }
}
