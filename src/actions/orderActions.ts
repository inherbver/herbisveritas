"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkAdminRole } from "@/lib/auth/admin-service";
import type {
  OrderWithRelations,
  OrderListOptions,
  PaginatedOrderList,
  UpdateOrderStatusData,
  OrderStats,
  OrderActionResult,
} from "@/types/orders";

/**
 * Récupère la liste paginée des commandes avec filtres
 */
export async function getOrdersListAction(
  options: OrderListOptions = {}
): Promise<OrderActionResult<PaginatedOrderList>> {
  try {
    const supabase = await createSupabaseServerClient();

    // Vérification des permissions admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await checkAdminRole(user.id))) {
      return {
        success: false,
        error: "Accès non autorisé",
      };
    }

    const {
      filters = {},
      sort = { field: "created_at", direction: "desc" },
      page = 1,
      limit = 25,
    } = options;

    // Construction de la requête
    let query = supabase.from("orders").select(
      `
        *,
        user:profiles!orders_user_id_fkey (
          id,
          email,
          first_name,
          last_name
        ),
        items:order_items (
          *,
          product:products (
            name,
            image_url
          )
        ),
        shipping_address:addresses!orders_shipping_address_id_fkey (
          id,
          full_name,
          address_line1,
          address_line2,
          city,
          postal_code,
          country_code,
          phone_number
        ),
        billing_address:addresses!orders_billing_address_id_fkey (
          id,
          full_name,
          address_line1,
          address_line2,
          city,
          postal_code,
          country_code,
          phone_number
        )
      `,
      { count: "exact" }
    );

    // Application des filtres
    if (filters.status?.length) {
      query = query.in("status", filters.status);
    }
    if (filters.payment_status?.length) {
      query = query.in("payment_status", filters.payment_status);
    }
    if (filters.date_from) {
      query = query.gte("created_at", filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte("created_at", filters.date_to);
    }
    if (filters.min_amount !== undefined) {
      query = query.gte("total_amount", filters.min_amount);
    }
    if (filters.max_amount !== undefined) {
      query = query.lte("total_amount", filters.max_amount);
    }
    if (filters.search) {
      query = query.or(`order_number.ilike.%${filters.search}%,id.ilike.%${filters.search}%`);
    }

    // Tri
    query = query.order(sort.field, { ascending: sort.direction === "asc" });

    // Pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching orders:", error);
      return {
        success: false,
        error: "Erreur lors de la récupération des commandes",
      };
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return {
      success: true,
      data: {
        orders: data as unknown as OrderWithRelations[],
        total_count: count || 0,
        page,
        limit,
        has_next: page < totalPages,
        has_previous: page > 1,
      },
    };
  } catch (error) {
    console.error("Error in getOrdersListAction:", error);
    return {
      success: false,
      error: "Erreur inattendue lors de la récupération des commandes",
    };
  }
}

/**
 * Récupère les détails d'une commande
 */
