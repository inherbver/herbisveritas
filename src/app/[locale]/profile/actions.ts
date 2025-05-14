// src/app/[locale]/profile/actions.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const UpdatePasswordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters long."),
  // On pourrait ajouter une confirmation de mot de passe ici si la validation se fait côté serveur
  // mais il est plus courant de la gérer côté client et de n'envoyer que le newPassword à l'action.
});

interface UpdatePasswordResult {
  success: boolean;
  message: string;
}

export async function updatePasswordAction(
   
  prevState: UpdatePasswordResult, // Added prevState, marked as unused for now
  formData: FormData
): Promise<UpdatePasswordResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "User not authenticated." };
  }

  const rawFormData = {
    newPassword: formData.get("newPassword"),
  };

  const validation = UpdatePasswordSchema.safeParse(rawFormData);

  if (!validation.success) {
    return {
      success: false,
      message: validation.error.errors.map((e) => e.message).join(", "),
    };
  }

  const { newPassword } = validation.data;

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    console.error("Error updating password:", error.message);
    return { success: false, message: `Error updating password: ${error.message}` };
  }

  // Optionnel: revalider un chemin si la mise à jour du mot de passe affecte d'autres données affichées.
  // revalidatePath("/[locale]/profile/account", "layout");

  return { success: true, message: "Password updated successfully." };
}
