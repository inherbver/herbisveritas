/**
 * Cart Domain Service
 * 
 * Contains business logic and orchestrates cart operations
 * following Domain-Driven Design principles.
 */

import { Result } from "@/lib/core/result";
import { BusinessError, NotFoundError, ValidationError } from "@/lib/core/errors";
import { logger, LogUtils } from "@/lib/core/logger";
import { Cart, CartItem, Money, Quantity, ProductReference } from "../entities/cart.entity";

/**
 * Cart repository interface (will be implemented in infrastructure layer)
 */
export interface CartRepository {
  findByUserId(userId: string): Promise<Result<Cart | null, Error>>;
  findById(cartId: string): Promise<Result<Cart | null, Error>>;
  save(cart: Cart): Promise<Result<Cart, Error>>;
  delete(cartId: string): Promise<Result<void, Error>>;
}

/**
 * Product repository interface
 */
export interface ProductRepository {
  findById(productId: string): Promise<Result<ProductReference | null, Error>>;
  findByIds(productIds: string[]): Promise<Result<ProductReference[], Error>>;
  updateStock(productId: string, newStock: number): Promise<Result<void, Error>>;
}

/**
 * User repository interface
 */
export interface UserRepository {
  exists(userId: string): Promise<Result<boolean, Error>>;
  isActive(userId: string): Promise<Result<boolean, Error>>;
}

/**
 * Cart domain events
 */
export interface CartDomainEvent {
  aggregateId: string;
  eventType: string;
  eventData: any;
  occurredAt: Date;
}

export class CartItemAddedEvent implements CartDomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly productId: string,
    public readonly quantity: number,
    public readonly userId: string,
    public readonly occurredAt: Date = new Date()
  ) {}

  eventType = 'CartItemAdded';
  eventData = {
    productId: this.productId,
    quantity: this.quantity,
    userId: this.userId,
  };
}

export class CartItemRemovedEvent implements CartDomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly itemId: string,
    public readonly productId: string,
    public readonly userId: string,
    public readonly occurredAt: Date = new Date()
  ) {}

  eventType = 'CartItemRemoved';
  eventData = {
    itemId: this.itemId,
    productId: this.productId,
    userId: this.userId,
  };
}

export class CartItemQuantityUpdatedEvent implements CartDomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly itemId: string,
    public readonly oldQuantity: number,
    public readonly newQuantity: number,
    public readonly userId: string,
    public readonly occurredAt: Date = new Date()
  ) {}

  eventType = 'CartItemQuantityUpdated';
  eventData = {
    itemId: this.itemId,
    oldQuantity: this.oldQuantity,
    newQuantity: this.newQuantity,
    userId: this.userId,
  };
}

/**
 * Event publisher interface
 */
export interface EventPublisher {
  publish(event: CartDomainEvent): Promise<void>;
}

/**
 * Cart domain service
 */
