/**
 * Cart Event Handler
 * 
 * Gère tous les événements du domaine panier avec une approche unifiée.
 */

import { Result } from "@/lib/core/result";
import { BusinessError } from "@/lib/core/errors";
import type { DomainEvent, EventStore } from "@/lib/core/events";
import type { SupabaseCartRepository } from "../../repositories/cart.repository";
import { logger } from "@/lib/core/logger";

export class CartEventHandler {
  constructor(
    private readonly cartRepository: SupabaseCartRepository,
    private readonly eventStore: EventStore,
    private readonly logger: typeof logger
  ) {}

  async handle(event: DomainEvent): Promise<Result<void, BusinessError>> {
    try {
      switch (event.eventType) {
        case 'CART_ITEM_ADDED':
          return await this.handleCartItemAdded(event);
        case 'CART_ITEM_REMOVED':
          return await this.handleCartItemRemoved(event);
        case 'CART_ITEM_QUANTITY_UPDATED':
          return await this.handleCartItemQuantityUpdated(event);
        case 'CART_CLEARED':
          return await this.handleCartCleared(event);
        default:
          this.logger.warn('Unhandled cart event type', { eventType: event.eventType });
          return Result.ok(undefined);
      }
    } catch (error) {
      this.logger.error('Cart event handler error', { error, event });
      return Result.error(new BusinessError('Cart event handling failed', { error, event }));
    }
  }

  async handleCartItemAdded(event: DomainEvent): Promise<Result<void, BusinessError>> {
    try {
      const { productId, quantity, userId, cartId } = event.eventData;

      this.logger.info('Processing cart item added', {
        cartId,
        productId,
        quantity,
        userId,
        eventId: event.eventId
      });

      // Ici on pourrait :
      // - Mettre à jour des statistiques du panier
      // - Déclencher des règles métier
      // - Synchroniser avec des services externes
      
      // Pour les tests, on log simplement
      this.logger.debug('Cart item added processed successfully', {
        cartId,
        productId,
        eventId: event.eventId
      });

      return Result.ok(undefined);
    } catch (error) {
      this.logger.error('Failed to handle cart item added', error);
      return Result.error(new BusinessError('Failed to process cart item added event', { error }));
    }
  }

  async handleCartItemRemoved(event: DomainEvent): Promise<Result<void, BusinessError>> {
    try {
      const { productId, quantity, userId, cartId, itemId } = event.eventData;

      this.logger.info('Processing cart item removed', {
        cartId,
        productId,
        quantity,
        itemId,
        eventId: event.eventId
      });

      // Traitement spécifique au retrait d'article
      this.logger.debug('Cart item removed processed successfully', {
        cartId,
        productId,
        eventId: event.eventId
      });

      return Result.ok(undefined);
    } catch (error) {
      this.logger.error('Failed to handle cart item removed', error);
      return Result.error(new BusinessError('Failed to process cart item removed event', { error }));
    }
  }

  async handleCartItemQuantityUpdated(event: DomainEvent): Promise<Result<void, BusinessError>> {
    try {
      const { productId, oldQuantity, newQuantity, userId, cartId } = event.eventData;

      this.logger.info('Processing cart item quantity update', {
        cartId,
        productId,
        oldQuantity,
        newQuantity,
        eventId: event.eventId
      });

      // Traitement spécifique à la mise à jour de quantité
      this.logger.debug('Cart item quantity updated processed successfully', {
        cartId,
        productId,
        quantityChange: newQuantity - oldQuantity,
        eventId: event.eventId
      });

      return Result.ok(undefined);
    } catch (error) {
      this.logger.error('Failed to handle cart item quantity update', error);
      return Result.error(new BusinessError('Failed to process cart item quantity update event', { error }));
    }
  }

  async handleCartCleared(event: DomainEvent): Promise<Result<void, BusinessError>> {
    try {
      const { userId, cartId, itemCount } = event.eventData;

      this.logger.info('Processing cart cleared', {
        cartId,
        userId,
        itemCount,
        eventId: event.eventId
      });

      // Traitement spécifique à la vidange du panier
      this.logger.debug('Cart cleared processed successfully', {
        cartId,
        itemCount,
        eventId: event.eventId
      });

      return Result.ok(undefined);
    } catch (error) {
      this.logger.error('Failed to handle cart cleared', error);
      return Result.error(new BusinessError('Failed to process cart cleared event', { error }));
    }
  }
}