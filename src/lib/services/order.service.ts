/**
 * Order Service - Couche d'intégration avec migration progressive
 * 
 * Cette couche utilise les feature flags pour décider entre l'ancien système
 * et le nouveau OrderRepository avec intégration Stripe critique.
 * 
 * Pattern "Strangler Fig" : remplace progressivement l'ancien code.
 * Context7 : Pipeline commandes complexe le plus critique de l'application.
 */

import { Result } from '@/lib/core/result';
import { LogUtils } from '@/lib/core/logger';
import { isRepositoryEnabled } from '@/lib/config/feature-flags';
import { OrderSupabaseRepository } from '@/lib/infrastructure/repositories/order.supabase.repository';
import type { 
  IOrderRepository,
  Order,
  OrderWithDetails,
  CreateOrderData,
  UpdateOrderData,
  OrderSearchParams,
  PaginatedOrders,
  OrderStatus,
  StripeWebhookEvent,
  OrderStats
} from '@/lib/domain/interfaces/order.repository.interface';

// Import des anciennes fonctions (fallback - à implémenter si nécessaire)
// import { createOrder as createOrderLegacy } from '@/actions/orderActions';

export class OrderService {
  private repository: IOrderRepository;

  constructor() {
    this.repository = new OrderSupabaseRepository();
  }

  // === Opérations de base ===

