"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { withPermissionSafe } from "@/lib/auth/server-actions-auth";
import { productSchema, type ProductFormValues } from "@/lib/validators/product-validator";

export const createProduct = withPermissionSafe("products:create", async (data: ProductFormValues) => {
    const supabase = await createSupabaseServerClient();

    const validationResult = productSchema.safeParse(data);

    if (!validationResult.success) {
        return {
            success: false,
            message: "Les données du formulaire sont invalides.",
            errors: validationResult.error.flatten().fieldErrors,
        };
    }

    const { translations, ...productData } = validationResult.data;

    const { data: newProduct, error: productError } = await supabase
        .from("products")
        .insert(productData)
        .select()
        .single();

    if (productError) {
        console.error("Error creating product:", productError);
        return { success: false, message: `Erreur base de données: ${productError.message}` };
    }

    if (!newProduct) {
        return { success: false, message: "La création du produit a échoué, aucune donnée retournée." };
    }

    const translationsWithProductId = translations.map(t => ({
        ...t,
        product_id: newProduct.id,
    }));

    const { error: translationsError } = await supabase
        .from("product_translations")
        .insert(translationsWithProductId);

    if (translationsError) {
        console.error("Error creating product translations:", translationsError);
        // Dans un scénario réel, nous pourrions vouloir supprimer le produit qui vient d'être créé.
        // Pour l'instant, nous retournons un message d'erreur.
        return { success: false, message: `Produit créé, mais l'enregistrement des traductions a échoué: ${translationsError.message}` };
    }

    revalidatePath("/admin/products");

    return {
        success: true,
        message: "Produit créé avec succès !",
        data: newProduct,
    };
});


export const deleteProduct = withPermissionSafe("products:delete", async (productId: string) => {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("products").delete().eq("id", productId);

  if (error) {
    // Le HOF interceptera cette erreur et retournera un format d'erreur standard
    throw new Error(`La suppression du produit a échoué: ${error.message}`);
  }

  revalidatePath("/admin/products");
  // On retourne explicitement l'objet attendu par le client pour le toast
  return { success: true, message: "Produit supprimé avec succès." };
});

export const updateProduct = withPermissionSafe("products:update", async (data: ProductFormValues) => {
    const supabase = await createSupabaseServerClient();

    // 1. Validate the incoming data
    const validationResult = productSchema.safeParse(data);
    if (!validationResult.success) {
        return {
            success: false,
            message: "Les données du formulaire sont invalides.",
            errors: validationResult.error.flatten().fieldErrors,
        };
    }

    const { id, translations, ...productData } = validationResult.data;

    // 2. Prepare parameters for the RPC call, ensuring they match the function signature
    const params = {
        p_id: id,
        p_slug: productData.slug,
        p_price: productData.price,
        p_stock: productData.stock,
        p_unit: productData.unit,
        p_image_url: productData.image_url,
        p_inci_list: productData.inci_list,
        p_is_active: productData.is_active,
        p_is_new: productData.is_new,
        p_is_on_promotion: productData.is_on_promotion,
        p_translations: translations,
    };

    // 3. Call the RPC function
    const { error } = await supabase.rpc("update_product_with_translations", params);

    if (error) {
        console.error("RPC update_product_with_translations error:", error);
        return {
            success: false,
            message: `La mise à jour du produit a échoué. Raison: ${error.message}`,
        };
    }

    // 4. Revalidate paths to reflect changes
    revalidatePath("/admin/products");
    revalidatePath(`/products/${productData.slug}`);
    revalidatePath(`/fr/admin/products/${id}/edit`);

    return {
        success: true,
        message: "Produit mis à jour avec succès !",
    };
});

// A more complex action with business logic validation
export const updateProductStatus = withPermissionSafe(
  "products:update",
  async (productId: string, status: "active" | "inactive" | "discontinued") => {
    const supabase = await createSupabaseServerClient();

    // Example of business logic validation inside the action
    if (status === "discontinued") {
      // Check for pending orders before discontinuing a product
      const { data: pendingOrders, error: orderError } = await supabase
        .from("order_items")
        .select("id")
        // This is a simplified query; a real implementation might need to join with orders table
        // .eq("order.status", "pending") 
        .eq("product_id", productId)
        .limit(1);

      if (orderError) {
        throw new Error(`Failed to check pending orders: ${orderError.message}`);
      }

      if (pendingOrders && pendingOrders.length > 0) {
        throw new Error("Cannot discontinue product with pending orders.");
      }
    }

    const { data, error } = await supabase
      .from("products")
      .update({ status })
      .eq("id", productId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update product status: ${error.message}`);
    }

    revalidatePath("/admin/products");
    revalidatePath(`/products/${(data as any)?.slug}`); // Invalidate specific product page
    revalidatePath("/shop"); // Invalidate the main shop page
    return data;
  }
);
