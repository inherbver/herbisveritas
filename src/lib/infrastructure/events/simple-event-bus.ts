/**
 * Simple Event Bus Implementation
 * 
 * Version simplifiée pour l'architecture Event-Driven avec les listeners.
 */

import { Result } from '@/lib/core/result';
import { BusinessError } from '@/lib/core/errors';
import type { DomainEvent, EventBus } from '@/lib/core/events';
import { logger } from '@/lib/core/logger';

export class SimpleEventBus implements EventBus {
  private subscribers = new Map<string, Set<(event: DomainEvent) => Promise<void>>>();

  constructor(private readonly logger: typeof logger) {}

  /**
   * Subscribe a handler function to a specific event type
   */
  async subscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): Promise<void> {
    const handlers = this.subscribers.get(eventType) || new Set();
    handlers.add(handler);
    this.subscribers.set(eventType, handlers);
    
    this.logger.debug('Event handler subscribed', { eventType, handlerCount: handlers.size });
  }

  /**
   * Unsubscribe a handler from an event type
   */
  async unsubscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): Promise<void> {
    const handlers = this.subscribers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.subscribers.delete(eventType);
      }
    }
  }

  /**
   * Publish a single event
   */
  async publish(event: DomainEvent): Promise<Result<void, BusinessError>> {
    try {
      this.logger.info('Publishing event', {
        eventId: event.eventId,
        eventType: event.eventType,
        aggregateId: event.aggregateId
      });

      const handlers = this.subscribers.get(event.eventType);
      if (!handlers || handlers.size === 0) {
        this.logger.warn('No handlers found for event type', { eventType: event.eventType });
        return Result.ok(undefined);
      }

      // Exécuter tous les handlers en parallèle
      const handlerPromises = Array.from(handlers).map(async (handler) => {
        try {
          await handler(event);
        } catch (error) {
          this.logger.error('Handler failed', { 
            error, 
            eventType: event.eventType, 
            eventId: event.eventId 
          });
          // Ne pas faire échouer les autres handlers
        }
      });

      await Promise.allSettled(handlerPromises);

      this.logger.debug('Event published successfully', {
        eventType: event.eventType,
        eventId: event.eventId,
        handlerCount: handlers.size
      });

      return Result.ok(undefined);
    } catch (error) {
      this.logger.error('Failed to publish event', { error, event });
      return Result.error(new BusinessError('Failed to publish event', { error, event }));
    }
  }

  /**
   * Publish multiple events as a batch
   */
  async publishBatch(events: DomainEvent[]): Promise<Result<void, BusinessError>> {
    try {
      this.logger.info('Publishing event batch', { eventCount: events.length });

      const publishPromises = events.map(event => this.publish(event));
      const results = await Promise.allSettled(publishPromises);

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      this.logger.info('Event batch published', {
        total: events.length,
        successful,
        failed
      });

      return Result.ok(undefined);
    } catch (error) {
      this.logger.error('Failed to publish event batch', { error, eventCount: events.length });
      return Result.error(new BusinessError('Failed to publish event batch', { error }));
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

    for (const [eventType, handlers] of this.subscribers.entries()) {
      handlersByType[eventType] = handlers.size;
      totalHandlers += handlers.size;
    }

    return {
      subscribedHandlers: totalHandlers,
      eventTypes,
      handlersByType
    };
  }

  /**
   * Clear all subscriptions (useful for testing)
   */
  clear(): void {
    this.subscribers.clear();
  }
}