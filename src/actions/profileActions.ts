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

  const rawFormData = {
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    phone_number: formData.get("phone_number"),
    shipping_address_line1: formData.get("shipping_address_line1"),
    shipping_address_line2: formData.get("shipping_address_line2"),
    shipping_postal_code: formData.get("shipping_postal_code"),
    shipping_city: formData.get("shipping_city"),
    shipping_country: formData.get("shipping_country"),
    terms_accepted: formData.get("terms_accepted") === "on",
  };

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

  const { terms_accepted, ...profileUpdateData } = validationResult.data;

  let termsAcceptedAtValue: string | null | undefined = undefined;

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("terms_accepted_at")
    .eq("id", user.id)
    .single();

  if (terms_accepted === true) {
    if (!currentProfile?.terms_accepted_at) {
      termsAcceptedAtValue = new Date().toISOString();
    }
  } else if (terms_accepted === false) {
    termsAcceptedAtValue = null;
  }

  const dataToUpsert: any = {
    ...profileUpdateData,
    id: user.id,
    updated_at: new Date().toISOString(),
  };

  if (termsAcceptedAtValue !== undefined) {
    dataToUpsert.terms_accepted_at = termsAcceptedAtValue;
  }

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
