/**
 * Container Configuration
 *
 * Configures the dependency injection container with all application services.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { Container, ContainerBuilder, SERVICE_TOKENS, ServiceLifetime } from "./container";
import { Result } from "@/lib/core/result";
import { BusinessError } from "@/lib/core/errors";
import { logger } from "@/lib/core/logger";

// Domain Services
import { CartDomainService, EventPublisher } from "@/lib/domain/services/cart.service";

// Event System
import { configureEventSystem, initializeEventSystem } from "../events/event-container-config";

// Repositories
import { SupabaseCartRepository } from "../repositories/cart.repository";
import { SupabaseProductRepository } from "../repositories/product.repository";
import { UserSupabaseRepository } from "../repositories/user.supabase.repository";
import { AddressSupabaseRepository } from "../repositories/address.supabase.repository";
import { OrderSupabaseRepository } from "../repositories/order.supabase.repository";

// Supabase clients
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";

/**
 * Simple event publisher implementation
 */
class SimpleEventPublisher implements EventPublisher {
  async publish(event: any): Promise<void> {
    // Log the event for now - in production this would publish to a message queue
    logger.info("Domain event published", {
      eventType: event.eventType,
      aggregateId: event.aggregateId,
      eventData: event.eventData,
    });

    // Here you could integrate with:
    // - Redis pub/sub
    // - Message queues (RabbitMQ, AWS SQS)
    // - Event streaming (Kafka)
    // - Webhooks
  }
}

/**
 * Container configuration for different environments
 */
export class ContainerConfiguration {
  /**
   * Configure container for server-side operations
   */
  static configureServer(): Result<Container, BusinessError> {
    try {
      const builder = new ContainerBuilder();

      // Infrastructure - Supabase Clients
      builder.addSingleton(SERVICE_TOKENS.SUPABASE_CLIENT, () => createSupabaseServerClient(), []);

      // Repositories
      builder.addSingleton(
        SERVICE_TOKENS.CART_REPOSITORY,
        (container) =>
          new SupabaseCartRepository(container.resolve(SERVICE_TOKENS.SUPABASE_CLIENT)),
        [SERVICE_TOKENS.SUPABASE_CLIENT]
      );

      builder.addSingleton(
        SERVICE_TOKENS.PRODUCT_REPOSITORY,
        (container) =>
          new SupabaseProductRepository(container.resolve(SERVICE_TOKENS.SUPABASE_CLIENT)),
        [SERVICE_TOKENS.SUPABASE_CLIENT]
      );

      builder.addSingleton(SERVICE_TOKENS.USER_REPOSITORY, () => new UserSupabaseRepository(), []);

      builder.addSingleton(
        SERVICE_TOKENS.ADDRESS_REPOSITORY,
        (container) =>
          new AddressSupabaseRepository(container.resolve(SERVICE_TOKENS.SUPABASE_CLIENT)),
        [SERVICE_TOKENS.SUPABASE_CLIENT]
      );

      builder.addSingleton(
        SERVICE_TOKENS.ORDER_REPOSITORY,
        (container) =>
          new OrderSupabaseRepository(container.resolve(SERVICE_TOKENS.SUPABASE_CLIENT)),
        [SERVICE_TOKENS.SUPABASE_CLIENT]
      );

      builder.addInstance(SERVICE_TOKENS.LOGGER, logger);

      // Configure Event System
      configureEventSystem(builder);

      // Domain Services
      builder.addTransient(
        SERVICE_TOKENS.CART_DOMAIN_SERVICE,
        (container) =>
          new CartDomainService(
            container.resolve(SERVICE_TOKENS.CART_REPOSITORY),
            container.resolve(SERVICE_TOKENS.PRODUCT_REPOSITORY),
            container.resolve(SERVICE_TOKENS.USER_REPOSITORY),
            container.resolve(SERVICE_TOKENS.EVENT_PUBLISHER)
          ),
        [
          SERVICE_TOKENS.CART_REPOSITORY,
          SERVICE_TOKENS.PRODUCT_REPOSITORY,
          SERVICE_TOKENS.USER_REPOSITORY,
          SERVICE_TOKENS.EVENT_PUBLISHER,
        ]
      );

      return builder.build();
    } catch (error) {
      logger.error("Failed to configure server container", error);
      return Result.error(new BusinessError("Container configuration failed", { error }));
    }
  }

