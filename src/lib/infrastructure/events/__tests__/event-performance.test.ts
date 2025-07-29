/**
 * Event System Performance Tests
 * 
 * Tests de performance, charge et endurance pour l'architecture Event-Driven.
 * Ces tests valident la scalabilité et la résilience du système sous charge.
 */

import { ContainerConfiguration } from '../../container/container.config';
import { SERVICE_TOKENS } from '../../container/container';
import { initializeEventSystem } from '../event-container-config';
import { EventFactory } from '@/lib/core/events';
import type { EventBus, EventStore } from '@/lib/core/events';

// Mock optimisé pour les tests de performance
jest.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: jest.fn().mockReturnValue({
    from: jest.fn(() => ({
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
      insert: jest.fn().mockResolvedValue({ error: null }),
      update: jest.fn().mockResolvedValue({ error: null }),
      delete: jest.fn().mockResolvedValue({ error: null }),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
    rpc: jest.fn().mockResolvedValue({ error: null }),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  }),
}));

// Helper pour mesurer les performances
function measurePerformance<T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
  return new Promise(async (resolve) => {
    const startTime = performance.now();
    const result = await operation();
    const endTime = performance.now();
    resolve({ result, duration: endTime - startTime });
  });
}

// Helper pour générer des événements de test
function generateTestEvents(count: number, eventType: string = 'CART_ITEM_ADDED') {
  return Array.from({ length: count }, (_, i) => 
    EventFactory.create(
      eventType,
      `aggregate_${i}`,
      'test',
      {
        id: i,
        productId: `product_${i % 100}`, // 100 produits différents
        userId: `user_${i % 20}`, // 20 utilisateurs différents
        quantity: Math.floor(Math.random() * 5) + 1,
        timestamp: Date.now(),
        testData: `test_data_${i}`
      }
    )
  );
}

