/**
 * Audit Event Listener
 */

import type { DomainEvent } from "@/lib/core/events";
import type { AuditEventHandler } from "../handlers/audit.event-handler";
import { logger } from "@/lib/core/logger";

export class AuditEventListener {
  constructor(
    private readonly auditHandler: AuditEventHandler,
    private readonly logger: typeof logger
  ) {}

  async handleAuditEvent(event: DomainEvent): Promise<void> {
    try {
      this.logger.debug('Audit listener processing event', { eventType: event.eventType, eventId: event.eventId });
      await this.auditHandler.handle(event);
    } catch (error) {
      this.logger.error('Audit event processing failed', { error, eventId: event.eventId });
      // Ne pas propager l'erreur pour éviter de bloquer les autres handlers
    }
  }
}