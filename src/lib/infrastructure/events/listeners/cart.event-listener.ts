/**
 * Cart Event Listener
 * 
 * Orchestre les événements du domaine panier en coordonnant
 * plusieurs handlers spécialisés.
 */

import type { DomainEvent } from "@/lib/core/events";
import type { CartEventHandler } from "../handlers/cart.event-handler";
import type { InventoryEventHandler } from "../handlers/inventory.event-handler";
import type { NotificationEventHandler } from "../handlers/notification.event-handler";
import type { AuditEventHandler } from "../handlers/audit.event-handler";
import { logger } from "@/lib/core/logger";

export class CartEventListener {
  constructor(
    private readonly cartHandler: CartEventHandler,
    private readonly inventoryHandler: InventoryEventHandler,
    private readonly notificationHandler: NotificationEventHandler,
    private readonly auditHandler: AuditEventHandler,
    private readonly logger: typeof logger
  ) {}

  async handleCartItemAdded(event: DomainEvent): Promise<void> {
    try {
      this.logger.info('Cart listener orchestrating item added event', { eventId: event.eventId });

      // Orchestration parallèle des handlers
      await Promise.all([
        this.cartHandler.handle(event),
        this.inventoryHandler.reserveStock(event),
        this.notificationHandler.sendCartNotification(event),
        this.auditHandler.logEvent(event)
      ]);

      this.logger.debug('Cart item added orchestration completed', { eventId: event.eventId });
    } catch (error) {
      this.logger.error('Cart item added orchestration failed', { error, eventId: event.eventId });
      throw error;
    }
  }

  async handleCartItemRemoved(event: DomainEvent): Promise<void> {
    try {
      this.logger.info('Cart listener orchestrating item removed event', { eventId: event.eventId });

      await Promise.all([
        this.cartHandler.handle(event),
        this.inventoryHandler.handle(event),
        this.auditHandler.logEvent(event)
      ]);
    } catch (error) {
      this.logger.error('Cart item removed orchestration failed', { error, eventId: event.eventId });
      throw error;
    }
  }

  async handleCartItemQuantityUpdated(event: DomainEvent): Promise<void> {
    try {
      this.logger.info('Cart listener orchestrating quantity update event', { eventId: event.eventId });

      await Promise.all([
        this.cartHandler.handle(event),
        this.inventoryHandler.handle(event),
        this.auditHandler.logEvent(event)
      ]);
    } catch (error) {
      this.logger.error('Cart quantity update orchestration failed', { error, eventId: event.eventId });
      throw error;
    }
  }

  async handleCartCleared(event: DomainEvent): Promise<void> {
    try {
      this.logger.info('Cart listener orchestrating cart cleared event', { eventId: event.eventId });

      await Promise.all([
        this.cartHandler.handle(event),
        this.inventoryHandler.handle(event),
        this.auditHandler.logEvent(event)
      ]);
    } catch (error) {
      this.logger.error('Cart cleared orchestration failed', { error, eventId: event.eventId });
      throw error;
    }
  }

  async handleProductStockUpdated(event: DomainEvent): Promise<void> {
    try {
      this.logger.info('Cart listener handling product stock update', { eventId: event.eventId });

      await Promise.all([
        this.inventoryHandler.handle(event),
        this.auditHandler.logEvent(event)
      ]);
    } catch (error) {
      this.logger.error('Product stock update handling failed', { error, eventId: event.eventId });
      throw error;
    }
  }

  async handleProductPriceChanged(event: DomainEvent): Promise<void> {
    try {
      this.logger.info('Cart listener handling product price change', { eventId: event.eventId });

      await Promise.all([
        this.inventoryHandler.handle(event),
        this.notificationHandler.handle(event),
        this.auditHandler.logEvent(event)
      ]);
    } catch (error) {
      this.logger.error('Product price change handling failed', { error, eventId: event.eventId });
      throw error;
    }
  }
}