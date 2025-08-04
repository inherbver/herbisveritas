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

// Interface pour les erreurs de validation du profil
type ProfileValidationErrors = Partial<Record<keyof z.infer<typeof accountInfoSchema>, string[]>>;

// Interface pour les données à insérer dans la base de données
interface ProfileUpsertData {
  id: string;
  updated_at: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
}

export interface UpdateProfileFormState {
  success: boolean;
  message: string;
  errors?: ProfileValidationErrors | null;
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
      errors: validationResult.error.flatten().fieldErrors as ProfileValidationErrors,
    };
  }

  const accountInfoUpdateData = validationResult.data;

  const dataToUpsert: ProfileUpsertData = {
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

/**
 * Synchronise le champ billing_address_is_different dans le profil utilisateur
 * en comparant les adresses de livraison et facturation par défaut
 */
export async function syncProfileAddressFlag(
  locale: string,
  userId?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const supabase = await createSupabaseServerClient();

  // Récupère l'utilisateur actuel si userId n'est pas fourni
  let targetUserId = userId;
  if (!targetUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "User not authenticated." };
    }
    targetUserId = user.id;
  }

  try {
    // Récupère toutes les adresses de l'utilisateur (même logique que dans page.tsx)
    const { data: userAddresses, error: addressesError } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", targetUserId);

    if (addressesError) {
      console.error("Error fetching addresses:", addressesError);
      return { success: false, error: "Failed to fetch user addresses" };
    }

    // Utilise la même logique que dans la page account (lignes 167-178)
    const defaultShippingAddress =
      userAddresses?.find((addr) => addr.is_default && addr.address_type === "shipping") ?? null;
    const defaultBillingAddress =
      userAddresses?.find((addr) => addr.is_default && addr.address_type === "billing") ?? null;

    // Détermine les adresses effectives (par défaut ou première du type)
    const effectiveShipping =
      defaultShippingAddress ??
      userAddresses?.find((addr) => addr.address_type === "shipping") ??
      null;
    const effectiveBilling =
      defaultBillingAddress ??
      userAddresses?.find((addr) => addr.address_type === "billing") ??
      null;

    // Détermine si les adresses sont différentes
    let billingAddressIsDifferent = false;

    if (effectiveShipping && effectiveBilling) {
      // Compare les champs importants des adresses
      billingAddressIsDifferent = !(
        effectiveShipping.address_line1 === effectiveBilling.address_line1 &&
        effectiveShipping.address_line2 === effectiveBilling.address_line2 &&
        effectiveShipping.city === effectiveBilling.city &&
        effectiveShipping.postal_code === effectiveBilling.postal_code &&
        effectiveShipping.country_code === effectiveBilling.country_code &&
        effectiveShipping.state_province_region === effectiveBilling.state_province_region
      );
    } else if (effectiveBilling && !effectiveShipping) {
      // Si seule l'adresse de facturation existe, elles sont différentes
      billingAddressIsDifferent = true;
    }
    // Si seule l'adresse de livraison existe ou aucune des deux, billing_address_is_different = false

    // Met à jour le profil
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        billing_address_is_different: billingAddressIsDifferent,
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetUserId);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      return { success: false, error: "Failed to update profile" };
    }

    // Revalide les pages concernées
    revalidatePath(`/${locale}/profile/account`);
    revalidatePath(`/${locale}/profile/addresses`);
    revalidatePath(`/${locale}/checkout`);

    return {
      success: true,
      message: `Profile address flag updated: ${billingAddressIsDifferent}`,
    };
  } catch (error) {
    console.error("Error in syncProfileAddressFlag:", error);
    return { success: false, error: "Internal server error" };
  }
}

/**
 * Met à jour le flag billing_address_is_different dans le profil utilisateur
 */
export async function setBillingAddressSameAsShipping(
  isSame: boolean,
  locale: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const supabase = await createSupabaseServerClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "User not authenticated." };
    }

    // Mettre à jour le flag dans le profil
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        billing_address_is_different: !isSame,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating billing address flag:", updateError);
      return { success: false, error: "Failed to update profile." };
    }

    // Si l'utilisateur indique que les adresses sont identiques,
    // copier l'adresse de livraison vers l'adresse de facturation
    if (isSame) {
      // Récupérer l'adresse de livraison par défaut
      const { data: shippingAddress, error: shippingError } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", user.id)
        .eq("address_type", "shipping")
        .eq("is_default", true)
        .single();

      if (shippingError && shippingError.code !== "PGRST116") {
        console.error("Error fetching shipping address:", shippingError);
        return { success: false, error: "Failed to fetch shipping address." };
      }

      if (shippingAddress) {
        // Supprimer l'ancienne adresse de facturation par défaut
        await supabase
          .from("addresses")
          .delete()
          .eq("user_id", user.id)
          .eq("address_type", "billing");

        // Créer une nouvelle adresse de facturation basée sur l'adresse de livraison
        const { error: insertError } = await supabase.from("addresses").insert({
          user_id: user.id,
          address_type: "billing",
          is_default: true,
          company_name: shippingAddress.company_name,
          first_name: shippingAddress.first_name,
          last_name: shippingAddress.last_name,
          street_number: shippingAddress.street_number,
          address_line1: shippingAddress.address_line1,
          address_line2: shippingAddress.address_line2,
          postal_code: shippingAddress.postal_code,
          city: shippingAddress.city,
          country_code: shippingAddress.country_code,
          state_province_region: shippingAddress.state_province_region,
          phone_number: shippingAddress.phone_number,
          email: shippingAddress.email,
        });

        if (insertError) {
          console.error("Error creating billing address:", insertError);
          return { success: false, error: "Failed to synchronize addresses." };
        }
      }
    }

    // Revalider les pages concernées
    revalidatePath(`/${locale}/profile/account`);
    revalidatePath(`/${locale}/profile/addresses`);
    revalidatePath(`/${locale}/checkout`);

    return {
      success: true,
      message: isSame
        ? "Billing address synchronized with shipping address."
        : "Billing address set as different from shipping address.",
    };
  } catch (error) {
    console.error("Error in setBillingAddressSameAsShipping:", error);
    return { success: false, error: "Internal server error" };
  }
}
