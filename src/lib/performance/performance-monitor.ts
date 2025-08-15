/**
 * Système de monitoring des performances en temps réel
 * Mesure et analyse les métriques critiques de l'application
 */

import { unstable_cache } from "next/cache";

// Types pour les métriques
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: "ms" | "bytes" | "count" | "percentage";
  timestamp: number;
  category: "database" | "cache" | "render" | "api" | "user";
}

export interface ComponentPerformance {
  componentName: string;
  renderTime: number;
  cacheHits: number;
  cacheMisses: number;
  dbQueries: number;
  loadTime: number;
  memoryUsage?: number;
}

export interface SystemHealth {
  cacheHitRate: number;
  averageDbResponseTime: number;
  averageRenderTime: number;
  memoryUsage: number;
  activeUsers: number;
  errorRate: number;
}

// Store en mémoire pour les métriques (limite de 1000 entries)
class PerformanceStore {
  private metrics: PerformanceMetric[] = [];
  private maxSize = 100; // Limite réduite pour éviter l'accumulation mémoire
  private componentStats = new Map<string, ComponentPerformance>();

  addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Nettoyer les anciennes métriques si nécessaire
    if (this.metrics.length > this.maxSize) {
      this.metrics = this.metrics.slice(-this.maxSize);
    }
  }

  getMetrics(category?: string, since?: number): PerformanceMetric[] {
    let filtered = this.metrics;
    
    if (category) {
      filtered = filtered.filter(m => m.category === category);
    }
    
    if (since) {
      filtered = filtered.filter(m => m.timestamp >= since);
    }
    
    return filtered;
  }

  updateComponentStats(componentName: string, stats: Partial<ComponentPerformance>): void {
    const existing = this.componentStats.get(componentName) || {
      componentName,
      renderTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      dbQueries: 0,
      loadTime: 0,
    };

    this.componentStats.set(componentName, { ...existing, ...stats });
  }

  getComponentStats(componentName?: string): ComponentPerformance[] {
    if (componentName) {
      const stats = this.componentStats.get(componentName);
      return stats ? [stats] : [];
    }
    
    return Array.from(this.componentStats.values());
  }

  getSystemHealth(): SystemHealth {
    const recent = this.getMetrics(undefined, Date.now() - 5 * 60 * 1000); // 5 dernières minutes
    
    const cacheMetrics = recent.filter(m => m.name.includes('cache'));
    const dbMetrics = recent.filter(m => m.category === 'database');
    const renderMetrics = recent.filter(m => m.category === 'render');
    const errorMetrics = recent.filter(m => m.name.includes('error'));

    const cacheHits = cacheMetrics.filter(m => m.name.includes('hit')).length;
    const cacheMisses = cacheMetrics.filter(m => m.name.includes('miss')).length;
    const cacheHitRate = cacheHits + cacheMisses > 0 ? (cacheHits / (cacheHits + cacheMisses)) * 100 : 0;

    const avgDbTime = dbMetrics.length > 0 
      ? dbMetrics.reduce((sum, m) => sum + m.value, 0) / dbMetrics.length 
      : 0;

    const avgRenderTime = renderMetrics.length > 0
      ? renderMetrics.reduce((sum, m) => sum + m.value, 0) / renderMetrics.length
      : 0;

    const errorRate = recent.length > 0 
      ? (errorMetrics.length / recent.length) * 100 
      : 0;

    return {
      cacheHitRate,
      averageDbResponseTime: avgDbTime,
      averageRenderTime: avgRenderTime,
      memoryUsage: this.getMemoryUsage(),
      activeUsers: this.getActiveUsers(),
      errorRate,
    };
  }

  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memory = process.memoryUsage();
      const heapUsedMB = memory.heapUsed / 1024 / 1024;
      
      // Nettoyage automatique si mémoire > 500MB
      if (heapUsedMB > 500) {
        this.forceCleanup();
      }
      
      return heapUsedMB;
    }
    return 0;
  }

  private forceCleanup(): void {
    // Nettoyer les métriques anciennes (garder seulement les 20 dernières)
    if (this.metrics.length > 20) {
      this.metrics = this.metrics.slice(-20);
    }
    
    // Nettoyer les stats de composants inactifs
    const cutoff = Date.now() - 10 * 60 * 1000; // 10 minutes
    for (const [componentName, stats] of this.componentStats.entries()) {
      if (!stats.loadTime || stats.loadTime < cutoff) {
        this.componentStats.delete(componentName);
      }
    }
    
    // Forcer le garbage collection si disponible
    if (global.gc) {
      global.gc();
    }
  }

  private getActiveUsers(): number {
    // Estimation basée sur les métriques récentes
    const userMetrics = this.getMetrics("user", Date.now() - 15 * 60 * 1000); // 15 dernières minutes
    const uniqueUsers = new Set(userMetrics.map(m => m.name)).size;
    return uniqueUsers;
  }

  clear(): void {
    this.metrics = [];
    this.componentStats.clear();
  }
}

