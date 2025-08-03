/**
 * Core Event System
 * 
 * Provides the foundation for Domain-Driven Design event architecture
 * with type-safe event handling and persistence.
 */

import { Result } from './result';

/**
 * Base interface for all domain events
 */
export interface DomainEvent<T = unknown> {
  readonly eventId: string;
  readonly eventType: string;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly eventData: T;
  readonly occurredAt: Date;
  readonly version: number;
  readonly userId?: string;
  readonly correlationId?: string;
  readonly causationId?: string;
}

/**
 * Event handler interface
 */
export interface EventHandler<T extends DomainEvent = DomainEvent> {
  readonly eventType: string;
  handle(event: T): Promise<Result<void, Error>>;
}

/**
 * Event publisher interface
 */
export interface EventPublisher {
  publish<T extends DomainEvent>(event: T): Promise<Result<void, Error>>;
  publishBatch<T extends DomainEvent>(events: T[]): Promise<Result<void, Error>>;
}

/**
 * Event store interface for persistence
 */
export interface EventStore {
  append<T extends DomainEvent>(event: T): Promise<Result<void, Error>>;
  appendBatch<T extends DomainEvent>(events: T[]): Promise<Result<void, Error>>;
  getEvents(aggregateId: string, fromVersion?: number): Promise<Result<DomainEvent[], Error>>;
  getEventsByType(eventType: string, fromDate?: Date): Promise<Result<DomainEvent[], Error>>;
  getAllEvents(fromDate?: Date, limit?: number): Promise<Result<DomainEvent[], Error>>;
}

/**
 * Event bus interface for coordinating publishers and handlers
 */
export interface EventBus {
  subscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): Promise<void>;
  unsubscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): Promise<void>;
  publish<T extends DomainEvent>(event: T): Promise<Result<void, Error>>;
  publishBatch<T extends DomainEvent>(events: T[]): Promise<Result<void, Error>>;
  getSubscribedHandlers(eventType: string): ((event: DomainEvent) => Promise<void>)[];
}

/**
 * Abstract base class for domain events
 */
export abstract class BaseDomainEvent<T = unknown> implements DomainEvent<T> {
  public readonly eventId: string;
  public readonly occurredAt: Date;
  public readonly version: number;
  
  constructor(
    public readonly eventType: string,
    public readonly aggregateId: string,
    public readonly aggregateType: string,
    public readonly eventData: T,
    public readonly userId?: string,
    public readonly correlationId?: string,
    public readonly causationId?: string,
    version: number = 1
  ) {
    this.eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.occurredAt = new Date();
    this.version = version;
  }
}

/**
 * Event metadata for enriching events
 */
