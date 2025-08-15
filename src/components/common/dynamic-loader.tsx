"use client";

import dynamic from "next/dynamic";
import { Suspense, ComponentType } from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Utilitaires pour le chargement dynamique optimisé des composants
 */

// Loader générique pour les composants admin lourds
export const AdminDynamicLoader = <T extends Record<string, any>>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  fallback?: React.ReactNode
) => {
  const Component = dynamic(importFn, {
    loading: () => (
      <div className="space-y-4 p-6">
        {fallback || (
          <>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          </>
        )}
      </div>
    ),
    ssr: false // Désactiver SSR pour les composants admin
  });

  return (props: T) => (
    <Suspense fallback={fallback}>
      <Component {...props} />
    </Suspense>
  );
};

// Loader pour les composants shop avec SSR
export const ShopDynamicLoader = <T extends Record<string, any>>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  fallback?: React.ReactNode
) => {
  const Component = dynamic(importFn, {
    loading: () => (
      <div className="space-y-4">
        {fallback || (
          <>
            <Skeleton className="h-6 w-32" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-square w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    ),
    ssr: true // Garder SSR pour les composants shop critiques
  });

  return (props: T) => (
    <Suspense fallback={fallback}>
      <Component {...props} />
    </Suspense>
  );
};

// Composants dynamiques pré-configurés pour les features lourdes

// Admin - Chargé uniquement quand nécessaire
export const DynamicAdminDataTable = AdminDynamicLoader(
  () => import("@/app/[locale]/admin/users/components/enhanced-data-table"),
  <div className="space-y-4">
    <Skeleton className="h-10 w-full" />
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  </div>
);

export const DynamicAdminStats = AdminDynamicLoader(
  () => import("@/app/[locale]/admin/users/components/users-stats-cards")
);

export const DynamicOrdersTable = AdminDynamicLoader(
  () => import("@/app/[locale]/admin/orders/components/OrdersTable")
);

// Magazine - TipTap editor lourd
export const DynamicTipTapEditor = AdminDynamicLoader(
  () => import("@/components/features/magazine/tiptap-editor"),
  <div className="min-h-[400px] w-full rounded-md border border-input bg-background">
    <div className="flex h-12 items-center border-b px-3">
      <div className="flex space-x-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-6" />
        ))}
      </div>
    </div>
    <div className="p-4">
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  </div>
);

// Shop - Composants non-critiques
export const DynamicProductFilters = ShopDynamicLoader(
  () => import("@/components/features/shop/category-filter")
);

export const DynamicVirtualizedGrid = ShopDynamicLoader(
  () => import("@/components/features/shop/virtualized-product-grid")
);

// Charts pour les dashboards
export const DynamicChart = AdminDynamicLoader(
  () => import("recharts").then(mod => ({ default: mod.LineChart })),
  <Skeleton className="h-64 w-full" />
);

/**
 * Hook pour détecter les capacités du device et adapter le chargement
 */
export function useDeviceCapabilities() {
  const isLowEnd = typeof navigator !== 'undefined' && 
    ('connection' in navigator && 
     // @ts-ignore - connection is not in types yet
     (navigator.connection?.effectiveType === 'slow-2g' || 
      // @ts-ignore
      navigator.connection?.effectiveType === '2g'));

  const isSlowNetwork = typeof navigator !== 'undefined' &&
    ('connection' in navigator &&
     // @ts-ignore
     navigator.connection?.downlink < 1.5);

  return {
    isLowEnd,
    isSlowNetwork,
    shouldUseLightComponents: isLowEnd || isSlowNetwork
  };
}

/**
 * Wrapper conditionnel pour charger des composants selon les capacités
 */
export function AdaptiveComponent<T extends Record<string, any>>({
  lightComponent: LightComponent,
  heavyComponent: HeavyComponent,
  forceLight = false,
  ...props
}: {
  lightComponent: ComponentType<T>;
  heavyComponent: ComponentType<T>;
  forceLight?: boolean;
} & T) {
  const { shouldUseLightComponents } = useDeviceCapabilities();
  
  const ComponentToRender = (forceLight || shouldUseLightComponents) 
    ? LightComponent 
    : HeavyComponent;

  return <ComponentToRender {...(props as T)} />;
}