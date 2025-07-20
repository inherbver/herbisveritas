"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { FilterIcon, Search, X, Package } from "lucide-react";
import type { ProductFilters, ProductStatus } from "@/types/product-filters";
import { PRODUCT_STATUS_GROUPS, DEFAULT_PRODUCT_FILTERS } from "@/types/product-filters";

interface ProductFiltersProps {
  filters: ProductFilters;
  onFiltersChange: (filters: ProductFilters) => void;
  totalCount: number;
  filteredCount: number;
}

export function ProductFilters({
  filters,
  onFiltersChange,
  totalCount,
  filteredCount,
}: ProductFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    onFiltersChange({ ...filters, search: value });
  };

  const handleStatusToggle = (status: ProductStatus) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status];
    onFiltersChange({ ...filters, status: newStatus });
  };

  const handleStockFilterChange = (inStock: boolean | null) => {
    onFiltersChange({ ...filters, inStock });
  };

  const clearAllFilters = () => {
    setSearchInput("");
    onFiltersChange(DEFAULT_PRODUCT_FILTERS);
  };

  const activeFiltersCount =
    filters.status.length +
    filters.categories.length +
    filters.tags.length +
    (filters.priceRange ? 1 : 0) +
    (filters.inStock !== null ? 1 : 0) +
    (filters.search ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Barre de recherche et actions rapides */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom de produit..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {filteredCount} / {totalCount} produits
          </Badge>

          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              <X className="mr-1 h-4 w-4" />
              Effacer ({activeFiltersCount})
            </Button>
          )}

          {/* Filtres sur desktop */}
          <div className="hidden items-center gap-2 lg:flex">
            <StatusFilter selectedStatus={filters.status} onStatusToggle={handleStatusToggle} />
            <StockFilter inStock={filters.inStock} onStockFilterChange={handleStockFilterChange} />
          </div>

          {/* Filtres sur mobile */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden">
                <FilterIcon className="mr-1 h-4 w-4" />
                Filtres
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle>Filtres des produits</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <MobileStatusFilter
                  selectedStatus={filters.status}
                  onStatusToggle={handleStatusToggle}
                />
                <MobileStockFilter
                  inStock={filters.inStock}
                  onStockFilterChange={handleStockFilterChange}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Panneau des filtres sélectionnés (desktop) */}
      <div className="hidden lg:block">
        <SelectedFiltersDisplay filters={filters} onFiltersChange={onFiltersChange} />
      </div>
    </div>
  );
}

