"use server";

/**
 * Partner Server Actions
 *
 * Server actions for CRUD operations on partners.
 * Includes authentication, validation, and event emission.
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkAdminRole } from "@/lib/auth/admin-service";
import { ActionResult } from "@/lib/core/result";
import type {
  Partner,
  CreatePartnerData as _CreatePartnerData,
  UpdatePartnerData as _UpdatePartnerData,
} from "@/types/partner";
import {
  createPartnerSchema,
  updatePartnerSchema,
  validatePartnerForm,
  updatePartnerOrderSchema,
  togglePartnerStatusSchema,
} from "@/lib/validators/partner";
import {
  uploadPartnerImageCore,
  UploadImageResult as CoreUploadImageResult,
} from "@/lib/storage/image-upload";

/**
 * Create a new partner
 */
export async function createPartner(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. Check admin permissions
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Non authentifié" };
    }
    const isAdmin = await checkAdminRole(user.id);
    if (!isAdmin) {
      return {
        success: false,
        error: "Accès non autorisé. Seuls les administrateurs peuvent créer des partenaires.",
      };
    }

    // 2. Validate form data
    const validatedData = validatePartnerForm(formData);
    if (!validatedData) {
      return { success: false, error: "Données du formulaire invalides" };
    }

    // 3. Validate with schema
    const validation = createPartnerSchema.safeParse(validatedData);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return {
        success: false,
        error: `Validation échouée: ${firstError.message}`,
      };
    }

    // 4. Insert into database
    const { data, error } = await supabase
      .from("partners")
      .insert(validation.data)
      .select("id")
      .single();

    if (error) {
      console.error("Database error creating partner:", error);
      return {
        success: false,
        error: "Erreur lors de la création du partenaire en base de données",
      };
    }

    // 5. Revalidate cache
    revalidatePath("/partenaires");
    revalidatePath("/admin/partners");

    // 6. TODO: Emit event (Phase 4)
    // await emitPartnerCreatedEvent(data.id, validation.data);

    return {
      success: true,
      data: { id: data.id },
      message: "Partenaire créé avec succès",
    };
  } catch (error) {
    console.error("Unexpected error creating partner:", error);
    return {
      success: false,
      error: "Erreur inattendue lors de la création du partenaire",
    };
  }
}

/**
 * Update an existing partner
 */
export async function updatePartner(id: string, formData: FormData): Promise<ActionResult<void>> {
  try {
    // 1. Check admin permissions
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Non authentifié" };
    }
    const isAdmin = await checkAdminRole(user.id);
    if (!isAdmin) {
      return {
        success: false,
        error: "Accès non autorisé. Seuls les administrateurs peuvent modifier des partenaires.",
      };
    }

    // 2. Validate form data
    const validatedData = validatePartnerForm(formData);
    if (!validatedData) {
      return { success: false, error: "Données du formulaire invalides" };
    }

    // 3. Validate with schema
    const validation = updatePartnerSchema.safeParse({
      id,
      ...validatedData,
    });
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return {
        success: false,
        error: `Validation échouée: ${firstError.message}`,
      };
    }

    // 4. Update in database
    const { error } = await supabase.from("partners").update(validation.data).eq("id", id);

    if (error) {
      console.error("Database error updating partner:", error);
      return {
        success: false,
        error: "Erreur lors de la modification du partenaire",
      };
    }

    // 5. Revalidate cache
    revalidatePath("/partenaires");
    revalidatePath("/admin/partners");

    // 6. TODO: Emit event (Phase 4)
    // await emitPartnerUpdatedEvent(id, validation.data);

    return {
      success: true,
      message: "Partenaire modifié avec succès",
    };
  } catch (error) {
    console.error("Unexpected error updating partner:", error);
    return {
      success: false,
      error: "Erreur inattendue lors de la modification du partenaire",
    };
  }
}

/**
 * Delete a partner
 */
export async function deletePartner(id: string): Promise<ActionResult<void>> {
  try {
    // 1. Check admin permissions
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Non authentifié" };
    }
    const isAdmin = await checkAdminRole(user.id);
    if (!isAdmin) {
      return {
        success: false,
        error: "Accès non autorisé. Seuls les administrateurs peuvent supprimer des partenaires.",
      };
    }

    // 2. Validate ID
    if (!id || typeof id !== "string") {
      return { success: false, error: "ID de partenaire invalide" };
    }

    // 3. Get partner details before deletion (for event emission)
    const { data: partner, error: fetchError } = await supabase
      .from("partners")
      .select("name")
      .eq("id", id)
      .single();

    if (fetchError) {
      return {
        success: false,
        error: "Partenaire non trouvé ou erreur d'accès",
      };
    }

    // 4. Delete from database
    const { error } = await supabase.from("partners").delete().eq("id", id);

    if (error) {
      console.error("Database error deleting partner:", error);
      return {
        success: false,
        error: "Erreur lors de la suppression du partenaire",
      };
    }

    // 5. Revalidate cache
    revalidatePath("/partenaires");
    revalidatePath("/admin/partners");

    // 6. TODO: Emit event (Phase 4)
    // await emitPartnerDeletedEvent(id, partner);

    return {
      success: true,
      message: `Partenaire "${partner.name}" supprimé avec succès`,
    };
  } catch (error) {
    console.error("Unexpected error deleting partner:", error);
    return {
      success: false,
      error: "Erreur inattendue lors de la suppression du partenaire",
    };
  }
}

