/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// New schema for account information only
const accountInfoSchema = z.object({
  first_name: z
    .string()
    .min(2, { message: "First name must be at least 2 characters." })
    .max(50, { message: "First name must be at most 50 characters." })
    .trim(),
  last_name: z
    .string()
    .min(2, { message: "Last name must be at least 2 characters." })
    .max(50, { message: "Last name must be at most 50 characters." })
    .trim(),
  phone_number: z
    .string()
    .regex(/^(\+\d{1,3}[- ]?)?\d{10}$/, { message: "Invalid phone number format." })
    .or(z.literal("")) // Allows empty string
    .nullable(), // Allows null
});

export interface UpdateProfileFormState {
  // This state type might need to be adjusted if its errors field is tied to the full profileSchema
  success: boolean;
  message: string;
  errors?: Partial<Record<keyof z.infer<typeof accountInfoSchema>, string[]>> | null; // Adjusted to accountInfoSchema
  resetKey?: string; // To help trigger form reset on successful submission
}

export async function updateUserProfile(
  prevState: UpdateProfileFormState,
  formData: FormData
): Promise<UpdateProfileFormState> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "User not authenticated.",
      errors: null,
    };
  }

  const rawFormData = {
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    phone_number: formData.get("phone_number"),
  };

  // console.log("Processed rawFormData for Zod:", JSON.stringify(rawFormData, null, 2));

  const locale = (formData.get("locale") as string) || "en";

  const validationResult = accountInfoSchema.safeParse(rawFormData);

  if (!validationResult.success) {
    console.log("Validation errors:", validationResult.error.flatten());
    return {
      success: false,
      message: "Validation failed. Please check the errors.",
      errors: validationResult.error.flatten().fieldErrors as any,
    };
  }

  const accountInfoUpdateData = validationResult.data;

  const dataToUpsert: any = {
    id: user.id,
    updated_at: new Date().toISOString(),
    first_name: accountInfoUpdateData.first_name,
    last_name: accountInfoUpdateData.last_name,
    phone_number: accountInfoUpdateData.phone_number,
  };

  // Removed all address-related logic from dataToUpsert

  const { error: upsertError } = await supabase
    .from("profiles")
    .upsert(dataToUpsert)
    .select()
    .single();

  if (upsertError) {
    console.error("Supabase upsert error:", upsertError);
    return {
      success: false,
      message: upsertError.message || "Failed to update profile. Please try again.",
      errors: null,
    };
  }

  revalidatePath(`/${locale}/profile/account/edit`);
  revalidatePath(`/${locale}/profile/account`);

  return {
    success: true,
    message: "Profile updated successfully!",
    errors: null,
    resetKey: Date.now().toString(),
  };
}

// Schéma Zod pour la validation des données du formulaire de changement de mot de passe
const passwordUpdateSchema = z.object({
  // currentPassword n'est pas directement vérifiable par supabase.auth.updateUser sans une étape supplémentaire.
  // La vérification est généralement gérée côté client ou par une étape de re-authentification.
  newPassword: z.string().min(8, "New password must be at least 8 characters long."),
  // confirmPassword est validé côté client pour la correspondance.
});

interface UpdatePasswordResult {
  success: boolean;
  error?: {
    message: string;
    code?: string;
  } | null;
}

export async function updatePassword(
  // Le formulaire enverra currentPassword, newPassword, confirmPassword.
  // Seul newPassword est requis par la fonction supabase.auth.updateUser.
  values: { newPassword: string; currentPassword?: string } // currentPassword est optionnel ici, car non utilisé par updateUser
): Promise<UpdatePasswordResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { success: false, error: { message: "User not authenticated." } };
  }

  // Valider uniquement newPassword car c'est ce que updateUser attend.
  const validatedFields = passwordUpdateSchema.safeParse({ newPassword: values.newPassword });
  if (!validatedFields.success) {
    const firstErrorMessage = validatedFields.error.errors[0]?.message || "Invalid new password.";
    return {
      success: false,
      error: { message: firstErrorMessage },
    };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: validatedFields.data.newPassword,
  });

  if (updateError) {
    console.error("Supabase update user (password) error:", updateError);
    // TODO: Traduire ces messages d'erreur potentiels ou les mapper à des clés de traduction
    let friendlyMessage = "Failed to update password.";
    if (updateError.message.includes("New password should be different from the old password.")) {
      friendlyMessage = "Le nouveau mot de passe doit être différent de l'ancien."; // Exemple de traduction
    }
    // Vous pouvez ajouter d'autres conditions pour des messages d'erreur spécifiques de Supabase ici

    return {
      success: false,
      error: {
        message: friendlyMessage,
        code: updateError.code,
      },
    };
  }

  // Optionnel: Révalider des chemins si nécessaire, par exemple pour déconnecter l'utilisateur
  // ou mettre à jour une section "dernière modification du mot de passe".
  // revalidatePath('/profile/account');

  return { success: true };
}
