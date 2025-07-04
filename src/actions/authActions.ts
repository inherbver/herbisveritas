// Indique que ce fichier contient des Server Actions
"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server"; // Importe le client Supabase côté serveur

import { migrateAndGetCart } from "@/actions/cartActions"; // AJOUT: Importer pour la migration du panier
import { isGeneralError, isValidationError } from "@/lib/cart-helpers"; // AJOUT: Importer les gardiens de type
import { getTranslations } from "next-intl/server";
import { createPasswordSchema, createSignupSchema } from "@/lib/validators/auth.validator";

// --- Schéma Login ---
const loginSchema = z.object({
  email: z.string().email({ message: "L'adresse email n'est pas valide." }),
  password: z.string().min(8, { message: "Le mot de passe doit contenir au moins 8 caractères." }),
});

// --- Types d'Actions ---
export interface AuthActionResult {
  success: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

// --- Action de Connexion ---
export async function loginAction(
  prevState: AuthActionResult | undefined,
  formData: FormData
): Promise<AuthActionResult> {
  const supabase = await createSupabaseServerClient();

  // 1. Valider les données
  const validatedFields = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    const fieldErrors = validatedFields.error.flatten().fieldErrors;
    const formErrors = validatedFields.error.flatten().formErrors;
    return {
      success: false,
      error:
        formErrors.length > 0
          ? formErrors.join(", ")
          : "Erreur de validation. Veuillez vérifier les champs.",
      fieldErrors: fieldErrors as Record<string, string[]>,
    };
  }

  const { email, password } = validatedFields.data;

  // 2. Récupérer l'utilisateur actuel (potentiellement anonyme) AVANT la connexion
  let guestUserId: string | undefined;
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  if (currentUser && currentUser.is_anonymous) {
    guestUserId = currentUser.id;
    console.log(`loginAction: Utilisateur invité détecté avec ID: ${guestUserId}`);
  }

  // 3. Essayer de connecter
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("Erreur Supabase Auth (Login):", error.message);
    if (error.message === "Email not confirmed") {
      return {
        success: false,
        error: "Email non confirmé. Veuillez vérifier votre boîte de réception.",
        // On pourrait ajouter un champ pour permettre de renvoyer l'email
        // par exemple: needsConfirmation: true
      };
    }
    return {
      success: false,
      error: "L'email ou le mot de passe est incorrect.",
    };
  }

  // 4. Si la connexion est réussie et qu'un utilisateur invité a été détecté, tenter la migration du panier
  if (guestUserId) {
    console.log(
      `loginAction: Tentative de migration du panier pour l'ancien invité ID: ${guestUserId}`
    );
    const migrationResult = await migrateAndGetCart({ guestUserId });
    if (!migrationResult.success) {
      let errorDetails = "Détails de l'erreur de migration non disponibles.";
      if (isGeneralError(migrationResult)) {
        errorDetails = `Erreur générale: ${migrationResult.error}`;
      } else if (isValidationError(migrationResult)) {
        errorDetails = `Erreurs de validation: ${JSON.stringify(migrationResult.errors)}`;
      }
      console.warn(
        `loginAction: La migration du panier pour l'invité ${guestUserId} a échoué. ${errorDetails}. Message: ${migrationResult.message}`
      );
      // Ne pas bloquer la redirection, la connexion a réussi.
    } else {
      console.log(`loginAction: Migration du panier pour l'invité ${guestUserId} réussie.`);
    }
  }

  redirect("/fr/profile/account");
}

// --- Action d'Inscription ---
export async function signUpAction(
  prevState: AuthActionResult | undefined,
  formData: FormData
): Promise<AuthActionResult> {
  const supabase = await createSupabaseServerClient();
  const locale = (formData.get("locale") as string) || "fr";

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
    const fieldErrors = validatedFields.error.flatten().fieldErrors;
    const formErrors = validatedFields.error.flatten().formErrors;
    return {
      success: false,
      error:
        formErrors.length > 0
          ? formErrors.join(", ")
          : "Erreur de validation. Veuillez vérifier les champs.",
      fieldErrors: fieldErrors as Record<string, string[]>,
    };
  }

  const { email, password } = validatedFields.data;

  // 2. Construire l'URL de redirection
  const origin = process.env.NEXT_PUBLIC_BASE_URL;
  if (!origin) {
    console.error("FATAL: La variable d'environnement NEXT_PUBLIC_BASE_URL n'est pas définie.");
    return {
      success: false,
      error: "Erreur de configuration du serveur. Impossible de traiter l'inscription.",
    };
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
    console.error("Erreur Supabase Auth (Signup):", error.message);
    const t = await getTranslations({ locale, namespace: "Auth.validation" });

    // Vérifier si l'erreur est due à un utilisateur déjà existant
    if (error.message.includes("User already registered")) {
      return {
        success: false,
        error: t("emailAlreadyExists"),
      };
    }

    // Pour toutes les autres erreurs
    return {
      success: false,
      error: t("genericSignupError"),
    };
  }

  // 4. Audit the successful signup
  if (data.user) {
    const { error: auditError } = await supabase.from("audit_logs").insert({
      actor_id: data.user.id,
      action: "USER_SIGNUP",
      target_table: "auth.users",
      target_id: data.user.id,
      status: "SUCCESS",
      justification: "User self-registration",
    });

    if (auditError) {
      console.error("Failed to create audit log for user signup:", auditError);
      // Do not fail the signup if audit fails, just log it.
    }
  }

  // 5. Succès
  return {
    success: true,
    message:
      "Inscription réussie ! Veuillez vérifier votre boîte de réception pour confirmer votre adresse email.",
  };
}

