/**
 * Event Bus Implementation
 * 
 * Coordinates event publishing and handling with support for:
 * - Event persistence via EventStore
 * - Async event processing
 * - Error handling and retries
 * - Event replay and recovery
 */

import { 
  DomainEvent, 
  EventBus, 
  EventHandler, 
  EventStore, 
  EventProcessor,
  EventEnvelope,
  EventProcessingResult,
  EventMetadata,
  EventFactory,
  EventCorrelation
} from '@/lib/core/events';
import { Result } from '@/lib/core/result';
import { logger, Logger } from '@/lib/core/logger';

// Temporary helper function
function createSimpleContext(action: string, resource: string, data: any = {}) {
  return { action, resource, ...data };
}

/**
 * In-Memory Event Bus Implementation
 * 
 * Provides immediate event processing with optional persistence
 */
export class InMemoryEventBus implements EventBus {
  private subscribers = new Map<string, Set<EventHandler>>();
  protected eventFactory = new EventFactory();
  protected eventStore?: EventStore;

  constructor(private readonly logger: Logger) {}

  /**
   * Subscribe an event handler to a specific event type
   */
  subscribe<T extends DomainEvent>(handler: EventHandler<T>): void {
    const handlers = this.subscribers.get(handler.eventType) || new Set();
    handlers.add(handler);
    this.subscribers.set(handler.eventType, handlers);

    logger.info('Event handler subscribed', {
      eventType: handler.eventType,
      handlerName: handler.constructor.name,
    });
  }

  /**
   * Unsubscribe an event handler
   */
  unsubscribe<T extends DomainEvent>(handler: EventHandler<T>): void {
    const handlers = this.subscribers.get(handler.eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.subscribers.delete(handler.eventType);
      }
    }

