/**
 * Service Registry Tests
 * 
 * Tests for service registration, discovery, health checking,
 * and load balancing functionality.
 */

import { ServiceRegistry, ServiceRegistration } from '../registry';
import { getRegistryConfig } from '../config';

// Mock logger
jest.mock('@/lib/core/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('ServiceRegistry', () => {
  let registry: ServiceRegistry;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  const testRegistration: ServiceRegistration = {
    name: 'test-service',
    version: '1.0.0',
    host: 'localhost',
    port: 3001,
    protocol: 'http',
    healthCheckPath: '/health',
    metadata: { environment: 'test' },
    weight: 100,
  };

  beforeEach(() => {
    const config = getRegistryConfig('test');
    registry = new ServiceRegistry(config);
    mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();
  });

  afterEach(async () => {
    await registry.shutdown();
  });

  describe('Service Registration', () => {
    it('should register a new service instance', async () => {
      const result = await registry.register(testRegistration);

      expect(result.isSuccess()).toBe(true);
      const instance = result.getValue();
      
      expect(instance.name).toBe(testRegistration.name);
      expect(instance.host).toBe(testRegistration.host);
      expect(instance.port).toBe(testRegistration.port);
      expect(instance.version).toBe(testRegistration.version);
      expect(instance.id).toBeDefined();
    });

    it('should generate unique instance IDs', async () => {
      const result1 = await registry.register(testRegistration);
      const result2 = await registry.register({
        ...testRegistration,
        port: 3002,
      });

      expect(result1.isSuccess()).toBe(true);
      expect(result2.isSuccess()).toBe(true);
      
      const instance1 = result1.getValue();
      const instance2 = result2.getValue();
      
      expect(instance1.id).not.toBe(instance2.id);
    });

    it('should set default values for optional fields', async () => {
      const minimalRegistration: ServiceRegistration = {
        name: 'minimal-service',
        version: '1.0.0',
        host: 'localhost',
        port: 3003,
      };

      const result = await registry.register(minimalRegistration);
      expect(result.isSuccess()).toBe(true);

      const instance = result.getValue();
      expect(instance.protocol).toBe('http');
      expect(instance.healthCheckPath).toBe('/health');
      expect(instance.metadata).toEqual({});
      expect(instance.weight).toBe(100);
    });
  });

  describe('Service Deregistration', () => {
    it('should deregister an existing service instance', async () => {
      const registerResult = await registry.register(testRegistration);
      expect(registerResult.isSuccess()).toBe(true);

      const instance = registerResult.getValue();
      const deregisterResult = await registry.deregister(instance.name, instance.id);
      
      expect(deregisterResult.isSuccess()).toBe(true);
      
      // Verify instance is no longer discoverable
      const instances = registry.getServiceInstances(instance.name);
      expect(instances).toHaveLength(0);
    });

    it('should return error when deregistering non-existent service', async () => {
      const result = await registry.deregister('non-existent', 'fake-id');
      
      expect(result.isError()).toBe(true);
      expect(result.getError().message).toContain('not found');
    });

    it('should return error when deregistering non-existent instance', async () => {
      await registry.register(testRegistration);
      
      const result = await registry.deregister(testRegistration.name, 'fake-id');
      expect(result.isError()).toBe(true);
      expect(result.getError().message).toContain('not found');
    });
  });

  describe('Service Discovery', () => {
    beforeEach(async () => {
      // Mock successful health checks
      mockFetch.mockResolvedValue(
        new Response('OK', { status: 200 })
      );

      // Register multiple instances
      await registry.register(testRegistration);
      await registry.register({
        ...testRegistration,
        port: 3002,
      });
      await registry.register({
        ...testRegistration,
        port: 3003,
      });

      // Wait for initial health checks
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should discover healthy service instances', async () => {
      const result = await registry.discover('test-service');
      
      expect(result.isSuccess()).toBe(true);
      const instance = result.getValue();
      expect(instance.name).toBe('test-service');
      expect(instance.status).toBe('healthy');
    });

    it('should return error when no instances found', async () => {
      const result = await registry.discover('non-existent-service');
      
      expect(result.isError()).toBe(true);
      expect(result.getError().message).toContain('No instances found');
    });

    it('should use round-robin load balancing by default', async () => {
      const instances = new Set();
      
      // Discover multiple times to test round-robin
      for (let i = 0; i < 6; i++) {
        const result = await registry.discover('test-service');
        expect(result.isSuccess()).toBe(true);
        instances.add(result.getValue().port);
      }
      
      // Should have rotated through all instances
      expect(instances.size).toBe(3);
    });

    it('should support weighted load balancing', async () => {
      // Register instances with different weights
      await registry.register({
        ...testRegistration,
        name: 'weighted-service',
        port: 4001,
        weight: 100,
      });
      await registry.register({
        ...testRegistration,
        name: 'weighted-service',
        port: 4002,
        weight: 200, // Double weight
      });

      // Wait for health checks
      await new Promise(resolve => setTimeout(resolve, 100));

      const selections = new Map<number, number>();
      
      // Discover many times to test distribution
      for (let i = 0; i < 100; i++) {
        const result = await registry.discover('weighted-service', 'weighted');
        expect(result.isSuccess()).toBe(true);
        
        const port = result.getValue().port;
        selections.set(port, (selections.get(port) || 0) + 1);
      }
      
      // Port 4002 should be selected approximately twice as often
      const port4001Count = selections.get(4001) || 0;
      const port4002Count = selections.get(4002) || 0;
      
      expect(port4002Count).toBeGreaterThan(port4001Count);
    });
  });

  describe('Health Checking', () => {
    it('should mark instances as healthy when health check passes', async () => {
      mockFetch.mockResolvedValue(
        new Response('OK', { status: 200 })
      );

      const result = await registry.register(testRegistration);
      expect(result.isSuccess()).toBe(true);

      // Wait for health check
      await new Promise(resolve => setTimeout(resolve, 1500));

      const instances = registry.getServiceInstances('test-service');
      expect(instances[0].status).toBe('healthy');
    });

    it('should mark instances as unhealthy when health check fails', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      const result = await registry.register(testRegistration);
      expect(result.isSuccess()).toBe(true);

      // Wait for health check
      await new Promise(resolve => setTimeout(resolve, 1500));

      const instances = registry.getServiceInstances('test-service');
      expect(instances[0].status).toBe('unhealthy');
    });

    it('should not discover unhealthy instances', async () => {
      mockFetch.mockRejectedValue(new Error('Service down'));

      await registry.register(testRegistration);
      
      // Wait for health check to fail
      await new Promise(resolve => setTimeout(resolve, 1500));

      const result = await registry.discover('test-service');
      expect(result.isError()).toBe(true);
      expect(result.getError().message).toContain('No healthy instances');
    });
  });

  describe('Connection Tracking', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue(
        new Response('OK', { status: 200 })
      );

      await registry.register(testRegistration);
      await registry.register({
        ...testRegistration,
        port: 3002,
      });

      // Wait for health checks
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should track connection counts for load balancing', async () => {
      const result1 = await registry.discover('test-service');
      const result2 = await registry.discover('test-service');
      
      expect(result1.isSuccess()).toBe(true);
      expect(result2.isSuccess()).toBe(true);
      
      const instance1 = result1.getValue();
      const instance2 = result2.getValue();

      // Increment connections
      registry.incrementConnections(instance1.id);
      registry.incrementConnections(instance1.id);
      registry.incrementConnections(instance2.id);

      // Least connections should now prefer instance2
      const result3 = await registry.discover('test-service', 'least-connections');
      expect(result3.isSuccess()).toBe(true);
      expect(result3.getValue().id).toBe(instance2.id);
    });

    it('should handle connection decrement correctly', async () => {
      const result = await registry.discover('test-service');
      expect(result.isSuccess()).toBe(true);
      
      const instance = result.getValue();
      
      registry.incrementConnections(instance.id);
      registry.incrementConnections(instance.id);
      registry.decrementConnections(instance.id);
      
      // Connection count should be 1, not negative
      registry.decrementConnections(instance.id);
      registry.decrementConnections(instance.id); // Should not go below 0
    });
  });

  describe('Statistics', () => {
    it('should provide accurate registry statistics', async () => {
      mockFetch.mockResolvedValue(
        new Response('OK', { status: 200 })
      );

      await registry.register(testRegistration);
      await registry.register({
        ...testRegistration,
        name: 'another-service',
        port: 3002,
      });

      // Wait for health checks
      await new Promise(resolve => setTimeout(resolve, 100));

      const stats = registry.getStatistics();
      
      expect(stats.totalServices).toBe(2);
      expect(stats.totalInstances).toBe(2);
      expect(stats.healthyInstances).toBe(2);
      expect(stats.unhealthyInstances).toBe(0);
      expect(stats.instancesByService['test-service']).toBe(1);
      expect(stats.instancesByService['another-service']).toBe(1);
    });

    it('should track health check statistics', async () => {
      await registry.register(testRegistration);
      
      const stats = registry.getStatistics();
      
      expect(stats.healthCheckStats.totalChecks).toBe(1);
      expect(stats.healthCheckStats.activeChecks).toBe(1);
    });
  });

  describe('Cleanup', () => {
    it('should clean up stale instances', async () => {
      // Use a registry with very short TTL for testing
      const shortTtlRegistry = new ServiceRegistry({
        ...getRegistryConfig('test'),
        instanceTtl: 50, // 50ms
        cleanupInterval: 25, // 25ms
        enableAutoCleanup: true,
      });

      try {
        await shortTtlRegistry.register(testRegistration);
        
        // Wait for cleanup to trigger
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const instances = shortTtlRegistry.getServiceInstances('test-service');
        expect(instances).toHaveLength(0);
        
      } finally {
        await shortTtlRegistry.shutdown();
      }
    });
  });

  describe('Shutdown', () => {
    it('should clean up resources on shutdown', async () => {
      await registry.register(testRegistration);
      
      const statsBefore = registry.getStatistics();
      expect(statsBefore.totalInstances).toBe(1);
      
      await registry.shutdown();
      
      const statsAfter = registry.getStatistics();
      expect(statsAfter.totalInstances).toBe(0);
      expect(statsAfter.healthCheckStats.activeChecks).toBe(0);
    });
  });
});