describe('Event System Performance Tests', () => {
  let container: any;
  let eventBus: EventBus;
  let eventStore: EventStore;

  beforeAll(async () => {
    const result = ContainerConfiguration.configureServer();
    expect(result.isSuccess()).toBe(true);
    
    container = result.getValue();
    await initializeEventSystem(container);
    
    eventBus = container.resolve<EventBus>(SERVICE_TOKENS.EVENT_BUS);
    eventStore = container.resolve<EventStore>(SERVICE_TOKENS.EVENT_STORE);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Single Event Performance', () => {
    it('should publish single event quickly', async () => {
      const event = EventFactory.create('CART_ITEM_ADDED', 'cart_1', 'cart', {
        productId: 'product_1',
        quantity: 1,
        userId: 'user_1'
      });

      const { result, duration } = await measurePerformance(async () => {
        return await eventBus.publish(event);
      });

      expect(result.isSuccess()).toBe(true);
      expect(duration).toBeLessThan(50); // Moins de 50ms pour un événement
      
      console.log(`Single event processing time: ${duration.toFixed(2)}ms`);
    });

    it('should handle event persistence efficiently', async () => {
      const event = EventFactory.create('ORDER_CREATED', 'order_1', 'order', {
        orderId: 'order_1',
        userId: 'user_1',
        totalAmount: 99.99
      });

      const { result, duration } = await measurePerformance(async () => {
        return await eventStore.append(event);
      });

      expect(result.isSuccess()).toBe(true);
      expect(duration).toBeLessThan(100); // Moins de 100ms pour la persistance
      
      console.log(`Event persistence time: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Batch Event Performance', () => {
    it('should handle medium batch (100 events) efficiently', async () => {
      const events = generateTestEvents(100, 'CART_ITEM_ADDED');

      const { result, duration } = await measurePerformance(async () => {
        return await eventBus.publishBatch(events);
      });

      expect(result.isSuccess()).toBe(true);
      expect(duration).toBeLessThan(2000); // Moins de 2 secondes pour 100 événements
      
      const eventsPerSecond = (events.length / duration) * 1000;
      console.log(`Batch processing: ${events.length} events in ${duration.toFixed(2)}ms (${eventsPerSecond.toFixed(0)} events/sec)`);
      
      expect(eventsPerSecond).toBeGreaterThan(50); // Au moins 50 événements/seconde
    });

    it('should handle large batch (500 events) with acceptable performance', async () => {
      const events = generateTestEvents(500, 'PRODUCT_STOCK_UPDATED');

      const { result, duration } = await measurePerformance(async () => {
        return await eventBus.publishBatch(events);
      });

      expect(result.isSuccess()).toBe(true);
      expect(duration).toBeLessThan(10000); // Moins de 10 secondes pour 500 événements
      
      const eventsPerSecond = (events.length / duration) * 1000;
      console.log(`Large batch processing: ${events.length} events in ${duration.toFixed(2)}ms (${eventsPerSecond.toFixed(0)} events/sec)`);
      
      expect(eventsPerSecond).toBeGreaterThan(30); // Au moins 30 événements/seconde
    });
  });

  describe('Concurrent Event Processing', () => {
    it('should handle concurrent event publishing', async () => {
      const concurrentOperations = 20;
      const eventsPerOperation = 10;

      const operations = Array.from({ length: concurrentOperations }, (_, i) => {
        const events = generateTestEvents(eventsPerOperation, 'USER_REGISTERED');
        return () => eventBus.publishBatch(events);
      });

      const { result, duration } = await measurePerformance(async () => {
        const promises = operations.map(op => op());
        return await Promise.allSettled(promises);
      });

      const successful = result.filter(r => r.status === 'fulfilled').length;
      const totalEvents = concurrentOperations * eventsPerOperation;
      const eventsPerSecond = (totalEvents / duration) * 1000;

      expect(successful).toBeGreaterThan(concurrentOperations * 0.8); // Au moins 80% de réussite
      expect(eventsPerSecond).toBeGreaterThan(20); // Performance acceptable sous charge
      
      console.log(`Concurrent processing: ${totalEvents} events across ${concurrentOperations} operations in ${duration.toFixed(2)}ms`);
      console.log(`Success rate: ${((successful / concurrentOperations) * 100).toFixed(1)}%`);
      console.log(`Throughput: ${eventsPerSecond.toFixed(0)} events/sec`);
    });

    it('should maintain performance with mixed event types', async () => {
      const eventTypes = [
        'CART_ITEM_ADDED',
        'ORDER_CREATED', 
        'USER_REGISTERED',
        'PRODUCT_STOCK_UPDATED',
        'ORDER_SHIPPED'
      ];

      const mixedEvents = eventTypes.flatMap(eventType => 
        generateTestEvents(50, eventType) // 50 événements de chaque type
      );

      // Mélanger les événements pour simuler un traffic réel
      for (let i = mixedEvents.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [mixedEvents[i], mixedEvents[j]] = [mixedEvents[j], mixedEvents[i]];
      }

      const { result, duration } = await measurePerformance(async () => {
        return await eventBus.publishBatch(mixedEvents);
      });

      expect(result.isSuccess()).toBe(true);
      
      const eventsPerSecond = (mixedEvents.length / duration) * 1000;
      console.log(`Mixed event types: ${mixedEvents.length} events in ${duration.toFixed(2)}ms (${eventsPerSecond.toFixed(0)} events/sec)`);
      
      expect(eventsPerSecond).toBeGreaterThan(25); // Performance avec types mélangés
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not leak memory with repeated operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Exécuter plusieurs cycles d'événements
      for (let cycle = 0; cycle < 10; cycle++) {
        const events = generateTestEvents(100, 'CART_ITEM_ADDED');
        const result = await eventBus.publishBatch(events);
        expect(result.isSuccess()).toBe(true);
        
        // Forcer le garbage collection si disponible
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

      console.log(`Memory usage - Initial: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Memory usage - Final: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);

      // L'augmentation de mémoire devrait être raisonnable (moins de 50MB)
      expect(memoryIncreaseMB).toBeLessThan(50);
    });

    it('should handle event bus statistics efficiently', async () => {
      // Publier plusieurs événements
      const events = generateTestEvents(200, 'ORDER_CREATED');
      await eventBus.publishBatch(events);

      const { result: stats, duration } = await measurePerformance(async () => {
        return eventBus.getStatistics();
      });

      expect(duration).toBeLessThan(10); // Les statistiques doivent être rapides
      expect(stats.subscribedHandlers).toBeGreaterThan(0);
      expect(stats.eventTypes.length).toBeGreaterThan(0);
      
      console.log(`Statistics generation time: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle errors without significant performance impact', async () => {
      // Créer un mélange d'événements valides et invalides
      const validEvents = generateTestEvents(100, 'CART_ITEM_ADDED');
      const invalidEvents = Array.from({ length: 20 }, (_, i) =>
        EventFactory.create(
          'INVALID_EVENT_TYPE',
          `invalid_${i}`,
          'invalid',
          { invalid: true }
        )
      );

      const mixedEvents = [...validEvents, ...invalidEvents];

      const { result, duration } = await measurePerformance(async () => {
        const promises = mixedEvents.map(event => eventBus.publish(event));
        return await Promise.allSettled(promises);
      });

      const successful = result.filter(r => r.status === 'fulfilled').length;
      const failed = result.filter(r => r.status === 'rejected').length;

      expect(successful).toBeGreaterThan(80); // La plupart des événements valides réussissent
      expect(duration).toBeLessThan(5000); // Performance acceptable même avec erreurs
      
      console.log(`Error handling: ${successful} successful, ${failed} failed in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Scalability Stress Tests', () => {
    it('should handle high-frequency bursts', async () => {
      const burstSize = 50;
      const burstCount = 10;
      const burstInterval = 100; // 100ms entre les bursts

      const results: any[] = [];

      for (let burst = 0; burst < burstCount; burst++) {
        const events = generateTestEvents(burstSize, 'CART_ITEM_ADDED');
        
        const { result, duration } = await measurePerformance(async () => {
          return await eventBus.publishBatch(events);
        });

        results.push({ burst, success: result.isSuccess(), duration });

        // Attendre avant le prochain burst
        await new Promise(resolve => setTimeout(resolve, burstInterval));
      }

      const successfulBursts = results.filter(r => r.success).length;
      const averageDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      const totalEvents = burstSize * burstCount;

      expect(successfulBursts).toBeGreaterThan(burstCount * 0.8); // 80% de réussite minimum
      expect(averageDuration).toBeLessThan(2000); // Moins de 2s par burst en moyenne
      
      console.log(`Burst test: ${totalEvents} events in ${burstCount} bursts`);
      console.log(`Success rate: ${((successfulBursts / burstCount) * 100).toFixed(1)}%`);
      console.log(`Average burst duration: ${averageDuration.toFixed(2)}ms`);
    });

    // Test de charge extrême (désactivé par défaut pour éviter les timeouts)
    it.skip('should survive extreme load test', async () => {
      const extremeEventCount = 2000;
      const events = generateTestEvents(extremeEventCount, 'PRODUCT_PRICE_CHANGED');

      const { result, duration } = await measurePerformance(async () => {
        // Publier par batches pour éviter la surcharge
        const batchSize = 100;
        const batches = [];
        
        for (let i = 0; i < events.length; i += batchSize) {
          const batch = events.slice(i, i + batchSize);
          batches.push(eventBus.publishBatch(batch));
        }

        return await Promise.allSettled(batches);
      });

      const successful = result.filter(r => r.status === 'fulfilled').length;
      const successRate = (successful / result.length) * 100;
      const eventsPerSecond = (extremeEventCount / duration) * 1000;

      console.log(`Extreme load test: ${extremeEventCount} events in ${duration.toFixed(2)}ms`);
      console.log(`Success rate: ${successRate.toFixed(1)}%`);
      console.log(`Throughput: ${eventsPerSecond.toFixed(0)} events/sec`);

      expect(successRate).toBeGreaterThan(70); // Au moins 70% sous charge extrême
    });
  });

  describe('Performance Regression Detection', () => {
    it('should maintain baseline performance metrics', async () => {
      // Baseline attendu pour 100 événements
      const baselineEventsPerSecond = 25;
      const baselineMaxDuration = 4000; // 4 secondes max

      const events = generateTestEvents(100, 'ORDER_CONFIRMED');

      const { result, duration } = await measurePerformance(async () => {
        return await eventBus.publishBatch(events);
      });

      const eventsPerSecond = (events.length / duration) * 1000;

      expect(result.isSuccess()).toBe(true);
      expect(duration).toBeLessThan(baselineMaxDuration);
      expect(eventsPerSecond).toBeGreaterThan(baselineEventsPerSecond);

      // Log des métriques pour surveillance continue
      console.log('=== Performance Baseline Check ===');
      console.log(`Events processed: ${events.length}`);
      console.log(`Duration: ${duration.toFixed(2)}ms`);
      console.log(`Throughput: ${eventsPerSecond.toFixed(0)} events/sec`);
      console.log(`Baseline met: ${eventsPerSecond > baselineEventsPerSecond ? '✅' : '❌'}`);
    });
  });
});

/**
 * Ces tests de performance valident que :
 * 
 * 1. ✅ Le traitement d'un événement unique est rapide (< 50ms)
 * 2. ✅ Les batches d'événements sont traités efficacement
 * 3. ✅ Le système supporte le traitement concurrent
 * 4. ✅ Les performances restent stables avec des types d'événements mélangés
 * 5. ✅ Il n'y a pas de fuites mémoire avec utilisation répétée
 * 6. ✅ La génération de statistiques est rapide
 * 7. ✅ La gestion d'erreur n'impacte pas significativement les performances
 * 8. ✅ Le système peut gérer des pics de charge (bursts)
 * 9. ✅ Les métriques de performance restent dans les limites acceptables
 * 
 * Métriques de performance cibles :
 * - Événement unique : < 50ms
 * - Batch de 100 événements : < 2s (> 50 events/sec)
 * - Batch de 500 événements : < 10s (> 30 events/sec)
 * - Traitement concurrent : > 80% de réussite
 * - Augmentation mémoire : < 50MB après 1000 événements
 */