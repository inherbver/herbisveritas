/**
 * Quantity Value Object
 * 
 * Represents product quantities with validation.
 */

import { ValidationError } from "@/lib/core/errors";

export class Quantity {
  private readonly _value: number;

  constructor(value: number) {
    if (!Number.isInteger(value)) {
      throw new ValidationError('La quantité doit être un nombre entier');
    }
    
    if (value < 0) {
      throw new ValidationError('La quantité ne peut pas être négative');
    }

    if (value > 999999) {
      throw new ValidationError('La quantité ne peut pas dépasser 999999');
    }

    this._value = value;
  }

  get value(): number {
    return this._value;
  }

  /**
   * Add two quantities
   */
  add(other: Quantity): Quantity {
    return new Quantity(this._value + other._value);
  }

  /**
   * Subtract two quantities
   */
  subtract(other: Quantity): Quantity {
    return new Quantity(this._value - other._value);
  }

  /**
   * Check if this quantity is greater than another
   */
  isGreaterThan(other: Quantity): boolean {
    return this._value > other._value;
  }

  /**
   * Check if this quantity is less than another
   */
  isLessThan(other: Quantity): boolean {
    return this._value < other._value;
  }

  /**
   * Check if this quantity equals another
   */
  equals(other: Quantity): boolean {
    return this._value === other._value;
  }

  /**
   * Check if quantity is zero
   */
  isZero(): boolean {
    return this._value === 0;
  }

  /**
   * Check if quantity is positive
   */
  isPositive(): boolean {
    return this._value > 0;
  }

  /**
   * Convert to JSON representation
   */
  toJSON(): number {
    return this._value;
  }

  /**
   * Create Quantity from JSON/number
   */
  static fromJSON(value: number): Quantity {
    return new Quantity(value);
  }

  /**
   * Zero quantity constant
   */
  static get ZERO(): Quantity {
    return new Quantity(0);
  }

  /**
   * One quantity constant
   */
  static get ONE(): Quantity {
    return new Quantity(1);
  }
}