export interface EventMetadata {
  userId?: string;
  correlationId?: string;
  causationId?: string;
  source?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Event envelope for wrapping events with metadata
 */
export interface EventEnvelope<T extends DomainEvent = DomainEvent> {
  event: T;
  metadata: EventMetadata;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  processedAt?: Date;
  failedAt?: Date;
  error?: string;
}

/**
 * Event processing result
 */
export interface EventProcessingResult {
  success: boolean;
  eventId: string;
  eventType: string;
  processedAt: Date;
  error?: string;
  retryCount: number;
}

/**
 * Event processor interface for handling event processing workflows
 */
export interface EventProcessor {
  process<T extends DomainEvent>(envelope: EventEnvelope<T>): Promise<EventProcessingResult>;
  processAsync<T extends DomainEvent>(envelope: EventEnvelope<T>): Promise<void>;
  getProcessingStats(): Promise<{
    totalEvents: number;
    successfulEvents: number;
    failedEvents: number;
    retryingEvents: number;
  }>;
}

/**
 * Event serialization interface
 */
export interface EventSerializer {
  serialize<T extends DomainEvent>(event: T): string;
  deserialize<T extends DomainEvent>(serializedEvent: string): T;
}

/**
 * JSON event serializer implementation
 */
export class JsonEventSerializer implements EventSerializer {
  serialize<T extends DomainEvent>(event: T): string {
    try {
      return JSON.stringify({
        eventId: event.eventId,
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        eventData: event.eventData,
        occurredAt: event.occurredAt.toISOString(),
        version: event.version,
        userId: event.userId,
        correlationId: event.correlationId,
        causationId: event.causationId,
      });
    } catch (error) {
      throw new Error(`Failed to serialize event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  deserialize<T extends DomainEvent>(serializedEvent: string): T {
    try {
      const parsed = JSON.parse(serializedEvent);
      return {
        ...parsed,
        occurredAt: new Date(parsed.occurredAt),
      } as T;
    } catch (error) {
      throw new Error(`Failed to deserialize event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Event factory for creating events with proper metadata
 */
export class EventFactory {
  constructor(
    private readonly serializer: EventSerializer = new JsonEventSerializer()
  ) {}

  static create<T>(
    eventType: string,
    aggregateId: string,
    aggregateType: string,
    eventData: T,
    metadata?: EventMetadata
  ): DomainEvent<T> {
    return new (class extends BaseDomainEvent<T> {
      constructor() {
        super(
          eventType,
          aggregateId,
          aggregateType,
          eventData,
          metadata?.userId,
          metadata?.correlationId,
          metadata?.causationId
        );
      }
    })();
  }

  createEnvelope<T extends DomainEvent>(
    event: T,
    metadata: EventMetadata,
    maxRetries: number = 3
  ): EventEnvelope<T> {
    return {
      event,
      metadata,
      retryCount: 0,
      maxRetries,
      createdAt: new Date(),
    };
  }
}

/**
 * Event type definitions for the application
 */
export const EventTypes = {
  // Cart Events
  CART_ITEM_ADDED: 'cart.item.added',
  CART_ITEM_REMOVED: 'cart.item.removed',
  CART_ITEM_QUANTITY_UPDATED: 'cart.item.quantity.updated',
  CART_CLEARED: 'cart.cleared',
  CART_ABANDONED: 'cart.abandoned',

  // Order Events
  ORDER_CREATED: 'order.created',
  ORDER_PAID: 'order.paid',
  ORDER_CONFIRMED: 'order.confirmed',
  ORDER_SHIPPED: 'order.shipped',
  ORDER_DELIVERED: 'order.delivered',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_REFUNDED: 'order.refunded',

  // Product Events
  PRODUCT_CREATED: 'product.created',
  PRODUCT_UPDATED: 'product.updated',
  PRODUCT_STOCK_UPDATED: 'product.stock.updated',
  PRODUCT_PRICE_CHANGED: 'product.price.changed',
  PRODUCT_ACTIVATED: 'product.activated',
  PRODUCT_DEACTIVATED: 'product.deactivated',

  // User Events
  USER_REGISTERED: 'user.registered',
  USER_EMAIL_VERIFIED: 'user.email.verified',
  USER_PROFILE_UPDATED: 'user.profile.updated',
  USER_ROLE_CHANGED: 'user.role.changed',
  USER_DEACTIVATED: 'user.deactivated',

  // Address Events
  ADDRESS_CREATED: 'address.created',
  ADDRESS_UPDATED: 'address.updated',
  ADDRESS_DELETED: 'address.deleted',

  // Magazine Events
  ARTICLE_PUBLISHED: 'article.published',
  ARTICLE_UPDATED: 'article.updated',
  ARTICLE_UNPUBLISHED: 'article.unpublished',

  // Payment Events
  PAYMENT_INITIATED: 'payment.initiated',
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',

  // System Events
  SYSTEM_STARTUP: 'system.startup',
  SYSTEM_SHUTDOWN: 'system.shutdown',
  SYSTEM_ERROR: 'system.error',
} as const;

export type EventType = typeof EventTypes[keyof typeof EventTypes];

/**
 * Event correlation utilities
 */
export class EventCorrelation {
  private static correlationIdCounter = 0;

  static generateCorrelationId(): string {
    return `corr_${Date.now()}_${++this.correlationIdCounter}`;
  }

  static generateCausationId(): string {
    return `cause_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static createMetadata(
    userId?: string,
    source?: string,
    requestId?: string
  ): EventMetadata {
    return {
      userId,
      correlationId: this.generateCorrelationId(),
      causationId: this.generateCausationId(),
      source,
      requestId,
    };
  }
}

/**
 * Event validation utilities
 */
export class EventValidation {
  static isValidEvent(event: unknown): event is DomainEvent {
    return (
      typeof event === 'object' &&
      event !== null &&
      'eventId' in event && typeof (event as any).eventId === 'string' &&
      'eventType' in event && typeof (event as any).eventType === 'string' &&
      'aggregateId' in event && typeof (event as any).aggregateId === 'string' &&
      'aggregateType' in event && typeof (event as any).aggregateType === 'string' &&
      'occurredAt' in event && (event as any).occurredAt instanceof Date &&
      'version' in event && typeof (event as any).version === 'number'
    );
  }

  static validateEventType(eventType: string): boolean {
    return Object.values(EventTypes).includes(eventType as EventType);
  }

  static sanitizeEventData(eventData: unknown): unknown {
    // Remove sensitive data and perform basic sanitization
    if (typeof eventData === 'object' && eventData !== null) {
      const sanitized = { ...eventData } as any;
      
      // Remove common sensitive fields
      delete sanitized.password;
      delete sanitized.token;
      delete sanitized.secret;
      delete sanitized.creditCard;
      delete sanitized.ssn;
      
      return sanitized;
    }
    
    return eventData;
  }
}