// Instance globale
const performanceStore = new PerformanceStore();

/**
 * Classe principale pour le monitoring des performances
 */
export class PerformanceMonitor {
  /**
   * Mesure le temps d'exécution d'une fonction
   */
  static async measureExecutionTime<T>(
    fn: () => Promise<T>,
    name: string,
    category: PerformanceMetric["category"] = "api"
  ): Promise<T> {
    const start = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - start;
      
      performanceStore.addMetric({
        name: `${name}_success`,
        value: duration,
        unit: "ms",
        timestamp: Date.now(),
        category,
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      
      performanceStore.addMetric({
        name: `${name}_error`,
        value: duration,
        unit: "ms", 
        timestamp: Date.now(),
        category,
      });
      
      throw error;
    }
  }

  /**
   * Mesure les performances d'un composant React
   */
  static measureComponentPerformance(componentName: string) {
    return {
      startRender: () => {
        const start = performance.now();
        return () => {
          const renderTime = performance.now() - start;
          performanceStore.updateComponentStats(componentName, { renderTime });
          
          performanceStore.addMetric({
            name: `${componentName}_render`,
            value: renderTime,
            unit: "ms",
            timestamp: Date.now(),
            category: "render",
          });
        };
      },

      recordCacheHit: () => {
        const current = performanceStore.getComponentStats(componentName)[0];
        performanceStore.updateComponentStats(componentName, {
          cacheHits: (current?.cacheHits || 0) + 1,
        });

        performanceStore.addMetric({
          name: `${componentName}_cache_hit`,
          value: 1,
          unit: "count",
          timestamp: Date.now(),
          category: "cache",
        });
      },

      recordCacheMiss: () => {
        const current = performanceStore.getComponentStats(componentName)[0];
        performanceStore.updateComponentStats(componentName, {
          cacheMisses: (current?.cacheMisses || 0) + 1,
        });

        performanceStore.addMetric({
          name: `${componentName}_cache_miss`,
          value: 1,
          unit: "count",
          timestamp: Date.now(),
          category: "cache",
        });
      },

      recordDbQuery: (responseTime: number) => {
        const current = performanceStore.getComponentStats(componentName)[0];
        performanceStore.updateComponentStats(componentName, {
          dbQueries: (current?.dbQueries || 0) + 1,
        });

        performanceStore.addMetric({
          name: `${componentName}_db_query`,
          value: responseTime,
          unit: "ms",
          timestamp: Date.now(),
          category: "database",
        });
      },
    };
  }

  /**
   * Enregistre une métrique de performance utilisateur
   */
  static recordUserMetric(
    actionName: string,
    duration: number,
    userId?: string
  ): void {
    performanceStore.addMetric({
      name: `user_${actionName}${userId ? `_${userId}` : ""}`,
      value: duration,
      unit: "ms",
      timestamp: Date.now(),
      category: "user",
    });
  }

  /**
   * Surveille les Core Web Vitals
   */
  static measureWebVitals() {
    if (typeof window === 'undefined') return;

    // First Contentful Paint (FCP)
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') {
          performanceStore.addMetric({
            name: 'fcp',
            value: entry.startTime,
            unit: "ms",
            timestamp: Date.now(),
            category: "user",
          });
        }
      }
    });

    observer.observe({ entryTypes: ['paint'] });

    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      performanceStore.addMetric({
        name: 'lcp',
        value: lastEntry.startTime,
        unit: "ms",
        timestamp: Date.now(),
        category: "user",
      });
    });

    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }

      performanceStore.addMetric({
        name: 'cls',
        value: clsValue,
        unit: "count",
        timestamp: Date.now(),
        category: "user",
      });
    });

    clsObserver.observe({ entryTypes: ['layout-shift'] });
  }

  /**
   * Analyse automatique des performances
   */
  static analyzePerformance(): {
    insights: string[];
    recommendations: string[];
    alerts: string[];
  } {
    const health = performanceStore.getSystemHealth();
    const insights: string[] = [];
    const recommendations: string[] = [];
    const alerts: string[] = [];

    // Analyse du cache
    if (health.cacheHitRate < 70) {
      alerts.push(`Taux de cache faible: ${health.cacheHitRate.toFixed(1)}%`);
      recommendations.push("Optimiser la stratégie de cache ou augmenter les TTL");
    } else if (health.cacheHitRate > 90) {
      insights.push(`Excellent taux de cache: ${health.cacheHitRate.toFixed(1)}%`);
    }

    // Analyse des temps de réponse DB
    if (health.averageDbResponseTime > 500) {
      alerts.push(`Temps de réponse DB élevé: ${health.averageDbResponseTime.toFixed(0)}ms`);
      recommendations.push("Vérifier les index et optimiser les requêtes SQL");
    } else if (health.averageDbResponseTime < 100) {
      insights.push(`Temps de réponse DB optimal: ${health.averageDbResponseTime.toFixed(0)}ms`);
    }

    // Analyse du rendu
    if (health.averageRenderTime > 200) {
      alerts.push(`Temps de rendu lent: ${health.averageRenderTime.toFixed(0)}ms`);
      recommendations.push("Optimiser les composants ou utiliser la virtualisation");
    }

    // Analyse mémoire
    if (health.memoryUsage > 500) {
      alerts.push(`Utilisation mémoire élevée: ${health.memoryUsage.toFixed(0)}MB`);
      recommendations.push("Vérifier les fuites mémoire et optimiser le cache");
    }

    // Analyse des erreurs
    if (health.errorRate > 5) {
      alerts.push(`Taux d'erreur élevé: ${health.errorRate.toFixed(1)}%`);
      recommendations.push("Analyser les logs d'erreur et corriger les problèmes");
    }

    return { insights, recommendations, alerts };
  }

  /**
   * Génère un rapport de performance
   */
  static generateReport(timeframe: "hour" | "day" | "week" = "hour"): {
    summary: SystemHealth;
    metrics: PerformanceMetric[];
    components: ComponentPerformance[];
    analysis: ReturnType<typeof PerformanceMonitor.analyzePerformance>;
  } {
    const since = Date.now() - this.getTimeframeMs(timeframe);
    
    return {
      summary: performanceStore.getSystemHealth(),
      metrics: performanceStore.getMetrics(undefined, since),
      components: performanceStore.getComponentStats(),
      analysis: this.analyzePerformance(),
    };
  }

  /**
   * Nettoie les anciennes métriques
   */
  static cleanup(): void {
    performanceStore.clear();
  }

  /**
   * Exporte les données pour analyse externe
   */
  static exportData(format: "json" | "csv" = "json"): string {
    const data = {
      health: performanceStore.getSystemHealth(),
      metrics: performanceStore.getMetrics(),
      components: performanceStore.getComponentStats(),
      timestamp: new Date().toISOString(),
    };

    if (format === "json") {
      return JSON.stringify(data, null, 2);
    }

    // Format CSV simple pour les métriques
    const csvLines = ["name,value,unit,timestamp,category"];
    data.metrics.forEach(m => {
      csvLines.push(`${m.name},${m.value},${m.unit},${m.timestamp},${m.category}`);
    });
    
    return csvLines.join("\n");
  }

  private static getTimeframeMs(timeframe: "hour" | "day" | "week"): number {
    switch (timeframe) {
      case "hour": return 60 * 60 * 1000;
      case "day": return 24 * 60 * 60 * 1000;
      case "week": return 7 * 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  }
}

// Cache les rapports de performance pour éviter les recalculs fréquents
export const getCachedPerformanceReport = unstable_cache(
  async (timeframe: "hour" | "day" | "week" = "hour") => {
    return PerformanceMonitor.generateReport(timeframe);
  },
  ["performance-report"],
  {
    revalidate: 60, // 1 minute de cache
    tags: ["performance"],
  }
);

// Hook React pour monitoring côté client
export function usePerformanceMonitoring(componentName: string) {
  if (typeof window === 'undefined') {
    return {
      startRender: () => () => {},
      recordCacheHit: () => {},
      recordCacheMiss: () => {},
      recordDbQuery: () => {},
    };
  }

  return PerformanceMonitor.measureComponentPerformance(componentName);
}

// Initialisation automatique des Web Vitals côté client
if (typeof window !== 'undefined') {
  PerformanceMonitor.measureWebVitals();
}