    logger.info('Event handler unsubscribed', {
      eventType: handler.eventType,
      handlerName: handler.constructor.name,
    });
  }

  /**
   * Get all subscribed handlers for an event type
   */
  getSubscribedHandlers(eventType: string): EventHandler[] {
    const handlers = this.subscribers.get(eventType);
    return handlers ? Array.from(handlers) : [];
  }

  /**
   * Publish a single event
   */
  async publish<T extends DomainEvent>(event: T): Promise<Result<void, Error>> {
    const context = {
      eventId: event.eventId,
      eventType: event.eventType,
      aggregateId: event.aggregateId,
      action: 'event_bus_publish',
      resource: 'events',
    };

    logger.info('EventBus.publish started', context);

    try {
      // Store event if persistence is configured
      if (this.eventStore) {
        const storeResult = await this.eventStore.append(event);
        if (storeResult.isError()) {
          logger.error('EventBus.publish', storeResult.getError(), context);
          return Result.error(storeResult.getError());
        }
      }

      // Process event immediately
      const processResult = await this.processEventImmediate(event);
      if (processResult.isError()) {
        logger.error('EventBus.publish', processResult.getError(), context);
        return Result.error(processResult.getError());
      }

      logger.info('EventBus.publish', context);
      return Result.ok(undefined);

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown event publishing error');
      logger.error('EventBus.publish', err, context);
      return Result.error(err);
    }
  }

  /**
   * Publish multiple events as a batch
   */
  async publishBatch<T extends DomainEvent>(events: T[]): Promise<Result<void, Error>> {
    const context = createSimpleContext('event_bus_publish_batch', 'events', {
      eventCount: events.length,
      eventTypes: events.map(e => e.eventType),
    });

    logger.info('EventBus.publishBatch', context);

    try {
      // Store events if persistence is configured
      if (this.eventStore) {
        const storeResult = await this.eventStore.appendBatch(events);
        if (storeResult.isError()) {
          logger.error('EventBus.publishBatch', storeResult.getError(), context);
          return Result.error(storeResult.getError());
        }
      }

      // Process all events
      const results = await Promise.allSettled(
        events.map(event => this.processEventImmediate(event))
      );

      // Check for failures
      const failures = results
        .map((result, index) => ({ result, index }))
        .filter(({ result }) => result.status === 'rejected' || 
          (result.status === 'fulfilled' && result.value.isError()))
        .map(({ result, index }) => ({
          event: events[index],
          error: result.status === 'rejected' 
            ? result.reason 
            : (result.value as Result<void, Error>).getError()
        }));

      if (failures.length > 0) {
        const error = new Error(`Failed to process ${failures.length} out of ${events.length} events`);
        logger.error('EventBus.publishBatch', error, {
          ...context,
          failures: failures.map(f => ({
            eventId: f.event.eventId,
            eventType: f.event.eventType,
            error: f.error.message,
          })),
        });
        return Result.error(error);
      }

      logger.info('EventBus.publishBatch', context);
      return Result.ok(undefined);

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown batch publishing error');
      logger.error('EventBus.publishBatch', err, context);
      return Result.error(err);
    }
  }

  /**
   * Process event immediately with all subscribed handlers
   */
  protected async processEventImmediate<T extends DomainEvent>(event: T): Promise<Result<void, Error>> {
    const handlers = this.getSubscribedHandlers(event.eventType);
    
    if (handlers.length === 0) {
      logger.debug('No handlers found for event type', {
        eventType: event.eventType,
        eventId: event.eventId,
      });
      return Result.ok(undefined);
    }

    const results = await Promise.allSettled(
      handlers.map(async handler => {
        try {
          const startTime = Date.now();
          const result = await handler.handle(event);
          const duration = Date.now() - startTime;

          if (result.isError()) {
            logger.error('Event handler failed', {
              eventType: event.eventType,
              eventId: event.eventId,
              handlerName: handler.constructor.name,
              error: result.getError().message,
              duration,
            });
            return result;
          }

          logger.debug('Event handler completed successfully', {
            eventType: event.eventType,
            eventId: event.eventId,
            handlerName: handler.constructor.name,
            duration,
          });

          return result;
        } catch (error) {
          const err = error instanceof Error ? error : new Error('Handler execution failed');
          logger.error('Event handler threw exception', {
            eventType: event.eventType,
            eventId: event.eventId,
            handlerName: handler.constructor.name,
            error: err.message,
          });
          return Result.error(err);
        }
      })
    );

    // Collect failures
    const failures = results
      .map((result, index) => ({ result, index }))
      .filter(({ result }) => result.status === 'rejected' || 
        (result.status === 'fulfilled' && result.value.isError()))
      .map(({ result, index }) => ({
        handler: handlers[index],
        error: result.status === 'rejected' 
          ? result.reason 
          : (result.value as Result<void, Error>).getError()
      }));

    if (failures.length > 0) {
      return Result.error(new Error(
        `${failures.length} out of ${handlers.length} handlers failed for event ${event.eventType}`
      ));
    }

    return Result.ok(undefined);
  }

  /**
   * Replay events from the event store
   */
  async replayEvents(
    aggregateId: string, 
    fromVersion?: number
  ): Promise<Result<number, Error>> {
    if (!this.eventStore) {
      return Result.error(new Error('Event store not configured for replay'));
    }

    try {
      const eventsResult = await this.eventStore.getEvents(aggregateId, fromVersion);
      if (eventsResult.isError()) {
        return Result.error(eventsResult.getError());
      }

      const events = eventsResult.getValue();
      let processedCount = 0;

      for (const event of events) {
        const result = await this.processEventImmediate(event);
        if (result.isSuccess()) {
          processedCount++;
        } else {
          logger.error('Failed to replay event', {
            eventId: event.eventId,
            eventType: event.eventType,
            error: result.getError().message,
          });
        }
      }

      logger.info('Event replay completed', {
        aggregateId,
        totalEvents: events.length,
        processedEvents: processedCount,
        fromVersion,
      });

      return Result.ok(processedCount);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Event replay failed');
      return Result.error(err);
    }
  }

  /**
   * Get statistics about the event bus
   */
  getStatistics(): {
    subscribedHandlers: number;
    eventTypes: string[];
    handlersByType: Record<string, number>;
  } {
    const eventTypes = Array.from(this.subscribers.keys());
    const handlersByType: Record<string, number> = {};
    let totalHandlers = 0;

    for (const [eventType, handlers] of this.subscribers) {
      handlersByType[eventType] = handlers.size;
      totalHandlers += handlers.size;
    }

    return {
      subscribedHandlers: totalHandlers,
      eventTypes,
      handlersByType,
    };
  }

  /**
   * Clear all subscriptions (useful for testing)
   */
  clear(): void {
    this.subscribers.clear();
    logger.info('Event bus cleared');
  }
}

