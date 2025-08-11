/**
 * Test utilities for FormData handling
 */

/**
 * Creates a FormData mock for testing Server Actions
 */
export const createFormData = (fields: Record<string, string | number>): FormData => {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    formData.set(key, String(value));
  });
  return formData;
};

/**
 * Creates a mock Supabase client with chainable methods
 */
export const createSupabaseMock = (overrides: Record<string, any> = {}) => {
  const chainableMethods = {
    from: jest.fn(),
    select: jest.fn(),
    eq: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    order: jest.fn(),
    limit: jest.fn(),
  };

  const mock = {
    ...chainableMethods,
    single: jest.fn(),
    maybeSingle: jest.fn(),
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
    mock[method].mockReturnValue(mock);
  });

  return mock;
};

/**
 * Assertion helpers for test results
 */
export const expectSuccessResult = (result: any, message?: string) => {
  expect(result.success).toBe(true);
  expect(result.error).toBeUndefined();
  if (message) {
    expect(result.message).toContain(message);
  }
};

export const expectErrorResult = (result: any, errorText?: string) => {
  expect(result.success).toBe(false);
  if (errorText) {
    expect(result.error || result.message).toContain(errorText);
  }
};

export const expectValidationErrorResult = (
  result: any,
  expectedErrors?: Record<string, string[]>
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
export const buildMockCart = (overrides: Record<string, any> = {}) => ({
  id: "cart-123",
  user_id: "user-123",
  items: [],
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

export const buildMockCartItem = (overrides: Record<string, any> = {}) => ({
  id: "item-123",
  cart_id: "cart-123",
  product_id: "prod-123",
  quantity: 1,
  price: 29.99,
  created_at: "2024-01-01T00:00:00Z",
  ...overrides,
});
