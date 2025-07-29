/**
 * Order Repository Interface
 * 
 * Centralise toutes les opérations liées aux commandes avec intégration Stripe.
 * Interface la plus complexe selon Context7 - "Pipeline commandes complexe, intégration Stripe critique"
 */

import { Result } from '@/lib/core/result';
import { Repository } from './repository.interface';

// Types pour les entités Order
export type OrderStatus = 'draft' | 'pending_payment' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
export type PaymentMethod = 'stripe_card' | 'stripe_sepa' | 'paypal' | 'bank_transfer';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_slug: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_image_url?: string;
  created_at: string;
}

export interface OrderAddress {
  id: string;
  order_id: string;
  type: 'billing' | 'shipping';
  first_name: string;
  last_name: string;
  company?: string | null;
  address_line_1: string;
  address_line_2?: string | null;
  city: string;
  postal_code: string;
  country: string;
  phone?: string | null;
  email?: string | null;
}

export interface OrderPayment {
  id: string;
  order_id: string;
  stripe_payment_intent_id?: string | null;
  stripe_charge_id?: string | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  amount: number;
  currency: string;
  processing_fee?: number | null;
  failure_reason?: string | null;
  refunded_amount?: number | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  order_number: string;
  status: OrderStatus;
  subtotal: number;
  shipping_cost: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  notes?: string | null;
  tracking_number?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderWithDetails extends Order {
  items: OrderItem[];
  billing_address?: OrderAddress;
  shipping_address?: OrderAddress;
  payment?: OrderPayment;
}

// Types pour les opérations CRUD
export interface CreateOrderData {
  user_id: string;
  items: CreateOrderItemData[];
  billing_address: CreateOrderAddressData;
  shipping_address?: CreateOrderAddressData;
  notes?: string | null;
  currency?: string;
}

export interface CreateOrderItemData {
  product_id: string;
  quantity: number;
  unit_price: number;
}

export interface CreateOrderAddressData {
  type: 'billing' | 'shipping';
  first_name: string;
  last_name: string;
  company?: string | null;
  address_line_1: string;
  address_line_2?: string | null;
  city: string;
  postal_code: string;
  country: string;
  phone?: string | null;
  email?: string | null;
}

export interface UpdateOrderData {
  status?: OrderStatus;
  notes?: string | null;
  tracking_number?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
}

// Types pour les filtres et recherches
export interface OrderFilters {
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  user_id?: string;
  date_from?: string;
  date_to?: string;
  min_amount?: number;
  max_amount?: number;
  search?: string; // Recherche par numéro de commande, nom client, etc.
}

export interface OrderSearchParams {
  filters?: OrderFilters;
  sort_by?: 'created_at' | 'total_amount' | 'order_number';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface PaginatedOrders {
  orders: OrderWithDetails[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Types pour l'intégration Stripe
export interface StripePaymentIntentData {
  amount: number;
  currency: string;
  metadata: {
    order_id: string;
    user_id: string;
  };
}

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
  created: number;
}

// Types pour les statistiques et reporting
export interface OrderStats {
  total_orders: number;
  total_revenue: number;
  average_order_value: number;
  orders_by_status: Record<OrderStatus, number>;
  revenue_by_month: { month: string; revenue: number }[];
  top_products: { product_id: string; product_name: string; quantity_sold: number }[];
}

/**
 * Interface du Repository Order
 * 
 * Couvre toutes les opérations nécessaires pour la gestion des commandes
 * avec intégration Stripe et pipeline de paiement complexe.
 */
export interface IOrderRepository extends Repository<Order> {
  // === Opérations de base ===
  
  /**
   * Trouve une commande par numéro de commande
   */
  findByOrderNumber(orderNumber: string): Promise<Result<OrderWithDetails | null, Error>>;
  
  /**
   * Trouve une commande avec tous ses détails
   */
  findByIdWithDetails(id: string): Promise<Result<OrderWithDetails | null, Error>>;
  
  /**
   * Trouve les commandes d'un utilisateur
   */
  findByUserId(userId: string, params?: OrderSearchParams): Promise<Result<PaginatedOrders, Error>>;
  
  /**
   * Trouve toutes les commandes avec pagination et filtres
   */
  findAllOrders(params: OrderSearchParams): Promise<Result<PaginatedOrders, Error>>;
  
  // === Opérations CRUD ===
  
  /**
   * Crée une nouvelle commande (draft)
   */
  createOrder(orderData: CreateOrderData): Promise<Result<OrderWithDetails, Error>>;
  
  /**
   * Met à jour une commande existante
   */
  updateOrder(orderId: string, orderData: UpdateOrderData): Promise<Result<Order, Error>>;
  
  /**
   * Supprime une commande (soft delete si possible)
   */
  deleteOrder(orderId: string): Promise<Result<void, Error>>;
  
  /**
   * Met à jour le statut d'une commande
   */
  updateOrderStatus(orderId: string, status: OrderStatus): Promise<Result<Order, Error>>;
  
  // === Pipeline de paiement Stripe ===
  
  /**
   * Crée un PaymentIntent Stripe pour une commande
   */
  createPaymentIntent(orderId: string): Promise<Result<{ client_secret: string; payment_intent_id: string }, Error>>;
  
  /**
   * Confirme le paiement d'une commande
   */
  confirmPayment(orderId: string, paymentIntentId: string): Promise<Result<OrderWithDetails, Error>>;
  
  /**
   * Traite un webhook Stripe
   */
  processStripeWebhook(event: StripeWebhookEvent): Promise<Result<void, Error>>;
  
  /**
   * Effectue un remboursement total ou partiel
   */
  refundOrder(orderId: string, amount?: number, reason?: string): Promise<Result<OrderPayment, Error>>;
  
  /**
   * Vérifie le statut de paiement auprès de Stripe
   */
  syncPaymentStatus(orderId: string): Promise<Result<OrderPayment, Error>>;
  
  // === Gestion du stock ===
  
  /**
   * Réserve le stock pour une commande
   */
  reserveOrderStock(orderId: string): Promise<Result<void, Error>>;
  
  /**
   * Libère le stock d'une commande annulée
   */
  releaseOrderStock(orderId: string): Promise<Result<void, Error>>;
  
  /**
   * Confirme la vente du stock après paiement
   */
  confirmOrderStock(orderId: string): Promise<Result<void, Error>>;
  
  // === Opérations de validation ===
  
  /**
   * Valide les données d'une commande avant création
   */
  validateOrderData(orderData: CreateOrderData): Promise<Result<void, Error>>;
  
  /**
   * Vérifie la disponibilité des produits dans une commande
   */
  checkOrderAvailability(orderId: string): Promise<Result<boolean, Error>>;
  
  /**
   * Calcule les totaux d'une commande (taxes, frais de port, etc.)
   */
  calculateOrderTotals(orderData: CreateOrderData): Promise<Result<{
    subtotal: number;
    shipping_cost: number;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
  }, Error>>;
  
  // === Opérations de notification ===
  
  /**
   * Envoie l'email de confirmation de commande
   */
  sendOrderConfirmation(orderId: string): Promise<Result<void, Error>>;
  
  /**
   * Envoie l'email de notification d'expédition
   */
  sendShippingNotification(orderId: string): Promise<Result<void, Error>>;
  
  /**
   * Envoie l'email de notification de livraison
   */
  sendDeliveryNotification(orderId: string): Promise<Result<void, Error>>;
  
  // === Opérations de recherche ===
  
  /**
   * Recherche de commandes par critères
   */
  searchOrders(query: string, filters?: OrderFilters): Promise<Result<OrderWithDetails[], Error>>;
  
  /**
   * Trouve les commandes récentes
   */
  getRecentOrders(limit?: number): Promise<Result<OrderWithDetails[], Error>>;
  
  /**
   * Trouve les commandes en attente de traitement
   */
  getPendingOrders(): Promise<Result<OrderWithDetails[], Error>>;
  
  /**
   * Trouve les commandes nécessitant un suivi
   */
  getOrdersRequiringAttention(): Promise<Result<OrderWithDetails[], Error>>;
  
  // === Opérations de statistiques ===
  
  /**
   * Obtient les statistiques des commandes
   */
  getOrderStats(dateFrom?: string, dateTo?: string): Promise<Result<OrderStats, Error>>;
  
  /**
   * Obtient le chiffre d'affaires par période
   */
  getRevenueByPeriod(period: 'day' | 'week' | 'month', dateFrom?: string, dateTo?: string): Promise<Result<{ period: string; revenue: number }[], Error>>;
  
  /**
   * Obtient les produits les plus vendus
   */
  getBestSellingProducts(limit?: number, dateFrom?: string, dateTo?: string): Promise<Result<{ product_id: string; product_name: string; quantity_sold: number; revenue: number }[], Error>>;
  
  // === Opérations utilitaires ===
  
  /**
   * Génère un numéro de commande unique
   */
  generateOrderNumber(): Promise<Result<string, Error>>;
  
  /**
   * Archive les anciennes commandes
   */
  archiveOldOrders(olderThanDays: number): Promise<Result<number, Error>>;
  
  /**
   * Exporte les commandes au format CSV
   */
  exportOrdersToCSV(filters?: OrderFilters): Promise<Result<string, Error>>;
  
  /**
   * Synchronise les données avec les systèmes externes (ERP, etc.)
   */
  syncWithExternalSystems(orderId: string): Promise<Result<void, Error>>;
}

/**
 * Repository Service Token pour le Container DI
 */
export const ORDER_REPOSITORY_TOKEN = 'OrderRepository' as const;

/**
 * Configuration des délais et limites pour les commandes
 */
export const ORDER_CONFIG = {
  PAYMENT_TIMEOUT: 30 * 60 * 1000, // 30 minutes en ms
  STOCK_RESERVATION_TIMEOUT: 15 * 60 * 1000, // 15 minutes en ms
  AUTO_CANCEL_AFTER_DAYS: 7,
  MAX_REFUND_DAYS: 30,
  ORDER_NUMBER_PREFIX: 'HV',
  DEFAULT_CURRENCY: 'EUR',
} as const;