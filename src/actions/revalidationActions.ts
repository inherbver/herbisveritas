"use server";

import { revalidatePath } from "next/cache";
import { Locale } from "@/i18n-config"; // Assuming Locale type is accessible here

export async function revalidateProfilePaths(locale: Locale) {
  try {
    console.log(`[Server Action] Revalidating /${locale}/profile/addresses`);
    revalidatePath(`/${locale}/profile/addresses`);

    console.log(`[Server Action] Revalidating /${locale}/profile/account`);
    revalidatePath(`/${locale}/profile/account`);

    return { success: true };
  } catch (error) {
    console.error("[Server Action] Error revalidating paths:", error);
    return { success: false, error: "Failed to revalidate paths" };
  }
}
