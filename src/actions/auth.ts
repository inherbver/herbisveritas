// Indique que ce fichier contient des Server Actions
"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server"; // Importe le client Supabase côté serveur

// --- Schéma Login ---
const loginSchema = z.object({
  email: z.string().email({ message: "L'adresse email n'est pas valide." }),
  password: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères." }),
});

// --- Schéma Inscription ---
const signUpSchema = z
  .object({
    email: z.string().email({ message: "L'adresse email n'est pas valide." }),
    password: z
      .string()
      .min(6, { message: "Le mot de passe doit contenir au moins 6 caractères." }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    // Validation personnalisée pour vérifier que les mots de passe correspondent
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"], // Indique que l'erreur concerne le champ confirmPassword
  });

// --- Types d'Actions ---
interface ActionResult {
  error?: string;
  message?: string; // Ajouté pour les messages de succès/info
}

// --- Action de Connexion ---
export async function loginAction(
  prevState: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();

  // 1. Valider les données
  const validatedFields = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    const errorMessage = validatedFields.error.issues.map((issue) => issue.message).join("\n");
    return { error: errorMessage };
  }

  const { email, password } = validatedFields.data;

  // 2. Essayer de connecter
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("Erreur Supabase Auth (Login):", error.message);
    return { error: "L'email ou le mot de passe est incorrect." };
  }

  // 3. Rediriger si succès
  console.log("Connexion réussie pour:", email);
  redirect("/");
}

// --- Action d'Inscription ---
export async function signUpAction(
  prevState: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();

  // 1. Valider les données du formulaire avec Zod (incluant la confirmation de mdp)
  const validatedFields = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  // Si la validation échoue
  if (!validatedFields.success) {
    const errorMessage = validatedFields.error.issues.map((issue) => issue.message).join("\n");
    return { error: errorMessage };
  }

  const { email, password } = validatedFields.data;

  // 2. Essayer d'inscrire l'utilisateur avec Supabase
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Options (ex: redirection après confirmation email, données utilisateur supplémentaires)
    // options: {
    //   emailRedirectTo: `${location.origin}/auth/callback`,
    // }
  });

  // Si Supabase renvoie une erreur (ex: utilisateur existe déjà)
  if (error) {
    console.error("Erreur Supabase Auth (Signup):", error.message);
    // Analyser l'erreur pour un message plus spécifique si possible/souhaité
    if (error.message.includes("User already registered")) {
      return { error: "Un compte existe déjà avec cette adresse email." };
    }
    return { error: "Une erreur est survenue lors de l'inscription. Veuillez réessayer." };
  }

  // 3. Si succès (et la confirmation par email est activée par défaut)
  // Supabase renvoie data.user non null si l'inscription a réussi,
  // même si l'email n'est pas encore confirmé.
  if (data.user) {
    console.log("Inscription initiée pour:", email, "ID:", data.user.id);
    // Vérifier si la confirmation par email est requise (comportement par défaut)
    // Si data.session est null et data.user n'est pas null, la confirmation est probablement requise.
    if (!data.session) {
      return {
        message:
          "Inscription réussie ! Veuillez vérifier votre boîte de réception pour confirmer votre adresse email.",
      };
    }
    // Si la confirmation n'est pas activée (ou auto-confirmée), on peut rediriger
    // Cependant, il est plus sûr d'attendre la confirmation.
    // redirect('/'); // Optionnel: Rediriger directement si pas de confirmation
  }

  // Cas par défaut ou si quelque chose d'inattendu se produit
  return { error: "Une erreur inattendue est survenue lors de l'inscription." };
}
