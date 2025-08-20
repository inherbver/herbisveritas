/**
 * Consolidated Mock Strategy for Test Reliability
 * Single source of truth for all mocks to reduce conflicts and improve maintainability
 */

import { UserFactory } from "./factories/UserFactory";
import { CartFactory } from "./factories/CartFactory";
import { ProductFactory } from "./factories/ProductFactory";

export interface TestScenario {
  name: string;
  user?: any;
  cart?: any;
  products?: any[];
  authError?: boolean;
  dbError?: boolean;
}

/**
 * Predefined test scenarios for consistency
 */
export const TEST_SCENARIOS: Record<string, TestScenario> = {
  AUTHENTICATED_USER: {
    name: "Authenticated User",
    user: UserFactory.authenticated(),
    cart: CartFactory.withItems(),
    products: ProductFactory.mixedCategories(),
  },

  GUEST_USER: {
    name: "Guest User",
    user: null,
    cart: CartFactory.guest(),
    products: ProductFactory.mixedCategories(),
  },

  ADMIN_USER: {
    name: "Admin User",
    user: UserFactory.admin(),
    cart: CartFactory.empty(),
    products: ProductFactory.mixedCategories(),
  },

  AUTH_ERROR: {
    name: "Authentication Error",
    authError: true,
  },

  DATABASE_ERROR: {
    name: "Database Error",
    dbError: true,
  },
};

/**
 * Creates a consistent Supabase mock for any scenario
 */
export function createConsolidatedSupabaseMock(scenario: TestScenario) {
  const { user, cart, products = [], authError, dbError } = scenario;

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: authError ? null : user },
        error: authError ? { message: "Auth failed" } : null,
      }),

      getSession: jest.fn().mockResolvedValue({
        data: { session: authError ? null : user ? { user } : null },
        error: authError ? { message: "Session failed" } : null,
      }),

      signInWithPassword: jest.fn().mockResolvedValue({
        data: authError ? null : { user, session: { user } },
        error: authError ? { message: "Invalid credentials" } : null,
      }),

      signUp: jest.fn().mockResolvedValue({
        data: authError ? null : { user, session: null },
        error: authError ? { message: "Signup failed" } : null,
      }),

      signOut: jest.fn().mockResolvedValue({
        error: authError ? { message: "Signout failed" } : null,
      }),

      resetPasswordForEmail: jest.fn().mockResolvedValue({
        error: authError ? { message: "Reset failed" } : null,
      }),

      updateUser: jest.fn().mockResolvedValue({
        data: authError ? null : { user },
        error: authError ? { message: "Update failed" } : null,
      }),

      resend: jest.fn().mockResolvedValue({
        error: authError ? { message: "Resend failed" } : null,
      }),
    },

    from: jest.fn((table: string) => {
      const queryMethods = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: dbError ? null : getTableData(table, { user, cart, products }),
          error: dbError ? { message: "Database error" } : null,
        }),
        maybeSingle: jest.fn().mockResolvedValue({
          data: dbError ? null : getTableData(table, { user, cart, products }),
          error: dbError ? { message: "Database error" } : null,
        }),
      };

      // Make query methods thenable for direct awaiting
      Object.assign(queryMethods, {
        then: jest.fn().mockResolvedValue({
          data: dbError
            ? []
            : getTableData(table, { user, cart, products }, true),
          error: dbError ? { message: "Query failed" } : null,
        }),
      });

      return queryMethods;
    }),

    rpc: jest.fn().mockResolvedValue({
      data: dbError ? null : {},
      error: dbError ? { message: "RPC failed" } : null,
    }),

    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({
          data: dbError ? null : { path: "test-path" },
          error: dbError ? { message: "Upload failed" } : null,
        }),
        download: jest.fn().mockResolvedValue({
          data: dbError ? null : new Blob(),
          error: dbError ? { message: "Download failed" } : null,
        }),
        remove: jest.fn().mockResolvedValue({
          data: dbError ? null : {},
          error: dbError ? { message: "Remove failed" } : null,
        }),
        getPublicUrl: jest.fn(() => ({
          data: { publicUrl: "mock-url" },
        })),
      })),
    },
  };
}

/**
 * Helper to get mock data based on table name
 */
function getTableData(table: string, data: any, asArray = false): any {
  const { user, cart, products } = data;

  const tableData = {
    users: user ? [user] : [],
    profiles: user ? [{ id: user.id, ...user }] : [],
    products: products || [],
    carts: cart ? [cart] : [],
    cart_items: cart?.items || [],
    orders: [],
    order_items: [],
    addresses: [],
    newsletters: [],
    partners: [],
    markets: [],
    magazines: [],
  };

  const result = tableData[table as keyof typeof tableData] || [];
  return asArray ? result : result[0] || null;
}

/**
 * Setup function for consistent test initialization
 */
export function setupConsolidatedTest(
  scenarioName: keyof typeof TEST_SCENARIOS,
) {
  const scenario = TEST_SCENARIOS[scenarioName];
  const mockSupabase = createConsolidatedSupabaseMock(scenario);

  // Apply mocks
  jest
    .mocked(require("@/lib/supabase/client").createClient)
    .mockReturnValue(mockSupabase);
  jest
    .mocked(require("@/lib/supabase/server").createSupabaseServerClient)
    .mockResolvedValue(mockSupabase);
  jest
    .mocked(require("@/lib/supabase/admin").createAdminClient)
    .mockReturnValue(mockSupabase);

  return {
    scenario,
    mockSupabase,
    cleanup: () => jest.clearAllMocks(),
  };
}

/**
 * Fast test utilities for performance
 */
export const fastTest = {
  auth: (success = true) =>
    setupConsolidatedTest(success ? "AUTHENTICATED_USER" : "AUTH_ERROR"),
  guest: () => setupConsolidatedTest("GUEST_USER"),
  admin: () => setupConsolidatedTest("ADMIN_USER"),
  dbError: () => setupConsolidatedTest("DATABASE_ERROR"),
};
