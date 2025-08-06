"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { withPermissionSafe } from "@/lib/auth/server-actions-auth";
import { productSchema, type ProductFormValues } from "@/lib/validators/product-validator";
import { revalidateProductPages } from "@/utils/revalidation";
import { z } from "zod";
import {
  uploadProductImageCore,
  UploadImageResult as CoreUploadImageResult,
} from "@/lib/storage/image-upload";

// New imports for Clean Architecture
import { ActionResult } from "@/lib/core/result";
import { LogUtils } from "@/lib/core/logger";
import { ValidationError, ErrorUtils } from "@/lib/core/errors";

// ✅ Schémas de validation pour les autres actions
const deleteProductSchema = z.object({
  id: z.string().min(1, "Product ID is required"),
});

const updateProductStatusSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  status: z.enum(["active", "inactive", "draft"]),
});

// ===== CREATE PRODUCT =====
export const createProduct = withPermissionSafe(
  "products:create",
  async (data: ProductFormValues): Promise<ActionResult<unknown>> => {
    const context = LogUtils.createUserActionContext("unknown", "create_product", "products");
    LogUtils.logOperationStart("create_product", context);

    try {
      // Si c'est un nouveau produit (pas d'ID), en générer un.
      if (!data.id) {
        data.id = crypto.randomUUID();
      }

      const supabase = await createSupabaseServerClient();

      const validationResult = productSchema.safeParse(data);
      if (!validationResult.success) {
        throw new ValidationError("Données du formulaire invalides", undefined, {
          validationErrors: validationResult.error.flatten().fieldErrors,
        });
      }

      // L'ID est garanti d'être présent ici grâce à la logique ci-dessus et à la validation.
      const { translations, ...productDataWithoutName } = validationResult.data as Required<
        typeof validationResult.data
      >;

      // Le nom principal du produit est extrait de la traduction française par défaut.
      const defaultTranslation = translations.find((t) => t.locale === "fr");
      if (!defaultTranslation || !defaultTranslation.name) {
        throw new ValidationError(
          "La traduction française (fr) avec un nom de produit est requise."
        );
      }

      const productData = {
        ...productDataWithoutName,
        name: defaultTranslation.name,
        // Maintenir la compatibilité: convertir status vers is_active
        is_active: productDataWithoutName.status === "active",
        // Inclure le status dans les données de création
        status: productDataWithoutName.status,
      };

      // Utilisation de la nouvelle fonction v2 corrigée
      const { data: newProduct, error } = await supabase.rpc(
        "create_product_with_translations_v2",
        {
          product_data: productData,
          translations_data: translations,
        }
      );

      if (error) {
        throw ErrorUtils.fromSupabaseError(error);
      }

      revalidateProductPages({
        productId: productData.id,
        slug: productData.slug,
        action: "create",
      });

      LogUtils.logOperationSuccess("create_product", { ...context, productId: productData.id });
      return ActionResult.ok(newProduct, "Produit créé avec succès !");
    } catch (error) {
      LogUtils.logOperationError("create_product", error, context);
      return ActionResult.error(
        ErrorUtils.isAppError(error)
          ? ErrorUtils.formatForUser(error)
          : "Une erreur inattendue est survenue"
      );
    }
  }
);

// ===== UPDATE PRODUCT =====
export const updateProduct = withPermissionSafe(
  "products:update",
  async (data: ProductFormValues): Promise<ActionResult<null>> => {
    const context = LogUtils.createUserActionContext("unknown", "update_product", "products");
    LogUtils.logOperationStart("update_product", context);

    try {
      const supabase = await createSupabaseServerClient();

      const validationResult = productSchema.safeParse(data);
      if (!validationResult.success) {
        throw new ValidationError("Données du formulaire invalides", undefined, {
          validationErrors: validationResult.error.flatten().fieldErrors,
        });
      }

      const { id, translations, ...productData } = validationResult.data;

      if (!id) {
        throw new ValidationError("L'ID du produit est manquant pour la mise à jour.");
      }

      // Les types sont désormais garantis non-nuls par le schéma Zod.
      const params = {
        p_id: id,
        p_slug: productData.slug,
        p_price: productData.price,
        p_stock: productData.stock,
        p_unit: productData.unit,
        p_image_url: productData.image_url,
        p_inci_list: productData.inci_list,
        p_status: productData.status, // Nouveau paramètre status
        p_is_active: productData.status === "active", // Convertir status vers is_active pour compatibilité
        p_is_new: productData.is_new,
        p_is_on_promotion: productData.is_on_promotion,
        p_translations: translations as unknown, // Cast vers unknown pour Supabase RPC
      };

      const { error } = await supabase.rpc("update_product_with_translations", params as any);

      if (error) {
        throw ErrorUtils.fromSupabaseError(error);
      }

      revalidateProductPages({
        productId: id,
        slug: productData.slug,
        action: "update",
      });

      LogUtils.logOperationSuccess("update_product", { ...context, productId: id });
      return ActionResult.ok(null, "Produit mis à jour avec succès !");
    } catch (error) {
      LogUtils.logOperationError("update_product", error, context);
      return ActionResult.error(
        ErrorUtils.isAppError(error)
          ? ErrorUtils.formatForUser(error)
          : "Une erreur inattendue est survenue"
      );
    }
  }
);

