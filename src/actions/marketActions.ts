"use server";

/**
 * Market Server Actions
 * 
 * Server actions for CRUD operations on markets.
 * Includes authentication, validation, and event emission.
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkAdminRole } from "@/lib/auth/admin-service";
import { ActionResult } from "@/lib/core/result";
import type { Market, CreateMarketData, UpdateMarketData } from "@/types/market";
import { 
  createMarketSchema, 
  updateMarketSchema, 
  validateMarketForm,
  validateUpdateMarketForm
} from "@/lib/validators/market";
import {
  uploadMarketImageCore,
  UploadImageResult as CoreUploadImageResult,
} from "@/lib/storage/image-upload";

/**
 * Create a new market
 */
export async function createMarket(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. Check admin permissions
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Non authentifié" };
    }
    const isAdmin = await checkAdminRole(user.id);
    if (!isAdmin) {
      return { 
        success: false, 
        error: "Accès non autorisé. Seuls les administrateurs peuvent créer des marchés." 
      };
    }

    // 2. Validate form data
    const validatedData = validateMarketForm(formData);
    if (!validatedData) {
      return { success: false, error: "Données du formulaire invalides" };
    }

    // 3. Validate with schema
    const validation = createMarketSchema.safeParse(validatedData);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return { 
        success: false, 
        error: `Validation échouée: ${firstError.message}` 
      };
    }

    // 4. Insert into database
    const { data, error } = await supabase
      .from("markets")
      .insert(validation.data)
      .select("id")
      .single();

    if (error) {
      console.error("Database error creating market:", error);
      return { 
        success: false, 
        error: "Erreur lors de la création du marché en base de données" 
      };
    }

    // 5. Revalidate cache
    revalidatePath("/contact");
    revalidatePath("/admin/markets");

    // 6. TODO: Emit event (Phase 4)
    // await emitMarketCreatedEvent(data.id, validation.data);

    return { 
      success: true, 
      data: { id: data.id },
      message: "Marché créé avec succès"
    };

  } catch (error) {
    console.error("Unexpected error creating market:", error);
    return { 
      success: false, 
      error: "Erreur inattendue lors de la création du marché" 
    };
  }
}

/**
 * Update an existing market
 */
export async function updateMarket(
  id: string, 
  formData: FormData
): Promise<ActionResult<void>> {
  try {
    // 1. Check admin permissions
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Non authentifié" };
    }
    const isAdmin = await checkAdminRole(user.id);
    if (!isAdmin) {
      return { 
        success: false, 
        error: "Accès non autorisé. Seuls les administrateurs peuvent modifier des marchés." 
      };
    }

    // 2. Validate form data for updates
    const validatedData = validateUpdateMarketForm(formData);
    if (!validatedData) {
      return { success: false, error: "Données du formulaire invalides" };
    }

    // 3. Validate with schema
    const validation = updateMarketSchema.safeParse({
      id,
      ...validatedData
    });
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return { 
        success: false, 
        error: `Validation échouée: ${firstError.message}` 
      };
    }

    // 4. Update in database
    const { error } = await supabase
      .from("markets")
      .update(validation.data)
      .eq("id", id);

    if (error) {
      console.error("Database error updating market:", error);
      return { 
        success: false, 
        error: "Erreur lors de la modification du marché" 
      };
    }

    // 5. Revalidate cache
    revalidatePath("/contact");
    revalidatePath("/admin/markets");

    // 6. TODO: Emit event (Phase 4)
    // await emitMarketUpdatedEvent(id, validation.data);

    return { 
      success: true,
      message: "Marché modifié avec succès"
    };

  } catch (error) {
    console.error("Unexpected error updating market:", error);
    return { 
      success: false, 
      error: "Erreur inattendue lors de la modification du marché" 
    };
  }
}

/**
 * Delete a market
 */
export async function deleteMarket(id: string): Promise<ActionResult<void>> {
  try {
    // 1. Check admin permissions
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Non authentifié" };
    }
    const isAdmin = await checkAdminRole(user.id);
    if (!isAdmin) {
      return { 
        success: false, 
        error: "Accès non autorisé. Seuls les administrateurs peuvent supprimer des marchés." 
      };
    }

    // 2. Validate ID
    if (!id || typeof id !== 'string') {
      return { success: false, error: "ID de marché invalide" };
    }

    // 3. Get market details before deletion (for event emission)
    const { data: market, error: fetchError } = await supabase
      .from("markets")
      .select("name, city")
      .eq("id", id)
      .single();

    if (fetchError) {
      return { 
        success: false, 
        error: "Marché non found ou erreur d'accès" 
      };
    }

    // 4. Delete from database
    const { error } = await supabase
      .from("markets")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Database error deleting market:", error);
      return { 
        success: false, 
        error: "Erreur lors de la suppression du marché" 
      };
    }

    // 5. Revalidate cache
    revalidatePath("/contact");
    revalidatePath("/admin/markets");

    // 6. TODO: Emit event (Phase 4)
    // await emitMarketDeletedEvent(id, market);

    return { 
      success: true,
      message: `Marché "${market.name}" supprimé avec succès`
    };

  } catch (error) {
    console.error("Unexpected error deleting market:", error);
    return { 
      success: false, 
      error: "Erreur inattendue lors de la suppression du marché" 
    };
  }
}

/**
 * Get all markets (for admin interface)
 */
export async function getMarkets(): Promise<ActionResult<Market[]>> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: markets, error } = await supabase
      .from("markets")
      .select("*")
      .order("start_date", { ascending: true });

    if (error) {
      console.error("Database error fetching markets:", error);
      return { 
        success: false, 
        error: "Erreur lors de la récupération des marchés" 
      };
    }

    return { 
      success: true, 
      data: markets || [] 
    };

  } catch (error) {
    console.error("Unexpected error fetching markets:", error);
    return { 
      success: false, 
      error: "Erreur inattendue lors de la récupération des marchés" 
    };
  }
}

/**
 * Get a single market by ID
 */
export async function getMarketById(id: string): Promise<ActionResult<Market>> {
  try {
    if (!id || typeof id !== 'string') {
      return { success: false, error: "ID de marché invalide" };
    }

    const supabase = await createSupabaseServerClient();
    const { data: market, error } = await supabase
      .from("markets")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Database error fetching market:", error);
      return { 
        success: false, 
        error: "Marché non trouvé" 
      };
    }

    return { 
      success: true, 
      data: market 
    };

  } catch (error) {
    console.error("Unexpected error fetching market:", error);
    return { 
      success: false, 
      error: "Erreur inattendue lors de la récupération du marché" 
    };
  }
}

/**
 * Redirect to markets admin page
 */
export async function redirectToMarketsAdmin(): Promise<never> {
  redirect("/admin/markets");
}

/**
 * Upload market image
 */
export type UploadImageResult = CoreUploadImageResult;
export const uploadMarketImage = uploadMarketImageCore;