  /**
   * Obtenir une commande par numéro de commande
   */
  async getOrderByNumber(orderNumber: string): Promise<Result<OrderWithDetails | null, Error>> {
    const context = LogUtils.createOperationContext('getOrderByNumber', 'order-service');
    LogUtils.logOperationStart('getOrderByNumber', { ...context, orderNumber });

    try {
      if (isRepositoryEnabled('USE_ORDER_REPOSITORY')) {
        LogUtils.logOperationInfo('getOrderByNumber', 'Using new OrderRepository', context);
        const result = await this.repository.findByOrderNumber(orderNumber);
        
        if (result.isSuccess()) {
          LogUtils.logOperationSuccess('getOrderByNumber', { 
            ...context, 
            source: 'repository', 
            found: !!result.getValue() 
          });
          return result;
        }

        LogUtils.logOperationWarning('getOrderByNumber', 'Repository failed, falling back to legacy', context);
      }

      // Fallback vers l'ancien système
      LogUtils.logOperationInfo('getOrderByNumber', 'Using legacy system (not implemented)', context);
      
      // TODO: Implémenter fallback vers l'ancien système
      LogUtils.logOperationError('getOrderByNumber', 'Legacy fallback not implemented', context);
      return Result.failure(new Error('Legacy fallback not implemented for getOrderByNumber'));

    } catch (error) {
      LogUtils.logOperationError('getOrderByNumber', error, context);
      return Result.failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Obtenir une commande avec tous ses détails
   */
  async getOrderWithDetails(orderId: string): Promise<Result<OrderWithDetails | null, Error>> {
    const context = LogUtils.createOperationContext('getOrderWithDetails', 'order-service');
    LogUtils.logOperationStart('getOrderWithDetails', { ...context, orderId });

    try {
      if (isRepositoryEnabled('USE_ORDER_REPOSITORY')) {
        LogUtils.logOperationInfo('getOrderWithDetails', 'Using new OrderRepository', context);
        const result = await this.repository.findByIdWithDetails(orderId);
        
        if (result.isSuccess()) {
          LogUtils.logOperationSuccess('getOrderWithDetails', { 
            ...context, 
            source: 'repository', 
            found: !!result.getValue(),
            itemsCount: result.getValue()?.items.length || 0
          });
          return result;
        }

        LogUtils.logOperationWarning('getOrderWithDetails', 'Repository failed, falling back to legacy', context);
      }

      // Fallback: pas d'équivalent dans l'ancien système
      LogUtils.logOperationError('getOrderWithDetails', 'Legacy fallback not available', context);
      return Result.failure(new Error('Legacy fallback not available for getOrderWithDetails'));

    } catch (error) {
      LogUtils.logOperationError('getOrderWithDetails', error, context);
      return Result.failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Obtenir les commandes d'un utilisateur
   */
  async getUserOrders(userId: string, params?: OrderSearchParams): Promise<Result<PaginatedOrders, Error>> {
    const context = LogUtils.createOperationContext('getUserOrders', 'order-service');
    LogUtils.logOperationStart('getUserOrders', { ...context, userId, params });

    try {
      if (isRepositoryEnabled('USE_ORDER_REPOSITORY')) {
        LogUtils.logOperationInfo('getUserOrders', 'Using new OrderRepository', context);
        const result = await this.repository.findByUserId(userId, params);
        
        if (result.isSuccess()) {
          LogUtils.logOperationSuccess('getUserOrders', { 
            ...context, 
            source: 'repository', 
            ordersCount: result.getValue()!.orders.length,
            total: result.getValue()!.total
          });
          return result;
        }

        LogUtils.logOperationWarning('getUserOrders', 'Repository failed, falling back to legacy', context);
      }

      // Fallback vers l'ancien système
      LogUtils.logOperationInfo('getUserOrders', 'Using legacy system (not implemented)', context);
      LogUtils.logOperationError('getUserOrders', 'Legacy fallback not implemented', context);
      return Result.failure(new Error('Legacy fallback not implemented for getUserOrders'));

    } catch (error) {
      LogUtils.logOperationError('getUserOrders', error, context);
      return Result.failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Obtenir toutes les commandes (admin)
   */
  async getAllOrders(params: OrderSearchParams): Promise<Result<PaginatedOrders, Error>> {
    const context = LogUtils.createOperationContext('getAllOrders', 'order-service');
    LogUtils.logOperationStart('getAllOrders', { ...context, params });

    try {
      if (isRepositoryEnabled('USE_ORDER_REPOSITORY')) {
        LogUtils.logOperationInfo('getAllOrders', 'Using new OrderRepository', context);
        const result = await this.repository.findAllOrders(params);
        
        if (result.isSuccess()) {
          LogUtils.logOperationSuccess('getAllOrders', { 
            ...context, 
            source: 'repository', 
            ordersCount: result.getValue()!.orders.length,
            total: result.getValue()!.total
          });
          return result;
        }

        LogUtils.logOperationWarning('getAllOrders', 'Repository failed, falling back to legacy', context);
      }

      // Fallback vers l'ancien système
      LogUtils.logOperationInfo('getAllOrders', 'Using legacy system (not implemented)', context);
      LogUtils.logOperationError('getAllOrders', 'Legacy fallback not implemented', context);
      return Result.failure(new Error('Legacy fallback not implemented for getAllOrders'));

    } catch (error) {
      LogUtils.logOperationError('getAllOrders', error, context);
      return Result.failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  // === Opérations CRUD ===

  /**
   * Créer une nouvelle commande
   */
  async createOrder(orderData: CreateOrderData): Promise<Result<OrderWithDetails, Error>> {
    const context = LogUtils.createOperationContext('createOrder', 'order-service');
    LogUtils.logOperationStart('createOrder', { ...context, userId: orderData.user_id });

    try {
      if (isRepositoryEnabled('USE_ORDER_REPOSITORY')) {
        LogUtils.logOperationInfo('createOrder', 'Using new OrderRepository', context);
        
        // Validation via repository
        const validationResult = await this.repository.validateOrderData(orderData);
        if (!validationResult.isSuccess()) {
          LogUtils.logOperationError('createOrder', validationResult.getError(), context);
          return validationResult;
        }

        // Vérifier la disponibilité des produits
        // TODO: Implémenter avec ProductService

        const result = await this.repository.createOrder(orderData);
        
        if (result.isSuccess()) {
          LogUtils.logOperationSuccess('createOrder', { 
            ...context, 
            source: 'repository',
            orderId: result.getValue()!.id,
            orderNumber: result.getValue()!.order_number
          });
          return result;
        }

        LogUtils.logOperationWarning('createOrder', 'Repository failed, falling back to legacy', context);
      }

      // Fallback vers l'ancien système
      LogUtils.logOperationInfo('createOrder', 'Using legacy system (not implemented)', context);
      LogUtils.logOperationError('createOrder', 'Legacy fallback not implemented', context);
      return Result.failure(new Error('Legacy fallback not implemented for createOrder'));

    } catch (error) {
      LogUtils.logOperationError('createOrder', error, context);
      return Result.failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Mettre à jour une commande existante
   */
  async updateOrder(orderId: string, orderData: UpdateOrderData): Promise<Result<Order, Error>> {
    const context = LogUtils.createOperationContext('updateOrder', 'order-service');
    LogUtils.logOperationStart('updateOrder', { ...context, orderId });

    try {
      if (isRepositoryEnabled('USE_ORDER_REPOSITORY')) {
        LogUtils.logOperationInfo('updateOrder', 'Using new OrderRepository', context);
        const result = await this.repository.updateOrder(orderId, orderData);
        
        if (result.isSuccess()) {
          LogUtils.logOperationSuccess('updateOrder', { 
            ...context, 
            source: 'repository' 
          });
          return result;
        }

        LogUtils.logOperationWarning('updateOrder', 'Repository failed, falling back to legacy', context);
      }

      // Fallback vers l'ancien système
      LogUtils.logOperationInfo('updateOrder', 'Using legacy system (not implemented)', context);
      LogUtils.logOperationError('updateOrder', 'Legacy fallback not implemented', context);
      return Result.failure(new Error('Legacy fallback not implemented for updateOrder'));

    } catch (error) {
      LogUtils.logOperationError('updateOrder', error, context);
      return Result.failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Supprimer une commande (soft delete)
   */
  async deleteOrder(orderId: string): Promise<Result<void, Error>> {
    const context = LogUtils.createOperationContext('deleteOrder', 'order-service');
    LogUtils.logOperationStart('deleteOrder', { ...context, orderId });

    try {
      if (isRepositoryEnabled('USE_ORDER_REPOSITORY')) {
        LogUtils.logOperationInfo('deleteOrder', 'Using new OrderRepository', context);
        const result = await this.repository.deleteOrder(orderId);
        
        if (result.isSuccess()) {
          LogUtils.logOperationSuccess('deleteOrder', { 
            ...context, 
            source: 'repository' 
          });
          return result;
        }

        LogUtils.logOperationWarning('deleteOrder', 'Repository failed, falling back to legacy', context);
      }

      // Fallback vers l'ancien système
      LogUtils.logOperationInfo('deleteOrder', 'Using legacy system (not implemented)', context);
      LogUtils.logOperationError('deleteOrder', 'Legacy fallback not implemented', context);
      return Result.failure(new Error('Legacy fallback not implemented for deleteOrder'));

    } catch (error) {
      LogUtils.logOperationError('deleteOrder', error, context);
      return Result.failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Mettre à jour le statut d'une commande
   */
  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Result<Order, Error>> {
    const context = LogUtils.createOperationContext('updateOrderStatus', 'order-service');
    LogUtils.logOperationStart('updateOrderStatus', { ...context, orderId, status });

    try {
      if (isRepositoryEnabled('USE_ORDER_REPOSITORY')) {
        LogUtils.logOperationInfo('updateOrderStatus', 'Using new OrderRepository', context);
        const result = await this.repository.updateOrderStatus(orderId, status);
        
        if (result.isSuccess()) {
          LogUtils.logOperationSuccess('updateOrderStatus', { 
            ...context, 
            source: 'repository' 
          });
          return result;
        }

        LogUtils.logOperationWarning('updateOrderStatus', 'Repository failed, falling back to legacy', context);
      }

      // Fallback vers l'ancien système
      LogUtils.logOperationInfo('updateOrderStatus', 'Using legacy system (not implemented)', context);
      LogUtils.logOperationError('updateOrderStatus', 'Legacy fallback not implemented', context);
      return Result.failure(new Error('Legacy fallback not implemented for updateOrderStatus'));

    } catch (error) {
      LogUtils.logOperationError('updateOrderStatus', error, context);
      return Result.failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  // === Pipeline de paiement Stripe (Context7 critique) ===

  /**
   * Créer un PaymentIntent Stripe pour une commande
   */
  async createPaymentIntent(orderId: string): Promise<Result<{ client_secret: string; payment_intent_id: string }, Error>> {
    const context = LogUtils.createOperationContext('createPaymentIntent', 'order-service');
    LogUtils.logOperationStart('createPaymentIntent', { ...context, orderId });

    try {
      if (isRepositoryEnabled('USE_ORDER_REPOSITORY')) {
        LogUtils.logOperationInfo('createPaymentIntent', 'Using new OrderRepository', context);
        const result = await this.repository.createPaymentIntent(orderId);
        
        if (result.isSuccess()) {
          LogUtils.logOperationSuccess('createPaymentIntent', { 
            ...context, 
            source: 'repository',
            paymentIntentId: result.getValue()!.payment_intent_id
          });
          return result;
        }

        LogUtils.logOperationWarning('createPaymentIntent', 'Repository failed, falling back to legacy', context);
      }

      // Fallback: intégration Stripe critique - pas de fallback sûr
      LogUtils.logOperationError('createPaymentIntent', 'Stripe integration requires repository', context);
      return Result.failure(new Error('Stripe PaymentIntent creation requires repository - no legacy fallback'));

    } catch (error) {
      LogUtils.logOperationError('createPaymentIntent', error, context);
      return Result.failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Confirmer le paiement d'une commande
   */
  async confirmPayment(orderId: string, paymentIntentId: string): Promise<Result<OrderWithDetails, Error>> {
    const context = LogUtils.createOperationContext('confirmPayment', 'order-service');
    LogUtils.logOperationStart('confirmPayment', { ...context, orderId, paymentIntentId });

    try {
      if (isRepositoryEnabled('USE_ORDER_REPOSITORY')) {
        LogUtils.logOperationInfo('confirmPayment', 'Using new OrderRepository', context);
        const result = await this.repository.confirmPayment(orderId, paymentIntentId);
        
        if (result.isSuccess()) {
          LogUtils.logOperationSuccess('confirmPayment', { 
            ...context, 
            source: 'repository'
          });
          return result;
        }

        LogUtils.logOperationWarning('confirmPayment', 'Repository failed, falling back to legacy', context);
      }

      // Fallback: intégration Stripe critique - pas de fallback sûr
      LogUtils.logOperationError('confirmPayment', 'Stripe payment confirmation requires repository', context);
      return Result.failure(new Error('Stripe payment confirmation requires repository - no legacy fallback'));

    } catch (error) {
      LogUtils.logOperationError('confirmPayment', error, context);
      return Result.failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Traiter un webhook Stripe
   */
  async processStripeWebhook(event: StripeWebhookEvent): Promise<Result<void, Error>> {
    const context = LogUtils.createOperationContext('processStripeWebhook', 'order-service');
    LogUtils.logOperationStart('processStripeWebhook', { ...context, eventType: event.type });

    try {
      if (isRepositoryEnabled('USE_ORDER_REPOSITORY')) {
        LogUtils.logOperationInfo('processStripeWebhook', 'Using new OrderRepository', context);
        const result = await this.repository.processStripeWebhook(event);
        
        if (result.isSuccess()) {
          LogUtils.logOperationSuccess('processStripeWebhook', { 
            ...context, 
            source: 'repository',
            eventId: event.id
          });
          return result;
        }

        LogUtils.logOperationWarning('processStripeWebhook', 'Repository failed, falling back to legacy', context);
      }

      // Fallback: webhook Stripe critique - pas de fallback sûr
      LogUtils.logOperationError('processStripeWebhook', 'Stripe webhook processing requires repository', context);
      return Result.failure(new Error('Stripe webhook processing requires repository - no legacy fallback'));

    } catch (error) {
      LogUtils.logOperationError('processStripeWebhook', error, context);
      return Result.failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  // === Opérations de validation ===

  /**
   * Valider les données d'une commande
   */
  async validateOrder(orderData: CreateOrderData): Promise<Result<void, Error>> {
    const context = LogUtils.createOperationContext('validateOrder', 'order-service');

    try {
      if (isRepositoryEnabled('USE_ORDER_REPOSITORY')) {
        LogUtils.logOperationInfo('validateOrder', 'Using new OrderRepository', context);
        return await this.repository.validateOrderData(orderData);
      }

      // Fallback: validation basique
      LogUtils.logOperationInfo('validateOrder', 'Using basic validation', context);
      
      if (!orderData.user_id) {
        return Result.failure(new Error('User ID is required'));
      }

      if (!orderData.items || orderData.items.length === 0) {
        return Result.failure(new Error('Order must contain at least one item'));
      }

      if (!orderData.billing_address) {
        return Result.failure(new Error('Billing address is required'));
      }

      LogUtils.logOperationSuccess('validateOrder', { ...context, source: 'basic' });
      return Result.success(undefined);

    } catch (error) {
      LogUtils.logOperationError('validateOrder', error, context);
      return Result.failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * Vérifier la disponibilité des produits dans une commande
   */
  async checkOrderAvailability(orderId: string): Promise<Result<boolean, Error>> {
    const context = LogUtils.createOperationContext('checkOrderAvailability', 'order-service');
    LogUtils.logOperationStart('checkOrderAvailability', { ...context, orderId });

    try {
      if (isRepositoryEnabled('USE_ORDER_REPOSITORY')) {
        LogUtils.logOperationInfo('checkOrderAvailability', 'Using new OrderRepository', context);
        return await this.repository.checkOrderAvailability(orderId);
      }

      // Fallback: considérer comme disponible
      LogUtils.logOperationInfo('checkOrderAvailability', 'Using fallback - assume available', context);
      LogUtils.logOperationSuccess('checkOrderAvailability', { ...context, source: 'fallback', available: true });
      return Result.success(true);

    } catch (error) {
      LogUtils.logOperationError('checkOrderAvailability', error, context);
      return Result.failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  // === Opérations de statistiques ===

  /**
   * Obtenir les statistiques des commandes
   */
  async getOrderStats(dateFrom?: string, dateTo?: string): Promise<Result<OrderStats, Error>> {
    const context = LogUtils.createOperationContext('getOrderStats', 'order-service');
    
    try {
      if (isRepositoryEnabled('USE_ORDER_REPOSITORY')) {
        LogUtils.logOperationInfo('getOrderStats', 'Using new OrderRepository', context);
        return await this.repository.getOrderStats(dateFrom, dateTo);
      }

      // Fallback: pas de statistiques dans l'ancien système
      LogUtils.logOperationError('getOrderStats', 'Stats not available in legacy system', context);
      return Result.failure(new Error('Order statistics require repository - no legacy fallback'));

    } catch (error) {
      LogUtils.logOperationError('getOrderStats', error, context);
      return Result.failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  // === Opérations utilitaires ===

  /**
   * Générer un numéro de commande unique
   */
  async generateOrderNumber(): Promise<Result<string, Error>> {
    const context = LogUtils.createOperationContext('generateOrderNumber', 'order-service');

    try {
      if (isRepositoryEnabled('USE_ORDER_REPOSITORY')) {
        LogUtils.logOperationInfo('generateOrderNumber', 'Using new OrderRepository', context);
        return await this.repository.generateOrderNumber();
      }

      // Fallback: génération simple
      LogUtils.logOperationInfo('generateOrderNumber', 'Using simple generation', context);
      
      const timestamp = Date.now().toString().slice(-8);
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      const orderNumber = `HV${timestamp}${random}`;
      
      LogUtils.logOperationSuccess('generateOrderNumber', { ...context, source: 'simple', orderNumber });
      return Result.success(orderNumber);

    } catch (error) {
      LogUtils.logOperationError('generateOrderNumber', error, context);
      return Result.failure(error instanceof Error ? error : new Error('Unknown error'));
    }
  }
}

// Instance singleton pour utilisation dans l'application
export const orderService = new OrderService();