/**
 * Cart Domain Entities
 *
 * Core domain models following DDD principles
 */

import { Result } from "@/lib/core/result";
import { BusinessError, ValidationError } from "@/lib/core/errors";

/**
 * Value Objects
 */

export class Money {
  constructor(
    public readonly amount: number,
    public readonly currency: string = "EUR"
  ) {
    if (amount < 0) {
      throw new ValidationError("Le montant ne peut pas être négatif");
    }
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new BusinessError("Les devises doivent être identiques");
    }
    return new Money(this.amount + other.amount, this.currency);
  }

  multiply(quantity: number): Money {
    return new Money(this.amount * quantity, this.currency);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  toJSON() {
    return {
      amount: this.amount,
      currency: this.currency,
    };
  }
}

export class Quantity {
  public readonly value: number;

  constructor(value: number) {
    if (value < 0) {
      throw new ValidationError("La quantité ne peut pas être négative");
    }
    if (!Number.isInteger(value)) {
      throw new ValidationError("La quantité doit être un nombre entier");
    }
    this.value = value;
  }

  add(other: Quantity): Quantity {
    return new Quantity(this.value + other.value);
  }

  subtract(other: Quantity): Quantity {
    return new Quantity(this.value - other.value);
  }

  equals(other: Quantity): boolean {
    return this.value === other.value;
  }

  isZero(): boolean {
    return this.value === 0;
  }

  toJSON() {
    return this.value;
  }
}

/**
 * Product reference for cart items
 */
export interface ProductReference {
  id: string;
  name: string;
  slug: string;
  price: Money;
  imageUrl?: string;
  stock: Quantity;
  isActive: boolean;
}

/**
 * Cart Item Entity
 */
export class CartItem {
  constructor(
    public readonly id: string,
    public readonly productReference: ProductReference,
    public readonly quantity: Quantity,
    public readonly addedAt: Date = new Date()
  ) {}

  getTotalPrice(): Money {
    return this.productReference.price.multiply(this.quantity.value);
  }

  updateQuantity(newQuantity: Quantity): CartItem {
    return new CartItem(this.id, this.productReference, newQuantity, this.addedAt);
  }

  toJSON() {
    return {
      id: this.id,
      productId: this.productReference.id,
      productName: this.productReference.name,
      productSlug: this.productReference.slug,
      price: this.productReference.price.toJSON(),
      quantity: this.quantity.toJSON(),
      totalPrice: this.getTotalPrice().toJSON(),
      addedAt: this.addedAt.toISOString(),
    };
  }
}

/**
 * Cart Aggregate Root
 */
export class Cart {
  private static readonly MAX_ITEMS = 100;
  private static readonly MAX_QUANTITY_PER_ITEM = 999;
  private items: Map<string, CartItem>;

  constructor(
    public readonly id: string,
    public readonly userId: string,
    items?: Map<string, CartItem>,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date()
  ) {
    this.items = items || new Map();
  }

  /**
   * Add item to cart
   */
  addItem(
    itemId: string,
    product: ProductReference,
    quantity: Quantity
  ): Result<Cart, BusinessError | ValidationError> {
    // Check cart size limit
    if (this.items.size >= Cart.MAX_ITEMS && !this.items.has(itemId)) {
      return Result.error(new BusinessError("Le panier est plein"));
    }

    // Check stock availability
    if (quantity.value > product.stock.value) {
      return Result.error(new BusinessError("Quantité insuffisante en stock"));
    }

    // Check if product is active
    if (!product.isActive) {
      return Result.error(new BusinessError("Ce produit n'est plus disponible"));
    }

    // Check if item already exists
    const existingItem = this.getItemByProductId(product.id);
    if (existingItem) {
      // Update quantity of existing item
      const newQuantity = existingItem.quantity.add(quantity);

      if (newQuantity.value > Cart.MAX_QUANTITY_PER_ITEM) {
        return Result.error(
          new ValidationError(`La quantité maximale par article est ${Cart.MAX_QUANTITY_PER_ITEM}`)
        );
      }

      if (newQuantity.value > product.stock.value) {
        return Result.error(new BusinessError("Quantité insuffisante en stock"));
      }

      const updatedItem = existingItem.updateQuantity(newQuantity);
      this.items.set(existingItem.id, updatedItem);
    } else {
      // Add new item
      if (quantity.value > Cart.MAX_QUANTITY_PER_ITEM) {
        return Result.error(
          new ValidationError(`La quantité maximale par article est ${Cart.MAX_QUANTITY_PER_ITEM}`)
        );
      }

      const newItem = new CartItem(itemId, product, quantity);
      this.items.set(itemId, newItem);
    }

    return Result.ok(
      new Cart(this.id, this.userId, new Map(this.items), this.createdAt, new Date())
    );
  }

