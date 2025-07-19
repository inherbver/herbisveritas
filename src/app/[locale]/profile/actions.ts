// src/app/[locale]/profile/actions.ts
"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";
import { checkUserPermission } from "@/lib/auth/server-auth";
import { z, type ZodIssue as _ZodIssue } from "zod";

const UpdatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Le mot de passe actuel est requis."), // TODO: Internationalize
    newPassword: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères.") // TODO: Internationalize
      .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule.") // TODO: Internationalize
      .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre.") // TODO: Internationali
      .regex(/[^A-Za-z0-9]/, "Le mot de passe doit contenir au moins un caractère spécial."), // TODO: Internationalize
    confirmPassword: z.string(), // Sera validé par .refine côté client, mais on le garde pour la forme ici
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.", // TODO: Internationalize
    path: ["confirmPassword"],
  });

export interface UpdatePasswordResult {
  success: boolean;
  message: string;
  error?: {
    field?: "currentPassword" | "newPassword" | "confirmPassword" | "general";
    message: string;
  } | null;
}

// Generic type for profile action results for consistent return shapes
type ProfileActionResult<T> = {
  success: boolean;
  error?: string | null;
  data?: T;
};

export async function updateProfile(formData: FormData): Promise<ProfileActionResult<Profile>> {
  // For profile actions, a manual check is often clearer,
  // especially when the user ID is needed for the query.
  const { isAuthorized, user, error: permError } = await checkUserPermission("profile:update:own");

  if (!isAuthorized || !user) {
    return {
      success: false,
      error: permError || "User not authorized to update this profile.",
    };
  }

  const supabase = await createSupabaseServerClient();

  // TODO: Add Zod validation for profile data
  const updates = {
    first_name: formData.get("firstName") as string,
    last_name: formData.get("lastName") as string,
    phone: formData.get("phone") as string,
    // Ensure we don't allow updating arbitary fields
  };

  const { data, error: updateError } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id) // ✅ Always scope updates to the authenticated user's ID
    .select()
    .single();

  if (updateError) {
    return {
      success: false,
      error: `Failed to update profile: ${updateError.message}`,
    };
  }

  revalidatePath("/[locale]/profile", "layout");
  return { success: true, data };
}

export async function updatePasswordAction(
  prevState: UpdatePasswordResult | null, // prevState can be null initially
  formData: FormData
): Promise<UpdatePasswordResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // TODO: Internationalize "User not authenticated. Please log in again."
    // Pour l'instant, on utilise un message en dur, mais il faudrait une clé de traduction.
    // Par exemple: Global.errors.userNotAuthenticated
    return {
      success: false,
      message: "User not authenticated.", // Ce message n'est pas directement utilisé par le client pour les erreurs generales si error.message est fourni
      error: {
        field: "general",
        message: "User not authenticated. Please log in again.", // Ce message sera affiché
      },
    };
  }

  const formDataObj = Object.fromEntries(formData.entries());
  const validation = UpdatePasswordSchema.safeParse(formDataObj);

  if (!validation.success) {
    // Simplistic error reporting for now, ideally map Zod issues to field errors
    return {
      success: false,
      message: "Validation échouée.", // TODO: Internationalize
      error: {
        field: "general",
        message:
          validation.error.flatten().formErrors.join(", ") +
            Object.entries(validation.error.flatten().fieldErrors)
              .map(([field, errors]) => `${field}: ${errors?.join(", ")}`)
              .join("; ") || "Erreur de validation détaillée.",
      },
    };
  }

  const { currentPassword, newPassword } = validation.data;

  // 1. Verify current password
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  });

  if (signInError) {
    return {
      success: false,
      message: "Le mot de passe actuel est incorrect.", // TODO: Internationalize
      error: { field: "currentPassword", message: "Le mot de passe actuel est incorrect." }, // TODO: Internationalize
    };
  }

  // 2. Update to the new password
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    console.error("Error updating password:", error.message);
    return { success: false, message: `Error updating password: ${error.message}` };
  }

  // Optionnel: revalider un chemin si la mise à jour du mot de passe affecte d'autres données affichées.
  // revalidatePath("/[locale]/profile/account", "layout");

  // 3. Sign out the user for security (optional, but recommended)
  // Consider if this is the desired UX. If so, client needs to handle redirect to login.
  await supabase.auth.signOut();

  return {
    success: true,
    message: "Votre mot de passe a été mis à jour avec succès. Veuillez vous reconnecter.", // TODO: Internationalize
    error: null,
  };
}