// --- Mot de passe oublié ---
export async function requestPasswordResetAction(
  prevState: AuthActionResult | undefined,
  formData: FormData
): Promise<AuthActionResult> {
  const supabase = await createSupabaseServerClient();
  const locale = (formData.get("locale") as string) || "fr";
  const email = formData.get("email") as string;

  // 1. Valider l'email
  const t = await getTranslations({ locale, namespace: "Auth.validation" });
  const emailSchema = z.string().email({ message: t("emailInvalid") });
  const validatedEmail = emailSchema.safeParse(email);

  if (!validatedEmail.success) {
    return {
      success: false,
      fieldErrors: {
        email: validatedEmail.error.flatten().formErrors,
      },
    };
  }

  // 2. Construire l'URL de redirection
  const origin = process.env.NEXT_PUBLIC_BASE_URL;
  if (!origin) {
    console.error("FATAL: NEXT_PUBLIC_BASE_URL is not set.");
    return {
      success: false,
      error: "Server configuration error.",
    };
  }
  const redirectUrl = `${origin}/${locale}/update-password`;

  // 3. Appeler Supabase pour envoyer l'email
  const { error } = await supabase.auth.resetPasswordForEmail(validatedEmail.data, {
    redirectTo: redirectUrl,
  });

  if (error) {
    console.error("Error sending password reset email:", error.message);
    // Ne pas révéler si l'email existe ou non
    // On renvoie un succès générique pour des raisons de sécurité
  }

  // 4. Toujours renvoyer un message de succès pour éviter l'énumération d'utilisateurs
  const tSuccess = await getTranslations({ locale, namespace: "Auth.ForgotPassword" });
  return {
    success: true,
    message: tSuccess("successMessage"),
  };
}

export async function updatePasswordAction(
  prevState: AuthActionResult | undefined,
  formData: FormData
): Promise<AuthActionResult> {
  const supabase = await createSupabaseServerClient();
  const locale = (formData.get("locale") as string) || "fr";

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
    return {
      success: false,
      fieldErrors: validatedFields.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { password } = validatedFields.data;

  // 2. Mettre à jour l'utilisateur dans Supabase
  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    console.error("Error updating password:", error.message);
    const tError = await getTranslations({ locale, namespace: "Auth.UpdatePassword" });
    return {
      success: false,
      error: tError("errorMessage"),
    };
  }

  // 3. Succès
  const tSuccess = await getTranslations({ locale, namespace: "Auth.UpdatePassword" });
  return {
    success: true,
    message: tSuccess("successMessage"),
  };
}

// --- Action pour renvoyer l'email de confirmation ---
export async function resendConfirmationEmailAction(email: string): Promise<AuthActionResult> {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email,
  });

  if (error) {
    console.error("Erreur lors du renvoi de l'email de confirmation:", error.message);
    return {
      success: false,
      error: "Une erreur est survenue lors du renvoi de l'email.",
    };
  }

  return {
    success: true,
    message:
      "Email de confirmation renvoyé avec succès. Veuillez vérifier votre boîte de réception.",
  };
}

// --- Logout Action ---
export async function logoutAction() {
  try {
    const supabase = await createSupabaseServerClient();

    // Log pour traçabilité
    console.log("Server: Initiating logout process");

    // Déconnexion avec gestion d'erreur
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Server: Logout error:", error.message);
      // En cas d'erreur de déconnexion Supabase, on redirige quand même mais avec un indicateur d'erreur
      // pour éviter que l'utilisateur reste bloqué sur une page nécessitant une session.
      redirect("/?logout_error=true&message=" + encodeURIComponent(error.message));
    } else {
      console.log("Server: Logout successful");
      // Redirection avec paramètre pour signaler la déconnexion réussie
      redirect("/?logged_out=true");
    }
  } catch (error: unknown) {
    let errorMessage = "Unknown error during logout";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    // Si l'erreur est une redirection Next.js, la relancer pour que Next.js la gère
    // Vérification de type pour error.digest (spécifique aux erreurs Next.js)
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
    console.error("Server: Exception during logout:", error);
    redirect("/?logout_error=true&message=" + encodeURIComponent(errorMessage));
  }
}
