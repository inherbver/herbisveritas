/**
 * Supabase Event Store Implementation
 * 
 * Provides persistent event storage using Supabase with:
 * - Event sourcing capabilities
 * - Event replay functionality
 * - Optimistic concurrency control
 * - Event snapshots and compaction
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { 
  DomainEvent, 
  EventStore, 
  EventSerializer,
  JsonEventSerializer 
} from '@/lib/core/events';
import { Result } from '@/lib/core/result';
import { logger } from '@/lib/core/logger';

// Temporary helper function
function createSimpleContext(action: string, resource: string, data: any = {}) {
  return { action, resource, ...data };
}

/**
 * Event record as stored in Supabase
 */
interface StoredEventRecord {
  id: string;
  event_id: string;
  event_type: string;
  aggregate_id: string;
  aggregate_type: string;
  event_data: any; // JSONB in Supabase
  version: number;
  occurred_at: string; // ISO timestamp
  user_id?: string;
  correlation_id?: string;
  causation_id?: string;
  created_at: string;
  checksum?: string; // For data integrity
}

/**
 * Event stream metadata
 */
interface EventStreamMetadata {
  aggregate_id: string;
  aggregate_type: string;
  current_version: number;
  first_event_id: string;
  last_event_id: string;
  event_count: number;
  created_at: string;
  updated_at: string;
  snapshot_version?: number;
  snapshot_data?: any;
}

/**
 * Supabase Event Store Implementation
 */
export class SupabaseEventStore implements EventStore {
  private readonly eventsTable = 'domain_events';
  private readonly streamsTable = 'event_streams';
  private readonly serializer: EventSerializer;

  constructor(
    private readonly supabase: SupabaseClient,
    serializer: EventSerializer = new JsonEventSerializer()
  ) {
    this.serializer = serializer;
  }

  /**
   * Append a single event to the store
   */
  async append<T extends DomainEvent>(event: T): Promise<Result<void, Error>> {
    const context = createSimpleContext('event_store_append', 'events', {
      eventId: event.eventId,
      eventType: event.eventType,
      aggregateId: event.aggregateId,
    });

    logger.info('SupabaseEventStore.append', context);

    try {
      // Prepare event record
      const eventRecord: Omit<StoredEventRecord, 'id' | 'created_at'> = {
        event_id: event.eventId,
        event_type: event.eventType,
        aggregate_id: event.aggregateId,
        aggregate_type: event.aggregateType,
        event_data: event.eventData,
        version: event.version,
        occurred_at: event.occurredAt.toISOString(),
        user_id: event.userId,
        correlation_id: event.correlationId,
        causation_id: event.causationId,
        checksum: this.calculateChecksum(event),
      };

      // Use a transaction to ensure consistency
      const { error: transactionError } = await this.supabase.rpc('append_event_with_stream_update', {
        p_event: eventRecord,
        p_aggregate_id: event.aggregateId,
        p_aggregate_type: event.aggregateType,
        p_expected_version: event.version - 1, // Optimistic concurrency control
      });

      if (transactionError) {
        const error = new Error(`Failed to append event: ${transactionError.message}`);
        logger.error('SupabaseEventStore.append', error, context);
        return Result.error(error);
      }

      logger.info('SupabaseEventStore.append', context);
      return Result.ok(undefined);

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown event store error');
      logger.error('SupabaseEventStore.append', err, context);
      return Result.error(err);
    }
  }

  /**
   * Append multiple events as a batch (atomic operation)
   */
  async appendBatch<T extends DomainEvent>(events: T[]): Promise<Result<void, Error>> {
    if (events.length === 0) {
      return Result.ok(undefined);
    }

    const context = createSimpleContext('event_store_append_batch', 'events', {
      eventCount: events.length,
      aggregateIds: [...new Set(events.map(e => e.aggregateId))],
      eventTypes: [...new Set(events.map(e => e.eventType))],
    });

    logger.info('SupabaseEventStore.appendBatch', context);

    try {
      // Group events by aggregate to maintain version ordering
      const eventsByAggregate = new Map<string, T[]>();
      for (const event of events) {
        const existing = eventsByAggregate.get(event.aggregateId) || [];
        existing.push(event);
        eventsByAggregate.set(event.aggregateId, existing);
      }

      // Prepare batch records
      const eventRecords: Omit<StoredEventRecord, 'id' | 'created_at'>[] = events.map(event => ({
        event_id: event.eventId,
        event_type: event.eventType,
        aggregate_id: event.aggregateId,
        aggregate_type: event.aggregateType,
        event_data: event.eventData,
        version: event.version,
        occurred_at: event.occurredAt.toISOString(),
        user_id: event.userId,
        correlation_id: event.correlationId,
        causation_id: event.causationId,
        checksum: this.calculateChecksum(event),
      }));

      // Execute batch insert with stream updates
      const { error: batchError } = await this.supabase.rpc('append_events_batch', {
        p_events: eventRecords,
        p_aggregates_metadata: Array.from(eventsByAggregate.entries()).map(([aggregateId, aggEvents]) => ({
          aggregate_id: aggregateId,
          aggregate_type: aggEvents[0].aggregateType,
          event_count: aggEvents.length,
          first_version: Math.min(...aggEvents.map(e => e.version)),
          last_version: Math.max(...aggEvents.map(e => e.version)),
        })),
      });

      if (batchError) {
        const error = new Error(`Failed to append event batch: ${batchError.message}`);
        logger.error('SupabaseEventStore.appendBatch', error, context);
        return Result.error(error);
      }

      logger.info('SupabaseEventStore.appendBatch', context);
      return Result.ok(undefined);

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown batch append error');
      logger.error('SupabaseEventStore.appendBatch', err, context);
      return Result.error(err);
    }
  }

