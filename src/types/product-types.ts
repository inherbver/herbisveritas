// src/types/product-types.ts

// Centralized type definitions for Product related data structures

/**
 * Data structure used for displaying products in a grid or card view.
 */
export interface ProductListItem {
  id: string;
  slug: string;
  name: string; // Translated
  short_description?: string; // Translated (Optional)
  price: number | null;
  image_url: string | null;
  stock: number | null; // Assuming stock is needed by the grid/card
  is_new: boolean | null;
  is_on_promotion: boolean | null;
  labels: string[] | null;
  // Add any other fields the ProductCard/Grid might need
}

/**
 * Data structure used for displaying product details
 * (in modals, full pages, etc.)
 */
export interface ProductDetailData {
  id: string | number;
  name: string;
  shortDescription?: string | null;
  description_long?: string | null;
  unit?: string | null;
  price: string; // Formatted price
  images?: { src: string; alt: string }[];
  properties?: string | null; // Could be structured later (e.g., { key: string; value: string }[])
  compositionText?: string;
  inciList?: string[];
  usageInstructions?: string;
}

// Add other product-related types here as needed
