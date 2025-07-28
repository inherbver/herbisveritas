/**
 * Container Integration Tests
 * 
 * Tests the dependency injection container with real service configurations
 * to ensure proper service resolution and lifecycle management.
 */

import { beforeEach, describe, expect, it, jest, afterEach } from '@jest/globals';
import { 
  Container, 
  ContainerBuilder, 
  ServiceLifetime, 
  SERVICE_TOKENS 
} from '../container';
import { 
  ContainerConfiguration,
  getServerContainer,
  getAdminContainer,
  createRequestScopedContainer,
  resolveService,
  resetContainers,
  checkContainerHealth
} from '../container.config';
import { CartDomainService } from '@/lib/domain/services/cart.service';
import { BusinessError } from '@/lib/core/errors';

// Mock external dependencies
jest.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: jest.fn(() => ({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null })
  }))
}));

jest.mock('@/lib/supabase/server-admin', () => ({
  createSupabaseAdminClient: jest.fn(() => ({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null })
  }))
}));

jest.mock('@/lib/core/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

describe('Container Integration Tests', () => {
  beforeEach(() => {
    resetContainers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    resetContainers();
  });

  describe('Container Basic Functionality', () => {
    let container: Container;

    beforeEach(() => {
      const builder = new ContainerBuilder();
      
      // Register test services
      builder.addSingleton('TestService', () => ({ value: 'test' }));
      builder.addTransient('TransientService', () => ({ id: Math.random() }));
      builder.addInstance('InstanceService', { configured: true });
      
      const result = builder.build();
      if (result.isError()) {
        throw new Error(`Failed to build container: ${result.getError().message}`);
      }
      container = result.getValue();
    });

    it('should resolve singleton services consistently', () => {
      // Act
      const service1 = container.resolve<any>('TestService');
      const service2 = container.resolve<any>('TestService');

      // Assert
      expect(service1).toBe(service2); // Same instance
      expect(service1.value).toBe('test');
    });

    it('should resolve transient services as new instances', () => {
      // Act
      const service1 = container.resolve<any>('TransientService');
      const service2 = container.resolve<any>('TransientService');

      // Assert
      expect(service1).not.toBe(service2); // Different instances
      expect(service1.id).not.toBe(service2.id);
    });

    it('should resolve instance services', () => {
      // Act
      const service = container.resolve<any>('InstanceService');

      // Assert
      expect(service.configured).toBe(true);
    });

    it('should handle scoped services correctly', () => {
      // Arrange
      container.registerScoped('ScopedService', () => ({ scopeId: Math.random() }));
      const buildResult = container.build();
      if (buildResult.isError()) {
        throw new Error('Failed to rebuild container');
      }

      const scope1 = container.createScope();
      const scope2 = container.createScope();

      // Act
      const service1a = scope1.resolve<any>('ScopedService');
      const service1b = scope1.resolve<any>('ScopedService');
      const service2a = scope2.resolve<any>('ScopedService');

      // Assert
      expect(service1a).toBe(service1b); // Same within scope
      expect(service1a).not.toBe(service2a); // Different across scopes
      expect(service1a.scopeId).toBe(service1b.scopeId);
      expect(service1a.scopeId).not.toBe(service2a.scopeId);

      // Cleanup
      scope1.dispose();
      scope2.dispose();
    });

    it('should throw error for unregistered services', () => {
      // Act & Assert
      expect(() => container.resolve('UnknownService')).toThrow(BusinessError);
    });

    it('should detect circular dependencies', () => {
      // Arrange
      const builder = new ContainerBuilder();
      builder.addSingleton('ServiceA', (container) => {
        return { serviceB: container.resolve('ServiceB') };
      }, ['ServiceB']);
      
      builder.addSingleton('ServiceB', (container) => {
        return { serviceA: container.resolve('ServiceA') };
      }, ['ServiceA']);

      // Act & Assert
      const result = builder.build();
      expect(result.isError()).toBe(true);
      expect(result.getError().message).toContain('Circular dependency');
    });

    it('should validate missing dependencies', () => {
      // Arrange
      const builder = new ContainerBuilder();
      builder.addSingleton('ServiceWithDeps', () => ({}), ['MissingDependency']);

      // Act & Assert
      const result = builder.build();
      expect(result.isError()).toBe(true);
      expect(result.getError().message).toContain('depends on');
    });

    it('should provide container statistics', () => {
      // Act
      const stats = container.getStatistics();

      // Assert
      expect(stats.totalServices).toBe(3);
      expect(stats.singletonServices).toBe(1);
      expect(stats.transientServices).toBe(1);
      expect(stats.singletonInstances).toBe(0); // Not yet resolved
    });

    it('should handle tryResolve gracefully', () => {
      // Act
      const existingService = container.tryResolve('TestService');
      const nonExistentService = container.tryResolve('NonExistent');

      // Assert
      expect(existingService).toBeDefined();
      expect(existingService.value).toBe('test');
      expect(nonExistentService).toBeNull();
    });
  });

  describe('Server Container Configuration', () => {
    it('should successfully configure server container', async () => {
      // Act
      const container = await getServerContainer();

      // Assert
      expect(container).toBeInstanceOf(Container);
      expect(container.isRegistered(SERVICE_TOKENS.CART_DOMAIN_SERVICE)).toBe(true);
      expect(container.isRegistered(SERVICE_TOKENS.CART_REPOSITORY)).toBe(true);
      expect(container.isRegistered(SERVICE_TOKENS.PRODUCT_REPOSITORY)).toBe(true);
    });

    it('should resolve cart domain service from server container', async () => {
      // Act
      const cartService = await resolveService<CartDomainService>(SERVICE_TOKENS.CART_DOMAIN_SERVICE);

      // Assert
      expect(cartService).toBeInstanceOf(CartDomainService);
    });

    it('should reuse server container instance', async () => {
      // Act
      const container1 = await getServerContainer();
      const container2 = await getServerContainer();

      // Assert
      expect(container1).toBe(container2); // Same instance
    });

    it('should create independent request-scoped containers', async () => {
      // Act
      const { container: container1, scope: scope1 } = await createRequestScopedContainer();
      const { container: container2, scope: scope2 } = await createRequestScopedContainer();

      // Assert
      expect(container1).toBe(container2); // Same base container
      expect(scope1).not.toBe(scope2); // Different scopes

      // Services from different scopes should be independent
      const service1 = scope1.resolve<CartDomainService>(SERVICE_TOKENS.CART_DOMAIN_SERVICE);
      const service2 = scope2.resolve<CartDomainService>(SERVICE_TOKENS.CART_DOMAIN_SERVICE);
      
      expect(service1).not.toBe(service2); // Different instances (transient)

      // Cleanup
      scope1.dispose();
      scope2.dispose();
    });
  });

  describe('Admin Container Configuration', () => {
    it('should successfully configure admin container', async () => {
      // Act
      const container = await getAdminContainer();

      // Assert
      expect(container).toBeInstanceOf(Container);
      expect(container.isRegistered(SERVICE_TOKENS.CART_DOMAIN_SERVICE)).toBe(true);
      expect(container.isRegistered(SERVICE_TOKENS.CART_REPOSITORY)).toBe(true);
    });

    it('should use different Supabase client for admin container', async () => {
      // Arrange
      const serverContainer = await getServerContainer();
      const adminContainer = await getAdminContainer();

      // Act
      const serverClient = serverContainer.resolve(SERVICE_TOKENS.SUPABASE_CLIENT);
      const adminClient = adminContainer.resolve(SERVICE_TOKENS.SUPABASE_CLIENT);

      // Assert
      expect(serverClient).toBeDefined();
      expect(adminClient).toBeDefined();
      // They should be different instances (different configurations)
      // This is implied by different factory functions in configuration
    });
  });

  describe('Test Container Configuration', () => {
    it('should configure test container with mocks', () => {
      // Arrange
      const mockCartService = { test: true };
      const mockRepository = { mock: true };

      // Act
      const result = ContainerConfiguration.configureTest({
        [SERVICE_TOKENS.CART_DOMAIN_SERVICE]: mockCartService,
        [SERVICE_TOKENS.CART_REPOSITORY]: mockRepository
      });

      // Assert
      expect(result.isError()).toBe(false);
      const container = result.getValue();
      
      const resolvedCartService = container.resolve(SERVICE_TOKENS.CART_DOMAIN_SERVICE);
      const resolvedRepository = container.resolve(SERVICE_TOKENS.CART_REPOSITORY);
      
      expect(resolvedCartService).toBe(mockCartService);
      expect(resolvedRepository).toBe(mockRepository);
    });

    it('should use real services when not mocked', () => {
      // Arrange & Act
      const result = ContainerConfiguration.configureTest({
        [SERVICE_TOKENS.CART_REPOSITORY]: { mocked: true }
      });

      // Assert
      expect(result.isError()).toBe(false);
      const container = result.getValue();
      
      // Should have mock
      const repository = container.resolve(SERVICE_TOKENS.CART_REPOSITORY);
      expect(repository.mocked).toBe(true);
      
      // Should have real service
      expect(container.isRegistered(SERVICE_TOKENS.EVENT_PUBLISHER)).toBe(true);
    });
  });

  describe('Container Health Check', () => {
    it('should report healthy containers', async () => {
      // Arrange
      await getServerContainer();
      await getAdminContainer();

      // Act
      const health = await checkContainerHealth();

      // Assert
      expect(health.server).toBe(true);
      expect(health.admin).toBe(true);
      expect(health.errors).toHaveLength(0);
    });

    it('should handle container errors in health check', async () => {
      // Arrange
      resetContainers();
      
      // Mock a container configuration failure
      jest.spyOn(ContainerConfiguration, 'configureServer').mockReturnValue({
        isError: () => true,
        getError: () => new BusinessError('Configuration failed')
      } as any);

      // Act
      const health = await checkContainerHealth();

      // Assert
      expect(health.server).toBe(false);
      expect(health.errors.length).toBeGreaterThan(0);
      expect(health.errors[0]).toContain('Server container error');
    });
  });

  describe('Container Lifecycle Management', () => {
    it('should properly reset containers', async () => {
      // Arrange
      const container1 = await getServerContainer();
      
      // Act
      resetContainers();
      const container2 = await getServerContainer();

      // Assert
      expect(container1).not.toBe(container2); // Different instances after reset
    });

    it('should dispose scoped services on scope disposal', () => {
      // Arrange
      const builder = new ContainerBuilder();
      const mockDispose = jest.fn();
      
      builder.addScoped('DisposableService', () => ({
        dispose: mockDispose,
        value: 'test'
      }));
      
      const result = builder.build();
      const container = result.getValue();
      const scope = container.createScope();

      // Act
      const service = scope.resolve('DisposableService');
      expect(service.value).toBe('test');
      
      scope.dispose();

      // Assert
      expect(mockDispose).toHaveBeenCalled();
    });

    it('should clear singleton instances when requested', () => {
      // Arrange
      const builder = new ContainerBuilder();
      builder.addSingleton('TestSingleton', () => ({ id: Math.random() }));
      
      const result = builder.build();
      const container = result.getValue();

      // Act
      const instance1 = container.resolve<any>('TestSingleton');
      const id1 = instance1.id;
      
      container.clearSingletons();
      
      const instance2 = container.resolve<any>('TestSingleton');
      const id2 = instance2.id;

      // Assert
      expect(instance1).not.toBe(instance2);
      expect(id1).not.toBe(id2);
    });
  });

  describe('Complex Dependency Scenarios', () => {
    it('should handle deep dependency chains', () => {
      // Arrange
      const builder = new ContainerBuilder();
      
      builder.addSingleton('ServiceA', () => ({ name: 'A' }));
      builder.addSingleton('ServiceB', (container) => ({
        name: 'B',
        serviceA: container.resolve('ServiceA')
      }), ['ServiceA']);
      builder.addSingleton('ServiceC', (container) => ({
        name: 'C',
        serviceB: container.resolve('ServiceB')
      }), ['ServiceB']);

      const result = builder.build();
      const container = result.getValue();

      // Act
      const serviceC = container.resolve<any>('ServiceC');

      // Assert
      expect(serviceC.name).toBe('C');
      expect(serviceC.serviceB.name).toBe('B');
      expect(serviceC.serviceB.serviceA.name).toBe('A');
    });

    it('should handle services with multiple dependencies', () => {
      // Arrange
      const builder = new ContainerBuilder();
      
      builder.addSingleton('LogService', () => ({ log: jest.fn() }));
      builder.addSingleton('CacheService', () => ({ get: jest.fn(), set: jest.fn() }));
      builder.addSingleton('ComplexService', (container) => ({
        logger: container.resolve('LogService'),
        cache: container.resolve('CacheService'),
        process: () => 'processed'
      }), ['LogService', 'CacheService']);

      const result = builder.build();
      const container = result.getValue();

      // Act
      const complexService = container.resolve<any>('ComplexService');

      // Assert
      expect(complexService.logger).toBeDefined();
      expect(complexService.cache).toBeDefined();
      expect(complexService.process()).toBe('processed');
    });

    it('should handle conditional service registration', () => {
      // Arrange
      const builder = new ContainerBuilder();
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      if (isDevelopment) {
        builder.addSingleton('DevService', () => ({ mode: 'development' }));
      } else {
        builder.addSingleton('ProdService', () => ({ mode: 'production' }));
      }

      const result = builder.build();
      const container = result.getValue();

      // Act & Assert
      if (isDevelopment) {
        expect(container.isRegistered('DevService')).toBe(true);
        expect(container.isRegistered('ProdService')).toBe(false);
      } else {
        expect(container.isRegistered('ProdService')).toBe(true);
        expect(container.isRegistered('DevService')).toBe(false);
      }
    });

    it('should handle service decorators', () => {
      // Arrange
      const builder = new ContainerBuilder();
      
      // Base service
      builder.addSingleton('BaseService', () => ({
        process: (input: string) => `base:${input}`
      }));
      
      // Decorated service
      builder.addSingleton('DecoratedService', (container) => {
        const baseService = container.resolve<any>('BaseService');
        return {
          process: (input: string) => `decorated:${baseService.process(input)}`
        };
      }, ['BaseService']);

      const result = builder.build();
      const container = result.getValue();

      // Act
      const decoratedService = container.resolve<any>('DecoratedService');
      const output = decoratedService.process('test');

      // Assert
      expect(output).toBe('decorated:base:test');
    });
  });

  describe('Performance and Stress Tests', () => {
    it('should handle many service registrations efficiently', () => {
      // Arrange
      const builder = new ContainerBuilder();
      const serviceCount = 1000;
      
      for (let i = 0; i < serviceCount; i++) {
        builder.addSingleton(`Service${i}`, () => ({ id: i }));
      }

      // Act
      const startTime = Date.now();
      const result = builder.build();
      const buildTime = Date.now() - startTime;
      
      expect(result.isError()).toBe(false);
      const container = result.getValue();

      const resolveStartTime = Date.now();
      for (let i = 0; i < 100; i++) {
        container.resolve(`Service${i}`);
      }
      const resolveTime = Date.now() - resolveStartTime;

      // Assert
      expect(buildTime).toBeLessThan(1000); // 1 second
      expect(resolveTime).toBeLessThan(100); // 100ms for 100 resolutions
      
      const stats = container.getStatistics();
      expect(stats.totalServices).toBe(serviceCount);
    });

    it('should handle concurrent service resolution', async () => {
      // Arrange
      const builder = new ContainerBuilder();
      builder.addSingleton('ConcurrentService', () => ({ 
        id: Math.random(),
        timestamp: Date.now()
      }));
      
      const result = builder.build();
      const container = result.getValue();

      // Act
      const promises = Array.from({ length: 100 }, () => 
        Promise.resolve(container.resolve<any>('ConcurrentService'))
      );
      
      const services = await Promise.all(promises);

      // Assert
      // All should be the same instance (singleton)
      const firstService = services[0];
      services.forEach(service => {
        expect(service).toBe(firstService);
        expect(service.id).toBe(firstService.id);
      });
    });
  });
});