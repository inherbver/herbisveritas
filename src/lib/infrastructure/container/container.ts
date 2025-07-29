/**
 * Simple Dependency Injection Container
 * 
 * Provides a lightweight IoC container for managing dependencies
 * without the complexity of full DI frameworks.
 */

import { Result } from "@/lib/core/result";
import { BusinessError } from "@/lib/core/errors";
import { logger } from "@/lib/core/logger";

/**
 * Service lifetime types
 */
export enum ServiceLifetime {
  SINGLETON = 'singleton',
  TRANSIENT = 'transient',
  SCOPED = 'scoped',
}

/**
 * Service factory function
 */
export type ServiceFactory<T = any> = (container: Container) => T;

/**
 * Service registration
 */
interface ServiceRegistration<T = any> {
  factory: ServiceFactory<T>;
  lifetime: ServiceLifetime;
  instance?: T;
  dependencies?: string[];
  tags?: string[];
}

/**
 * Container scope for scoped services
 */
export class ContainerScope {
  private scopedInstances = new Map<string, any>();

  constructor(private readonly container: Container) {}

  resolve<T>(token: string): T {
    return this.container.resolveInScope<T>(token, this.scopedInstances);
  }

  dispose(): void {
    // Dispose all scoped instances that have a dispose method
    for (const [token, instance] of this.scopedInstances) {
      if (instance && typeof instance.dispose === 'function') {
        try {
          instance.dispose();
        } catch (error) {
          logger.warn(`Failed to dispose scoped service ${token}`, error);
        }
      }
    }
    this.scopedInstances.clear();
  }
}

/**
 * Dependency injection container
 */
export class Container {
  private services = new Map<string, ServiceRegistration>();
  private singletonInstances = new Map<string, any>();
  private isBuilt = false;

  /**
   * Register a service with singleton lifetime
   */
  registerSingleton<T>(
    token: string,
    factory: ServiceFactory<T>,
    dependencies: string[] = [],
    tags: string[] = []
  ): Container {
    this.ensureNotBuilt();
    
    this.services.set(token, {
      factory,
      lifetime: ServiceLifetime.SINGLETON,
      dependencies,
      tags,
    });

    return this;
  }

  /**
   * Register a service with transient lifetime
   */
  registerTransient<T>(
    token: string,
    factory: ServiceFactory<T>,
    dependencies: string[] = [],
    tags: string[] = []
  ): Container {
    this.ensureNotBuilt();
    
    this.services.set(token, {
      factory,
      lifetime: ServiceLifetime.TRANSIENT,
      dependencies,
      tags,
    });

    return this;
  }

  /**
   * Register a service with scoped lifetime
   */
  registerScoped<T>(
    token: string,
    factory: ServiceFactory<T>,
    dependencies: string[] = [],
    tags: string[] = []
  ): Container {
    this.ensureNotBuilt();
    
    this.services.set(token, {
      factory,
      lifetime: ServiceLifetime.SCOPED,
      dependencies,
      tags,
    });

    return this;
  }

  /**
   * Register a concrete instance
   */
  registerInstance<T>(token: string, instance: T, tags: string[] = []): Container {
    this.ensureNotBuilt();
    
    this.services.set(token, {
      factory: () => instance,
      lifetime: ServiceLifetime.SINGLETON,
      instance,
      dependencies: [],
      tags,
    });

    return this;
  }

  /**
   * Register a service using a class constructor
   */
  registerClass<T>(
    token: string,
    constructor: new (...args: any[]) => T,
    lifetime: ServiceLifetime = ServiceLifetime.TRANSIENT,
    dependencies: string[] = [],
    tags: string[] = []
  ): Container {
    this.ensureNotBuilt();
    
    const factory: ServiceFactory<T> = (container) => {
      const deps = dependencies.map(dep => container.resolve(dep));
      return new constructor(...deps);
    };

    this.services.set(token, {
      factory,
      lifetime,
      dependencies,
      tags,
    });

    return this;
  }

  /**
   * Build the container (validates dependencies and prepares for resolution)
   */
  build(): Result<Container, BusinessError> {
    try {
      // Validate all dependencies
      const validationResult = this.validateDependencies();
      if (validationResult.isError()) {
        return Result.error(validationResult.getError());
      }

      this.isBuilt = true;
      logger.info('Container built successfully', { serviceCount: this.services.size });
      
      return Result.ok(this);
    } catch (error) {
      return Result.error(new BusinessError('Failed to build container', { error }));
    }
  }

  /**
   * Resolve a service by token
   */
  resolve<T>(token: string): T {
    this.ensureBuilt();
    return this.resolveInternal<T>(token, new Set());
  }