/**
 * Get all partners (for admin interface)
 */
export async function getPartners(): Promise<ActionResult<Partner[]>> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: partners, error } = await supabase
      .from("partners")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Database error fetching partners:", error);
      return {
        success: false,
        error: "Erreur lors de la récupération des partenaires",
      };
    }

    return {
      success: true,
      data: partners || [],
    };
  } catch (error) {
    console.error("Unexpected error fetching partners:", error);
    return {
      success: false,
      error: "Erreur inattendue lors de la récupération des partenaires",
    };
  }
}

/**
 * Get a single partner by ID
 */
export async function getPartnerById(id: string): Promise<ActionResult<Partner>> {
  try {
    if (!id || typeof id !== "string") {
      return { success: false, error: "ID de partenaire invalide" };
    }

    const supabase = await createSupabaseServerClient();
    const { data: partner, error } = await supabase
      .from("partners")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Database error fetching partner:", error);
      return {
        success: false,
        error: "Partenaire non trouvé",
      };
    }

    return {
      success: true,
      data: partner,
    };
  } catch (error) {
    console.error("Unexpected error fetching partner:", error);
    return {
      success: false,
      error: "Erreur inattendue lors de la récupération du partenaire",
    };
  }
}

/**
 * Update partners display order
 */
export async function updatePartnersOrder(
  partnersOrder: Array<{ id: string; display_order: number }>
): Promise<ActionResult<void>> {
  try {
    // 1. Check admin permissions
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Non authentifié" };
    }
    const isAdmin = await checkAdminRole(user.id);
    if (!isAdmin) {
      return {
        success: false,
        error: "Accès non autorisé. Seuls les administrateurs peuvent réorganiser les partenaires.",
      };
    }

    // 2. Validate data
    const validation = updatePartnerOrderSchema.safeParse({ partners: partnersOrder });
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return {
        success: false,
        error: `Validation échouée: ${firstError.message}`,
      };
    }

    // 3. Update in database (batch update)
    const updatePromises = validation.data.partners.map(({ id, display_order }) =>
      supabase.from("partners").update({ display_order }).eq("id", id)
    );

    const results = await Promise.all(updatePromises);
    const hasError = results.some((result) => result.error);

    if (hasError) {
      console.error(
        "Database error updating partners order:",
        results.filter((r) => r.error)
      );
      return {
        success: false,
        error: "Erreur lors de la mise à jour de l'ordre des partenaires",
      };
    }

    // 4. Revalidate cache
    revalidatePath("/partenaires");
    revalidatePath("/admin/partners");

    // 5. TODO: Emit event (Phase 4)
    // await emitPartnersOrderUpdatedEvent(validation.data.partners);

    return {
      success: true,
      message: "Ordre des partenaires mis à jour avec succès",
    };
  } catch (error) {
    console.error("Unexpected error updating partners order:", error);
    return {
      success: false,
      error: "Erreur inattendue lors de la mise à jour de l'ordre",
    };
  }
}

/**
 * Toggle partner active status
 */
export async function togglePartnerStatus(
  id: string,
  isActive: boolean
): Promise<ActionResult<void>> {
  try {
    // 1. Check admin permissions
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Non authentifié" };
    }
    const isAdmin = await checkAdminRole(user.id);
    if (!isAdmin) {
      return {
        success: false,
        error:
          "Accès non autorisé. Seuls les administrateurs peuvent modifier le statut des partenaires.",
      };
    }

    // 2. Validate data
    const validation = togglePartnerStatusSchema.safeParse({ id, is_active: isActive });
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return {
        success: false,
        error: `Validation échouée: ${firstError.message}`,
      };
    }

    // 3. Update in database
    const { error } = await supabase
      .from("partners")
      .update({ is_active: validation.data.is_active })
      .eq("id", validation.data.id);

    if (error) {
      console.error("Database error toggling partner status:", error);
      return {
        success: false,
        error: "Erreur lors de la modification du statut du partenaire",
      };
    }

    // 4. Revalidate cache
    revalidatePath("/partenaires");
    revalidatePath("/admin/partners");

    // 5. TODO: Emit event (Phase 4)
    // await emitPartnerStatusChangedEvent(validation.data.id, validation.data.is_active);

    const statusText = validation.data.is_active ? "activé" : "désactivé";
    return {
      success: true,
      message: `Partenaire ${statusText} avec succès`,
    };
  } catch (error) {
    console.error("Unexpected error toggling partner status:", error);
    return {
      success: false,
      error: "Erreur inattendue lors de la modification du statut",
    };
  }
}

/**
 * Redirect to partners admin page
 */
export async function redirectToPartnersAdmin(): Promise<never> {
  redirect("/admin/partners");
}

/**
 * Upload partner image
 */
export type UploadImageResult = CoreUploadImageResult;
export const uploadPartnerImage = uploadPartnerImageCore;
