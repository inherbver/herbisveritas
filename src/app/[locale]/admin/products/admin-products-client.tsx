"use client";

import { useState, useMemo } from "react";
import { DashboardShell } from "@/components/features/admin/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

import { ProductFilters } from "@/components/features/admin/ProductFilters";
import { columns } from "./columns";
import { DataTable } from "./data-table";
import {
  ProductFilters as ProductFiltersType,
  DEFAULT_PRODUCT_FILTERS,
} from "@/types/product-filters";
import { ProductWithTranslations } from "@/lib/supabase/queries/products";

interface AdminProductsClientProps {
  initialProducts: ProductWithTranslations[];
}

export default function AdminProductsClient({ initialProducts }: AdminProductsClientProps) {
  const [filters, setFilters] = useState<ProductFiltersType>(DEFAULT_PRODUCT_FILTERS);

  // Filtrage côté client avec useMemo pour les performances
  const filteredProducts = useMemo(() => {
    return initialProducts.filter((product) => {
      // Filtrage par statut
      if (
        filters.status.length > 0 &&
        !filters.status.includes(product.status as ProductFiltersType["status"][0])
      ) {
        return false;
      }

      // Filtrage par recherche textuelle
      if (filters.search.trim()) {
        const searchLower = filters.search.toLowerCase();
        const productName = product.name?.toLowerCase() || "";
        if (!productName.includes(searchLower)) {
          return false;
        }
      }

      // Filtrage par prix
      if (filters.priceRange) {
        const price = Number(product.price) || 0;
        if (
          price < filters.priceRange.min ||
          (filters.priceRange.max !== Infinity && price > filters.priceRange.max)
        ) {
          return false;
        }
      }

      // Filtrage par stock
      if (filters.inStock === true && (product.stock || 0) <= 0) {
        return false;
      }
      if (filters.inStock === false && (product.stock || 0) > 0) {
        return false;
      }

      // Filtrage par catégories
      if (filters.categories.length > 0 && !filters.categories.includes(product.category || "")) {
        return false;
      }

      // Filtrage par tags/labels
      if (filters.tags.length > 0) {
        const productLabels = product.labels || [];
        const hasMatchingTag = filters.tags.some((tag) => productLabels.includes(tag));
        if (!hasMatchingTag) {
          return false;
        }
      }

      return true;
    });
  }, [initialProducts, filters]);

  return (
    <DashboardShell
      title="Gestion des Produits"
      headerAction={
        <Link href="/admin/products/new">
          <Button>Ajouter un produit</Button>
        </Link>
      }
    >
      <div className="space-y-6">
        <ProductFilters
          filters={filters}
          onFiltersChange={setFilters}
          totalCount={initialProducts.length}
          filteredCount={filteredProducts.length}
        />

        <Card>
          <CardHeader>
            <CardTitle>Liste des produits</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={columns} data={filteredProducts} />
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
