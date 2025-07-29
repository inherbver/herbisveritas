/**
 * Notification Event Listener
 */

import type { DomainEvent } from "@/lib/core/events";
import type { NotificationEventHandler } from "../handlers/notification.event-handler";
import type { UserEventHandler } from "../handlers/user.event-handler";
import { logger } from "@/lib/core/logger";

export class NotificationEventListener {
  constructor(
    private readonly notificationHandler: NotificationEventHandler,
    private readonly userHandler: UserEventHandler,
    private readonly logger: typeof logger
  ) {}

  async handleUserRegistered(event: DomainEvent): Promise<void> {
    try {
      this.logger.info('Notification listener orchestrating user registered event', { eventId: event.eventId });

      await Promise.all([
        this.notificationHandler.handle(event),
        this.userHandler.handle(event)
      ]);
    } catch (error) {
      this.logger.error('User registered orchestration failed', { error, eventId: event.eventId });
      throw error;
    }
  }

  async handleUserProfileUpdated(event: DomainEvent): Promise<void> {
    try {
      await Promise.all([
        this.notificationHandler.handle(event),
        this.userHandler.handle(event)
      ]);
    } catch (error) {
      this.logger.error('User profile updated orchestration failed', { error, eventId: event.eventId });
      throw error;
    }
  }
}