  /**
   * Resolve a service within a scope
   */
  resolveInScope<T>(token: string, scopedInstances: Map<string, any>): T {
    this.ensureBuilt();
    return this.resolveInternal<T>(token, new Set(), scopedInstances);
  }

  /**
   * Try to resolve a service (returns null if not found)
   */
  tryResolve<T>(token: string): T | null {
    this.ensureBuilt();
    
    try {
      return this.resolveInternal<T>(token, new Set());
    } catch {
      return null;
    }
  }

  /**
   * Check if a service is registered
   */
  isRegistered(token: string): boolean {
    return this.services.has(token);
  }

  /**
   * Get all services with a specific tag
   */
  getServicesByTag<T>(tag: string): T[] {
    this.ensureBuilt();
    
    const services: T[] = [];
    
    for (const [token, registration] of this.services) {
      if (registration.tags?.includes(tag)) {
        services.push(this.resolve<T>(token));
      }
    }

    return services;
  }

  /**
   * Create a new scope
   */
  createScope(): ContainerScope {
    this.ensureBuilt();
    return new ContainerScope(this);
  }

  /**
   * Get container statistics
   */
  getStatistics(): {
    totalServices: number;
    singletonServices: number;
    transientServices: number;
    scopedServices: number;
    singletonInstances: number;
  } {
    const stats = {
      totalServices: this.services.size,
      singletonServices: 0,
      transientServices: 0,
      scopedServices: 0,
      singletonInstances: this.singletonInstances.size,
    };

    for (const registration of this.services.values()) {
      switch (registration.lifetime) {
        case ServiceLifetime.SINGLETON:
          stats.singletonServices++;
          break;
        case ServiceLifetime.TRANSIENT:
          stats.transientServices++;
          break;
        case ServiceLifetime.SCOPED:
          stats.scopedServices++;
          break;
      }
    }

    return stats;
  }

  /**
   * Clear all singleton instances (for testing)
   */
  clearSingletons(): void {
    this.singletonInstances.clear();
  }

  /**
   * Internal resolution method
   */
  private resolveInternal<T>(
    token: string,
    resolutionStack: Set<string>,
    scopedInstances?: Map<string, any>
  ): T {
    // Check for circular dependencies
    if (resolutionStack.has(token)) {
      const cycle = Array.from(resolutionStack).join(' -> ') + ' -> ' + token;
      throw new BusinessError(`Circular dependency detected: ${cycle}`);
    }

    const registration = this.services.get(token);
    if (!registration) {
      throw new BusinessError(`Service '${token}' is not registered`);
    }

    resolutionStack.add(token);

    try {
      switch (registration.lifetime) {
        case ServiceLifetime.SINGLETON:
          return this.resolveSingleton<T>(token, registration, resolutionStack);
          
        case ServiceLifetime.SCOPED:
          if (!scopedInstances) {
            throw new BusinessError(`Scoped service '${token}' requested outside of scope`);
          }
          return this.resolveScoped<T>(token, registration, resolutionStack, scopedInstances);
          
        case ServiceLifetime.TRANSIENT:
          return this.resolveTransient<T>(token, registration, resolutionStack, scopedInstances);
          
        default:
          throw new BusinessError(`Unknown service lifetime: ${registration.lifetime}`);
      }
    } finally {
      resolutionStack.delete(token);
    }
  }

  /**
   * Resolve singleton service
   */
  private resolveSingleton<T>(
    token: string,
    registration: ServiceRegistration<T>,
    resolutionStack: Set<string>
  ): T {
    if (registration.instance) {
      return registration.instance;
    }

    if (this.singletonInstances.has(token)) {
      return this.singletonInstances.get(token);
    }

    const instance = registration.factory(this);
    this.singletonInstances.set(token, instance);
    registration.instance = instance;

    return instance;
  }

  /**
   * Resolve scoped service
   */
  private resolveScoped<T>(
    token: string,
    registration: ServiceRegistration<T>,
    resolutionStack: Set<string>,
    scopedInstances: Map<string, any>
  ): T {
    if (scopedInstances.has(token)) {
      return scopedInstances.get(token);
    }

    const instance = registration.factory(this);
    scopedInstances.set(token, instance);

    return instance;
  }

  /**
   * Resolve transient service
   */
  private resolveTransient<T>(
    token: string,
    registration: ServiceRegistration<T>,
    resolutionStack: Set<string>,
    scopedInstances?: Map<string, any>
  ): T {
    return registration.factory(this);
  }

