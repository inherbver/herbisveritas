/**
 * Types pour la gestion des commandes
 * Synchronisé avec la structure de la base de données Supabase
 */

// === ENUMS ===
export type OrderStatus =
  | "pending_payment"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";

// === TYPES DE BASE ===

/**
 * Type pour un article de commande
 */
export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price_at_purchase: number;
  product_sku_at_purchase?: string;
  product_name_at_purchase?: string;
  product_image_url_at_purchase?: string;
  created_at: string;
  updated_at: string;
  product?: {
    name: string;
    image_url?: string;
  };
}

/**
 * Type pour une commande
 */
export interface Order {
  id: string;
  user_id: string;
  order_number?: string;
  status: OrderStatus;
  total_amount: number;
  currency: string;
  shipping_address_id?: string;
  billing_address_id?: string;
  shipping_fee?: number;
  notes?: string;
  payment_method?: string;
  payment_intent_id?: string;
  payment_status: PaymentStatus;
  stripe_checkout_session_id?: string;
  stripe_checkout_id?: string;
  pickup_point_id?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Type pour une commande avec ses relations
 */
export interface OrderWithRelations extends Order {
  items: OrderItem[];
  profile?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone_number?: string;
  };
  shipping_address?: {
    id: string;
    full_name: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    postal_code: string;
    country_code: string;
    phone_number?: string;
  };
  billing_address?: {
    id: string;
    full_name: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    postal_code: string;
    country_code: string;
    phone_number?: string;
  };
}

// === TYPES POUR L'ADMIN ===

/**
 * Filtres pour la liste des commandes
 */
export interface OrderFilters {
  status?: OrderStatus[];
  payment_status?: PaymentStatus[];
  date_from?: string;
  date_to?: string;
  search?: string; // Recherche par numéro de commande, email client
  min_amount?: number;
  max_amount?: number;
}

/**
 * Options de tri pour les commandes
 */
export interface OrderSortOptions {
  field: "created_at" | "total_amount" | "status" | "order_number";
  direction: "asc" | "desc";
}

/**
 * Options pour récupérer la liste des commandes
 */
export interface OrderListOptions {
  filters?: OrderFilters;
  sort?: OrderSortOptions;
  page?: number;
  limit?: number;
}

/**
 * Résultat paginé pour la liste des commandes
 */
export interface PaginatedOrderList {
  orders: OrderWithRelations[];
  total_count: number;
  page: number;
  limit: number;
  has_next: boolean;
  has_previous: boolean;
}

/**
 * Données pour mettre à jour le statut d'une commande
 */
export interface UpdateOrderStatusData {
  status: OrderStatus;
  notes?: string;
  tracking_number?: string;
  notify_customer?: boolean;
}

/**
 * Statistiques des commandes pour le dashboard
 */
export interface OrderStats {
  total_orders: number;
  pending_orders: number;
  processing_orders: number;
  shipped_orders: number;
  delivered_orders: number;
  cancelled_orders: number;
  total_revenue: number;
  average_order_value: number;
  orders_today: number;
  revenue_today: number;
}

/**
 * Type pour l'action result des commandes
 */
export interface OrderActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// === HELPERS ===

/**
 * Map des statuts avec leurs labels en français
 */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "En attente de paiement",
  processing: "En traitement",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
  refunded: "Remboursée",
};

/**
 * Map des statuts de paiement avec leurs labels
 */
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "En attente",
  succeeded: "Payé",
  failed: "Échoué",
  refunded: "Remboursé",
};

/**
 * Couleurs pour les badges de statut
 */
export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending_payment: "warning",
  processing: "info",
  shipped: "primary",
  delivered: "success",
  cancelled: "destructive",
  refunded: "secondary",
};
