/**
 * Event Container Integration Tests
 * 
 * Tests spécifiques pour l'intégration de l'architecture Event-Driven
 * avec le Container DI et l'initialisation du système.
 */

import { ContainerConfiguration } from '../../container/container.config';
import { SERVICE_TOKENS } from '../../container/container';
import { configureEventSystem, initializeEventSystem, checkEventSystemHealth } from '../event-container-config';
import { ContainerBuilder } from '../../container/container';
import type { EventBus, EventStore } from '@/lib/core/events';

// Mock environment variables
process.env.STRIPE_SECRET_KEY = 'sk_test_mock';

// Mock des clients Supabase
jest.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: jest.fn().mockReturnValue({
    from: jest.fn(() => ({
      select: jest.fn(),
      insert: jest.fn().mockResolvedValue({ error: null }),
      update: jest.fn(),
      delete: jest.fn(),
      eq: jest.fn(),
      order: jest.fn(),
      limit: jest.fn(),
      single: jest.fn(),
    })),
    rpc: jest.fn().mockResolvedValue({ error: null }),
    auth: {
      getUser: jest.fn(),
    },
  }),
}));

jest.mock('@/lib/supabase/server-admin', () => ({
  createSupabaseAdminClient: jest.fn().mockReturnValue({
    from: jest.fn(() => ({
      select: jest.fn(),
      insert: jest.fn().mockResolvedValue({ error: null }),
      update: jest.fn(),
      delete: jest.fn(),
      eq: jest.fn(),
      order: jest.fn(),
      limit: jest.fn(),
      single: jest.fn(),
    })),
    rpc: jest.fn().mockResolvedValue({ error: null }),
  }),
}));

