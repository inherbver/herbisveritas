/**
 * Product Reference Value Object
 * 
 * Represents a reference to a product with essential information.
 */

import { ValidationError } from "@/lib/core/errors";
import { Money } from "./money";

export class ProductReference {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly price: Money,
    public readonly slug: string,
    public readonly imageUrl?: string
  ) {
    if (!id || id.trim().length === 0) {
      throw new ValidationError('L\'ID du produit est requis');
    }

    if (!name || name.trim().length === 0) {
      throw new ValidationError('Le nom du produit est requis');
    }

    if (name.length > 255) {
      throw new ValidationError('Le nom du produit ne peut pas dépasser 255 caractères');
    }

    if (!slug || slug.trim().length === 0) {
      throw new ValidationError('Le slug du produit est requis');
    }

    if (slug.length > 100) {
      throw new ValidationError('Le slug du produit ne peut pas dépasser 100 caractères');
    }

    // Validate slug format (basic validation)
    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new ValidationError('Le slug doit contenir uniquement des lettres minuscules, des chiffres et des tirets');
    }

    if (imageUrl && imageUrl.length > 500) {
      throw new ValidationError('L\'URL de l\'image ne peut pas dépasser 500 caractères');
    }

    if (imageUrl && !this.isValidUrl(imageUrl)) {
      throw new ValidationError('L\'URL de l\'image n\'est pas valide');
    }
  }

  /**
   * Check if two product references are equal
   */
  equals(other: ProductReference): boolean {
    return this.id === other.id &&
           this.name === other.name &&
           this.price.equals(other.price) &&
           this.slug === other.slug &&
           this.imageUrl === other.imageUrl;
  }

  /**
   * Get product display name
   */
  getDisplayName(): string {
    return this.name;
  }

  /**
   * Get formatted price
   */
  getFormattedPrice(locale?: string, currency?: string): string {
    return this.price.format(locale, currency);
  }

  /**
   * Check if product has image
   */
  hasImage(): boolean {
    return !!this.imageUrl;
  }

  /**
   * Get image URL or default placeholder
   */
  getImageUrl(defaultImage?: string): string {
    return this.imageUrl || defaultImage || '/images/product-placeholder.jpg';
  }

  /**
   * Convert to JSON representation
   */
  toJSON(): {
    id: string;
    name: string;
    price: number;
    slug: string;
    imageUrl?: string;
  } {
    return {
      id: this.id,
      name: this.name,
      price: this.price.amount,
      slug: this.slug,
      ...(this.imageUrl && { imageUrl: this.imageUrl })
    };
  }

  /**
   * Create ProductReference from JSON
   */
  static fromJSON(data: {
    id: string;
    name: string;
    price: number;
    slug: string;
    imageUrl?: string;
  }): ProductReference {
    return new ProductReference(
      data.id,
      data.name,
      new Money(data.price),
      data.slug,
      data.imageUrl
    );
  }

  /**
   * Create a copy with updated price
   */
  withPrice(newPrice: Money): ProductReference {
    return new ProductReference(
      this.id,
      this.name,
      newPrice,
      this.slug,
      this.imageUrl
    );
  }

  /**
   * Create a copy with updated image URL
   */
  withImageUrl(newImageUrl?: string): ProductReference {
    return new ProductReference(
      this.id,
      this.name,
      this.price,
      this.slug,
      newImageUrl
    );
  }

  /**
   * Basic URL validation
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}