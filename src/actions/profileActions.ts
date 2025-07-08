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
// Add this interface near the top with other type/schema definitions
interface AddressForSync {
  id: string;
  user_id: string;
  address_type: "shipping" | "billing";
  is_default: boolean;
  // We only need these fields for the logic
}

export async function syncProfileAddressFlag(
  locale: string,
  userId?: string // Optional: if called from a context where user ID is already known
): Promise<{ success: boolean; message?: string }> {
  const supabase = await createSupabaseServerClient();
  let currentUserId = userId;

  if (!currentUserId) {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("syncProfileAddressFlag: User not authenticated.", authError);
      return { success: false, message: "User not authenticated." };
    }
    currentUserId = user.id;
  }

  const { data: userAddresses, error: fetchAddressesError } = await supabase
    .from("addresses")
    .select("id, user_id, address_type, is_default")
    .eq("user_id", currentUserId);

  if (fetchAddressesError) {
    console.error("syncProfileAddressFlag: Error fetching user addresses:", fetchAddressesError);
    return { success: false, message: "Could not fetch user addresses." };
  }

  const defaultShippingAddress =
    userAddresses?.find(
      (addr: AddressForSync) => addr.address_type === "shipping" && addr.is_default
    ) || null;

  const defaultBillingAddress =
    userAddresses?.find(
      (addr: AddressForSync) => addr.address_type === "billing" && addr.is_default
    ) || null;

  let newBillingAddressIsDifferent = false;

  if (defaultBillingAddress) {
    if (defaultShippingAddress) {
      // If both exist, they are different if their IDs are different
      if (defaultBillingAddress.id !== defaultShippingAddress.id) {
        newBillingAddressIsDifferent = true;
      }
    } else {
      // Only default billing exists, so it's different from a non-existent default shipping
      newBillingAddressIsDifferent = true;
    }
  }
  // If no defaultBillingAddress, newBillingAddressIsDifferent remains false.

  const { error: updateProfileError } = await supabase
    .from("profiles")
    .update({
      billing_address_is_different: newBillingAddressIsDifferent,
      updated_at: new Date().toISOString(),
    })
    .eq("id", currentUserId);

  if (updateProfileError) {
    console.error("syncProfileAddressFlag: Error updating profile flag:", updateProfileError);
    return { success: false, message: "Could not update profile address flag." };
  }

  revalidatePath(`/${locale}/profile/account`);
  // Potentially revalidate addresses page too if it uses this flag, though less likely.
  // revalidatePath(`/${locale}/profile/addresses`);

  return { success: true, message: "Profile address flag synchronized." };
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

export async function setDefaultAddress(
  addressId: string,
  locale: string
): Promise<{ success: boolean; message?: string }> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "User not authenticated." };
  }

  const { error } = await supabase.rpc("set_default_address", {
    address_id_to_set: addressId,
    auth_user_id: user.id,
  });

  if (error) {
    console.error("Error setting default address:", error);
    return { success: false, message: error.message || "Failed to set default address." };
  }

  revalidatePath(`/${locale}/profile/addresses`);

  return { success: true };
}
