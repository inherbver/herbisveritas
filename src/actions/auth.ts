// Indique que ce fichier contient des Server Actions
"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server"; // Importe le client Supabase côté serveur
import { headers } from "next/headers"; // AJOUT: Importer headers
import { migrateAndGetCart } from "@/actions/cartActions"; // AJOUT: Importer pour la migration du panier
import { isGeneralError, isValidationError } from "@/lib/cart-helpers"; // AJOUT: Importer les gardiens de type

// --- Schéma Login ---
const loginSchema = z.object({
  email: z.string().email({ message: "L'adresse email n'est pas valide." }),
  password: z.string().min(8, { message: "Le mot de passe doit contenir au moins 8 caractères." }),
});

// --- Schéma Inscription ---
const signUpSchema = z
  .object({
    email: z.string().email({ message: "L'adresse email n'est pas valide." }),
    password: z
      .string()
      .min(8, { message: "Le mot de passe doit contenir au moins 8 caractères." }),
    confirmPassword: z
      .string()
      .min(8, { message: "La confirmation du mot de passe doit contenir au moins 8 caractères." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
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

  // Récupérer la locale du formData
  const locale = (formData.get("locale") as string) || "en"; // Valeur par défaut 'en' si non fournie

  // 1. Valider les données du formulaire avec Zod (incluant la confirmation de mdp)
  const validatedFields = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  // Si la validation échoue
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

  // Construire l'URL de redirection pour la confirmation par email
  const headersList = await headers(); // Utiliser await ici
  const host = headersList.get("host");
  const protocol =
    headersList.get("x-forwarded-proto") ||
    (process.env.NODE_ENV === "production" ? "https" : "http");
  const origin = `${protocol}://${host}`;
  const redirectUrl = `${origin}/${locale}/auth/callback?type=signup&next=/${locale}/profile/account`;

  // Log pour débogage de l'URL construite
  console.log("Constructed emailRedirectTo for signUp:", redirectUrl);

  // 2. Essayer d'inscrire l'utilisateur avec Supabase
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl, // Utiliser la variable définie
    },
  });

  // Si Supabase renvoie une erreur (ex: utilisateur existe déjà)
  if (error) {
    console.error("Erreur Supabase Auth (Signup):", error.message);
    let errorMessage = "Une erreur est survenue lors de l'inscription. Veuillez réessayer.";
    if (error.message.includes("User already registered")) {
      errorMessage = "Un compte existe déjà avec cette adresse email.";
    }
    // Vous pourriez ajouter d'autres vérifications d'erreurs spécifiques ici
    return {
      success: false,
      error: errorMessage,
    };
  }

  // 3. Si succès (et la confirmation par email est activée par défaut)
  // Supabase renvoie data.user non null si l'inscription a réussi,
  // même si l'email n'est pas encore confirmé.
  if (data.user) {
    // Vérifier si la confirmation par email est requise (comportement par défaut)
    // Si data.session est null et data.user n'est pas null, la confirmation est probablement requise.
    if (!data.session) {
      return {
        success: true,
        message:
          "Inscription réussie ! Veuillez vérifier votre boîte de réception pour confirmer votre adresse email.",
      };
    }
    // Si la confirmation n'est pas activée (ou auto-confirmée), on peut rediriger
    // Cependant, il est plus sûr d'attendre la confirmation.
    // redirect('/'); // Optionnel: Rediriger directement si pas de confirmation
  }

  // Cas par défaut ou si quelque chose d'inattendu se produit
  return {
    success: false,
    error: "Une erreur inattendue est survenue lors de l'inscription.",
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
