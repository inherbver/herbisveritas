/**
 * Cart domain entities with business logic
 */

import { Result } from "@/lib/core/result";
import { BusinessError, ValidationError } from "@/lib/core/errors";

/**
 * Value objects
 */
export class Money {
  constructor(
    public readonly amount: number,
    public readonly currency: string = 'EUR'
  ) {
    if (amount < 0) {
      throw new ValidationError('Amount cannot be negative');
    }
    if (!currency || currency.length !== 3) {
      throw new ValidationError('Currency must be a 3-letter code');
    }
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new BusinessError('Cannot add different currencies');
    }
    return new Money(this.amount + other.amount, this.currency);
  }

  multiply(factor: number): Money {
    return new Money(this.amount * factor, this.currency);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  toString(): string {
    return `${this.amount.toFixed(2)} ${this.currency}`;
  }
}

export class Quantity {
  constructor(public readonly value: number) {
    if (!Number.isInteger(value) || value < 0) {
      throw new ValidationError('Quantity must be a non-negative integer');
    }
    if (value > 999) {
      throw new ValidationError('Quantity cannot exceed 999');
    }
  }

  add(other: Quantity): Quantity {
    return new Quantity(this.value + other.value);
  }

  subtract(other: Quantity): Result<Quantity, ValidationError> {
    const newValue = this.value - other.value;
    if (newValue < 0) {
      return Result.error(new ValidationError('Quantity cannot be negative'));
    }
    return Result.ok(new Quantity(newValue));
  }

  equals(other: Quantity): boolean {
    return this.value === other.value;
  }

  isZero(): boolean {
    return this.value === 0;
  }

  toString(): string {
    return this.value.toString();
  }
}

/**
 * Product reference (aggregate root reference)
 */
export interface ProductReference {
  id: string;
  name: string;
  price: Money;
  stock: Quantity;
  slug?: string;
  imageUrl?: string;
  isActive: boolean;
}

/**
 * Cart item entity
 */
export class CartItem {
  constructor(
    public readonly id: string,
    public readonly productReference: ProductReference,
    public readonly quantity: Quantity,
    public readonly addedAt: Date = new Date()
  ) {}

  /**
   * Update quantity with business rules validation
   */
  updateQuantity(newQuantity: Quantity): Result<CartItem, BusinessError> {
    // Business rule: Cannot exceed available stock
    if (newQuantity.value > this.productReference.stock.value) {
      return Result.error(new BusinessError(
        `Stock insuffisant. Disponible: ${this.productReference.stock.value}, demandé: ${newQuantity.value}`
      ));
    }

    // Business rule: Cannot have zero quantity (should remove instead)
    if (newQuantity.isZero()) {
      return Result.error(new BusinessError(
        'Utilisez la méthode de suppression pour une quantité de 0'
      ));
    }

    return Result.ok(new CartItem(
      this.id,
      this.productReference,
      newQuantity,
      this.addedAt
    ));
  }

  /**
   * Calculate subtotal for this item
   */
  getSubtotal(): Money {
    return this.productReference.price.multiply(this.quantity.value);
  }

  /**
   * Check if product is still available
   */
  isAvailable(): boolean {
    return this.productReference.isActive && this.productReference.stock.value > 0;
  }

  /**
   * Check if requested quantity is available
   */
  isQuantityAvailable(): boolean {
    return this.quantity.value <= this.productReference.stock.value;
  }

  /**
   * Create from primitive data
   */
  static fromPrimitives(data: {
    id: string;
    productId: string;
    productName: string;
    productPrice: number;
    productStock: number;
    productSlug?: string;
    productImageUrl?: string;
    productIsActive: boolean;
    quantity: number;
    addedAt?: Date;
  }): Result<CartItem, ValidationError> {
    try {
      const productReference: ProductReference = {
        id: data.productId,
        name: data.productName,
        price: new Money(data.productPrice),
        stock: new Quantity(data.productStock),
        slug: data.productSlug,
        imageUrl: data.productImageUrl,
        isActive: data.productIsActive,
      };

      const quantity = new Quantity(data.quantity);
      const addedAt = data.addedAt || new Date();

      return Result.ok(new CartItem(data.id, productReference, quantity, addedAt));
    } catch (error) {
      if (error instanceof ValidationError) {
        return Result.error(error);
      }
      return Result.error(new ValidationError('Invalid cart item data'));
    }
  }

  /**
   * Convert to primitives for persistence
   */
  toPrimitives() {
    return {
      id: this.id,
      productId: this.productReference.id,
      quantity: this.quantity.value,
      addedAt: this.addedAt,
    };
  }
}

/**
 * Cart constraints
 */
export const CART_BUSINESS_RULES = {
  MAX_ITEMS: 50,
  MAX_TOTAL_QUANTITY: 500,
  MAX_SUBTOTAL: 10000, // 10,000 EUR
} as const;

/**
 * Cart aggregate root
 */