// ===== DELETE PRODUCT =====
export const deleteProduct = withPermissionSafe(
  "products:delete",
  async (productId: string): Promise<ActionResult<null>> => {
    const context = LogUtils.createUserActionContext("unknown", "delete_product", "products", {
      productId,
    });
    LogUtils.logOperationStart("delete_product", context);

    try {
      const supabase = await createSupabaseServerClient();

      const validation = deleteProductSchema.safeParse({ id: productId });
      if (!validation.success) {
        throw new ValidationError(
          validation.error.flatten().fieldErrors.id?.[0] || "ID produit invalide."
        );
      }

      // Récupérer le slug avant suppression pour une revalidation correcte
      const { data: product, error: fetchError } = await supabase
        .from("products")
        .select("slug")
        .eq("id", validation.data.id)
        .single();

      // Ignorer l'erreur si le produit n'est pas trouvé (déjà supprimé?), mais logguer les autres erreurs.
      if (fetchError && fetchError.code !== "PGRST116") {
        throw ErrorUtils.fromSupabaseError(fetchError);
      }

      const { error: deleteError } = await supabase
        .from("products")
        .delete()
        .eq("id", validation.data.id);

      if (deleteError) {
        throw ErrorUtils.fromSupabaseError(deleteError);
      }

      revalidateProductPages({
        productId,
        slug: product?.slug,
        action: "delete",
      });

      LogUtils.logOperationSuccess("delete_product", context);
      return ActionResult.ok(null, "Produit supprimé avec succès.");
    } catch (error) {
      LogUtils.logOperationError("delete_product", error, context);
      return ActionResult.error(
        ErrorUtils.isAppError(error)
          ? ErrorUtils.formatForUser(error)
          : "Une erreur inattendue est survenue"
      );
    }
  }
);

// ===== UPDATE PRODUCT STATUS (Action métier avancée) =====
export const updateProductStatus = withPermissionSafe(
  "products:update",
  async (data: z.infer<typeof updateProductStatusSchema>): Promise<ActionResult<unknown>> => {
    const context = LogUtils.createUserActionContext(
      "unknown",
      "update_product_status",
      "products"
    );
    LogUtils.logOperationStart("update_product_status", context);

    try {
      const supabase = await createSupabaseServerClient();

      const validation = updateProductStatusSchema.safeParse(data);
      if (!validation.success) {
        throw new ValidationError(
          validation.error.flatten().fieldErrors.productId?.[0] || "Données invalides."
        );
      }

      const { productId, status } = validation.data;

      const { data: updatedProduct, error } = await supabase
        .from("products")
        .update({
          status: status,
          is_active: status === "active", // Maintenir la compatibilité
        })
        .eq("id", productId)
        .select()
        .single();

      if (error) {
        throw ErrorUtils.fromSupabaseError(error);
      }

      revalidateProductPages({
        productId: validation.data.productId,
        slug: updatedProduct?.slug,
        action: "updateStatus",
      });

      LogUtils.logOperationSuccess("update_product_status", { ...context, productId });
      return ActionResult.ok(updatedProduct, "Statut du produit mis à jour avec succès.");
    } catch (error) {
      LogUtils.logOperationError("update_product_status", error, context);
      return ActionResult.error(
        ErrorUtils.isAppError(error)
          ? ErrorUtils.formatForUser(error)
          : "Une erreur inattendue est survenue"
      );
    }
  }
);

// ===== UPLOAD PRODUCT IMAGE =====

// Définit le type de retour pour une meilleure inférence côté client
export type UploadImageResult = CoreUploadImageResult;

// Migration vers la fonction centralisée
export const uploadProductImage = uploadProductImageCore;