export class CartDomainService {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly productRepository: ProductRepository,
    private readonly userRepository: UserRepository,
    private readonly eventPublisher: EventPublisher
  ) {}

  /**
   * Add item to cart with full business logic
   */
  async addItemToCart(
    userId: string,
    productId: string,
    quantity: number
  ): Promise<Result<Cart, BusinessError | NotFoundError | ValidationError>> {
    const context = LogUtils.createUserActionContext(userId, 'add_item_to_cart', 'cart', { productId, quantity });
    LogUtils.logOperationStart('CartDomainService.addItemToCart', context);

    try {
      // Validate user exists and is active
      const userValidation = await this.validateUser(userId);
      if (userValidation.isError()) {
        return Result.error(userValidation.getError());
      }

      // Get product details with stock validation
      const productResult = await this.productRepository.findById(productId);
      if (productResult.isError()) {
        return Result.error(new BusinessError('Erreur lors de la récupération du produit'));
      }

      const product = productResult.getValue();
      if (!product) {
        return Result.error(new NotFoundError('Produit', productId));
      }

      // Validate quantity
      let quantityVO: Quantity;
      try {
        quantityVO = new Quantity(quantity);
      } catch (error) {
        return Result.error(new ValidationError(error instanceof Error ? error.message : 'Quantité invalide'));
      }

      // Get or create cart
      const cartResult = await this.getOrCreateCart(userId);
      if (cartResult.isError()) {
        return Result.error(cartResult.getError());
      }

      let cart = cartResult.getValue();

      // Generate unique item ID
      const itemId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Add item to cart (business rules validated in entity)
      const addResult = cart.addItem(itemId, product, quantityVO);
      if (addResult.isError()) {
        LogUtils.logOperationError('CartDomainService.addItemToCart', addResult.getError(), context);
        return Result.error(addResult.getError());
      }

      cart = addResult.getValue();

      // Persist cart
      const saveResult = await this.cartRepository.save(cart);
      if (saveResult.isError()) {
        return Result.error(new BusinessError('Erreur lors de la sauvegarde du panier'));
      }

      // Publish domain event
      const event = new CartItemAddedEvent(cart.id, productId, quantity, userId);
      await this.eventPublisher.publish(event);

      LogUtils.logOperationSuccess('CartDomainService.addItemToCart', context);
      return Result.ok(saveResult.getValue());

    } catch (error) {
      LogUtils.logOperationError('CartDomainService.addItemToCart', error, context);
      return Result.error(new BusinessError('Erreur interne lors de l\'ajout au panier'));
    }
  }

  /**
   * Remove item from cart
   */
  async removeItemFromCart(
    userId: string,
    itemId: string
  ): Promise<Result<Cart, BusinessError | NotFoundError>> {
    const context = LogUtils.createUserActionContext(userId, 'remove_item_from_cart', 'cart', { itemId });
    LogUtils.logOperationStart('CartDomainService.removeItemFromCart', context);

    try {
      // Validate user
      const userValidation = await this.validateUser(userId);
      if (userValidation.isError()) {
        return Result.error(userValidation.getError());
      }

      // Get cart
      const cartResult = await this.cartRepository.findByUserId(userId);
      if (cartResult.isError()) {
        return Result.error(new BusinessError('Erreur lors de la récupération du panier'));
      }

      const cart = cartResult.getValue();
      if (!cart) {
        return Result.error(new NotFoundError('Panier', userId));
      }

      // Get item before removal for event
      const item = cart.getItemById(itemId);
      if (!item) {
        return Result.error(new NotFoundError('Article', itemId));
      }

      // Remove item
      const removeResult = cart.removeItem(itemId);
      if (removeResult.isError()) {
        return Result.error(removeResult.getError());
      }

      const updatedCart = removeResult.getValue();

      // Persist cart
      const saveResult = await this.cartRepository.save(updatedCart);
      if (saveResult.isError()) {
        return Result.error(new BusinessError('Erreur lors de la sauvegarde du panier'));
      }

      // Publish domain event
      const event = new CartItemRemovedEvent(cart.id, itemId, item.productReference.id, userId);
      await this.eventPublisher.publish(event);

      LogUtils.logOperationSuccess('CartDomainService.removeItemFromCart', context);
      return Result.ok(saveResult.getValue());

    } catch (error) {
      LogUtils.logOperationError('CartDomainService.removeItemFromCart', error, context);
      return Result.error(new BusinessError('Erreur interne lors de la suppression'));
    }
  }

  /**
   * Update item quantity
   */
  async updateItemQuantity(
    userId: string,
    itemId: string,
    newQuantity: number
  ): Promise<Result<Cart, BusinessError | NotFoundError | ValidationError>> {
    const context = LogUtils.createUserActionContext(userId, 'update_item_quantity', 'cart', { itemId, newQuantity });
    LogUtils.logOperationStart('CartDomainService.updateItemQuantity', context);

    try {
      // Validate user
      const userValidation = await this.validateUser(userId);
      if (userValidation.isError()) {
        return Result.error(userValidation.getError());
      }

      // Validate quantity
      let quantityVO: Quantity;
      try {
        quantityVO = new Quantity(newQuantity);
      } catch (error) {
        return Result.error(new ValidationError(error instanceof Error ? error.message : 'Quantité invalide'));
      }

      // Get cart
      const cartResult = await this.cartRepository.findByUserId(userId);
      if (cartResult.isError()) {
        return Result.error(new BusinessError('Erreur lors de la récupération du panier'));
      }

      const cart = cartResult.getValue();
      if (!cart) {
        return Result.error(new NotFoundError('Panier', userId));
      }

      // Get current item for event data
      const currentItem = cart.getItemById(itemId);
      if (!currentItem) {
        return Result.error(new NotFoundError('Article', itemId));
      }

      const oldQuantity = currentItem.quantity.value;

      // Update quantity (handles removal if quantity is 0)
      const updateResult = cart.updateItemQuantity(itemId, quantityVO);
      if (updateResult.isError()) {
        return Result.error(updateResult.getError());
      }

      const updatedCart = updateResult.getValue();

      // Persist cart
      const saveResult = await this.cartRepository.save(updatedCart);
      if (saveResult.isError()) {
        return Result.error(new BusinessError('Erreur lors de la sauvegarde du panier'));
      }

      // Publish domain event
      const event = new CartItemQuantityUpdatedEvent(cart.id, itemId, oldQuantity, newQuantity, userId);
      await this.eventPublisher.publish(event);

      LogUtils.logOperationSuccess('CartDomainService.updateItemQuantity', context);
      return Result.ok(saveResult.getValue());

    } catch (error) {
      LogUtils.logOperationError('CartDomainService.updateItemQuantity', error, context);
      return Result.error(new BusinessError('Erreur interne lors de la mise à jour'));
    }
  }

  /**
   * Clear entire cart
   */
  async clearCart(userId: string): Promise<Result<Cart, BusinessError | NotFoundError>> {
    const context = LogUtils.createUserActionContext(userId, 'clear_cart', 'cart');
    LogUtils.logOperationStart('CartDomainService.clearCart', context);

    try {
      // Validate user
      const userValidation = await this.validateUser(userId);
      if (userValidation.isError()) {
        return Result.error(userValidation.getError());
      }

      // Get cart
      const cartResult = await this.cartRepository.findByUserId(userId);
      if (cartResult.isError()) {
        return Result.error(new BusinessError('Erreur lors de la récupération du panier'));
      }

      const cart = cartResult.getValue();
      if (!cart) {
        return Result.error(new NotFoundError('Panier', userId));
      }

      // Clear cart
      const clearedCart = cart.clear();

      // Persist cart
      const saveResult = await this.cartRepository.save(clearedCart);
      if (saveResult.isError()) {
        return Result.error(new BusinessError('Erreur lors de la sauvegarde du panier'));
      }

      LogUtils.logOperationSuccess('CartDomainService.clearCart', context);
      return Result.ok(saveResult.getValue());

    } catch (error) {
      LogUtils.logOperationError('CartDomainService.clearCart', error, context);
      return Result.error(new BusinessError('Erreur interne lors de la vidange du panier'));
    }
  }

  /**
   * Get cart by user ID
   */
  async getCartByUserId(userId: string): Promise<Result<Cart | null, BusinessError>> {
    const context = LogUtils.createUserActionContext(userId, 'get_cart', 'cart');
    
    try {
      // Validate user
      const userValidation = await this.validateUser(userId);
      if (userValidation.isError()) {
        return Result.error(userValidation.getError());
      }

      const cartResult = await this.cartRepository.findByUserId(userId);
      if (cartResult.isError()) {
        return Result.error(new BusinessError('Erreur lors de la récupération du panier'));
      }

      const cart = cartResult.getValue();
      
      // Validate cart items against current product data
      if (cart) {
        const validationResult = await this.validateCartItems(cart);
        if (validationResult.isError()) {
          logger.warn('Cart validation failed', { error: validationResult.getError(), context });
          // Return cart anyway but log the validation issues
        }
      }

      return Result.ok(cart);

    } catch (error) {
      LogUtils.logOperationError('CartDomainService.getCartByUserId', error, context);
      return Result.error(new BusinessError('Erreur interne lors de la récupération du panier'));
    }
  }

  /**
   * Merge two carts (for guest to authenticated user transition)
   */
  async mergeCarts(
    fromUserId: string,
    toUserId: string
  ): Promise<Result<Cart, BusinessError | NotFoundError>> {
    const context = LogUtils.createUserActionContext(toUserId, 'merge_carts', 'cart', { fromUserId });
    LogUtils.logOperationStart('CartDomainService.mergeCarts', context);

    try {
      // Validate both users
      const toUserValidation = await this.validateUser(toUserId);
      if (toUserValidation.isError()) {
        return Result.error(toUserValidation.getError());
      }

      // Get both carts
      const [fromCartResult, toCartResult] = await Promise.all([
        this.cartRepository.findByUserId(fromUserId),
        this.cartRepository.findByUserId(toUserId),
      ]);

      if (fromCartResult.isError() || toCartResult.isError()) {
        return Result.error(new BusinessError('Erreur lors de la récupération des paniers'));
      }

      const fromCart = fromCartResult.getValue();
      const toCart = toCartResult.getValue();

      // If source cart is empty, return target cart
      if (!fromCart || fromCart.isEmpty()) {
        return Result.ok(toCart || await this.createEmptyCart(toUserId));
      }

      // If target cart doesn't exist, transfer ownership of source cart
      if (!toCart) {
        const transferredCart = new Cart(
          fromCart.id,
          toUserId, // New user ID
          new Map(fromCart.getItems().map(item => [item.id, item])),
          fromCart.createdAt,
          new Date()
        );

        const saveResult = await this.cartRepository.save(transferredCart);
        if (saveResult.isError()) {
          return Result.error(new BusinessError('Erreur lors du transfert du panier'));
        }

        // Delete old cart
        await this.cartRepository.delete(fromCart.id);

        LogUtils.logOperationSuccess('CartDomainService.mergeCarts', context);
        return Result.ok(saveResult.getValue());
      }

      // Merge carts: add items from source to target
      let mergedCart = toCart;
      const fromItems = fromCart.getItems();

      for (const fromItem of fromItems) {
        const existingItem = mergedCart.getItemByProductId(fromItem.productReference.id);
        
        if (existingItem) {
          // Combine quantities
          const combinedQuantity = new Quantity(
            existingItem.quantity.value + fromItem.quantity.value
          );
          
          const updateResult = mergedCart.updateItemQuantity(existingItem.id, combinedQuantity);
          if (updateResult.isError()) {
            // If update fails (e.g., exceeds stock), keep existing quantity
            logger.warn('Failed to merge item quantities', { error: updateResult.getError(), context });
            continue;
          }
          mergedCart = updateResult.getValue();
        } else {
          // Add new item
          const addResult = mergedCart.addItem(
            fromItem.id,
            fromItem.productReference,
            fromItem.quantity
          );
          if (addResult.isError()) {
            // If add fails (e.g., cart full), skip this item
            logger.warn('Failed to add item during merge', { error: addResult.getError(), context });
            continue;
          }
          mergedCart = addResult.getValue();
        }
      }

      // Save merged cart and delete source cart
      const saveResult = await this.cartRepository.save(mergedCart);
      if (saveResult.isError()) {
        return Result.error(new BusinessError('Erreur lors de la sauvegarde du panier fusionné'));
      }

      await this.cartRepository.delete(fromCart.id);

      LogUtils.logOperationSuccess('CartDomainService.mergeCarts', context);
      return Result.ok(saveResult.getValue());

    } catch (error) {
      LogUtils.logOperationError('CartDomainService.mergeCarts', error, context);
      return Result.error(new BusinessError('Erreur interne lors de la fusion des paniers'));
    }
  }

  /**
   * Get or create cart for user
   */
  private async getOrCreateCart(userId: string): Promise<Result<Cart, BusinessError>> {
    const cartResult = await this.cartRepository.findByUserId(userId);
    if (cartResult.isError()) {
      return Result.error(new BusinessError('Erreur lors de la récupération du panier'));
    }

    let cart = cartResult.getValue();
    if (!cart) {
      cart = await this.createEmptyCart(userId);
    }

    return Result.ok(cart);
  }

  /**
   * Create empty cart for user
   */
  private async createEmptyCart(userId: string): Promise<Cart> {
    const cartId = `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const cart = new Cart(cartId, userId);
    
    const saveResult = await this.cartRepository.save(cart);
    if (saveResult.isError()) {
      throw new BusinessError('Erreur lors de la création du panier');
    }

    return saveResult.getValue();
  }

  /**
   * Validate user exists and is active
   */
  private async validateUser(userId: string): Promise<Result<void, BusinessError>> {
    const [existsResult, isActiveResult] = await Promise.all([
      this.userRepository.exists(userId),
      this.userRepository.isActive(userId),
    ]);

    if (existsResult.isError() || isActiveResult.isError()) {
      return Result.error(new BusinessError('Erreur lors de la validation de l\'utilisateur'));
    }

    if (!existsResult.getValue()) {
      return Result.error(new BusinessError('Utilisateur non trouvé'));
    }

    if (!isActiveResult.getValue()) {
      return Result.error(new BusinessError('Compte utilisateur désactivé'));
    }

    return Result.ok(undefined);
  }

  /**
   * Validate cart items against current product data
   */
  private async validateCartItems(cart: Cart): Promise<Result<void, BusinessError>> {
    const items = cart.getItems();
    if (items.length === 0) {
      return Result.ok(undefined);
    }

    const productIds = items.map(item => item.productReference.id);
    const productsResult = await this.productRepository.findByIds(productIds);
    
    if (productsResult.isError()) {
      return Result.error(new BusinessError('Erreur lors de la validation des produits'));
    }

    const currentProducts = productsResult.getValue();
    const issues: string[] = [];

    for (const item of items) {
      const currentProduct = currentProducts.find(p => p.id === item.productReference.id);
      
      if (!currentProduct) {
        issues.push(`Produit ${item.productReference.name} non trouvé`);
        continue;
      }

      if (!currentProduct.isActive) {
        issues.push(`Produit ${item.productReference.name} non disponible`);
      }

      if (item.quantity.value > currentProduct.stock.value) {
        issues.push(`Stock insuffisant pour ${item.productReference.name}`);
      }

      // Check for price changes (warning only)
      if (!item.productReference.price.equals(currentProduct.price)) {
        issues.push(`Prix modifié pour ${item.productReference.name}`);
      }
    }

    if (issues.length > 0) {
      return Result.error(new BusinessError(`Problèmes détectés: ${issues.join(', ')}`));
    }

    return Result.ok(undefined);
  }
}