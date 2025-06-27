"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { withPermission, withPermissionSafe } from "@/lib/auth/server-actions-auth";

// To secure a server action, we wrap it with the 'withPermission' or 'withPermissionSafe' HOF.

// This version throws an error on failure, which is simpler to implement.
// The client will need a try/catch block to handle the error.
export const createProduct = withPermission("products:create", async (formData: FormData) => {
  const supabase = await createSupabaseServerClient();

  const productData = {
    name: formData.get("name") as string,
    description: formData.get("description") as string,
    price: parseFloat(formData.get("price") as string),
    // ... other fields would be extracted here
  };

  // TODO: Add Zod validation for productData

  const { data, error } = await supabase
    .from("products")
    .insert(productData)
    .select()
    .single();

  if (error) {
    // The wrapper will catch this and return a standard error format if using withPermissionSafe
    throw new Error(`Failed to create product: ${error.message}`);
  }

  revalidatePath("/admin/products");
  return data;
});

// This version returns a typed result, which is more robust for UI handling.
export const deleteProduct = withPermissionSafe("products:delete", async (productId: string) => {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("products").delete().eq("id", productId);

  if (error) {
    throw new Error(`Failed to delete product: ${error.message}`);
  }

  revalidatePath("/admin/products");
  return { productId };
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