  /**
   * Get events for a specific aggregate
   */
  async getEvents(
    aggregateId: string, 
    fromVersion?: number
  ): Promise<Result<DomainEvent[], Error>> {
    const context = createSimpleContext('event_store_get_events', 'events', {
      aggregateId,
      fromVersion,
    });

    logger.info('SupabaseEventStore.getEvents', context);

    try {
      let query = this.supabase
        .from(this.eventsTable)
        .select('*')
        .eq('aggregate_id', aggregateId)
        .order('version', { ascending: true });

      if (fromVersion !== undefined) {
        query = query.gte('version', fromVersion);
      }

      const { data, error } = await query;

      if (error) {
        const err = new Error(`Failed to get events: ${error.message}`);
        logger.error('SupabaseEventStore.getEvents', err, context);
        return Result.error(err);
      }

      const events = (data as StoredEventRecord[]).map(record => this.recordToEvent(record));

      logger.info('SupabaseEventStore.getEvents', {
        ...context,
        eventCount: events.length,
      });

      return Result.ok(events);

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown get events error');
      logger.error('SupabaseEventStore.getEvents', err, context);
      return Result.error(err);
    }
  }

  /**
   * Get events by type
   */
  async getEventsByType(
    eventType: string, 
    fromDate?: Date
  ): Promise<Result<DomainEvent[], Error>> {
    const context = createSimpleContext('event_store_get_events_by_type', 'events', {
      eventType,
      fromDate: fromDate?.toISOString(),
    });

    logger.info('SupabaseEventStore.getEventsByType', context);

    try {
      let query = this.supabase
        .from(this.eventsTable)
        .select('*')
        .eq('event_type', eventType)
        .order('occurred_at', { ascending: true });

      if (fromDate) {
        query = query.gte('occurred_at', fromDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        const err = new Error(`Failed to get events by type: ${error.message}`);
        logger.error('SupabaseEventStore.getEventsByType', err, context);
        return Result.error(err);
      }

      const events = (data as StoredEventRecord[]).map(record => this.recordToEvent(record));

      logger.info('SupabaseEventStore.getEventsByType', {
        ...context,
        eventCount: events.length,
      });

      return Result.ok(events);

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown get events by type error');
      logger.error('SupabaseEventStore.getEventsByType', err, context);
      return Result.error(err);
    }
  }

  /**
   * Get all events with optional pagination
   */
  async getAllEvents(
    fromDate?: Date, 
    limit?: number
  ): Promise<Result<DomainEvent[], Error>> {
    const context = createSimpleContext('event_store_get_all_events', 'events', {
      fromDate: fromDate?.toISOString(),
      limit,
    });

    logger.info('SupabaseEventStore.getAllEvents', context);

    try {
      let query = this.supabase
        .from(this.eventsTable)
        .select('*')
        .order('occurred_at', { ascending: true });

      if (fromDate) {
        query = query.gte('occurred_at', fromDate.toISOString());
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        const err = new Error(`Failed to get all events: ${error.message}`);
        logger.error('SupabaseEventStore.getAllEvents', err, context);
        return Result.error(err);
      }

      const events = (data as StoredEventRecord[]).map(record => this.recordToEvent(record));

      logger.info('SupabaseEventStore.getAllEvents', {
        ...context,
        eventCount: events.length,
      });

      return Result.ok(events);

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown get all events error');
      logger.error('SupabaseEventStore.getAllEvents', err, context);
      return Result.error(err);
    }
  }

  /**
   * Get event stream metadata
   */
  async getStreamMetadata(aggregateId: string): Promise<Result<EventStreamMetadata | null, Error>> {
    try {
      const { data, error } = await this.supabase
        .from(this.streamsTable)
        .select('*')
        .eq('aggregate_id', aggregateId)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        return Result.error(new Error(`Failed to get stream metadata: ${error.message}`));
      }

      return Result.ok(data as EventStreamMetadata | null);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown stream metadata error');
      return Result.error(err);
    }
  }

