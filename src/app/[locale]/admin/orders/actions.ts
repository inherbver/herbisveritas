"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { withPermissionSafe } from "@/lib/auth/server-actions-auth";

export const updateOrderStatus = withPermissionSafe(
  "orders:update:status",
  async (
    orderId: string,
    status: "pending_payment" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded"
  ) => {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("orders")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update order status: ${error.message}`);
    }

    revalidatePath("/admin/orders");
    revalidatePath(`/profile/orders/${orderId}`); // Also revalidate user's view of the order
    return data;
  }
);