describe('Event Container Integration Tests', () => {
  beforeEach(() => {
    const { resetContainers } = require('../../container/container.config');
    resetContainers();
    jest.clearAllMocks();
  });

  describe('Event System Container Configuration', () => {
    it('should configure all event system components', () => {
      const builder = new ContainerBuilder();
      
      // Ajouter les services de base nécessaires
      builder.addSingleton(
        SERVICE_TOKENS.SUPABASE_CLIENT,
        () => require('@/lib/supabase/server').createSupabaseServerClient(),
        []
      );
      
      builder.addInstance(SERVICE_TOKENS.LOGGER, console);

      // Configurer le système d'événements
      configureEventSystem(builder);

      const containerResult = builder.build();
      expect(containerResult.isSuccess()).toBe(true);

      if (containerResult.isSuccess()) {
        const container = containerResult.getValue();

        // Vérifier l'infrastructure événementielle
        expect(() => container.resolve(SERVICE_TOKENS.EVENT_BUS)).not.toThrow();
        expect(() => container.resolve(SERVICE_TOKENS.EVENT_STORE)).not.toThrow();
        expect(() => container.resolve(SERVICE_TOKENS.EVENT_PUBLISHER)).not.toThrow();

        // Vérifier les handlers
        expect(() => container.resolve(SERVICE_TOKENS.CART_EVENT_HANDLER)).not.toThrow();
        expect(() => container.resolve(SERVICE_TOKENS.ORDER_EVENT_HANDLER)).not.toThrow();
        expect(() => container.resolve(SERVICE_TOKENS.USER_EVENT_HANDLER)).not.toThrow();
        expect(() => container.resolve(SERVICE_TOKENS.INVENTORY_EVENT_HANDLER)).not.toThrow();
        expect(() => container.resolve(SERVICE_TOKENS.NOTIFICATION_EVENT_HANDLER)).not.toThrow();
        expect(() => container.resolve(SERVICE_TOKENS.AUDIT_EVENT_HANDLER)).not.toThrow();

        // Vérifier les listeners
        expect(() => container.resolve(SERVICE_TOKENS.CART_EVENT_LISTENER)).not.toThrow();
        expect(() => container.resolve(SERVICE_TOKENS.ORDER_WORKFLOW_EVENT_LISTENER)).not.toThrow();
        expect(() => container.resolve(SERVICE_TOKENS.NOTIFICATION_EVENT_LISTENER)).not.toThrow();
        expect(() => container.resolve(SERVICE_TOKENS.AUDIT_EVENT_LISTENER)).not.toThrow();

        // Vérifier l'initializer
        expect(() => container.resolve(SERVICE_TOKENS.EVENT_SYSTEM_INITIALIZER)).not.toThrow();
      }
    });

    it('should have correct dependency graph', () => {
      const builder = new ContainerBuilder();
      
      builder.addSingleton(
        SERVICE_TOKENS.SUPABASE_CLIENT,
        () => require('@/lib/supabase/server').createSupabaseServerClient(),
        []
      );
      
      builder.addInstance(SERVICE_TOKENS.LOGGER, console);

      configureEventSystem(builder);

      const containerResult = builder.build();
      expect(containerResult.isSuccess()).toBe(true);

      if (containerResult.isSuccess()) {
        const container = containerResult.getValue();

        // Vérifier que les dépendances sont correctement résolues
        const eventBus = container.resolve<EventBus>(SERVICE_TOKENS.EVENT_BUS);
        const eventStore = container.resolve<EventStore>(SERVICE_TOKENS.EVENT_STORE);
        const eventPublisher = container.resolve(SERVICE_TOKENS.EVENT_PUBLISHER);

        expect(eventBus).toBeDefined();
        expect(eventStore).toBeDefined();
        expect(eventPublisher).toBeDefined();

        // Vérifier que l'EventPublisher utilise bien l'EventBus
        expect(eventPublisher).toBe(eventBus);
      }
    });
  });

  describe('Event System Initialization', () => {
    it('should initialize event system successfully', async () => {
      const result = ContainerConfiguration.configureServer();
      expect(result.isSuccess()).toBe(true);

      if (result.isSuccess()) {
        const container = result.getValue();

        // Initialiser le système d'événements
        await expect(initializeEventSystem(container)).resolves.not.toThrow();

        // Vérifier que l'EventBus a des souscriptions
        const eventBus = container.resolve<EventBus>(SERVICE_TOKENS.EVENT_BUS);
        const stats = eventBus.getStatistics();

        expect(stats.subscribedHandlers).toBeGreaterThan(0);
        expect(stats.eventTypes.length).toBeGreaterThan(0);

        // Vérifier des souscriptions spécifiques
        expect(stats.handlersByType['CART_ITEM_ADDED']).toBeGreaterThan(0);
        expect(stats.handlersByType['ORDER_CREATED']).toBeGreaterThan(0);
        expect(stats.handlersByType['USER_REGISTERED']).toBeGreaterThan(0);
      }
    });

    it('should register all expected event subscriptions', async () => {
      const result = ContainerConfiguration.configureServer();
      expect(result.isSuccess()).toBe(true);

      if (result.isSuccess()) {
        const container = result.getValue();
        await initializeEventSystem(container);

        const eventBus = container.resolve<EventBus>(SERVICE_TOKENS.EVENT_BUS);
        const stats = eventBus.getStatistics();

        // Vérifier que tous les événements métier principaux sont souscrits
        const expectedEvents = [
          'CART_ITEM_ADDED',
          'CART_ITEM_REMOVED', 
          'CART_ITEM_QUANTITY_UPDATED',
          'CART_CLEARED',
          'ORDER_CREATED',
          'ORDER_CONFIRMED',
          'ORDER_SHIPPED',
          'ORDER_DELIVERED',
          'ORDER_CANCELLED',
          'USER_REGISTERED',
          'USER_PROFILE_UPDATED',
          'PRODUCT_STOCK_UPDATED',
          'PRODUCT_PRICE_CHANGED'
        ];

        for (const eventType of expectedEvents) {
          expect(stats.handlersByType[eventType]).toBeGreaterThan(0);
        }

        // Vérifier le nombre total d'événements
        expect(stats.eventTypes.length).toBeGreaterThanOrEqual(expectedEvents.length);
      }
    });

    it('should handle initialization errors gracefully', async () => {
      // Créer un container avec un service manquant pour provoquer une erreur
      const builder = new ContainerBuilder();
      
      // Ne pas ajouter SUPABASE_CLIENT intentionnellement
      builder.addInstance(SERVICE_TOKENS.LOGGER, console);
      
      // Essayer de configurer le système sans toutes les dépendances
      configureEventSystem(builder);
      
      const containerResult = builder.build();
      
      // Le build devrait échouer à cause des dépendances manquantes
      expect(containerResult.isError()).toBe(true);
    });
  });

  describe('Event System Health Check', () => {
    it('should provide comprehensive health check', async () => {
      const result = ContainerConfiguration.configureServer();
      expect(result.isSuccess()).toBe(true);

      if (result.isSuccess()) {
        const container = result.getValue();
        await initializeEventSystem(container);

        const health = await checkEventSystemHealth(container);

        // Vérifier la structure du health check
        expect(health).toHaveProperty('eventBus');
        expect(health).toHaveProperty('eventStore');
        expect(health).toHaveProperty('handlers');
        expect(health).toHaveProperty('listeners');
        expect(health).toHaveProperty('errors');

        // Vérifier que les composants principaux sont sains
        expect(health.eventBus).toBe(true);
        expect(health.eventStore).toBe(true);

        // Vérifier les handlers
        expect(health.handlers['CART_EVENT_HANDLER']).toBe(true);
        expect(health.handlers['ORDER_EVENT_HANDLER']).toBe(true);
        expect(health.handlers['USER_EVENT_HANDLER']).toBe(true);
        expect(health.handlers['INVENTORY_EVENT_HANDLER']).toBe(true);
        expect(health.handlers['NOTIFICATION_EVENT_HANDLER']).toBe(true);
        expect(health.handlers['AUDIT_EVENT_HANDLER']).toBe(true);

        // Vérifier les listeners
        expect(health.listeners['CART_EVENT_LISTENER']).toBe(true);
        expect(health.listeners['ORDER_WORKFLOW_EVENT_LISTENER']).toBe(true);
        expect(health.listeners['NOTIFICATION_EVENT_LISTENER']).toBe(true);
        expect(health.listeners['AUDIT_EVENT_LISTENER']).toBe(true);

        // Pas d'erreurs
        expect(health.errors).toHaveLength(0);
      }
    });

    it('should detect and report unhealthy components', async () => {
      // Créer un container avec certains services défaillants
      const builder = new ContainerBuilder();
      
      builder.addSingleton(
        SERVICE_TOKENS.SUPABASE_CLIENT,
        () => require('@/lib/supabase/server').createSupabaseServerClient(),
        []
      );
      
      builder.addInstance(SERVICE_TOKENS.LOGGER, console);

      // Ajouter un handler défaillant pour tester la détection d'erreur
      builder.addSingleton(
        SERVICE_TOKENS.CART_EVENT_HANDLER,
        () => { throw new Error('Simulated handler failure'); },
        []
      );

      const containerResult = builder.build();
      
      if (containerResult.isSuccess()) {
        const container = containerResult.getValue();
        
        // Le health check devrait détecter le problème
        const health = await checkEventSystemHealth(container);
        
        expect(health.handlers['CART_EVENT_HANDLER']).toBe(false);
        expect(health.errors.length).toBeGreaterThan(0);
        
        const cartHandlerError = health.errors.find(e => e.includes('CART_EVENT_HANDLER'));
        expect(cartHandlerError).toBeDefined();
      }
    });
  });

  describe('Container Scoped Services', () => {
    it('should support scoped event processing', async () => {
      const result = ContainerConfiguration.configureServer();
      expect(result.isSuccess()).toBe(true);

      if (result.isSuccess()) {
        const container = result.getValue();
        
        // Créer un scope pour simuler une requête
        const scope = container.createScope();
        
        // Résoudre les services dans le scope
        const eventBus = scope.resolve<EventBus>(SERVICE_TOKENS.EVENT_BUS);
        const cartListener = scope.resolve(SERVICE_TOKENS.CART_EVENT_LISTENER);
        
        expect(eventBus).toBeDefined();
        expect(cartListener).toBeDefined();
        
        // Nettoyer le scope
        scope.dispose();
      }
    });
  });

  describe('Event System Integration with Existing Services', () => {
    it('should integrate with cart domain service', async () => {
      const result = ContainerConfiguration.configureServer();
      expect(result.isSuccess()).toBe(true);

      if (result.isSuccess()) {
        const container = result.getValue();
        
        // Vérifier que le CartDomainService utilise l'EventPublisher
        const cartDomainService = container.resolve(SERVICE_TOKENS.CART_DOMAIN_SERVICE);
        const eventPublisher = container.resolve(SERVICE_TOKENS.EVENT_PUBLISHER);
        
        expect(cartDomainService).toBeDefined();
        expect(eventPublisher).toBeDefined();
        
        // Le service devrait avoir accès à l'event publisher
        // (vérification indirecte via l'absence d'erreur lors de la résolution)
      }
    });

    it('should work with repository pattern', async () => {
      const result = ContainerConfiguration.configureServer();
      expect(result.isSuccess()).toBe(true);

      if (result.isSuccess()) {
        const container = result.getValue();
        
        // Vérifier que les repositories et les event handlers coexistent
        const cartRepository = container.resolve(SERVICE_TOKENS.CART_REPOSITORY);
        const productRepository = container.resolve(SERVICE_TOKENS.PRODUCT_REPOSITORY);
        const cartEventHandler = container.resolve(SERVICE_TOKENS.CART_EVENT_HANDLER);
        const inventoryEventHandler = container.resolve(SERVICE_TOKENS.INVENTORY_EVENT_HANDLER);
        
        expect(cartRepository).toBeDefined();
        expect(productRepository).toBeDefined();
        expect(cartEventHandler).toBeDefined();
        expect(inventoryEventHandler).toBeDefined();
      }
    });
  });

  describe('Event System Statistics and Monitoring', () => {
    it('should provide detailed statistics', async () => {
      const result = ContainerConfiguration.configureServer();
      expect(result.isSuccess()).toBe(true);

      if (result.isSuccess()) {
        const container = result.getValue();
        await initializeEventSystem(container);

        const eventBus = container.resolve<EventBus>(SERVICE_TOKENS.EVENT_BUS);
        const containerStats = container.getStatistics();
        const busStats = eventBus.getStatistics();

        // Vérifier les statistiques du container
        expect(containerStats.totalServices).toBeGreaterThan(20);
        expect(containerStats.singletonServices).toBeGreaterThan(15);

        // Vérifier les statistiques de l'event bus
        expect(busStats.subscribedHandlers).toBeGreaterThan(10);
        expect(busStats.eventTypes.length).toBeGreaterThan(10);
        expect(Object.keys(busStats.handlersByType).length).toBeGreaterThan(10);

        console.log('Container Stats:', containerStats);
        console.log('Event Bus Stats:', busStats);
      }
    });
  });
});

/**
 * Ces tests valident que :
 * 
 * 1. ✅ Le système d'événements s'intègre correctement avec le Container DI
 * 2. ✅ Tous les composants événementiels sont enregistrés et résolus
 * 3. ✅ L'initialisation du système configure toutes les souscriptions
 * 4. ✅ Le health check détecte les composants défaillants
 * 5. ✅ Les services scopés fonctionnent avec les événements
 * 6. ✅ L'intégration avec les services métier existants est fonctionnelle
 * 7. ✅ Les statistiques et le monitoring sont opérationnels
 * 8. ✅ La gestion d'erreur lors de l'initialisation fonctionne
 */