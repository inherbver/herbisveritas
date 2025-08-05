/**
 * Consolidated Event System - Phase 5 Pragmatic Implementation
 * 
 * This consolidation follows the architectural recommendations to:
 * 1. Reduce event granularity where appropriate
 * 2. Simplify event handling patterns
 * 3. Maintain type safety while reducing complexity
 * 4. Focus on business value over technical abstraction
 */

import { Result } from './result';
import { EventTypes } from './events';

/**
 * Business Domain Events - Consolidated approach
 * Instead of fine-grained events, we use discriminated unions for related actions
 */

// Cart Events - Consolidated with discriminated union
export interface CartEvent {
  type: 'item_added' | 'item_removed' | 'quantity_updated' | 'cleared' | 'abandoned';
  cartId: string;
  userId: string;
  timestamp: Date;
  metadata?: {
    correlationId?: string;
    source?: string;
  };
  data: CartEventData;
}

type CartEventData = 
  | { type: 'item_added'; productId: string; quantity: number; productName: string; price: number; }
  | { type: 'item_removed'; itemId: string; productId: string; quantity: number; }
  | { type: 'quantity_updated'; itemId: string; productId: string; oldQuantity: number; newQuantity: number; }
  | { type: 'cleared'; totalItems: number; totalValue: number; }
  | { type: 'abandoned'; duration: number; totalItems: number; totalValue: number; };

// Order Events - Consolidated workflow
export interface OrderEvent {
  type: 'created' | 'paid' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  orderId: string;
  userId: string;
  timestamp: Date;
  metadata?: {
    correlationId?: string;
    source?: string;
  };
  data: OrderEventData;
}

type OrderEventData = 
  | { type: 'created'; totalAmount: number; currency: string; itemCount: number; }
  | { type: 'paid'; paymentId: string; amount: number; paymentMethod: string; }
  | { type: 'confirmed'; estimatedDelivery?: Date; }
  | { type: 'shipped'; trackingNumber: string; carrier: string; }
  | { type: 'delivered'; deliveredAt: Date; signature?: string; }
  | { type: 'cancelled'; reason: string; refundAmount?: number; }
  | { type: 'refunded'; refundId: string; amount: number; reason: string; };

// Product Events - Simplified for business relevance
export interface ProductEvent {
  type: 'created' | 'updated' | 'stock_changed' | 'price_changed' | 'status_changed';
  productId: string;
  timestamp: Date;
  metadata?: {
    correlationId?: string;
    adminUserId?: string;
  };
  data: ProductEventData;
}

type ProductEventData = 
  | { type: 'created'; name: string; category: string; price: number; }
  | { type: 'updated'; changes: Record<string, { old: any; new: any; }>; }
  | { type: 'stock_changed'; oldStock: number; newStock: number; reason: string; }
  | { type: 'price_changed'; oldPrice: number; newPrice: number; reason?: string; }
  | { type: 'status_changed'; oldStatus: string; newStatus: string; };

// User Events - Security and business focused
export interface UserEvent {
  type: 'registered' | 'email_verified' | 'profile_updated' | 'role_changed' | 'deactivated';
  userId: string;
  timestamp: Date;
  metadata?: {
    correlationId?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  data: UserEventData;
}

type UserEventData = 
  | { type: 'registered'; email: string; registrationMethod: string; }
  | { type: 'email_verified'; verifiedAt: Date; }
  | { type: 'profile_updated'; changes: string[]; }
  | { type: 'role_changed'; oldRole: string; newRole: string; adminUserId: string; }
  | { type: 'deactivated'; reason: string; adminUserId?: string; };

/**
 * Consolidated Event Types
 */
export type BusinessEvent = CartEvent | OrderEvent | ProductEvent | UserEvent;

/**
 * Event Handler Interface - Simplified
 */
export interface BusinessEventHandler<T extends BusinessEvent = BusinessEvent> {
  readonly supportedEventTypes: T['type'][];
  handle(event: T): Promise<Result<void, Error>>;
}

/**
 * Event Publisher - Pragmatic approach
 */
export interface BusinessEventPublisher {
  publishCartEvent(event: CartEvent): Promise<Result<void, Error>>;
  publishOrderEvent(event: OrderEvent): Promise<Result<void, Error>>;
  publishProductEvent(event: ProductEvent): Promise<Result<void, Error>>;
  publishUserEvent(event: UserEvent): Promise<Result<void, Error>>;
  
  // Batch operations for performance
  publishBatch(events: BusinessEvent[]): Promise<Result<void, Error>>;
}

/**
 * Event Factory - Simplified creation patterns
 */
export class BusinessEventFactory {
  
  static createCartEvent(
    type: CartEvent['type'],
    cartId: string,
    userId: string,
    data: CartEventData,
    metadata?: CartEvent['metadata']
  ): CartEvent {
    return {
      type,
      cartId,
      userId,
      timestamp: new Date(),
      data,
      metadata
    };
  }

