/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/schemas/profileSchema";

export interface UpdateProfileFormState {
  success: boolean;
  message: string;
  errors?: Partial<Record<keyof z.infer<typeof profileSchema>, string[]>> | null;
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

  const rawFormValueForBillingDifferent = formData.get("billing_address_is_different");
  console.log("Raw 'billing_address_is_different' from formData:", rawFormValueForBillingDifferent);
  console.log(
    "Type of raw 'billing_address_is_different' from formData:",
    typeof rawFormValueForBillingDifferent
  );

  const rawFormData = {
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    phone_number: formData.get("phone_number"),
    shipping_address_line1: formData.get("shipping_address_line1"),
    shipping_address_line2: formData.get("shipping_address_line2"),
    shipping_postal_code: formData.get("shipping_postal_code"),
    shipping_city: formData.get("shipping_city"),
    shipping_country: formData.get("shipping_country"),
    billing_address_is_different: rawFormValueForBillingDifferent === "true",
    billing_address_line1: formData.get("billing_address_line1"),
    billing_address_line2: formData.get("billing_address_line2"),
    billing_postal_code: formData.get("billing_postal_code"),
    billing_city: formData.get("billing_city"),
    billing_country: formData.get("billing_country"),
  };

  console.log("Processed rawFormData for Zod:", JSON.stringify(rawFormData, null, 2));

  const locale = (formData.get("locale") as string) || "en";

  const validationResult = profileSchema.safeParse(rawFormData);

  if (!validationResult.success) {
    console.log("Validation errors:", validationResult.error.flatten());
    return {
      success: false,
      message: "Validation failed. Please check the errors.",
      errors: validationResult.error.flatten().fieldErrors as any,
    };
  }

  const profileUpdateData = validationResult.data;
  console.log(
    "'billing_address_is_different' after Zod parsing:",
    profileUpdateData.billing_address_is_different
  );

  const dataToUpsert: any = {
    id: user.id,
    updated_at: new Date().toISOString(),
    first_name: profileUpdateData.first_name,
    last_name: profileUpdateData.last_name,
    phone_number: profileUpdateData.phone_number,
    shipping_address_line1: profileUpdateData.shipping_address_line1,
    shipping_address_line2: profileUpdateData.shipping_address_line2,
    shipping_postal_code: profileUpdateData.shipping_postal_code,
    shipping_city: profileUpdateData.shipping_city,
    shipping_country: profileUpdateData.shipping_country,
    billing_address_is_different: profileUpdateData.billing_address_is_different,
  };

  console.log(
    "'billing_address_is_different' in dataToUpsert before Supabase:",
    dataToUpsert.billing_address_is_different
  );

  if (profileUpdateData.billing_address_is_different) {
    dataToUpsert.billing_address_line1 = profileUpdateData.billing_address_line1;
    dataToUpsert.billing_address_line2 = profileUpdateData.billing_address_line2;
    dataToUpsert.billing_postal_code = profileUpdateData.billing_postal_code;
    dataToUpsert.billing_city = profileUpdateData.billing_city;
    dataToUpsert.billing_country = profileUpdateData.billing_country;
  }
  // Le bloc 'else' qui mettait les champs à null a été supprimé pour préserver les données.

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
