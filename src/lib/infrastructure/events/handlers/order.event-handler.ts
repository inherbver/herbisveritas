/**
 * Order Event Handler
 * 
 * Gère tous les événements du domaine commandes.
 */

import { Result } from "@/lib/core/result";
import { BusinessError } from "@/lib/core/errors";
import type { DomainEvent, EventStore } from "@/lib/core/events";
import type { OrderSupabaseRepository } from "../../repositories/order.supabase.repository";
import { logger } from "@/lib/core/logger";

export class OrderEventHandler {
  constructor(
    private readonly orderRepository: OrderSupabaseRepository,
    private readonly eventStore: EventStore,
    private readonly logger: typeof logger
  ) {}

  async handle(event: DomainEvent): Promise<Result<void, BusinessError>> {
    try {
      switch (event.eventType) {
        case 'ORDER_CREATED':
          return await this.handleOrderCreated(event);
        case 'ORDER_CONFIRMED':
          return await this.handleOrderConfirmed(event);
        case 'ORDER_SHIPPED':
          return await this.handleOrderShipped(event);
        case 'ORDER_DELIVERED':
          return await this.handleOrderDelivered(event);
        case 'ORDER_CANCELLED':
          return await this.handleOrderCancelled(event);
        default:
          this.logger.warn('Unhandled order event type', { eventType: event.eventType });
          return Result.ok(undefined);
      }
    } catch (error) {
      this.logger.error('Order event handler error', { error, event });
      return Result.error(new BusinessError('Order event handling failed', { error, event }));
    }
  }

  async handleOrderCreated(event: DomainEvent): Promise<Result<void, BusinessError>> {
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

  async handleOrderConfirmed(event: DomainEvent): Promise<Result<void, BusinessError>> {
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

  async handleOrderShipped(event: DomainEvent): Promise<Result<void, BusinessError>> {
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

  async handleOrderDelivered(event: DomainEvent): Promise<Result<void, BusinessError>> {
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

  async handleOrderCancelled(event: DomainEvent): Promise<Result<void, BusinessError>> {
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