  /**
   * Create or update a snapshot for an aggregate
   */
  async createSnapshot(
    aggregateId: string,
    aggregateType: string,
    version: number,
    snapshotData: any
  ): Promise<Result<void, Error>> {
    try {
      const { error } = await this.supabase
        .from(this.streamsTable)
        .upsert({
          aggregate_id: aggregateId,
          aggregate_type: aggregateType,
          snapshot_version: version,
          snapshot_data: snapshotData,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        return Result.error(new Error(`Failed to create snapshot: ${error.message}`));
      }

      return Result.ok(undefined);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown snapshot error');
      return Result.error(err);
    }
  }

  /**
   * Convert stored record to domain event
   */
  private recordToEvent(record: StoredEventRecord): DomainEvent {
    return {
      eventId: record.event_id,
      eventType: record.event_type,
      aggregateId: record.aggregate_id,
      aggregateType: record.aggregate_type,
      eventData: record.event_data,
      version: record.version,
      occurredAt: new Date(record.occurred_at),
      userId: record.user_id,
      correlationId: record.correlation_id,
      causationId: record.causation_id,
    };
  }

  /**
   * Calculate event checksum for integrity verification
   */
  private calculateChecksum(event: DomainEvent): string {
    const data = {
      eventId: event.eventId,
      eventType: event.eventType,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      eventData: event.eventData,
      version: event.version,
    };

    // Simple checksum (in production, use a proper hash function)
    return Buffer.from(JSON.stringify(data)).toString('base64').slice(0, 16);
  }

  /**
   * Verify event integrity
   */
  async verifyEventIntegrity(eventId: string): Promise<Result<boolean, Error>> {
    try {
      const { data, error } = await this.supabase
        .from(this.eventsTable)
        .select('*')
        .eq('event_id', eventId)
        .single();

      if (error) {
        return Result.error(new Error(`Failed to verify event: ${error.message}`));
      }

      const record = data as StoredEventRecord;
      const event = this.recordToEvent(record);
      const expectedChecksum = this.calculateChecksum(event);

      return Result.ok(record.checksum === expectedChecksum);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown verification error');
      return Result.error(err);
    }
  }

  /**
   * Get event store statistics
   */
  async getStatistics(): Promise<Result<{
    totalEvents: number;
    totalStreams: number;
    eventsByType: Record<string, number>;
    oldestEvent: Date | null;
    newestEvent: Date | null;
  }, Error>> {
    try {
      // Get total counts
      const [eventsResult, streamsResult, typeStatsResult, dateRangeResult] = await Promise.all([
        this.supabase.from(this.eventsTable).select('*', { count: 'exact', head: true }),
        this.supabase.from(this.streamsTable).select('*', { count: 'exact', head: true }),
        this.supabase.from(this.eventsTable).select('event_type'),
        this.supabase
          .from(this.eventsTable)
          .select('occurred_at')
          .order('occurred_at', { ascending: true })
          .limit(1)
          .union(
            this.supabase
              .from(this.eventsTable)
              .select('occurred_at')
              .order('occurred_at', { ascending: false })
              .limit(1)
          ),
      ]);

      if (eventsResult.error || streamsResult.error || typeStatsResult.error || dateRangeResult.error) {
        return Result.error(new Error('Failed to get event store statistics'));
      }

      // Count events by type
      const eventsByType: Record<string, number> = {};
      for (const record of typeStatsResult.data || []) {
        const eventType = (record as { event_type: string }).event_type;
        eventsByType[eventType] = (eventsByType[eventType] || 0) + 1;
      }

      // Get date range
      const dates = dateRangeResult.data?.map(r => new Date((r as { occurred_at: string }).occurred_at)) || [];
      const oldestEvent = dates.length > 0 ? dates[0] : null;
      const newestEvent = dates.length > 1 ? dates[1] : (dates.length > 0 ? dates[0] : null);

      return Result.ok({
        totalEvents: eventsResult.count || 0,
        totalStreams: streamsResult.count || 0,
        eventsByType,
        oldestEvent,
        newestEvent,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown statistics error');
      return Result.error(err);
    }
  }
}