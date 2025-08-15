/**
 * Service de cache multi-niveaux pour optimiser les performances
 * Système hiérarchique : Memory Cache → React Cache → Next.js Cache → Redis (optionnel)
 */

import { cache } from "react";
import { unstable_cache } from "next/cache";

// Types pour les configurations de cache
export interface CacheConfig {
  ttl?: number; // Time to live en secondes
  tags?: string[]; // Tags pour invalidation sélective
  revalidate?: number; // Revalidation Next.js
  memory?: boolean; // Activer le cache mémoire
}

export interface CacheKey {
  type: "products" | "orders" | "users" | "stats" | "search";
  identifier: string;
  params?: Record<string, any>;
}

// Cache en mémoire pour les données très fréquemment utilisées
class MemoryCache {
  private cache = new Map<string, { data: any; expires: number }>();
  private maxSize = 200; // Limite de taille réduite pour éviter les fuites mémoire

  set(key: string, data: any, ttl: number): void {
    if (this.cache.size >= this.maxSize) {
      // Supprimer les entrées expirées d'abord
      this.cleanup();
      
      // Si toujours plein, supprimer la plus ancienne
      if (this.cache.size >= this.maxSize) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      expires: Date.now() + ttl * 1000,
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
      }
    }
  }

  // Statistiques pour monitoring
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        expiresIn: Math.max(0, entry.expires - Date.now()),
      })),
    };
  }
}

// Instance globale du cache mémoire
const memoryCache = new MemoryCache();

// Nettoyage automatique toutes les 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    memoryCache['cleanup']();
    console.log('[CACHE] Nettoyage automatique effectué. Taille actuelle:', memoryCache['cache'].size);
  }, 5 * 60 * 1000); // 5 minutes
}

/**
 * Classe principale du service de cache
 */
export class CacheService {
  private static generateKey(cacheKey: CacheKey): string {
    const paramsStr = cacheKey.params 
      ? JSON.stringify(cacheKey.params, Object.keys(cacheKey.params).sort())
      : "";
    return `${cacheKey.type}:${cacheKey.identifier}:${paramsStr}`;
  }

