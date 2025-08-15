"use client";

import { useState, useMemo, useCallback } from "react";
import { FixedSizeGrid as Grid } from "react-window";
import { ProductCard } from "./product-card";
import { OptimizedImage } from "@/components/common/optimized-image";
import { Button } from "@/components/ui/button";
import { useHydrated } from "@/hooks/use-hydrated";
import type { ProductListItem } from "@/app/[locale]/shop/page";

interface VirtualizedProductGridProps {
  products: ProductListItem[];
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

// Configuration de la grille
const ITEM_WIDTH = 300;
const ITEM_HEIGHT = 400;
const GRID_GAP = 16;

/**
 * Grille de produits virtualisée pour de meilleures performances avec de gros datasets
 * Utilise react-window pour ne rendre que les éléments visibles
 */
export function VirtualizedProductGrid({ 
  products, 
  loading = false,
  onLoadMore,
  hasMore = false 
}: VirtualizedProductGridProps) {
  const isHydrated = useHydrated();
  const [containerWidth, setContainerWidth] = useState(1200);

  // Calculer le nombre de colonnes basé sur la largeur du conteneur
  const columnsCount = useMemo(() => {
    return Math.floor((containerWidth - GRID_GAP) / (ITEM_WIDTH + GRID_GAP));
  }, [containerWidth]);

  // Calculer le nombre de lignes
  const rowsCount = useMemo(() => {
    return Math.ceil(products.length / columnsCount);
  }, [products.length, columnsCount]);

  // Référence du conteneur pour mesurer la largeur
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerWidth(entry.contentRect.width);
        }
      });
      resizeObserver.observe(node);
      return () => resizeObserver.disconnect();
    }
  }, []);

  // Composant cellule de la grille
  const Cell = useCallback(({ columnIndex, rowIndex, style }: any) => {
    const productIndex = rowIndex * columnsCount + columnIndex;
    const product = products[productIndex];

    if (!product) {
      return null;
    }

    return (
      <div
        style={{
          ...style,
          left: style.left + GRID_GAP,
          top: style.top + GRID_GAP,
          width: style.width - GRID_GAP,
          height: style.height - GRID_GAP,
        }}
      >
        <ProductCard 
          product={product}
          priority={productIndex < 6} // Priority pour les 6 premiers
          className="h-full"
        />
      </div>
    );
  }, [products, columnsCount]);

  // Fallback pour SSR et périodes de chargement
  if (!isHydrated || loading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Rendu normal pour petites listes (< 50 produits)
  if (products.length < 50) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product, index) => (
            <ProductCard 
              key={product.id}
              product={product}
              priority={index < 6}
            />
          ))}
        </div>
        {hasMore && (
          <div className="flex justify-center">
            <Button 
              onClick={onLoadMore}
              variant="outline"
              disabled={loading}
            >
              {loading ? "Chargement..." : "Charger plus"}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Grille virtualisée pour grandes listes
  return (
    <div className="space-y-6">
      <div ref={containerRef} className="h-[800px] w-full">
        <Grid
          columnCount={columnsCount}
          columnWidth={ITEM_WIDTH + GRID_GAP}
          height={800}
          rowCount={rowsCount}
          rowHeight={ITEM_HEIGHT + GRID_GAP}
          width={containerWidth}
          overscanRowCount={2}
          overscanColumnCount={1}
        >
          {Cell}
        </Grid>
      </div>
      
      {hasMore && (
        <div className="flex justify-center">
          <Button 
            onClick={onLoadMore}
            variant="outline"
            disabled={loading}
          >
            {loading ? "Chargement..." : "Charger plus"}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton pour les cartes produits pendant le chargement
 */
function ProductCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-square bg-muted rounded-lg mb-4" />
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-1/2" />
        <div className="h-6 bg-muted rounded w-1/3" />
      </div>
    </div>
  );
}

/**
 * Hook pour pagination infinie optimisée
 */
export function useInfiniteProducts(initialProducts: ProductListItem[]) {
  const [products, setProducts] = useState(initialProducts);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      // Simuler le chargement de plus de produits
      // Dans un vrai projet, ceci ferait un appel API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Pour l'exemple, nous arrêtons après 3 pages
      if (page >= 3) {
        setHasMore(false);
      } else {
        // Dupliquer les produits existants pour la démo
        setProducts(prev => [...prev, ...initialProducts.slice(0, 8)]);
        setPage(prev => prev + 1);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des produits:", error);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, initialProducts]);

  return {
    products,
    loading,
    hasMore,
    loadMore
  };
}