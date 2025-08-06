/**
 * Tests d'intégration Phase 3 - Repository Pattern
 *
 * Valide que tous les repositories sont correctement enregistrés dans le container DI
 * et peuvent être résolus sans erreur.
 */

import {
  ContainerConfiguration,
  resolveService,
  resolveAdminService,
} from "../../container/container.config";
import { SERVICE_TOKENS } from "../../container/container";
import type { IUserRepository } from "@/lib/domain/interfaces/user.repository.interface";
import type { IAddressRepository } from "@/lib/domain/interfaces/address.repository.interface";
import type { IProductRepository } from "@/lib/domain/interfaces/product.repository.interface";
import type { IOrderRepository } from "@/lib/domain/interfaces/order.repository.interface";

// Mock des clients Supabase pour les tests
jest.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: jest.fn().mockReturnValue({
    from: jest.fn(() => ({
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    })),
    auth: {
      getUser: jest.fn(),
    },
  }),
}));

// Mock environment variables
process.env.STRIPE_SECRET_KEY = "sk_test_mock";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_mock";

// Mock global fetch for Stripe
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ({}),
} as Response);

jest.mock("@/lib/supabase/server-admin", () => ({
  createSupabaseAdminClient: jest.fn().mockReturnValue({
    from: jest.fn(() => ({
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    })),
    auth: {
      admin: {
        listUsers: jest.fn(),
      },
    },
  }),
}));

describe("Phase 3 Integration Tests - Repository Pattern", () => {
  beforeEach(async () => {
    // Reset containers avant chaque test
    const { resetContainers } = await import("../../container/container.config");
    resetContainers();
  });

  describe("Container Configuration", () => {
    it("should successfully configure server container", async () => {
      const result = ContainerConfiguration.configureServer();

      expect(result.isSuccess()).toBe(true);

      if (result.isSuccess()) {
        const container = result.getValue();
        const stats = container.getStatistics();

        // Vérifier que tous les services sont enregistrés
        expect(stats.totalServices).toBeGreaterThan(0);
        expect(stats.singletonServices).toBeGreaterThan(0);
      }
    });

    it("should successfully configure admin container", async () => {
      const result = ContainerConfiguration.configureAdmin();

      expect(result.isSuccess()).toBe(true);

      if (result.isSuccess()) {
        const container = result.getValue();
        const stats = container.getStatistics();

        expect(stats.totalServices).toBeGreaterThan(0);
        expect(stats.singletonServices).toBeGreaterThan(0);
      }
    });
  });

  describe("Repository Resolution", () => {
    it("should resolve UserRepository from server container", async () => {
      const userRepository = await resolveService<IUserRepository>(SERVICE_TOKENS.USER_REPOSITORY);

      expect(userRepository).toBeDefined();
      expect(typeof userRepository.findByEmail).toBe("function");
      expect(typeof userRepository.findByIdWithProfile).toBe("function");
      expect(typeof userRepository.findAllWithProfiles).toBe("function");
    });

    it("should resolve AddressRepository from server container", async () => {
      const addressRepository = await resolveService<IAddressRepository>(
        SERVICE_TOKENS.ADDRESS_REPOSITORY
      );

      expect(addressRepository).toBeDefined();
      expect(typeof addressRepository.create).toBe("function");
      expect(typeof addressRepository.update).toBe("function");
      expect(typeof addressRepository.delete).toBe("function");
      expect(typeof addressRepository.findById).toBe("function");
    });

    it("should resolve ProductRepository from server container", async () => {
      const productRepository = await resolveService<IProductRepository>(
        SERVICE_TOKENS.PRODUCT_REPOSITORY
      );

      expect(productRepository).toBeDefined();
      expect(typeof productRepository.findById).toBe("function");
      expect(typeof productRepository.create).toBe("function");
      expect(typeof productRepository.update).toBe("function");
    });

    it("should resolve OrderRepository from server container", async () => {
      const orderRepository = await resolveService<IOrderRepository>(
        SERVICE_TOKENS.ORDER_REPOSITORY
      );

      expect(orderRepository).toBeDefined();
      expect(typeof orderRepository.create).toBe("function");
      expect(typeof orderRepository.findById).toBe("function");
    });

    it("should resolve UserRepository from admin container", async () => {
      const userRepository = await resolveAdminService<IUserRepository>(
        SERVICE_TOKENS.USER_REPOSITORY
      );

      expect(userRepository).toBeDefined();
      expect(typeof userRepository.findAllWithProfiles).toBe("function");
    });
  });

  describe("Singleton Behavior", () => {
    it("should return same instance for singleton services", async () => {
      const repo1 = await resolveService<IUserRepository>(SERVICE_TOKENS.USER_REPOSITORY);
      const repo2 = await resolveService<IUserRepository>(SERVICE_TOKENS.USER_REPOSITORY);

      expect(repo1).toBe(repo2);
    });

    it("should have separate instances between server and admin containers", async () => {
      const serverRepo = await resolveService<IUserRepository>(SERVICE_TOKENS.USER_REPOSITORY);
      const adminRepo = await resolveAdminService<IUserRepository>(SERVICE_TOKENS.USER_REPOSITORY);

      // Ils ne doivent pas être la même instance (différents clients Supabase)
      expect(serverRepo).not.toBe(adminRepo);
    });
  });

  describe("Error Handling", () => {
    it("should throw error for non-existent service token", async () => {
      await expect(resolveService("NON_EXISTENT_TOKEN")).rejects.toThrow();
    });
  });

  describe("Container Health Check", () => {
    it("should report healthy containers", async () => {
      const { checkContainerHealth } = await import("../../container/container.config");
      const health = await checkContainerHealth();

      expect(health.server).toBe(true);
      expect(health.admin).toBe(true);
      expect(health.errors).toHaveLength(0);
    });
  });
});

/**
 * Tests de compatibilité avec les migrations
 */
describe("Migration Compatibility Tests", () => {
  it("should maintain interface compatibility for migrated actions", async () => {
    // Test que les interfaces des repositories restent compatibles
    // avec les besoins des Server Actions migrés

    const userRepository = await resolveService<IUserRepository>(SERVICE_TOKENS.USER_REPOSITORY);
    const addressRepository = await resolveService<IAddressRepository>(
      SERVICE_TOKENS.ADDRESS_REPOSITORY
    );

    // Vérifier que les méthodes nécessaires pour userActions.migrated.ts existent
    expect(typeof userRepository.findAllWithProfiles).toBe("function");
    expect(typeof userRepository.findByIdWithProfile).toBe("function");

    // Vérifier que les méthodes nécessaires pour addressActions.migrated.ts existent
    expect(typeof addressRepository.create).toBe("function");
    expect(typeof addressRepository.update).toBe("function");
    expect(typeof addressRepository.delete).toBe("function");
    expect(typeof addressRepository.findById).toBe("function");
  });
});

/**
 * Ces tests valident que :
 *
 * 1. ✅ Tous les repositories sont correctement enregistrés dans le container DI
 * 2. ✅ Ils peuvent être résolus sans erreur depuis les containers server et admin
 * 3. ✅ Le comportement singleton fonctionne correctement
 * 4. ✅ Les interfaces sont compatibles avec les Server Actions migrés
 * 5. ✅ La gestion d'erreur fonctionne pour les services inexistants
 * 6. ✅ Le health check des containers fonctionne
 */
