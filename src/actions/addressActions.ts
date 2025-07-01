"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { addressSchema, AddressFormData } from "@/lib/validators/address.validator";
import { getTranslations } from "next-intl/server";

interface ActionResult {
  success: boolean;
  message?: string;
  error?: {
    message?: string;
    issues?: z.ZodIssue[];
  };
}

export async function addAddress(data: AddressFormData, locale: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: { message: "User not authenticated." } };
  }

  const t = await getTranslations({ locale, namespace: "AddressForm.serverActions" });

  const validationResult = addressSchema.safeParse(data);
  if (!validationResult.success) {
    return {
      success: false,
      error: {
        message: t("validationError"),
        issues: validationResult.error.issues,
      },
    };
  }

  try {
    const { error: insertError } = await supabase.from("addresses").insert([
      {
        ...validationResult.data,
        user_id: user.id,
      },
    ]);

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      return { success: false, error: { message: t("addError") } };
    }

    revalidatePath(`/${locale}/profile/addresses`);
    return { success: true, message: t("addSuccess") };
  } catch (error) {
    console.error("Error adding address:", error);
    return { success: false, error: { message: t("addError") } };
  }
}

export async function updateAddress(
  addressId: string,
  data: AddressFormData,
  locale: string
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: { message: "User not authenticated." } };
  }

  const t = await getTranslations({ locale, namespace: "AddressForm.serverActions" });

  const validationResult = addressSchema.safeParse(data);
  if (!validationResult.success) {
    return {
      success: false,
      error: {
        message: t("validationError"),
        issues: validationResult.error.issues,
      },
    };
  }

  try {
    const { error: updateError } = await supabase
      .from("addresses")
      .update(validationResult.data)
      .eq("id", addressId)
      .eq("user_id", user.id); // Ensure user can only update their own address

    if (updateError) {
      console.error("Supabase update error:", updateError);
      return { success: false, error: { message: t("updateError") } };
    }

    revalidatePath(`/${locale}/profile/addresses`);
    return { success: true, message: t("updateSuccess") };
  } catch (error) {
    console.error("Error updating address:", error);
    return { success: false, error: { message: t("updateError") } };
  }
}