export async function getOrderDetailsAction(
  orderId: string
): Promise<OrderActionResult<OrderWithRelations>> {
  try {
    const supabase = await createSupabaseServerClient();

    // Vérification des permissions admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await checkAdminRole(user.id))) {
      return {
        success: false,
        error: "Accès non autorisé",
      };
    }

    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        user:profiles!orders_user_id_fkey (
          id,
          email,
          first_name,
          last_name,
          phone_number
        ),
        items:order_items (
          *
        ),
        shipping_address:addresses!orders_shipping_address_id_fkey (
          *
        ),
        billing_address:addresses!orders_billing_address_id_fkey (
          *
        )
      `
      )
      .eq("id", orderId)
      .single();

    if (error) {
      console.error("Error fetching order details:", error);
      return {
        success: false,
        error: "Commande introuvable",
      };
    }

    return {
      success: true,
      data: data as unknown as OrderWithRelations,
    };
  } catch (error) {
    console.error("Error in getOrderDetailsAction:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération de la commande",
    };
  }
}

/**
 * Met à jour le statut d'une commande
 */
export async function updateOrderStatusAction(
  orderId: string,
  updateData: UpdateOrderStatusData
): Promise<OrderActionResult<void>> {
  try {
    const supabase = await createSupabaseServerClient();

    // Vérification des permissions admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await checkAdminRole(user.id))) {
      return {
        success: false,
        error: "Accès non autorisé",
      };
    }

    // Mise à jour du statut
    const { error } = await supabase
      .from("orders")
      .update({
        status: updateData.status,
        notes: updateData.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (error) {
      console.error("Error updating order status:", error);
      return {
        success: false,
        error: "Erreur lors de la mise à jour du statut",
      };
    }

    // Log de l'action dans audit_logs
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      event_type: "update_order_status",
      data: {
        target_type: "order",
        target_id: orderId,
        new_status: updateData.status,
        notes: updateData.notes,
      },
    });

    // TODO: Si notify_customer est true, envoyer un email au client

    // Revalidation des pages
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);

    return {
      success: true,
      message: "Statut de la commande mis à jour avec succès",
    };
  } catch (error) {
    console.error("Error in updateOrderStatusAction:", error);
    return {
      success: false,
      error: "Erreur inattendue lors de la mise à jour",
    };
  }
}

/**
 * Annule une commande
 */
export async function cancelOrderAction(
  orderId: string,
  reason: string
): Promise<OrderActionResult<void>> {
  try {
    const supabase = await createSupabaseServerClient();

    // Vérification des permissions admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await checkAdminRole(user.id))) {
      return {
        success: false,
        error: "Accès non autorisé",
      };
    }

    // Vérifier que la commande peut être annulée
    const { data: order } = await supabase
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .single();

    if (!order) {
      return {
        success: false,
        error: "Commande introuvable",
      };
    }

    if (["delivered", "cancelled", "refunded"].includes(order.status)) {
      return {
        success: false,
        error: "Cette commande ne peut pas être annulée",
      };
    }

    // Annuler la commande
    const { error } = await supabase
      .from("orders")
      .update({
        status: "cancelled",
        notes: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (error) {
      console.error("Error cancelling order:", error);
      return {
        success: false,
        error: "Erreur lors de l'annulation",
      };
    }

    // Remettre les produits en stock
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("product_id, quantity")
      .eq("order_id", orderId);

    if (orderItems && orderItems.length > 0) {
      for (const item of orderItems) {
        await supabase.rpc("increment_product_stock", {
          product_id: item.product_id,
          quantity_to_add: item.quantity,
        });
      }
    }

    // Log de l'action d'annulation
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      event_type: "cancel_order",
      data: {
        target_type: "order",
        target_id: orderId,
        reason: reason,
        stock_restored: orderItems?.length || 0,
      },
    });

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);

    return {
      success: true,
      message: "Commande annulée avec succès",
    };
  } catch (error) {
    console.error("Error in cancelOrderAction:", error);
    return {
      success: false,
      error: "Erreur inattendue lors de l'annulation",
    };
  }
}

/**
 * Marque une commande comme remboursée
 */
export async function refundOrderAction(
  orderId: string,
  amount?: number,
  reason?: string
): Promise<OrderActionResult<void>> {
  try {
    const supabase = await createSupabaseServerClient();

    // Vérification des permissions admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await checkAdminRole(user.id))) {
      return {
        success: false,
        error: "Accès non autorisé",
      };
    }

    // TODO: Intégration avec Stripe pour le remboursement réel

    // Mise à jour du statut
    const { error } = await supabase
      .from("orders")
      .update({
        status: "refunded",
        payment_status: "refunded",
        notes: reason || "Remboursement effectué",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (error) {
      console.error("Error refunding order:", error);
      return {
        success: false,
        error: "Erreur lors du remboursement",
      };
    }

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);

    return {
      success: true,
      message: "Commande remboursée avec succès",
    };
  } catch (error) {
    console.error("Error in refundOrderAction:", error);
    return {
      success: false,
      error: "Erreur inattendue lors du remboursement",
    };
  }
}

/**
 * Récupère les statistiques des commandes
 */
export async function getOrderStatsAction(): Promise<OrderActionResult<OrderStats>> {
  try {
    const supabase = await createSupabaseServerClient();

    // Vérification des permissions admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await checkAdminRole(user.id))) {
      return {
        success: false,
        error: "Accès non autorisé",
      };
    }

    // Récupération de toutes les commandes pour les stats
    const { data: orders, error } = await supabase
      .from("orders")
      .select("status, payment_status, total_amount, created_at");

    if (error) {
      console.error("Error fetching order stats:", error);
      return {
        success: false,
        error: "Erreur lors de la récupération des statistiques",
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats: OrderStats = {
      total_orders: orders?.length || 0,
      pending_orders: orders?.filter((o) => o.status === "pending_payment").length || 0,
      processing_orders: orders?.filter((o) => o.status === "processing").length || 0,
      shipped_orders: orders?.filter((o) => o.status === "shipped").length || 0,
      delivered_orders: orders?.filter((o) => o.status === "delivered").length || 0,
      cancelled_orders: orders?.filter((o) => o.status === "cancelled").length || 0,
      total_revenue:
        orders
          ?.filter((o) => o.payment_status === "succeeded")
          .reduce((sum, o) => sum + Number(o.total_amount), 0) || 0,
      average_order_value: 0,
      orders_today: orders?.filter((o) => new Date(o.created_at) >= today).length || 0,
      revenue_today:
        orders
          ?.filter((o) => new Date(o.created_at) >= today && o.payment_status === "succeeded")
          .reduce((sum, o) => sum + Number(o.total_amount), 0) || 0,
    };

    // Calcul de la valeur moyenne
    const paidOrders = orders?.filter((o) => o.payment_status === "succeeded") || [];
    if (paidOrders.length > 0) {
      stats.average_order_value = stats.total_revenue / paidOrders.length;
    }

    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    console.error("Error in getOrderStatsAction:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération des statistiques",
    };
  }
}

/**
 * Ajoute un numéro de suivi à une commande
 */
export async function addTrackingNumberAction(
  orderId: string,
  trackingNumber: string,
  carrier?: string
): Promise<OrderActionResult<void>> {
  try {
    const supabase = await createSupabaseServerClient();

    // Vérification des permissions admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await checkAdminRole(user.id))) {
      return {
        success: false,
        error: "Accès non autorisé",
      };
    }

    // Mise à jour avec le numéro de suivi dans les notes
    const { error } = await supabase
      .from("orders")
      .update({
        status: "shipped",
        notes: `Numéro de suivi: ${trackingNumber}${carrier ? ` (${carrier})` : ""}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (error) {
      console.error("Error adding tracking number:", error);
      return {
        success: false,
        error: "Erreur lors de l'ajout du numéro de suivi",
      };
    }

    // TODO: Envoyer un email au client avec le numéro de suivi

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);

    return {
      success: true,
      message: "Numéro de suivi ajouté avec succès",
    };
  } catch (error) {
    console.error("Error in addTrackingNumberAction:", error);
    return {
      success: false,
      error: "Erreur inattendue",
    };
  }
}
