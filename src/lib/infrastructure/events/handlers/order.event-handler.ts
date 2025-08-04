/**
 * Order Event Handler
 * 
 * Gère tous les événements du domaine commandes.
 */

import { Result } from "@/lib/core/result";
import { BusinessError } from "@/lib/core/errors";
import type { DomainEvent, EventStore } from "@/lib/core/events";
import type { OrderSupabaseRepository } from "../../repositories/order.supabase.repository";
import { logger, Logger } from "@/lib/core/logger";

interface OrderCreatedEventData {
  orderId: string;
  userId: string;
  totalAmount: number;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
}

interface OrderConfirmedEventData {
  orderId: string;
  confirmationNumber: string;
}

interface OrderShippedEventData {
  orderId: string;
  trackingNumber: string;
}

interface OrderDeliveredEventData {
  orderId: string;
  deliveredAt: Date;
}

interface OrderCancelledEventData {
  orderId: string;
  reason: string;
  refundAmount: number;
}

export class OrderEventHandler {
  constructor(
    private readonly orderRepository: OrderSupabaseRepository,
    private readonly eventStore: EventStore,
    private readonly logger: Logger = logger
  ) {}

  async handle(event: DomainEvent): Promise<Result<void, BusinessError>> {
    try {
      switch (event.eventType) {
        case 'ORDER_CREATED':
          return await this.handleOrderCreated(event as DomainEvent<OrderCreatedEventData>);
        case 'ORDER_CONFIRMED':
          return await this.handleOrderConfirmed(event as DomainEvent<OrderConfirmedEventData>);
        case 'ORDER_SHIPPED':
          return await this.handleOrderShipped(event as DomainEvent<OrderShippedEventData>);
        case 'ORDER_DELIVERED':
          return await this.handleOrderDelivered(event as DomainEvent<OrderDeliveredEventData>);
        case 'ORDER_CANCELLED':
          return await this.handleOrderCancelled(event as DomainEvent<OrderCancelledEventData>);
        default:
          this.logger.warn('Unhandled order event type', { eventType: event.eventType });
          return Result.ok(undefined);
      }
    } catch (error) {
      this.logger.error('Order event handler error', { error, event });
      return Result.error(new BusinessError('Order event handling failed', { error, event }));
    }
  }

  async handleOrderCreated(event: DomainEvent<OrderCreatedEventData>): Promise<Result<void, BusinessError>> {
    try {
      const { orderId, userId, totalAmount, items } = event.eventData;

      this.logger.info('Processing order created', {
        orderId,
        userId,
        totalAmount,
        itemCount: items?.length,
        eventId: event.eventId
      });

      return Result.ok(undefined);
    } catch (error) {
      this.logger.error('Failed to handle order created', error);
      return Result.error(new BusinessError('Failed to process order created event', { error }));
    }
  }

  async handleOrderConfirmed(event: DomainEvent<OrderConfirmedEventData>): Promise<Result<void, BusinessError>> {
    try {
      const { orderId, confirmationNumber } = event.eventData;

      this.logger.info('Processing order confirmed', {
        orderId,
        confirmationNumber,
        eventId: event.eventId
      });

      return Result.ok(undefined);
    } catch (error) {
      this.logger.error('Failed to handle order confirmed', error);
      return Result.error(new BusinessError('Failed to process order confirmed event', { error }));
    }
  }

  async handleOrderShipped(event: DomainEvent<OrderShippedEventData>): Promise<Result<void, BusinessError>> {
    try {
      const { orderId, trackingNumber } = event.eventData;

      this.logger.info('Processing order shipped', {
        orderId,
        trackingNumber,
        eventId: event.eventId
      });

      return Result.ok(undefined);
    } catch (error) {
      this.logger.error('Failed to handle order shipped', error);
      return Result.error(new BusinessError('Failed to process order shipped event', { error }));
    }
  }

  async handleOrderDelivered(event: DomainEvent<OrderDeliveredEventData>): Promise<Result<void, BusinessError>> {
    try {
      const { orderId, deliveredAt } = event.eventData;

      this.logger.info('Processing order delivered', {
        orderId,
        deliveredAt,
        eventId: event.eventId
      });

      return Result.ok(undefined);
    } catch (error) {
      this.logger.error('Failed to handle order delivered', error);
      return Result.error(new BusinessError('Failed to process order delivered event', { error }));
    }
  }

  async handleOrderCancelled(event: DomainEvent<OrderCancelledEventData>): Promise<Result<void, BusinessError>> {
    try {
      const { orderId, reason, refundAmount } = event.eventData;

      this.logger.info('Processing order cancelled', {
        orderId,
        reason,
        refundAmount,
        eventId: event.eventId
      });

      return Result.ok(undefined);
    } catch (error) {
      this.logger.error('Failed to handle order cancelled', error);
      return Result.error(new BusinessError('Failed to process order cancelled event', { error }));
    }
  }
}