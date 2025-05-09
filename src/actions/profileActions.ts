"use server";

import { z } from "zod";
import { profileSchema } from "@/lib/schemas/profileSchema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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

  const rawFormData = {
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    phone_number: formData.get("phone_number"),
  };

  // Le champ 'locale' sera ajouté au formulaire pour la revalidation
  const locale = (formData.get("locale") as string) || "en"; // Default locale si non fourni

  const validationResult = profileSchema.safeParse(rawFormData);

  if (!validationResult.success) {
    return {
      success: false,
      message: "Validation failed. Please check the errors.",
      errors: validationResult.error.flatten().fieldErrors,
    };
  }

  const { error: upsertError } = await supabase
    .from("profiles")
    .upsert({
      id: user.id, // Clé primaire pour l'upsert
      ...validationResult.data,
      updated_at: new Date().toISOString(), // Optionnel: gérer manuellement updated_at
    })
    .select()
    .single(); // Pour obtenir l'enregistrement mis à jour/inséré

  if (upsertError) {
    console.error("Supabase upsert error:", upsertError);
    return {
      success: false,
      message: upsertError.message || "Failed to update profile. Please try again.",
      errors: null,
    };
  }

  // Revalidation des chemins pertinents
  // Assurez-vous que les chemins sont corrects et dynamiques si nécessaire
  revalidatePath(`/${locale}/profile/account/edit`);
  revalidatePath(`/${locale}/profile/account`); // Page de visualisation du profil
  // Potentiellement revalidatePath('/') si le nom d'utilisateur est affiché dans le header, par exemple.

  return {
    success: true,
    message: "Profile updated successfully!",
    errors: null,
    resetKey: Date.now().toString(), // Pour aider à réinitialiser le formulaire côté client
  };
}
