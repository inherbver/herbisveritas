/**
 * Money Value Object
 * 
 * Represents monetary amounts with validation and formatting.
 */

import { ValidationError } from "@/lib/core/errors";

export class Money {
  private readonly _amount: number;

  constructor(amount: number) {
    if (amount < 0) {
      throw new ValidationError('Le montant ne peut pas être négatif');
    }
    
    if (!Number.isFinite(amount)) {
      throw new ValidationError('Le montant doit être un nombre valide');
    }

    // Round to 2 decimal places to handle floating point precision
    this._amount = Math.round(amount * 100) / 100;
  }

  get amount(): number {
    return this._amount;
  }

  /**
   * Add two Money instances
   */
  add(other: Money): Money {
    return new Money(this._amount + other._amount);
  }

  /**
   * Subtract two Money instances
   */
  subtract(other: Money): Money {
    return new Money(this._amount - other._amount);
  }

  /**
   * Multiply by a factor
   */
  multiply(factor: number): Money {
    return new Money(this._amount * factor);
  }

  /**
   * Check if this amount is greater than another
   */
  isGreaterThan(other: Money): boolean {
    return this._amount > other._amount;
  }

  /**
   * Check if this amount is less than another
   */
  isLessThan(other: Money): boolean {
    return this._amount < other._amount;
  }

  /**
   * Check if this amount equals another
   */
  equals(other: Money): boolean {
    return Math.abs(this._amount - other._amount) < 0.01; // Account for floating point precision
  }

  /**
   * Format as currency string
   */
  format(locale: string = 'fr-FR', currency: string = 'EUR'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(this._amount);
  }

  /**
   * Convert to JSON representation
   */
  toJSON(): number {
    return this._amount;
  }

  /**
   * Create Money from JSON/number
   */
  static fromJSON(value: number): Money {
    return new Money(value);
  }

  /**
   * Zero money constant
   */
  static get ZERO(): Money {
    return new Money(0);
  }
}