  /**
   * Validate all dependencies
   */
  private validateDependencies(): Result<void, BusinessError> {
    for (const [token, registration] of this.services) {
      if (registration.dependencies) {
        for (const dependency of registration.dependencies) {
          if (!this.services.has(dependency)) {
            return Result.error(new BusinessError(
              `Service '${token}' depends on '${dependency}' which is not registered`
            ));
          }
        }
      }

      // Check for circular dependencies
      const visited = new Set<string>();
      const recursionStack = new Set<string>();
      
      if (this.hasCircularDependency(token, visited, recursionStack)) {
        return Result.error(new BusinessError(
          `Circular dependency detected for service '${token}'`
        ));
      }
    }

    return Result.ok(undefined);
  }

  /**
   * Check for circular dependencies using DFS
   */
  private hasCircularDependency(
    token: string,
    visited: Set<string>,
    recursionStack: Set<string>
  ): boolean {
    if (recursionStack.has(token)) {
      return true;
    }

    if (visited.has(token)) {
      return false;
    }

    visited.add(token);
    recursionStack.add(token);

    const registration = this.services.get(token);
    if (registration?.dependencies) {
      for (const dependency of registration.dependencies) {
        if (this.hasCircularDependency(dependency, visited, recursionStack)) {
          return true;
        }
      }
    }

    recursionStack.delete(token);
    return false;
  }

  /**
   * Ensure container is not built (for registration methods)
   */
  private ensureNotBuilt(): void {
    if (this.isBuilt) {
      throw new BusinessError('Cannot register services after container is built');
    }
  }

  /**
   * Ensure container is built (for resolution methods)
   */
  private ensureBuilt(): void {
    if (!this.isBuilt) {
      throw new BusinessError('Container must be built before resolving services');
    }
  }
}

/**
 * Service tokens (string constants for type safety)
 */
export const SERVICE_TOKENS = {
  // Infrastructure
  SUPABASE_CLIENT: 'SupabaseClient',
  
  // Repositories
  CART_REPOSITORY: 'CartRepository',
  PRODUCT_REPOSITORY: 'ProductRepository',
  USER_REPOSITORY: 'UserRepository',
  ADDRESS_REPOSITORY: 'AddressRepository',
  ORDER_REPOSITORY: 'OrderRepository',
  ARTICLE_REPOSITORY: 'ArticleRepository',
  
  // Domain Services
  CART_DOMAIN_SERVICE: 'CartDomainService',
  
  // Event System
  EVENT_PUBLISHER: 'EventPublisher',
  EVENT_BUS: 'EventBus',
  EVENT_STORE: 'EventStore',
  EVENT_PROCESSOR: 'EventProcessor',
  
  // Event Handlers
  CART_EVENT_HANDLER: 'CartEventHandler',
  ORDER_EVENT_HANDLER: 'OrderEventHandler',
  USER_EVENT_HANDLER: 'UserEventHandler',
  INVENTORY_EVENT_HANDLER: 'InventoryEventHandler',
  NOTIFICATION_EVENT_HANDLER: 'NotificationEventHandler',
  AUDIT_EVENT_HANDLER: 'AuditEventHandler',
  
  // Event Listeners (Aggregate Handlers)
  CART_EVENT_LISTENER: 'CartEventListener',
  ORDER_WORKFLOW_EVENT_LISTENER: 'OrderWorkflowEventListener',
  NOTIFICATION_EVENT_LISTENER: 'NotificationEventListener',
  AUDIT_EVENT_LISTENER: 'AuditEventListener',
  
  // Event System
  EVENT_SYSTEM_INITIALIZER: 'EventSystemInitializer',
  
  // Infrastructure Services
  LOGGER: 'Logger',
  
  // External Services
  EMAIL_SERVICE: 'EmailService',
  PAYMENT_SERVICE: 'PaymentService',
} as const;

/**
 * Container builder for easier configuration
 */
export class ContainerBuilder {
  private container = new Container();

  /**
   * Add singleton service
   */
  addSingleton<T>(
    token: string,
    factory: ServiceFactory<T>,
    dependencies: string[] = []
  ): ContainerBuilder {
    this.container.registerSingleton(token, factory, dependencies);
    return this;
  }

  /**
   * Add transient service
   */
  addTransient<T>(
    token: string,
    factory: ServiceFactory<T>,
    dependencies: string[] = []
  ): ContainerBuilder {
    this.container.registerTransient(token, factory, dependencies);
    return this;
  }

  /**
   * Add scoped service
   */
  addScoped<T>(
    token: string,
    factory: ServiceFactory<T>,
    dependencies: string[] = []
  ): ContainerBuilder {
    this.container.registerScoped(token, factory, dependencies);
    return this;
  }

  /**
   * Add instance
   */
  addInstance<T>(token: string, instance: T): ContainerBuilder {
    this.container.registerInstance(token, instance);
    return this;
  }

  /**
   * Build the container
   */
  build(): Result<Container, BusinessError> {
    return this.container.build();
  }
}