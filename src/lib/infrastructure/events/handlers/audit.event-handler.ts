/**
 * Audit Event Handler
 */

import { Result } from "@/lib/core/result";
import { BusinessError } from "@/lib/core/errors";
import type { DomainEvent, EventStore } from "@/lib/core/events";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/core/logger";

export class AuditEventHandler {
  constructor(
    private readonly supabaseClient: SupabaseClient,
    private readonly eventStore: EventStore,
    private readonly logger: typeof logger
  ) {}

  async handle(event: DomainEvent): Promise<Result<void, BusinessError>> {
    try {
      this.logger.info('Processing audit event', { eventType: event.eventType, eventId: event.eventId });
      return Result.ok(undefined);
    } catch (error) {
      this.logger.error('Audit event handler error', { error, event });
      return Result.error(new BusinessError('Audit event handling failed', { error, event }));
    }
  }

  async logEvent(event: DomainEvent): Promise<Result<void, BusinessError>> {
    try {
      this.logger.info('Logging event for audit', { eventType: event.eventType, eventId: event.eventId });
      return Result.ok(undefined);
    } catch (error) {
      return Result.error(new BusinessError('Failed to log audit event', { error }));
    }
  }
}