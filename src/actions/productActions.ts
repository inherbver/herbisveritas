"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { withPermissionSafe } from "@/lib/auth/server-actions-auth";
import { productSchema, type ProductFormValues } from "@/lib/validators/product-validator";
import { revalidateProductPages } from "@/utils/revalidation";
import { z } from "zod";
import { slugify } from "../utils/slugify"; // Helper for sanitizing filenames

// ✅ Schémas de validation pour les autres actions
const deleteProductSchema = z.object({
  id: z.string().min(1, "Product ID is required"),
});

const imageUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size > 0, "Le fichier ne peut pas être vide.")
    .refine(
      (file) => file.size < 4 * 1024 * 1024, // 4MB max
      "Le fichier ne doit pas dépasser 4Mo."
    )
    .refine(
      (file) => ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type),
      "Le format du fichier doit être JPEG, PNG, WEBP ou GIF."
    ),
  fileName: z.string().min(3, "Le nom du fichier doit contenir au moins 3 caractères."),
});

const updateProductStatusSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  status: z.enum(["active", "inactive", "discontinued"]),
});

// ===== CREATE PRODUCT =====
export const createProduct = withPermissionSafe(
  "products:create",
  async (data: ProductFormValues) => {
    // Si c'est un nouveau produit (pas d'ID), en générer un.
    if (!data.id) {
      data.id = crypto.randomUUID();
    }

    const supabase = await createSupabaseServerClient();

    const validationResult = productSchema.safeParse(data);
    if (!validationResult.success) {
      return {
        success: false,
        message: "Les données du formulaire sont invalides.",
        errors: validationResult.error.flatten().fieldErrors,
      };
    }

    // L'ID est garanti d'être présent ici grâce à la logique ci-dessus et à la validation.
    const { translations, ...productDataWithoutName } = validationResult.data as Required<
      typeof validationResult.data
    >;

    // Le nom principal du produit est extrait de la traduction française par défaut.
    const defaultTranslation = translations.find((t) => t.locale === "fr");
    if (!defaultTranslation || !defaultTranslation.name) {
      return {
        success: false,
        message: "La traduction française (fr) avec un nom de produit est requise.",
      };
    }

    const productData = {
      ...productDataWithoutName,
      name: defaultTranslation.name,
    };

    // Utilisation de la nouvelle fonction v2 corrigée
    const { data: newProduct, error } = await supabase.rpc("create_product_with_translations_v2", {
      product_data: productData,
      translations_data: translations,
    });

    if (error) {
      console.error("RPC create_product_with_translations_v2 error:", error);
      return {
        success: false,
        message: `Erreur lors de la création: ${error.message}`,
      };
    }

    revalidateProductPages({
      productId: productData.id,
      slug: productData.slug,
      action: "create",
    });

    return {
      success: true,
      message: "Produit créé avec succès !",
      data: newProduct, // Retourner les données du produit créé
    };
  }
);

// ===== UPDATE PRODUCT =====
export const updateProduct = withPermissionSafe(
  "products:update",
  async (data: ProductFormValues) => {
    const supabase = await createSupabaseServerClient();

    const validationResult = productSchema.safeParse(data);
    if (!validationResult.success) {
      return {
        success: false,
        message: "Les données du formulaire sont invalides.",
        errors: validationResult.error.flatten().fieldErrors,
      };
    }

    const { id, translations, ...productData } = validationResult.data;

    if (!id) {
      return {
        success: false,
        message: "L'ID du produit est manquant pour la mise à jour.",
      };
    }

    // ✅ Paramètres correspondant exactement à la fonction RPC documentée
    const params = {
      p_id: id,
      p_slug: productData.slug,
      p_price: productData.price,
      p_stock: productData.stock,
      p_unit: productData.unit || "",
      p_image_url: productData.image_url,
      p_inci_list: productData.inci_list || [],
      p_is_active: productData.is_active,
      p_is_new: productData.is_new,
      p_is_on_promotion: productData.is_on_promotion,
      p_translations: translations,
    };

    const { error } = await supabase.rpc("update_product_with_translations", params);

    if (error) {
      console.error("RPC update_product_with_translations error:", error);
      return {
        success: false,
        message: `La mise à jour du produit a échoué: ${error.message}`,
      };
    }

    revalidateProductPages({
      productId: id,
      slug: productData.slug,
      action: "update",
    });

    return {
      success: true,
      message: "Produit mis à jour avec succès !",
    };
  }
);