  static createOrderEvent(
    type: OrderEvent['type'],
    orderId: string,
    userId: string,
    data: OrderEventData,
    metadata?: OrderEvent['metadata']
  ): OrderEvent {
    return {
      type,
      orderId,
      userId,
      timestamp: new Date(),
      data,
      metadata
    };
  }

  static createProductEvent(
    type: ProductEvent['type'],
    productId: string,
    data: ProductEventData,
    metadata?: ProductEvent['metadata']
  ): ProductEvent {
    return {
      type,
      productId,
      timestamp: new Date(),
      data,
      metadata
    };
  }

  static createUserEvent(
    type: UserEvent['type'],
    userId: string,
    data: UserEventData,
    metadata?: UserEvent['metadata']
  ): UserEvent {
    return {
      type,
      userId,
      timestamp: new Date(),
      data,
      metadata
    };
  }
}

/**
 * Event Correlation - Simplified tracking
 */
export class EventCorrelationService {
  private static counter = 0;

  static generateCorrelationId(): string {
    return `corr_${Date.now()}_${++this.counter}`;
  }

  static createMetadata(source: string, correlationId?: string): { correlationId: string; source: string } {
    return {
      correlationId: correlationId || this.generateCorrelationId(),
      source
    };
  }
}

/**
 * Event Metrics - Observability without over-engineering
 */
export interface EventMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  successRate: number;
  averageProcessingTime: number;
  lastProcessedAt?: Date;
}

export class EventMetricsCollector {
  private metrics: EventMetrics = {
    totalEvents: 0,
    eventsByType: {},
    successRate: 100,
    averageProcessingTime: 0
  };

  recordEvent(eventType: string, processingTimeMs: number, success: boolean): void {
    this.metrics.totalEvents++;
    this.metrics.eventsByType[eventType] = (this.metrics.eventsByType[eventType] || 0) + 1;
    this.metrics.lastProcessedAt = new Date();
    
    // Simple moving average for processing time
    const current = this.metrics.averageProcessingTime;
    this.metrics.averageProcessingTime = (current + processingTimeMs) / 2;
    
    // Simple success rate calculation
    if (!success) {
      this.metrics.successRate = Math.max(0, this.metrics.successRate - 0.1);
    } else if (this.metrics.successRate < 100) {
      this.metrics.successRate = Math.min(100, this.metrics.successRate + 0.05);
    }
  }

  getMetrics(): EventMetrics {
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = {
      totalEvents: 0,
      eventsByType: {},
      successRate: 100,
      averageProcessingTime: 0
    };
  }
}

/**
 * Event Bus - Simplified implementation
 */
export class ConsolidatedEventBus implements BusinessEventPublisher {
  private handlers: Map<string, BusinessEventHandler[]> = new Map();
  private metricsCollector = new EventMetricsCollector();

  subscribe<T extends BusinessEvent>(handler: BusinessEventHandler<T>): void {
    for (const eventType of handler.supportedEventTypes) {
      const handlers = this.handlers.get(eventType) || [];
      handlers.push(handler as BusinessEventHandler);
      this.handlers.set(eventType, handlers);
    }
  }

  async publishCartEvent(event: CartEvent): Promise<Result<void, Error>> {
    return this.publishEvent(event);
  }

  async publishOrderEvent(event: OrderEvent): Promise<Result<void, Error>> {
    return this.publishEvent(event);
  }

  async publishProductEvent(event: ProductEvent): Promise<Result<void, Error>> {
    return this.publishEvent(event);
  }

  async publishUserEvent(event: UserEvent): Promise<Result<void, Error>> {
    return this.publishEvent(event);
  }

  async publishBatch(events: BusinessEvent[]): Promise<Result<void, Error>> {
    const results = await Promise.allSettled(
      events.map(event => this.publishEvent(event))
    );

    const failures = results.filter(result => result.status === 'rejected');
    if (failures.length > 0) {
      return Result.error(new Error(`${failures.length} events failed to publish`));
    }

    return Result.ok(undefined);
  }

  private async publishEvent(event: BusinessEvent): Promise<Result<void, Error>> {
    const startTime = Date.now();
    let success = true;

    try {
      const handlers = this.handlers.get(event.type) || [];
      
      if (handlers.length === 0) {
        console.warn(`No handlers registered for event type: ${event.type}`);
        return Result.ok(undefined);
      }

      // Process handlers in parallel for performance
      const results = await Promise.allSettled(
        handlers.map(handler => handler.handle(event))
      );

      // Check for failures
      const failures = results.filter(result => result.status === 'rejected');
      if (failures.length > 0) {
        success = false;
        return Result.error(new Error(`${failures.length} handlers failed for event ${event.type}`));
      }

      return Result.ok(undefined);
    } catch (error) {
      success = false;
      return Result.error(error instanceof Error ? error : new Error('Unknown error'));
    } finally {
      const processingTime = Date.now() - startTime;
      this.metricsCollector.recordEvent(event.type, processingTime, success);
    }
  }

  getMetrics(): EventMetrics {
    return this.metricsCollector.getMetrics();
  }

  getRegisteredHandlers(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [eventType, handlers] of this.handlers.entries()) {
      result[eventType] = handlers.length;
    }
    return result;
  }
}