  /**
   * Configure container for admin operations
   */
  static configureAdmin(): Result<Container, BusinessError> {
    try {
      const builder = new ContainerBuilder();

      // Infrastructure - Admin Supabase Client
      builder.addSingleton(SERVICE_TOKENS.SUPABASE_CLIENT, () => createSupabaseAdminClient(), []);

      // Repositories (same as server but with admin client)
      builder.addSingleton(
        SERVICE_TOKENS.CART_REPOSITORY,
        (container) =>
          new SupabaseCartRepository(container.resolve(SERVICE_TOKENS.SUPABASE_CLIENT)),
        [SERVICE_TOKENS.SUPABASE_CLIENT]
      );

      builder.addSingleton(
        SERVICE_TOKENS.PRODUCT_REPOSITORY,
        (container) =>
          new SupabaseProductRepository(container.resolve(SERVICE_TOKENS.SUPABASE_CLIENT)),
        [SERVICE_TOKENS.SUPABASE_CLIENT]
      );

      builder.addSingleton(SERVICE_TOKENS.USER_REPOSITORY, () => new UserSupabaseRepository(), []);

      builder.addSingleton(
        SERVICE_TOKENS.ADDRESS_REPOSITORY,
        (container) =>
          new AddressSupabaseRepository(container.resolve(SERVICE_TOKENS.SUPABASE_CLIENT)),
        [SERVICE_TOKENS.SUPABASE_CLIENT]
      );

      builder.addSingleton(
        SERVICE_TOKENS.ORDER_REPOSITORY,
        (container) =>
          new OrderSupabaseRepository(container.resolve(SERVICE_TOKENS.SUPABASE_CLIENT)),
        [SERVICE_TOKENS.SUPABASE_CLIENT]
      );

      builder.addInstance(SERVICE_TOKENS.LOGGER, logger);

      // Configure Event System
      configureEventSystem(builder);

      // Domain Services
      builder.addTransient(
        SERVICE_TOKENS.CART_DOMAIN_SERVICE,
        (container) =>
          new CartDomainService(
            container.resolve(SERVICE_TOKENS.CART_REPOSITORY),
            container.resolve(SERVICE_TOKENS.PRODUCT_REPOSITORY),
            container.resolve(SERVICE_TOKENS.USER_REPOSITORY),
            container.resolve(SERVICE_TOKENS.EVENT_PUBLISHER)
          ),
        [
          SERVICE_TOKENS.CART_REPOSITORY,
          SERVICE_TOKENS.PRODUCT_REPOSITORY,
          SERVICE_TOKENS.USER_REPOSITORY,
          SERVICE_TOKENS.EVENT_PUBLISHER,
        ]
      );

      return builder.build();
    } catch (error) {
      logger.error("Failed to configure admin container", error);
      return Result.error(new BusinessError("Admin container configuration failed", { error }));
    }
  }

  /**
   * Configure container for testing
   */
  static configureTest(mockServices: Record<string, any> = {}): Result<Container, BusinessError> {
    try {
      const builder = new ContainerBuilder();

      // Add mock services
      for (const [token, mockService] of Object.entries(mockServices)) {
        builder.addInstance(token, mockService);
      }

      // Add real services that aren't mocked
      if (!mockServices[SERVICE_TOKENS.LOGGER]) {
        builder.addInstance(SERVICE_TOKENS.LOGGER, logger);
      }

      if (!mockServices[SERVICE_TOKENS.EVENT_PUBLISHER]) {
        builder.addSingleton(SERVICE_TOKENS.EVENT_PUBLISHER, () => new SimpleEventPublisher(), []);
      }

      // Domain Services (use real implementation with mocked dependencies)
      if (!mockServices[SERVICE_TOKENS.CART_DOMAIN_SERVICE]) {
        builder.addTransient(
          SERVICE_TOKENS.CART_DOMAIN_SERVICE,
          (container) =>
            new CartDomainService(
              container.resolve(SERVICE_TOKENS.CART_REPOSITORY),
              container.resolve(SERVICE_TOKENS.PRODUCT_REPOSITORY),
              container.resolve(SERVICE_TOKENS.USER_REPOSITORY),
              container.resolve(SERVICE_TOKENS.EVENT_PUBLISHER)
            ),
          [
            SERVICE_TOKENS.CART_REPOSITORY,
            SERVICE_TOKENS.PRODUCT_REPOSITORY,
            SERVICE_TOKENS.USER_REPOSITORY,
            SERVICE_TOKENS.EVENT_PUBLISHER,
          ]
        );
      }

      return builder.build();
    } catch (error) {
      logger.error("Failed to configure test container", error);
      return Result.error(new BusinessError("Test container configuration failed", { error }));
    }
  }
}

/**
 * Global container instances
 */
let serverContainer: Container | null = null;
let adminContainer: Container | null = null;

/**
 * Get or create the server container
 */
export async function getServerContainer(): Promise<Container> {
  if (!serverContainer) {
    const result = ContainerConfiguration.configureServer();
    if (result.isError()) {
      throw new Error(`Failed to create server container: ${result.getError().message}`);
    }
    serverContainer = result.getValue();
  }
  return serverContainer;
}

/**
 * Get or create the admin container
 */
export async function getAdminContainer(): Promise<Container> {
  if (!adminContainer) {
    const result = ContainerConfiguration.configureAdmin();
    if (result.isError()) {
      throw new Error(`Failed to create admin container: ${result.getError().message}`);
    }
    adminContainer = result.getValue();
  }
  return adminContainer;
}

/**
 * Create a request-scoped container (useful for Next.js server actions)
 */
export async function createRequestScopedContainer(): Promise<{
  container: Container;
  scope: ReturnType<Container["createScope"]>;
}> {
  const container = await getServerContainer();
  const scope = container.createScope();

  return { container, scope };
}

/**
 * Utility function to resolve a service from the server container
 */
export async function resolveService<T>(token: string): Promise<T> {
  const container = await getServerContainer();
  return container.resolve<T>(token);
}

/**
 * Utility function to resolve a service from the admin container
 */
export async function resolveAdminService<T>(token: string): Promise<T> {
  const container = await getAdminContainer();
  return container.resolve<T>(token);
}

/**
 * Reset containers (useful for testing or hot reload)
 */
export function resetContainers(): void {
  serverContainer = null;
  adminContainer = null;
  logger.info("Containers reset");
}

/**
 * Container health check
 */
export async function checkContainerHealth(): Promise<{
  server: boolean;
  admin: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  let serverHealthy = false;
  let adminHealthy = false;

  try {
    const container = await getServerContainer();
    const stats = container.getStatistics();
    if (stats.totalServices > 0) {
      serverHealthy = true;
    }
  } catch (error) {
    errors.push(
      `Server container error: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  try {
    const container = await getAdminContainer();
    const stats = container.getStatistics();
    if (stats.totalServices > 0) {
      adminHealthy = true;
    }
  } catch (error) {
    errors.push(
      `Admin container error: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  return {
    server: serverHealthy,
    admin: adminHealthy,
    errors,
  };
}