// Composant filtre de statut (desktop)
function StatusFilter({
  selectedStatus,
  onStatusToggle,
}: {
  selectedStatus: ProductStatus[];
  onStatusToggle: (status: ProductStatus) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Package className="mr-1 h-4 w-4" />
          Statut
          {selectedStatus.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
              {selectedStatus.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56" align="start">
        <div className="space-y-2">
          {PRODUCT_STATUS_GROUPS.map((statusGroup) => (
            <div key={statusGroup.id} className="flex items-center space-x-2">
              <Checkbox
                id={`status-${statusGroup.id}`}
                checked={selectedStatus.includes(statusGroup.id)}
                onCheckedChange={() => onStatusToggle(statusGroup.id)}
              />
              <Label htmlFor={`status-${statusGroup.id}`} className="flex items-center gap-2">
                <StatusBadge status={statusGroup.id} />
                <div className="text-xs text-muted-foreground">{statusGroup.description}</div>
              </Label>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Composant filtre de stock (desktop)
function StockFilter({
  inStock,
  onStockFilterChange,
}: {
  inStock: boolean | null;
  onStockFilterChange: (inStock: boolean | null) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          Stock
          {inStock !== null && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
              1
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48" align="start">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="stock-all"
              checked={inStock === null}
              onCheckedChange={() => onStockFilterChange(null)}
            />
            <Label htmlFor="stock-all">Tous les produits</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="stock-available"
              checked={inStock === true}
              onCheckedChange={() => onStockFilterChange(true)}
            />
            <Label htmlFor="stock-available">En stock</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="stock-out"
              checked={inStock === false}
              onCheckedChange={() => onStockFilterChange(false)}
            />
            <Label htmlFor="stock-out">Rupture de stock</Label>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Badge de statut réutilisable
function StatusBadge({ status }: { status: ProductStatus }) {
  const statusGroup = PRODUCT_STATUS_GROUPS.find((s) => s.id === status);
  if (!statusGroup) return null;

  const colorClasses = {
    green: "bg-green-100 text-green-800 border-green-200",
    orange: "bg-orange-100 text-orange-800 border-orange-200",
    gray: "bg-gray-100 text-gray-800 border-gray-200",
  };

  return (
    <Badge variant="outline" className={colorClasses[statusGroup.color]}>
      {statusGroup.label}
    </Badge>
  );
}

// Version mobile du filtre de statut
function MobileStatusFilter({
  selectedStatus,
  onStatusToggle,
}: {
  selectedStatus: ProductStatus[];
  onStatusToggle: (status: ProductStatus) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Statut</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {PRODUCT_STATUS_GROUPS.map((statusGroup) => (
          <div key={statusGroup.id} className="flex items-start space-x-2">
            <Checkbox
              id={`mobile-status-${statusGroup.id}`}
              checked={selectedStatus.includes(statusGroup.id)}
              onCheckedChange={() => onStatusToggle(statusGroup.id)}
            />
            <div className="flex flex-col gap-1">
              <Label
                htmlFor={`mobile-status-${statusGroup.id}`}
                className="flex items-center gap-2"
              >
                <StatusBadge status={statusGroup.id} />
              </Label>
              <div className="text-xs text-muted-foreground">{statusGroup.description}</div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Version mobile du filtre de stock
function MobileStockFilter({
  inStock,
  onStockFilterChange,
}: {
  inStock: boolean | null;
  onStockFilterChange: (inStock: boolean | null) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Disponibilité</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="mobile-stock-all"
            checked={inStock === null}
            onCheckedChange={() => onStockFilterChange(null)}
          />
          <Label htmlFor="mobile-stock-all">Tous les produits</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="mobile-stock-available"
            checked={inStock === true}
            onCheckedChange={() => onStockFilterChange(true)}
          />
          <Label htmlFor="mobile-stock-available">En stock</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="mobile-stock-out"
            checked={inStock === false}
            onCheckedChange={() => onStockFilterChange(false)}
          />
          <Label htmlFor="mobile-stock-out">Rupture de stock</Label>
        </div>
      </CardContent>
    </Card>
  );
}

// Affichage des filtres sélectionnés (desktop)
function SelectedFiltersDisplay({
  filters,
  onFiltersChange,
}: {
  filters: ProductFilters;
  onFiltersChange: (filters: ProductFilters) => void;
}) {
  const hasSelectedFilters = filters.status.length > 0 || filters.inStock !== null;

  if (!hasSelectedFilters) return null;

  const removeStatusFilter = (status: ProductStatus) => {
    const newStatus = filters.status.filter((s) => s !== status);
    onFiltersChange({ ...filters, status: newStatus });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Filtres actifs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {/* Filtres de statut */}
          {filters.status.map((status) => (
            <Badge
              key={status}
              variant="secondary"
              className="hover:bg-secondary/80 cursor-pointer"
              onClick={() => removeStatusFilter(status)}
            >
              <StatusBadge status={status} />
              <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}

          {/* Filtre de stock */}
          {filters.inStock !== null && (
            <Badge
              variant="secondary"
              className="hover:bg-secondary/80 cursor-pointer"
              onClick={() => onFiltersChange({ ...filters, inStock: null })}
            >
              {filters.inStock ? "En stock" : "Rupture de stock"}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
