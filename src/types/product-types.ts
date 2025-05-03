// src/types/product-types.ts

// Defines the structure expected by the ProductCard or ProductGrid components
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
