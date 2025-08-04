/**
 * Inventory Event Handler
 */

import { Result } from "@/lib/core/result";
import { BusinessError } from "@/lib/core/errors";
import type { DomainEvent, EventStore } from "@/lib/core/events";
import type { SupabaseProductRepository } from "../../repositories/product.repository";
import { logger, Logger } from "@/lib/core/logger";

interface ProductStockUpdatedEventData {
  productId: string;
  oldStock: number;
  newStock: number;
}

interface ProductPriceChangedEventData {
  productId: string;
  oldPrice: number;
  newPrice: number;
}

interface ProductReservedEventData {
  productId: string;
  quantity: number;
}

export class InventoryEventHandler {
  constructor(
    private readonly productRepository: SupabaseProductRepository,
    private readonly eventStore: EventStore,
    private readonly logger: Logger = logger
  ) {}

  async handle(event: DomainEvent): Promise<Result<void, BusinessError>> {
    try {
      switch (event.eventType) {
        case 'PRODUCT_STOCK_UPDATED':
          return await this.handleProductStockUpdated(event as DomainEvent<ProductStockUpdatedEventData>);
        case 'PRODUCT_PRICE_CHANGED':
          return await this.handleProductPriceChanged(event as DomainEvent<ProductPriceChangedEventData>);
        default:
          this.logger.warn('Unhandled inventory event type', { eventType: event.eventType });
          return Result.ok(undefined);
      }
    } catch (error) {
      this.logger.error('Inventory event handler error', { error, event });
      return Result.error(new BusinessError('Inventory event handling failed', { error, event }));
    }
  }

  async handleProductStockUpdated(event: DomainEvent<ProductStockUpdatedEventData>): Promise<Result<void, BusinessError>> {
    try {
      const { productId, oldStock, newStock } = event.eventData;
      this.logger.info('Processing product stock updated', { productId, oldStock, newStock, eventId: event.eventId });
      return Result.ok(undefined);
    } catch (error) {
      return Result.error(new BusinessError('Failed to process product stock updated event', { error }));
    }
  }

  async handleProductPriceChanged(event: DomainEvent<ProductPriceChangedEventData>): Promise<Result<void, BusinessError>> {
    try {
      const { productId, oldPrice, newPrice } = event.eventData;
      this.logger.info('Processing product price changed', { productId, oldPrice, newPrice, eventId: event.eventId });
      return Result.ok(undefined);
    } catch (error) {
      return Result.error(new BusinessError('Failed to process product price changed event', { error }));
    }
  }

  async reserveStock(event: DomainEvent<ProductReservedEventData>): Promise<Result<void, BusinessError>> {
    try {
      const { productId, quantity } = event.eventData;
      this.logger.info('Reserving stock', { productId, quantity, eventId: event.eventId });
      return Result.ok(undefined);
    } catch (error) {
      return Result.error(new BusinessError('Failed to reserve stock', { error }));
    }
  }
}