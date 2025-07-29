/**
 * Order Workflow Event Listener
 */

import type { DomainEvent } from "@/lib/core/events";
import type { OrderEventHandler } from "../handlers/order.event-handler";
import type { InventoryEventHandler } from "../handlers/inventory.event-handler";
import type { NotificationEventHandler } from "../handlers/notification.event-handler";
import type { AuditEventHandler } from "../handlers/audit.event-handler";
import { logger } from "@/lib/core/logger";

export class OrderWorkflowEventListener {
  constructor(
    private readonly orderHandler: OrderEventHandler,
    private readonly inventoryHandler: InventoryEventHandler,
    private readonly notificationHandler: NotificationEventHandler,
    private readonly auditHandler: AuditEventHandler,
    private readonly logger: typeof logger
  ) {}

  async handleOrderCreated(event: DomainEvent): Promise<void> {
    try {
      this.logger.info('Order workflow orchestrating order created event', { eventId: event.eventId });

      await Promise.all([
        this.orderHandler.handle(event),
        this.inventoryHandler.handle(event),
        this.notificationHandler.handle(event),
        this.auditHandler.logEvent(event)
      ]);
    } catch (error) {
      this.logger.error('Order created orchestration failed', { error, eventId: event.eventId });
      throw error;
    }
  }

  async handleOrderConfirmed(event: DomainEvent): Promise<void> {
    try {
      await Promise.all([
        this.orderHandler.handle(event),
        this.notificationHandler.handle(event),
        this.auditHandler.logEvent(event)
      ]);
    } catch (error) {
      this.logger.error('Order confirmed orchestration failed', { error, eventId: event.eventId });
      throw error;
    }
  }

  async handleOrderShipped(event: DomainEvent): Promise<void> {
    try {
      await Promise.all([
        this.orderHandler.handle(event),
        this.notificationHandler.handle(event),
        this.auditHandler.logEvent(event)
      ]);
    } catch (error) {
      this.logger.error('Order shipped orchestration failed', { error, eventId: event.eventId });
      throw error;
    }
  }

  async handleOrderDelivered(event: DomainEvent): Promise<void> {
    try {
      await Promise.all([
        this.orderHandler.handle(event),
        this.notificationHandler.handle(event),
        this.auditHandler.logEvent(event)
      ]);
    } catch (error) {
      this.logger.error('Order delivered orchestration failed', { error, eventId: event.eventId });
      throw error;
    }
  }

  async handleOrderCancelled(event: DomainEvent): Promise<void> {
    try {
      await Promise.all([
        this.orderHandler.handle(event),
        this.inventoryHandler.handle(event),
        this.notificationHandler.handle(event),
        this.auditHandler.logEvent(event)
      ]);
    } catch (error) {
      this.logger.error('Order cancelled orchestration failed', { error, eventId: event.eventId });
      throw error;
    }
  }
}