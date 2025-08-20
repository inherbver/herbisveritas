/**
 * Test utilities for FormData handling
 */

import { jest } from "@jest/globals";

/**
 * Creates a FormData mock for testing Server Actions
 */
export const createFormData = (
  fields: Record<string, string | number>,
): FormData => {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    formData.set(key, String(value));
  });
  return formData;
};

/**
 * Creates a mock Supabase client with chainable methods
 */
export const createSupabaseMock = (overrides: Record<string, unknown> = {}) => {
  const chainableMethods = {
    from: jest.fn(),
    select: jest.fn(),
    eq: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    order: jest.fn(),
    limit: jest.fn(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
  };

  const mock = {
    ...chainableMethods,
    rpc: jest.fn(),
    auth: {
      admin: {
        deleteUser: jest.fn(),
      },
    },
    ...overrides,
  };

  // Make ALL chainable methods return the mock itself for proper chaining
  Object.keys(chainableMethods).forEach((method) => {
    const mockMethod = mock[method as keyof typeof mock];
    if (typeof mockMethod === "object" && "mockReturnValue" in mockMethod) {
      (mockMethod as unknown as jest.Mock).mockReturnValue(mock);
    }
  });

  // Set default resolved values for terminating methods
  mock.single.mockResolvedValue({ data: null, error: null });
  mock.maybeSingle.mockResolvedValue({ data: null, error: null });
  mock.rpc.mockResolvedValue({ data: null, error: null });

  return mock;
};

/**
 * Assertion helpers for test results
 */
export const expectSuccessResult = (
  result: { success: boolean; error?: string; message?: string },
  message?: string,
) => {
  expect(result.success).toBe(true);
  expect(result.error).toBeUndefined();
  if (message) {
    expect(result.message).toContain(message);
  }
};

export const expectErrorResult = (
  result: { success: boolean; error?: string; message?: string },
  errorText?: string,
) => {
  expect(result.success).toBe(false);
  if (errorText) {
    expect(result.error || result.message).toContain(errorText);
  }
};

export const expectValidationErrorResult = (
  result: { success: boolean; errors?: Record<string, string[]> },
  expectedErrors?: Record<string, string[]>,
) => {
  expect(result.success).toBe(false);
  expect(result.errors).toBeDefined();
  if (expectedErrors) {
    expect(result.errors).toMatchObject(expectedErrors);
  }
};

/**
 * Mock data builders
 */
export const buildMockCart = (overrides: Record<string, unknown> = {}) => ({
  id: "cart-123",
  user_id: "user-123",
  items: [],
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

export const buildMockCartItem = (overrides: Record<string, unknown> = {}) => ({
  id: "item-123",
  cart_id: "cart-123",
  product_id: "prod-123",
  quantity: 1,
  price: 29.99,
  created_at: "2024-01-01T00:00:00Z",
  ...overrides,
});