/**
 * Async Event Bus Implementation
 * 
 * Provides asynchronous event processing with queuing and retry logic
 */
export class AsyncEventBus extends InMemoryEventBus {
  private processingQueue: EventEnvelope[] = [];
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private eventProcessor?: EventProcessor;

  constructor(
    logger: Logger,
    eventStore?: EventStore,
    eventProcessor?: EventProcessor,
    private readonly processingIntervalMs: number = 1000
  ) {
    super(logger);
    this.eventStore = eventStore;
    this.eventProcessor = eventProcessor;
    this.startProcessing();
  }

  /**
   * Publish event asynchronously (queued processing)
   */
  async publishAsync<T extends DomainEvent>(
    event: T, 
    metadata?: EventMetadata
  ): Promise<Result<void, Error>> {
    try {
      // Store event if persistence is configured
      if (this.eventStore) {
        const storeResult = await this.eventStore.append(event);
        if (storeResult.isError()) {
          return Result.error(storeResult.getError());
        }
      }

      // Add to processing queue
      const envelope = this.eventFactory.createEnvelope(
        event,
        metadata || EventCorrelation.createMetadata(event.userId)
      );

      this.processingQueue.push(envelope);

      logger.debug('Event queued for async processing', {
        eventId: event.eventId,
        eventType: event.eventType,
        queueSize: this.processingQueue.length,
      });

      return Result.ok(undefined);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Async publish failed');
      return Result.error(err);
    }
  }

  /**
   * Start the async processing loop
   */
  private startProcessing(): void {
    if (this.processingInterval) {
      return;
    }

    this.processingInterval = setInterval(async () => {
      if (!this.isProcessing && this.processingQueue.length > 0) {
        await this.processQueue();
      }
    }, this.processingIntervalMs);

    logger.info('Async event processing started', {
      intervalMs: this.processingIntervalMs,
    });
  }

  /**
   * Stop the async processing loop
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    logger.info('Async event processing stopped');
  }

  /**
   * Process the event queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const batch = this.processingQueue.splice(0, 10); // Process up to 10 events at once
      
      for (const envelope of batch) {
        await this.processEnvelope(envelope);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single event envelope
   */
  private async processEnvelope(envelope: EventEnvelope): Promise<void> {
    try {
      const result = await this.processEventImmediate(envelope.event);
      
      if (result.isError()) {
        envelope.retryCount++;
        envelope.failedAt = new Date();
        envelope.error = result.getError().message;

        if (envelope.retryCount < envelope.maxRetries) {
          // Re-queue for retry
          this.processingQueue.push(envelope);
          logger.warn('Event processing failed, queued for retry', {
            eventId: envelope.event.eventId,
            eventType: envelope.event.eventType,
            retryCount: envelope.retryCount,
            maxRetries: envelope.maxRetries,
            error: envelope.error,
          });
        } else {
          logger.error('Event processing failed after max retries', {
            eventId: envelope.event.eventId,
            eventType: envelope.event.eventType,
            retryCount: envelope.retryCount,
            error: envelope.error,
          });
        }
      } else {
        envelope.processedAt = new Date();
        logger.debug('Event processed successfully', {
          eventId: envelope.event.eventId,
          eventType: envelope.event.eventType,
          retryCount: envelope.retryCount,
        });
      }
    } catch (error) {
      logger.error('Unexpected error processing event envelope', {
        eventId: envelope.event.eventId,
        eventType: envelope.event.eventType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get queue statistics
   */
  getQueueStatistics(): {
    queueSize: number;
    isProcessing: boolean;
    processingIntervalMs: number;
  } {
    return {
      queueSize: this.processingQueue.length,
      isProcessing: this.isProcessing,
      processingIntervalMs: this.processingIntervalMs,
    };
  }

  /**
   * Clear the processing queue
   */
  clearQueue(): void {
    this.processingQueue = [];
    logger.info('Event processing queue cleared');
  }

  /**
   * Dispose of the async event bus
   */
  dispose(): void {
    this.stopProcessing();
    this.clearQueue();
    this.clear();
  }
}