  /**
   * Remove item from cart
   */
  removeItem(itemId: string): Result<Cart, BusinessError> {
    if (!this.items.has(itemId)) {
      return Result.error(new BusinessError("Article non trouvé dans le panier"));
    }

    const newItems = new Map(this.items);
    newItems.delete(itemId);

    return Result.ok(new Cart(this.id, this.userId, newItems, this.createdAt, new Date()));
  }

  /**
   * Update item quantity
   */
  updateItemQuantity(
    itemId: string,
    newQuantity: Quantity
  ): Result<Cart, BusinessError | ValidationError> {
    const item = this.items.get(itemId);
    if (!item) {
      return Result.error(new BusinessError("Article non trouvé dans le panier"));
    }

    // If quantity is zero, remove the item
    if (newQuantity.isZero()) {
      return this.removeItem(itemId);
    }

    // Check quantity limits
    if (newQuantity.value > Cart.MAX_QUANTITY_PER_ITEM) {
      return Result.error(
        new ValidationError(`La quantité maximale par article est ${Cart.MAX_QUANTITY_PER_ITEM}`)
      );
    }

    // Check stock availability
    if (newQuantity.value > item.productReference.stock.value) {
      return Result.error(new BusinessError("Quantité insuffisante en stock"));
    }

    const updatedItem = item.updateQuantity(newQuantity);
    const newItems = new Map(this.items);
    newItems.set(itemId, updatedItem);

    return Result.ok(new Cart(this.id, this.userId, newItems, this.createdAt, new Date()));
  }

  /**
   * Clear all items from cart
   */
  clear(): Cart {
    return new Cart(this.id, this.userId, new Map(), this.createdAt, new Date());
  }

  /**
   * Get cart items
   */
  getItems(): CartItem[] {
    return Array.from(this.items.values());
  }

  /**
   * Get item by ID
   */
  getItemById(itemId: string): CartItem | undefined {
    return this.items.get(itemId);
  }

  /**
   * Get item by product ID
   */
  getItemByProductId(productId: string): CartItem | undefined {
    return Array.from(this.items.values()).find((item) => item.productReference.id === productId);
  }

  /**
   * Calculate total amount
   */
  getTotalAmount(): Money {
    const items = this.getItems();
    if (items.length === 0) {
      return new Money(0, "EUR");
    }

    return items.reduce((total, item) => total.add(item.getTotalPrice()), new Money(0, "EUR"));
  }

  /**
   * Get total number of items
   */
  getTotalItems(): number {
    return this.getItems().reduce((total, item) => total + item.quantity.value, 0);
  }

  /**
   * Check if cart is empty
   */
  isEmpty(): boolean {
    return this.items.size === 0;
  }

  /**
   * Check if cart is full
   */
  isFull(): boolean {
    return this.items.size >= Cart.MAX_ITEMS;
  }

  /**
   * Validate cart items against business rules
   */
  validate(): Result<void, ValidationError> {
    const errors: string[] = [];

    // Check if cart is empty
    if (this.isEmpty()) {
      errors.push("Le panier est vide");
    }

    // Check each item
    for (const item of this.getItems()) {
      if (item.quantity.value <= 0) {
        errors.push(`Quantité invalide pour ${item.productReference.name}`);
      }

      if (!item.productReference.isActive) {
        errors.push(`${item.productReference.name} n'est plus disponible`);
      }

      if (item.quantity.value > item.productReference.stock.value) {
        errors.push(`Stock insuffisant pour ${item.productReference.name}`);
      }
    }

    if (errors.length > 0) {
      return Result.error(new ValidationError(errors.join(", ")));
    }

    return Result.ok(undefined);
  }

  /**
   * Convert to JSON for persistence
   */
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      items: this.getItems().map((item) => item.toJSON()),
      totalAmount: this.getTotalAmount().toJSON(),
      totalItems: this.getTotalItems(),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  /**
   * Create from JSON data
   */
  static fromJSON(data: any): Cart {
    const items = new Map<string, CartItem>();

    if (data.items && Array.isArray(data.items)) {
      for (const itemData of data.items) {
        const productReference: ProductReference = {
          id: itemData.productId,
          name: itemData.productName,
          slug: itemData.productSlug,
          price: new Money(itemData.price.amount, itemData.price.currency),
          imageUrl: itemData.imageUrl,
          stock: new Quantity(itemData.stock || 0),
          isActive: itemData.isActive !== false,
        };

        const item = new CartItem(
          itemData.id,
          productReference,
          new Quantity(itemData.quantity),
          new Date(itemData.addedAt)
        );

        items.set(item.id, item);
      }
    }

    return new Cart(
      data.id,
      data.userId,
      items,
      new Date(data.createdAt),
      new Date(data.updatedAt)
    );
  }
}
