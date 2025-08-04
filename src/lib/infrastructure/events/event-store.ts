/**
 * Event Store Implementation
 * 
 * Implémentations concrètes des interfaces EventStore pour la persistance des événements.
 */

import { Result } from "@/lib/core/result";
import { BusinessError } from "@/lib/core/errors";
import type { DomainEvent, EventStore } from "@/lib/core/events";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logger, Logger } from "@/lib/core/logger";

/**
 * Structure des événements stockés dans Supabase
 */
interface StoredEventRecord {
  id: string;
  event_id: string;
  event_type: string;
  aggregate_id: string;
  aggregate_type: string;
  event_data: any; // JSONB
  version: number;
  occurred_at: string;
  created_at?: string;
  checksum?: string;
}

/**
 * Event Store en mémoire pour les tests et développement
 */
export class InMemoryEventStore implements EventStore {
  private events: DomainEvent[] = [];
  private readonly supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient, private readonly logger: Logger) {
    this.supabaseClient = supabaseClient;
  }

  async append(event: DomainEvent): Promise<Result<void, BusinessError>> {
    try {
      // Stocker en mémoire pour accès rapide
      this.events.push(event);

      // Persister dans Supabase de manière asynchrone
      const record: Partial<StoredEventRecord> = {
        event_id: event.eventId,
        event_type: event.eventType,
        aggregate_id: event.aggregateId,
        aggregate_type: event.aggregateType,
        event_data: event.eventData,
        version: event.version,
        occurred_at: event.occurredAt.toISOString(),
      };

      const { error } = await this.supabaseClient
        .from('domain_events')
        .insert(record);

      if (error) {
        this.logger.error('Failed to persist event to Supabase', { error, event });
        // Continue anyway - l'événement est en mémoire
      }

      this.logger.debug('Event appended to store', { 
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        eventId: event.eventId 
      });

      return Result.ok(undefined);
    } catch (error) {
      this.logger.error('Failed to append event', error);
      return Result.error(new BusinessError('Failed to append event to event store', { error }));
    }
  }

  async appendBatch(events: DomainEvent[]): Promise<Result<void, BusinessError>> {
    try {
      // Stocker en mémoire
      this.events.push(...events);

      // Persister en batch dans Supabase
      const records: Partial<StoredEventRecord>[] = events.map(event => ({
        event_id: event.eventId,
        event_type: event.eventType,
        aggregate_id: event.aggregateId,
        aggregate_type: event.aggregateType,
        event_data: event.eventData,
        version: event.version,
        occurred_at: event.occurredAt.toISOString(),
      }));

      const { error } = await this.supabaseClient
        .from('domain_events')
        .insert(records);

      if (error) {
        this.logger.error('Failed to persist event batch to Supabase', { error, count: events.length });
        // Continue anyway - les événements sont en mémoire
      }

      this.logger.debug('Event batch appended to store', { count: events.length });

      return Result.ok(undefined);
    } catch (error) {
      this.logger.error('Failed to append event batch', error);
      return Result.error(new BusinessError('Failed to append event batch to event store', { error }));
    }
  }

  async getEvents(aggregateId: string, fromVersion?: number): Promise<Result<DomainEvent[], BusinessError>> {
    try {
      // Essayer d'abord Supabase
      let query = this.supabaseClient
        .from('domain_events')
        .select('*')
        .eq('aggregate_id', aggregateId)
        .order('version', { ascending: true });

      if (fromVersion !== undefined) {
        query = query.gte('version', fromVersion);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.warn('Failed to fetch events from Supabase, falling back to memory', { error, aggregateId });
        
        // Fallback sur les événements en mémoire
        let memoryEvents = this.events.filter(e => e.aggregateId === aggregateId);
        
        if (fromVersion !== undefined) {
          memoryEvents = memoryEvents.filter(e => e.version >= fromVersion);
        }
        
        return Result.ok(memoryEvents.sort((a, b) => a.version - b.version));
      }

      // Convertir les enregistrements Supabase en DomainEvent
      const events: DomainEvent[] = (data || []).map(record => ({
        eventId: record.event_id,
        eventType: record.event_type,
        aggregateId: record.aggregate_id,
        aggregateType: record.aggregate_type,
        eventData: record.event_data,
        version: record.version,
        occurredAt: new Date(record.occurred_at),
      }));

      return Result.ok(events);
    } catch (error) {
      this.logger.error('Failed to get events', error);
      return Result.error(new BusinessError('Failed to retrieve events from event store', { error }));
    }
  }

  async getEventsByType(eventType: string, options?: { fromDate?: Date; limit?: number }): Promise<Result<DomainEvent[], BusinessError>> {
    try {
      // Essayer d'abord Supabase
      let query = this.supabaseClient
        .from('domain_events')
        .select('*')
        .eq('event_type', eventType)
        .order('occurred_at', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.fromDate) {
        query = query.gte('occurred_at', options.fromDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        this.logger.warn('Failed to fetch events by type from Supabase, falling back to memory', { error, eventType });
        
        // Fallback sur les événements en mémoire
        let memoryEvents = this.events.filter(e => e.eventType === eventType);
        memoryEvents.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
        
        if (options?.limit) {
          memoryEvents = memoryEvents.slice(0, options.limit);
        }
        
        return Result.ok(memoryEvents);
      }

      // Convertir les enregistrements Supabase en DomainEvent
      const events: DomainEvent[] = (data || []).map(record => ({
        eventId: record.event_id,
        eventType: record.event_type,
        aggregateId: record.aggregate_id,
        aggregateType: record.aggregate_type,
        eventData: record.event_data,
        version: record.version,
        occurredAt: new Date(record.occurred_at),
      }));

      return Result.ok(events);
    } catch (error) {
      this.logger.error('Failed to get events by type', error);
      return Result.error(new BusinessError('Failed to retrieve events by type from event store', { error }));
    }
  }

  async getStatistics(): Promise<Result<{ totalEvents: number; eventTypes: string[]; oldestEvent?: Date; newestEvent?: Date }, BusinessError>> {
    try {
      const memoryEventCount = this.events.length;
      const memoryEventTypes = Array.from(new Set(this.events.map(e => e.eventType)));

      // Essayer d'obtenir les statistiques de Supabase
      const { data, error } = await this.supabaseClient
        .from('domain_events')
        .select('event_type, occurred_at', { count: 'exact' });

      if (error) {
        this.logger.warn('Failed to get statistics from Supabase, using memory data', { error });
        
        const oldestEvent = this.events.length > 0 
          ? new Date(Math.min(...this.events.map(e => e.occurredAt.getTime())))
          : undefined;
        const newestEvent = this.events.length > 0
          ? new Date(Math.max(...this.events.map(e => e.occurredAt.getTime())))
          : undefined;

        return Result.ok({
          totalEvents: memoryEventCount,
          eventTypes: memoryEventTypes,
          oldestEvent,
          newestEvent
        });
      }

      const supabaseEventTypes = Array.from(new Set((data || []).map(record => record.event_type)));
      const allEventTypes = Array.from(new Set([...memoryEventTypes, ...supabaseEventTypes]));

      const dates = (data || []).map(record => new Date(record.occurred_at));
      const oldestEvent = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : undefined;
      const newestEvent = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : undefined;

      return Result.ok({
        totalEvents: (data?.length || 0) + memoryEventCount,
        eventTypes: allEventTypes,
        oldestEvent,
        newestEvent
      });
    } catch (error) {
      this.logger.error('Failed to get event store statistics', error);
      return Result.error(new BusinessError('Failed to retrieve event store statistics', { error }));
    }
  }

  // Méthodes utilitaires pour les tests
  async clear(): Promise<void> {
    this.events = [];
    
    try {
      await this.supabaseClient
        .from('domain_events')
        .delete()
        .neq('id', ''); // Supprimer tous les enregistrements
    } catch (error) {
      this.logger.warn('Failed to clear Supabase events (test cleanup)', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  getInMemoryEvents(): DomainEvent[] {
    return [...this.events];
  }

  getInMemoryEventCount(): number {
    return this.events.length;
  }

  async getAllEvents(fromDate?: Date, limit?: number): Promise<Result<DomainEvent[], BusinessError>> {
    try {
      let events = [...this.events];
      
      if (fromDate) {
        events = events.filter(event => event.occurredAt >= fromDate);
      }
      
      if (limit) {
        events = events.slice(0, limit);
      }
      
      return Result.ok(events);
    } catch (error) {
      this.logger.error('Failed to get all events', error);
      return Result.error(new BusinessError('Failed to retrieve all events from event store', { error }));
    }
  }
}

/**
 * Event Store persistant (utilise uniquement Supabase)
 * Alternative à InMemoryEventStore pour la production
 */
export class SupabaseEventStore implements EventStore {
  constructor(
    private readonly supabaseClient: SupabaseClient,
    private readonly logger: Logger = logger
  ) {}

  async append(event: DomainEvent): Promise<Result<void, BusinessError>> {
    try {
      const record: Partial<StoredEventRecord> = {
        event_id: event.eventId,
        event_type: event.eventType,
        aggregate_id: event.aggregateId,
        aggregate_type: event.aggregateType,
        event_data: event.eventData,
        version: event.version,
        occurred_at: event.occurredAt.toISOString(),
      };

      const { error } = await this.supabaseClient
        .from('domain_events')
        .insert(record);

      if (error) {
        this.logger.error('Failed to persist event to Supabase', { error, event });
        return Result.error(new BusinessError('Failed to persist event', { error }));
      }

      this.logger.debug('Event persisted to Supabase', { 
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        eventId: event.eventId 
      });

      return Result.ok(undefined);
    } catch (error) {
      this.logger.error('Failed to append event', error);
      return Result.error(new BusinessError('Failed to append event to event store', { error }));
    }
  }

  async appendBatch(events: DomainEvent[]): Promise<Result<void, BusinessError>> {
    try {
      const records: Partial<StoredEventRecord>[] = events.map(event => ({
        event_id: event.eventId,
        event_type: event.eventType,
        aggregate_id: event.aggregateId,
        aggregate_type: event.aggregateType,
        event_data: event.eventData,
        version: event.version,
        occurred_at: event.occurredAt.toISOString(),
      }));

      const { error } = await this.supabaseClient
        .from('domain_events')
        .insert(records);

      if (error) {
        this.logger.error('Failed to persist event batch to Supabase', { error, count: events.length });
        return Result.error(new BusinessError('Failed to persist event batch', { error }));
      }

      this.logger.debug('Event batch persisted to Supabase', { count: events.length });

      return Result.ok(undefined);
    } catch (error) {
      this.logger.error('Failed to append event batch', error);
      return Result.error(new BusinessError('Failed to append event batch to event store', { error }));
    }
  }

  async getEvents(aggregateId: string, fromVersion?: number): Promise<Result<DomainEvent[], BusinessError>> {
    try {
      let query = this.supabaseClient
        .from('domain_events')
        .select('*')
        .eq('aggregate_id', aggregateId)
        .order('version', { ascending: true });

      if (fromVersion !== undefined) {
        query = query.gte('version', fromVersion);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error('Failed to fetch events from Supabase', { error, aggregateId });
        return Result.error(new BusinessError('Failed to retrieve events', { error }));
      }

      const events: DomainEvent[] = (data || []).map(record => ({
        eventId: record.event_id,
        eventType: record.event_type,
        aggregateId: record.aggregate_id,
        aggregateType: record.aggregate_type,
        eventData: record.event_data,
        version: record.version,
        occurredAt: new Date(record.occurred_at),
      }));

      return Result.ok(events);
    } catch (error) {
      this.logger.error('Failed to get events', error);
      return Result.error(new BusinessError('Failed to retrieve events from event store', { error }));
    }
  }

  async getEventsByType(eventType: string, options?: { fromDate?: Date; limit?: number }): Promise<Result<DomainEvent[], BusinessError>> {
    try {
      let query = this.supabaseClient
        .from('domain_events')
        .select('*')
        .eq('event_type', eventType)
        .order('occurred_at', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.fromDate) {
        query = query.gte('occurred_at', options.fromDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error('Failed to fetch events by type from Supabase', { error, eventType });
        return Result.error(new BusinessError('Failed to retrieve events by type', { error }));
      }

      const events: DomainEvent[] = (data || []).map(record => ({
        eventId: record.event_id,
        eventType: record.event_type,
        aggregateId: record.aggregate_id,
        aggregateType: record.aggregate_type,
        eventData: record.event_data,
        version: record.version,
        occurredAt: new Date(record.occurred_at),
      }));

      return Result.ok(events);
    } catch (error) {
      this.logger.error('Failed to get events by type', error);
      return Result.error(new BusinessError('Failed to retrieve events by type from event store', { error }));
    }
  }

  async getStatistics(): Promise<Result<{ totalEvents: number; eventTypes: string[]; oldestEvent?: Date; newestEvent?: Date }, BusinessError>> {
    try {
      const { data, error } = await this.supabaseClient
        .from('domain_events')
        .select('event_type, occurred_at', { count: 'exact' });

      if (error) {
        this.logger.error('Failed to get statistics from Supabase', { error });
        return Result.error(new BusinessError('Failed to retrieve event store statistics', { error }));
      }

      const eventTypes = Array.from(new Set((data || []).map(record => record.event_type)));
      const dates = (data || []).map(record => new Date(record.occurred_at));
      const oldestEvent = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : undefined;
      const newestEvent = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : undefined;

      return Result.ok({
        totalEvents: data?.length || 0,
        eventTypes,
        oldestEvent,
        newestEvent
      });
    } catch (error) {
      this.logger.error('Failed to get event store statistics', error);
      return Result.error(new BusinessError('Failed to retrieve event store statistics', { error }));
    }
  }

  async getAllEvents(fromDate?: Date, limit?: number): Promise<Result<DomainEvent[], BusinessError>> {
    try {
      let query = this.supabaseClient
        .from('domain_events')
        .select('*')
        .order('occurred_at', { ascending: false });

      if (fromDate) {
        query = query.gte('occurred_at', fromDate.toISOString());
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error('Failed to retrieve all events from Supabase', { error });
        return Result.error(new BusinessError('Failed to retrieve all events from event store', { error }));
      }

      const events: DomainEvent[] = (data || []).map(record => ({
        eventId: record.event_id,
        eventType: record.event_type,
        aggregateId: record.aggregate_id,
        aggregateType: record.aggregate_type,
        eventData: record.event_data,
        version: record.version,
        userId: record.user_id,
        correlationId: record.correlation_id,
        causationId: record.causation_id,
        occurredAt: new Date(record.occurred_at),
      }));

      return Result.ok(events);
    } catch (error) {
      this.logger.error('Failed to get all events', error);
      return Result.error(new BusinessError('Failed to retrieve all events from event store', { error }));
    }
  }
}