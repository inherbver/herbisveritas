export type ProductStatus = "active" | "inactive" | "draft";

export interface ProductFilters {
  status: ProductStatus[];
  categories: string[];
  search: string;
  priceRange: { min: number; max: number } | null;
  inStock: boolean | null;
  tags: string[];
}

export interface ProductStatusGroup {
  id: ProductStatus;
  label: string;
  description: string;
  color: "green" | "orange" | "gray";
}

export const PRODUCT_STATUS_GROUPS: ProductStatusGroup[] = [
  {
    id: "active",
    label: "Actifs",
    description: "Produits visibles dans la boutique",
    color: "green",
  },
  {
    id: "inactive",
    label: "Inactifs",
    description: "Produits masqués de la boutique",
    color: "orange",
  },
  {
    id: "draft",
    label: "Brouillons",
    description: "Produits en cours de création",
    color: "gray",
  },
];

export const DEFAULT_PRODUCT_FILTERS: ProductFilters = {
  status: ["active"], // Par défaut : afficher uniquement les produits actifs
  categories: [],
  search: "",
  priceRange: null,
  inStock: null,
  tags: [],
};

export const PRICE_RANGE_PRESETS = [
  { label: "Moins de 20€", min: 0, max: 20 },
  { label: "20€ - 50€", min: 20, max: 50 },
  { label: "50€ - 100€", min: 50, max: 100 },
  { label: "Plus de 100€", min: 100, max: Infinity },
];
