"use server";

// import { z } from "zod"; // Utilisé via ValidationError pour les erreurs Zod
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { addressSchema, AddressFormData } from "@/lib/validators/address.validator";
import { getTranslations } from "next-intl/server";

// New imports for Clean Architecture
import { ActionResult } from "@/lib/core/result";
import { LogUtils } from "@/lib/core/logger";
import { ValidationError, AuthenticationError, ErrorUtils } from "@/lib/core/errors";

export async function addAddress(
  data: AddressFormData,
  locale: string
): Promise<ActionResult<unknown>> {
  const context = LogUtils.createUserActionContext("unknown", "add_address", "profile");
  LogUtils.logOperationStart("add_address", context);

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new AuthenticationError("Utilisateur non authentifié");
    }
    context.userId = user.id;

    const t = await getTranslations({ locale, namespace: "AddressForm.serverActions" });

    // Validation avec Zod
    const validationResult = addressSchema.safeParse(data);
    if (!validationResult.success) {
      throw new ValidationError(t("validationError"), "address_validation", {
        issues: validationResult.error.issues,
      });
    }

    // Insertion en base
    const { data: newAddress, error: insertError } = await supabase
      .from("addresses")
      .insert([
        {
          ...validationResult.data,
          user_id: user.id,
        },
      ])
      .select()
      .single();

    if (insertError) {
      throw ErrorUtils.fromSupabaseError(insertError);
    }

    // Revalidation des pages
    revalidatePath(`/${locale}/profile/addresses`);
    revalidatePath(`/${locale}/checkout`);
    revalidatePath("/");

    // Synchronisation du flag billing_address_is_different
    try {
      const { syncProfileAddressFlag } = await import("./profileActions");
      await syncProfileAddressFlag(locale, user.id);
    } catch (syncError) {
      LogUtils.logOperationError("sync_profile_address_flag", syncError, context);
      // Ne pas faire échouer l'ajout si la sync échoue
    }

    LogUtils.logOperationSuccess("add_address", {
      ...context,
      addressType: validationResult.data.address_type,
    });
    return ActionResult.ok(newAddress, t("addSuccess"));
  } catch (error) {
    LogUtils.logOperationError("add_address", error, context);
    return ActionResult.error(
      ErrorUtils.isAppError(error)
        ? ErrorUtils.formatForUser(error)
        : "Erreur lors de l'ajout de l'adresse"
    );
  }
}

export async function updateAddress(
  addressId: string,
  data: AddressFormData,
  locale: string
): Promise<ActionResult<unknown>> {
  const context = LogUtils.createUserActionContext("unknown", "update_address", "profile", {
    addressId,
  });
  LogUtils.logOperationStart("update_address", context);

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new AuthenticationError("Utilisateur non authentifié");
    }
    context.userId = user.id;

    const t = await getTranslations({ locale, namespace: "AddressForm.serverActions" });

    // Validation avec Zod
    const validationResult = addressSchema.safeParse(data);
    if (!validationResult.success) {
      throw new ValidationError(t("validationError"), "address_validation", {
        issues: validationResult.error.issues,
      });
    }

    // Mise à jour en base (avec sécurité utilisateur)
    const { data: updatedAddress, error: updateError } = await supabase
      .from("addresses")
      .update(validationResult.data)
      .eq("id", addressId)
      .eq("user_id", user.id) // Sécurité : utilisateur ne peut modifier que ses adresses
      .select()
      .single();

    if (updateError) {
      throw ErrorUtils.fromSupabaseError(updateError);
    }

    // Revalidation des pages
    revalidatePath(`/${locale}/profile/addresses`);
    revalidatePath(`/${locale}/checkout`);
    revalidatePath("/");

    // Synchronisation du flag billing_address_is_different
    try {
      const { syncProfileAddressFlag } = await import("./profileActions");
      await syncProfileAddressFlag(locale, user.id);
    } catch (syncError) {
      LogUtils.logOperationError("sync_profile_address_flag", syncError, context);
      // Ne pas faire échouer la mise à jour si la sync échoue
    }

    LogUtils.logOperationSuccess("update_address", {
      ...context,
      addressType: validationResult.data.address_type,
    });
    return ActionResult.ok(updatedAddress, t("updateSuccess"));
  } catch (error) {
    LogUtils.logOperationError("update_address", error, context);
    return ActionResult.error(
      ErrorUtils.isAppError(error)
        ? ErrorUtils.formatForUser(error)
        : "Erreur lors de la mise à jour de l'adresse"
    );
  }
}

export async function deleteAddress(addressId: string): Promise<ActionResult<unknown>> {
  const context = LogUtils.createUserActionContext("unknown", "delete_address", "profile", {
    addressId,
  });
  LogUtils.logOperationStart("delete_address", context);

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new AuthenticationError("Utilisateur non authentifié");
    }
    context.userId = user.id;

    // Suppression en base (avec sécurité utilisateur)
    const { error: deleteError } = await supabase
      .from("addresses")
      .delete()
      .eq("id", addressId)
      .eq("user_id", user.id); // Sécurité : utilisateur ne peut supprimer que ses adresses

    if (deleteError) {
      throw ErrorUtils.fromSupabaseError(deleteError);
    }

    // Revalidation des pages
    revalidatePath("/profile/addresses");
    revalidatePath("/checkout");
    revalidatePath("/");

    // Synchronisation du flag billing_address_is_different
    try {
      const { syncProfileAddressFlag } = await import("./profileActions");
      await syncProfileAddressFlag("fr", user.id);
    } catch (syncError) {
      LogUtils.logOperationError("sync_profile_address_flag", syncError, context);
      // Ne pas faire échouer la suppression si la sync échoue
    }

    LogUtils.logOperationSuccess("delete_address", context);
    return ActionResult.ok(null, "Adresse supprimée avec succès");
  } catch (error) {
    LogUtils.logOperationError("delete_address", error, context);
    return ActionResult.error(
      ErrorUtils.isAppError(error)
        ? ErrorUtils.formatForUser(error)
        : "Erreur lors de la suppression de l'adresse"
    );
  }
}

export async function getUserAddresses(): Promise<ActionResult<unknown[]>> {
  const context = LogUtils.createUserActionContext("unknown", "get_user_addresses", "profile");
  LogUtils.logOperationStart("get_user_addresses", context);

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new AuthenticationError("Utilisateur non authentifié");
    }
    context.userId = user.id;

    // Récupération des adresses de l'utilisateur
    const { data: addresses, error: fetchError } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (fetchError) {
      throw ErrorUtils.fromSupabaseError(fetchError);
    }

    LogUtils.logOperationSuccess("get_user_addresses", {
      ...context,
      count: addresses?.length || 0,
    });
    return ActionResult.ok(addresses || []);
  } catch (error) {
    LogUtils.logOperationError("get_user_addresses", error, context);
    return ActionResult.error(
      ErrorUtils.isAppError(error)
        ? ErrorUtils.formatForUser(error)
        : "Erreur lors de la récupération des adresses"
    );
  }
}