  /**
   * Cache React - pour les données partagées entre composants
   */
  static createReactCache<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    cacheKey: CacheKey,
    config: CacheConfig = {}
  ) {
    const cachedFn = cache(async (...args: T): Promise<R> => {
      const key = this.generateKey(cacheKey) + ":" + JSON.stringify(args);
      
      // Essayer le cache mémoire d'abord
      if (config.memory !== false) {
        const cached = memoryCache.get(key);
        if (cached) return cached;
      }

      // Exécuter la fonction
      const result = await fn(...args);

      // Stocker en mémoire si activé
      if (config.memory !== false && config.ttl) {
        memoryCache.set(key, result, Math.min(config.ttl, 300)); // Max 5 minutes en mémoire
      }

      return result;
    });

    return cachedFn;
  }

  /**
   * Cache Next.js - pour les données côté serveur
   */
  static createNextCache<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    cacheKey: CacheKey,
    config: CacheConfig = {}
  ) {
    const key = this.generateKey(cacheKey);
    
    return unstable_cache(
      fn,
      [key],
      {
        revalidate: config.revalidate || config.ttl || 3600, // 1 heure par défaut
        tags: config.tags || [cacheKey.type, cacheKey.identifier],
      }
    );
  }

  /**
   * Cache hybride - combine React Cache et mémoire
   */
  static createHybridCache<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    cacheKey: CacheKey,
    config: CacheConfig = {}
  ) {
    // React Cache pour la cohérence dans le rendu
    const reactCached = this.createReactCache(fn, cacheKey, config);
    
    // Wrapper avec cache mémoire
    return async (...args: T): Promise<R> => {
      const key = this.generateKey(cacheKey) + ":" + JSON.stringify(args);
      
      // Cache mémoire
      if (config.memory !== false) {
        const cached = memoryCache.get(key);
        if (cached) return cached;
      }

      // Fallback vers React Cache
      const result = await reactCached(...args);

      // Stocker en mémoire
      if (config.memory !== false && config.ttl) {
        memoryCache.set(key, result, Math.min(config.ttl, 300));
      }

      return result;
    };
  }

  /**
   * Invalidation de cache par tags
   */
  static async invalidateByTag(tag: string): Promise<void> {
    try {
      // Invalider Next.js cache
      const { revalidateTag } = await import("next/cache");
      revalidateTag(tag);
    } catch (error) {
      console.warn("Cache invalidation failed:", error);
    }
  }

  /**
   * Invalidation de cache par pattern
   */
  static invalidateByPattern(pattern: string): void {
    // Nettoyer le cache mémoire par pattern
    const cache = memoryCache["cache" as keyof typeof memoryCache] as Map<string, any>;
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        memoryCache.delete(key);
      }
    }
  }

  /**
   * Nettoyage complet du cache
   */
  static clearAll(): void {
    memoryCache.clear();
  }

  /**
   * Statistiques du cache
   */
  static getStats() {
    return {
      memory: memoryCache.getStats(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Préchargement de données fréquemment utilisées
   */
  static async warmup(preloadFunctions: Array<() => Promise<any>>): Promise<void> {
    try {
      await Promise.allSettled(preloadFunctions.map(fn => fn()));
    } catch (error) {
      console.warn("Cache warmup failed:", error);
    }
  }
}

// ===== CACHES PRÉDÉFINIS POUR LES DOMAINES MÉTIER =====

/**
 * Cache pour les produits
 */
export const ProductsCache = {
  search: (searchFn: any) => CacheService.createHybridCache(
    searchFn,
    { type: "products", identifier: "search" },
    { ttl: 300, tags: ["products"], memory: true }
  ),

  byId: (getFn: any) => CacheService.createHybridCache(
    getFn,
    { type: "products", identifier: "byId" },
    { ttl: 600, tags: ["products"], memory: true }
  ),

  list: (listFn: any) => CacheService.createNextCache(
    listFn,
    { type: "products", identifier: "list" },
    { revalidate: 300, tags: ["products"] }
  ),

  popular: (popularFn: any) => CacheService.createHybridCache(
    popularFn,
    { type: "products", identifier: "popular" },
    { ttl: 900, tags: ["products", "stats"], memory: true }
  ),
};

/**
 * Cache pour les commandes
 */
export const OrdersCache = {
  adminList: (listFn: any) => CacheService.createReactCache(
    listFn,
    { type: "orders", identifier: "adminList" },
    { ttl: 60, tags: ["orders"] }
  ),

  userOrders: (userOrdersFn: any) => CacheService.createHybridCache(
    userOrdersFn,
    { type: "orders", identifier: "userOrders" },
    { ttl: 300, tags: ["orders"], memory: true }
  ),

  stats: (statsFn: any) => CacheService.createHybridCache(
    statsFn,
    { type: "orders", identifier: "stats" },
    { ttl: 300, tags: ["orders", "stats"], memory: true }
  ),
};

/**
 * Cache pour les utilisateurs
 */
export const UsersCache = {
  list: (listFn: any) => CacheService.createReactCache(
    listFn,
    { type: "users", identifier: "list" },
    { ttl: 180, tags: ["users"] }
  ),

  profile: (profileFn: any) => CacheService.createHybridCache(
    profileFn,
    { type: "users", identifier: "profile" },
    { ttl: 600, tags: ["users"], memory: true }
  ),

  stats: (statsFn: any) => CacheService.createHybridCache(
    statsFn,
    { type: "users", identifier: "stats" },
    { ttl: 600, tags: ["users", "stats"], memory: true }
  ),
};

/**
 * Cache pour les statistiques globales
 */
export const StatsCache = {
  dashboard: (dashboardFn: any) => CacheService.createHybridCache(
    dashboardFn,
    { type: "stats", identifier: "dashboard" },
    { ttl: 300, tags: ["stats"], memory: true }
  ),

  analytics: (analyticsFn: any) => CacheService.createNextCache(
    analyticsFn,
    { type: "stats", identifier: "analytics" },
    { revalidate: 600, tags: ["stats", "analytics"] }
  ),
};

// ===== HELPERS POUR L'INVALIDATION =====

/**
 * Invalidation intelligente basée sur les actions
 */
export const CacheInvalidation = {
  // Quand un produit est modifié
  onProductUpdate: async (productId?: string) => {
    CacheService.invalidateByPattern("products");
    await CacheService.invalidateByTag("products");
    if (productId) {
      CacheService.invalidateByPattern(`products:byId:${productId}`);
    }
  },

  // Quand une commande est créée/modifiée
  onOrderUpdate: async (userId?: string) => {
    CacheService.invalidateByPattern("orders");
    CacheService.invalidateByPattern("stats");
    await Promise.all([
      CacheService.invalidateByTag("orders"),
      CacheService.invalidateByTag("stats"),
    ]);
    if (userId) {
      CacheService.invalidateByPattern(`orders:userOrders:${userId}`);
    }
  },

  // Quand un utilisateur est modifié
  onUserUpdate: async (userId?: string) => {
    CacheService.invalidateByPattern("users");
    await CacheService.invalidateByTag("users");
    if (userId) {
      CacheService.invalidateByPattern(`users:profile:${userId}`);
    }
  },

  // Invalidation complète (à utiliser avec parcimonie)
  onDataMigration: async () => {
    CacheService.clearAll();
    await Promise.all([
      CacheService.invalidateByTag("products"),
      CacheService.invalidateByTag("orders"),
      CacheService.invalidateByTag("users"),
      CacheService.invalidateByTag("stats"),
    ]);
  },
};

// ===== CONFIGURATION CACHE =====

/**
 * Configuration prédéfinie pour différents types de données
 */
export const CACHE_CONFIG = {
  PRODUCTS_LIST: { ttl: 300, tags: ["products"], memory: true },
  PRODUCT_DETAIL: { ttl: 600, tags: ["products"], memory: true },
  ORDERS_LIST: { ttl: 60, tags: ["orders"] },
  USERS_LIST: { ttl: 180, tags: ["users"] },
  STATS_DASHBOARD: { ttl: 300, tags: ["stats"], memory: true },
};

/**
 * Helper pour cache les requêtes Supabase
 */
export function cacheSupabaseQuery<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  cacheKey: CacheKey,
  config: CacheConfig = {}
) {
  return CacheService.createHybridCache(fn, cacheKey, config);
}

// ===== MONITORING ET DEBUGGING =====

/**
 * Middleware de monitoring pour mesurer les performances du cache
 */
export const CacheMonitoring = {
  measureCacheHit: (cacheType: string, key: string, hit: boolean) => {
    if (process.env.NODE_ENV === "development") {
      console.log(`[CACHE] ${cacheType} - ${key} - ${hit ? "HIT" : "MISS"}`);
    }
  },

  logCacheStats: () => {
    if (process.env.NODE_ENV === "development") {
      console.log("[CACHE STATS]", CacheService.getStats());
    }
  },

  trackCachePerformance: async <T>(
    fn: () => Promise<T>,
    cacheKey: string
  ): Promise<T> => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    
    if (process.env.NODE_ENV === "development") {
      console.log(`[CACHE PERF] ${cacheKey} - ${(end - start).toFixed(2)}ms`);
    }
    
    return result;
  },
};