// ===== DELETE PRODUCT =====
export const deleteProduct = withPermissionSafe("products:delete", async (productId: string) => {
  const supabase = await createSupabaseServerClient();

  const validation = deleteProductSchema.safeParse({ id: productId });
  if (!validation.success) {
    return {
      success: false,
      message: validation.error.flatten().fieldErrors.id?.[0] || "ID produit invalide.",
    };
  }

  // Récupérer le slug avant suppression pour une revalidation correcte
  const { data: product, error: fetchError } = await supabase
    .from("products")
    .select("slug")
    .eq("id", validation.data.id)
    .single();

  // Ignorer l'erreur si le produit n'est pas trouvé (déjà supprimé?), mais logguer les autres erreurs.
  if (fetchError && fetchError.code !== "PGRST116") {
    console.error("Erreur lors de la récupération du produit avant suppression:", fetchError);
    return {
      success: false,
      message: `Impossible de récupérer les données du produit: ${fetchError.message}`,
    };
  }

  const { error: deleteError } = await supabase
    .from("products")
    .delete()
    .eq("id", validation.data.id);

  if (deleteError) {
    console.error("Supabase delete error:", deleteError);
    return {
      success: false,
      message: `La suppression du produit a échoué: ${deleteError.message}`,
    };
  }

  revalidateProductPages({
    productId,
    slug: product?.slug,
    action: "delete",
  });

  return {
    success: true,
    message: "Produit supprimé avec succès.",
  };
});

// ===== UPDATE PRODUCT STATUS (Action métier avancée) =====
export const updateProductStatus = withPermissionSafe(
  "products:update",
  async (data: z.infer<typeof updateProductStatusSchema>) => {
    const supabase = await createSupabaseServerClient();

    const validation = updateProductStatusSchema.safeParse(data);
    if (!validation.success) {
      return {
        success: false,
        message: validation.error.flatten().fieldErrors.productId?.[0] || "Données invalides.",
      };
    }

    const { productId, status } = validation.data;

    // ✅ Logique métier: Vérification des commandes en attente
    if (status === "discontinued") {
      const { data: pendingOrders, error: orderError } = await supabase
        .from("order_items")
        .select("id")
        .eq("product_id", productId)
        .limit(1);

      if (orderError) {
        console.error("Error checking pending orders:", orderError);
        return {
          success: false,
          message: "Impossible de vérifier les commandes en attente.",
        };
      }

      if (pendingOrders && pendingOrders.length > 0) {
        return {
          success: false,
          message: "Impossible d'arrêter un produit avec des commandes en attente.",
        };
      }
    }

    const { data: updatedProduct, error } = await supabase
      .from("products")
      .update({
        is_active: status === "active",
        // Vous pouvez ajouter d'autres champs selon votre logique
      })
      .eq("id", productId)
      .select()
      .single();

    if (error) {
      console.error("Error updating product status:", error);
      return {
        success: false,
        message: `Mise à jour du statut échouée: ${error.message}`,
      };
    }

    revalidateProductPages({
      productId: validation.data.productId,
      slug: updatedProduct?.slug,
      action: "updateStatus",
    });

    return {
      success: true,
      message: "Statut du produit mis à jour avec succès.",
      data: updatedProduct,
    };
  }
);

// ===== UPLOAD PRODUCT IMAGE =====

// Définit le type de retour pour une meilleure inférence côté client
export type UploadImageResult =
  | { success: true; data: { url: string }; message: string }
  | { success: false; message: string; errors?: { file?: string[]; fileName?: string[] } };

export const uploadProductImage = withPermissionSafe(
  "products:update",
  async (formData: FormData): Promise<UploadImageResult> => {
    const supabase = await createSupabaseServerClient();

    const file = formData.get("file") as File;
    const fileName = formData.get("fileName") as string;

    const validationResult = imageUploadSchema.safeParse({ file, fileName });

    if (!validationResult.success) {
      return {
        success: false,
        message: "Validation échouée",
        errors: validationResult.error.flatten().fieldErrors,
      };
    }

    const { file: validatedFile, fileName: validatedFileName } = validationResult.data;

    const fileExtension = validatedFile.name.split(".").pop();
    const sanitizedFileName = slugify(validatedFileName);
    const filePath = `${sanitizedFileName}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
      .from("products")
      .upload(filePath, validatedFile, {
        upsert: true, // Overwrite file if it exists
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return {
        success: false,
        message: `Erreur lors de l'upload: ${uploadError.message}`,
      };
    }

    const { data: publicUrlData } = supabase.storage.from("products").getPublicUrl(filePath);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      return {
        success: false,
        message: "Impossible de récupérer l'URL publique après l'upload.",
      };
    }

    return {
      success: true,
      message: "Image téléversée avec succès !",
      data: { url: publicUrlData.publicUrl },
    };
  }
);