export class Cart {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    private readonly items: Map<string, CartItem> = new Map(),
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date()
  ) {}

  /**
   * Get all items as array
   */
  getItems(): CartItem[] {
    return Array.from(this.items.values());
  }

  /**
   * Get item by product ID
   */
  getItemByProductId(productId: string): CartItem | null {
    return Array.from(this.items.values())
      .find(item => item.productReference.id === productId) || null;
  }

  /**
   * Get item by cart item ID
   */
  getItemById(itemId: string): CartItem | null {
    return this.items.get(itemId) || null;
  }

  /**
   * Add item to cart with business rules
   */
  addItem(
    itemId: string,
    productReference: ProductReference,
    quantity: Quantity
  ): Result<Cart, BusinessError> {
    // Business rule: Product must be active
    if (!productReference.isActive) {
      return Result.error(new BusinessError('Produit non disponible'));
    }

    // Business rule: Must have sufficient stock
    if (quantity.value > productReference.stock.value) {
      return Result.error(new BusinessError(
        `Stock insuffisant. Disponible: ${productReference.stock.value}`
      ));
    }

    // Business rule: Check max items limit
    if (this.items.size >= CART_BUSINESS_RULES.MAX_ITEMS) {
      return Result.error(new BusinessError(
        `Maximum ${CART_BUSINESS_RULES.MAX_ITEMS} articles différents autorisés`
      ));
    }

    // Check if product already exists in cart
    const existingItem = this.getItemByProductId(productReference.id);
    if (existingItem) {
      // Update existing item quantity
      const newQuantity = new Quantity(existingItem.quantity.value + quantity.value);
      const updateResult = existingItem.updateQuantity(newQuantity);
      
      if (updateResult.isError()) {
        return Result.error(updateResult.getError());
      }

      const newItems = new Map(this.items);
      newItems.set(existingItem.id, updateResult.getValue());
      
      return this.validateCartConstraints(newItems)
        .map(() => new Cart(this.id, this.userId, newItems, this.createdAt, new Date()));
    }

    // Add new item
    const newItem = new CartItem(itemId, productReference, quantity);
    const newItems = new Map(this.items);
    newItems.set(itemId, newItem);

    return this.validateCartConstraints(newItems)
      .map(() => new Cart(this.id, this.userId, newItems, this.createdAt, new Date()));
  }

  /**
   * Remove item from cart
   */
  removeItem(itemId: string): Result<Cart, BusinessError> {
    if (!this.items.has(itemId)) {
      return Result.error(new BusinessError('Article non trouvé dans le panier'));
    }

    const newItems = new Map(this.items);
    newItems.delete(itemId);

    return Result.ok(new Cart(this.id, this.userId, newItems, this.createdAt, new Date()));
  }

  /**
   * Update item quantity
   */
  updateItemQuantity(itemId: string, newQuantity: Quantity): Result<Cart, BusinessError> {
    const item = this.items.get(itemId);
    if (!item) {
      return Result.error(new BusinessError('Article non trouvé dans le panier'));
    }

    if (newQuantity.isZero()) {
      return this.removeItem(itemId);
    }

    const updateResult = item.updateQuantity(newQuantity);
    if (updateResult.isError()) {
      return Result.error(updateResult.getError());
    }

    const newItems = new Map(this.items);
    newItems.set(itemId, updateResult.getValue());

    return this.validateCartConstraints(newItems)
      .map(() => new Cart(this.id, this.userId, newItems, this.createdAt, new Date()));
  }

  /**
   * Clear all items
   */
  clear(): Cart {
    return new Cart(this.id, this.userId, new Map(), this.createdAt, new Date());
  }

  /**
   * Calculate total quantity
   */
  getTotalQuantity(): Quantity {
    const total = Array.from(this.items.values())
      .reduce((sum, item) => sum + item.quantity.value, 0);
    return new Quantity(total);
  }

  /**
   * Calculate subtotal
   */
  getSubtotal(): Money {
    const items = Array.from(this.items.values());
    if (items.length === 0) {
      return new Money(0);
    }

    return items.reduce(
      (total, item) => total.add(item.getSubtotal()),
      new Money(0)
    );
  }

  /**
   * Check if cart is empty
   */
  isEmpty(): boolean {
    return this.items.size === 0;
  }

  /**
   * Get unavailable items (out of stock or inactive products)
   */
  getUnavailableItems(): CartItem[] {
    return Array.from(this.items.values())
      .filter(item => !item.isAvailable() || !item.isQuantityAvailable());
  }

  /**
   * Validate business constraints
   */
  private validateCartConstraints(items: Map<string, CartItem>): Result<void, BusinessError> {
    const totalQuantity = Array.from(items.values())
      .reduce((sum, item) => sum + item.quantity.value, 0);

    if (totalQuantity > CART_BUSINESS_RULES.MAX_TOTAL_QUANTITY) {
      return Result.error(new BusinessError(
        `Quantité totale maximum: ${CART_BUSINESS_RULES.MAX_TOTAL_QUANTITY}`
      ));
    }

    const subtotal = Array.from(items.values())
      .reduce((total, item) => total + item.getSubtotal().amount, 0);

    if (subtotal > CART_BUSINESS_RULES.MAX_SUBTOTAL) {
      return Result.error(new BusinessError(
        `Montant maximum du panier: ${CART_BUSINESS_RULES.MAX_SUBTOTAL} EUR`
      ));
    }

    return Result.ok(undefined);
  }

  /**
   * Create cart from primitive data
   */
  static fromPrimitives(data: {
    id: string;
    userId: string;
    items: Array<{
      id: string;
      productId: string;
      productName: string;
      productPrice: number;
      productStock: number;
      productSlug?: string;
      productImageUrl?: string;
      productIsActive: boolean;
      quantity: number;
      addedAt?: Date;
    }>;
    createdAt?: Date;
    updatedAt?: Date;
  }): Result<Cart, ValidationError> {
    const items = new Map<string, CartItem>();

    for (const itemData of data.items) {
      const itemResult = CartItem.fromPrimitives(itemData);
      if (itemResult.isError()) {
        return Result.error(itemResult.getError());
      }
      items.set(itemData.id, itemResult.getValue());
    }

    return Result.ok(new Cart(
      data.id,
      data.userId,
      items,
      data.createdAt || new Date(),
      data.updatedAt || new Date()
    ));
  }

  /**
   * Convert to primitives for persistence
   */
  toPrimitives() {
    return {
      id: this.id,
      userId: this.userId,
      items: Array.from(this.items.values()).map(item => item.toPrimitives()),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}