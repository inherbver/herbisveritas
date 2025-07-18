import { revalidateTag } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import { isSuccessResult, createSuccessResult } from "@/lib/cart-helpers";
import type { CartDataFromServer } from "@/types/cart";

// Mock des modules externes
jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
}));
jest.mock("@/lib/supabase/server");
jest.mock("@/lib/supabase/server-admin");
jest.mock("@/lib/cartReader");
jest.mock("@/lib/authUtils");

// Import des fonctions à tester
import { addItemToCart, migrateAndGetCart } from "../cartActions";
import { getCart } from "@/lib/cartReader";
import { getActiveUserId } from "@/lib/authUtils";

// Mocks typés
const mockGetCart = getCart as jest.Mock;
const mockGetActiveUserId = getActiveUserId as jest.Mock;
const mockedCreateSupabaseServerClient = createSupabaseServerClient as jest.Mock;
const mockedCreateSupabaseAdminClient = createSupabaseAdminClient as jest.Mock;

// UUIDs valides pour les tests
const VALID_AUTH_USER_ID = "123e4567-e89b-12d3-a456-426614174000";
const VALID_GUEST_USER_ID = "987fcdeb-51d3-11e7-9998-23456789abcd";
const VALID_PRODUCT_ID = "550e8400-e29b-41d4-a716-446655440000";

// Factory pour créer des données de test cohérentes
function createTestCartData(overrides: Partial<CartDataFromServer> = {}): CartDataFromServer {
  return {
    id: "test-cart-123",
    user_id: VALID_AUTH_USER_ID,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    cart_items: [
      {
        id: "test-item-1",
        product_id: VALID_PRODUCT_ID,
        name: "Test Product",
        price: 10.99,
        quantity: 1,
        image_url: "test.jpg",
      },
    ],
    ...overrides,
  };
}

// Helper pour créer FormData
function createFormData(data: Record<string, string>): FormData {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });
  return formData;
}

// ✅ Interface typée pour les mocks exposés
interface MockSupabaseClient {
  auth: {
    getUser: jest.Mock;
    signInAnonymously?: jest.Mock;
  };
  from: jest.Mock;
  rpc: jest.Mock;
  // Mocks exposés avec types corrects
  insertMock: jest.Mock;
  updateMock: jest.Mock;
  rpcMock: jest.Mock;
}

// ✅ Mock Supabase corrigé et typé
function createCompleteSupabaseMock(
  config: {
    authUser?: { id: string } | null;
    authError?: { message: string } | null;
    anonUser?: { id: string } | null;
    anonError?: { message: string } | null;
    guestCartData?: { id: string } | null;
    authCartData?: { id: string } | null;
    newCartId?: string | null;
    newCartError?: { message: string } | null;
    updateError?: { message: string } | null;
    rpcError?: { message: string } | null;
  } = {}
): MockSupabaseClient {
  const {
    authUser = { id: VALID_AUTH_USER_ID },
    authError = null,
    anonUser = null,
    anonError = null,
    guestCartData = null,
    authCartData = null,
    newCartId = null,
    newCartError = null,
    updateError = null,
    rpcError = null,
  } = config;

  // ✅ Créer des mocks séparés et typés
  const insertMock = jest.fn().mockImplementation((_data: Record<string, unknown>) => ({
    select: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: newCartId ? { id: newCartId, ..._data } : null,
        error: newCartError,
      }),
    }),
  }));

  const updateMock = jest.fn().mockImplementation((_data: Record<string, unknown>) => ({
    eq: jest.fn().mockResolvedValue({
      error: updateError,
    }),
  }));

  const rpcMock = jest.fn().mockResolvedValue({ error: rpcError });

  const mockClient: MockSupabaseClient = {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: authUser },
        error: authError,
      }),
      signInAnonymously: jest.fn().mockResolvedValue({
        data: anonUser ? { user: anonUser } : null,
        error: anonError,
      }),
    },
    from: jest.fn().mockImplementation((table: string) => {
      if (table === "carts") {
        return {
          select: jest.fn().mockImplementation((_selectString: string) => ({
            eq: jest.fn().mockImplementation((field: string, value: string) => ({
              maybeSingle: jest.fn().mockImplementation(() => {
                if (value === VALID_GUEST_USER_ID) {
                  return Promise.resolve({ data: guestCartData, error: null });
                } else if (value === VALID_AUTH_USER_ID) {
                  return Promise.resolve({ data: authCartData, error: null });
                }
                return Promise.resolve({ data: null, error: null });
              }),
              order: jest.fn().mockReturnThis(),
            })),
          })),
          insert: insertMock,
          update: updateMock,
        };
      }

      return {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
    rpc: rpcMock,

    // ✅ Exposer les mocks pour les assertions
    insertMock,
    updateMock,
    rpcMock,
  };

  return mockClient;
}

// Type guards pour les tests
function isTestGeneralError(result: {
  success: boolean;
  error?: string;
}): result is { success: false; error: string } {
  return result.success === false && typeof result.error === "string";
}

function isTestValidationError(result: {
  success: boolean;
  errors?: Record<string, string[] | undefined>;
}): result is { success: false; errors: Record<string, string[] | undefined> } {
  return result.success === false && typeof result.errors === "object";
}

describe("Server Action: addItemToCart", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should add a new item to an existing cart", async () => {
    const existingCart = createTestCartData();
    mockGetCart.mockResolvedValue(createSuccessResult(existingCart));
    mockGetActiveUserId.mockResolvedValue(VALID_AUTH_USER_ID);

    const mockSupabase = createCompleteSupabaseMock({
      authCartData: { id: existingCart.id },
    });
    mockedCreateSupabaseServerClient.mockResolvedValue(mockSupabase);

    const formData = createFormData({
      productId: VALID_PRODUCT_ID,
      quantity: "1",
    });

    const result = await addItemToCart(null, formData);

    expect(result.success).toBe(true);
    expect(mockSupabase.rpcMock).toHaveBeenCalledWith("add_or_update_cart_item", {
      p_cart_id: existingCart.id,
      p_product_id: VALID_PRODUCT_ID,
      p_quantity_to_add: 1,
    });
    expect(revalidateTag).toHaveBeenCalledWith("cart");
  });

  it("should create a new cart if one does not exist", async () => {
    mockGetCart.mockResolvedValue(createSuccessResult(null)); // No existing cart
    mockGetActiveUserId.mockResolvedValue(VALID_AUTH_USER_ID);

    const mockSupabase = createCompleteSupabaseMock({
      authCartData: null, // No existing cart
      newCartId: "new-cart-id",
    });
    mockedCreateSupabaseServerClient.mockResolvedValue(mockSupabase);

    const formData = createFormData({
      productId: VALID_PRODUCT_ID,
      quantity: "2",
    });

    const result = await addItemToCart(null, formData);

    expect(result.success).toBe(true);
    expect(mockSupabase.insertMock).toHaveBeenCalledWith({ user_id: VALID_AUTH_USER_ID });
    expect(mockSupabase.rpcMock).toHaveBeenCalledWith("add_or_update_cart_item", {
      p_cart_id: "new-cart-id",
      p_product_id: VALID_PRODUCT_ID,
      p_quantity_to_add: 2,
    });
  });

  it("should return a validation error for invalid input", async () => {
    const formData = createFormData({
      productId: "invalid-uuid",
      quantity: "-1",
    });

    const result = await addItemToCart(null, formData);

    expect(result.success).toBe(false);
    expect(isTestValidationError(result)).toBe(true);
    if (isTestValidationError(result)) {
      expect(result.errors.productId).toBeDefined();
      expect(result.errors.quantity).toBeDefined();
    }
  });

  it("should return a general error if getActiveUserId fails", async () => {
    mockGetActiveUserId.mockResolvedValue(null);

    const formData = createFormData({
      productId: VALID_PRODUCT_ID,
      quantity: "1",
    });

    const mockSupabase = createCompleteSupabaseMock();
    mockedCreateSupabaseServerClient.mockResolvedValue(mockSupabase);

    const result = await addItemToCart(null, formData);

    expect(result.success).toBe(false);
    if (isTestGeneralError(result)) {
      expect(result.error).toBe("User identification failed");
    }
  });
});

describe("Server Action: migrateAndGetCart", () => {
  let mockAdminClient: { auth: { admin: { getUserById: jest.Mock; deleteUser: jest.Mock } } };

  beforeEach(() => {
    jest.clearAllMocks();

    mockAdminClient = {
      auth: {
        admin: {
          getUserById: jest.fn().mockResolvedValue({
            data: { user: { id: VALID_GUEST_USER_ID, is_anonymous: true } },
            error: null,
          }),
          deleteUser: jest.fn().mockResolvedValue({ error: null }),
        },
      },
    };
    mockedCreateSupabaseAdminClient.mockReturnValue(mockAdminClient);
  });

  it("should successfully migrate items from guest cart to auth cart", async () => {
    const guestCartData = createTestCartData({
      id: "guest-cart-id",
      user_id: VALID_GUEST_USER_ID,
      cart_items: [
        {
          id: "test-item-2",
          product_id: VALID_PRODUCT_ID,
          quantity: 1,
          name: "Test",
          price: 10,
          image_url: "img.jpg",
        },
      ],
    });

    const authCartData = createTestCartData({
      id: "auth-cart-id",
      user_id: VALID_AUTH_USER_ID,
      cart_items: [], // Auth cart is initially empty
    });

    const mockSupabase = createCompleteSupabaseMock({
      authUser: { id: VALID_AUTH_USER_ID },
      guestCartData: { id: guestCartData.id },
      authCartData: { id: authCartData.id },
    });
    mockedCreateSupabaseServerClient.mockResolvedValue(mockSupabase);
    mockGetActiveUserId.mockResolvedValue(VALID_AUTH_USER_ID);

    // Mock getCart to return the correct cart based on user ID
    mockGetCart.mockImplementation(async () => {
      return createSuccessResult(authCartData);
    });

    const result = await migrateAndGetCart({ guestUserId: VALID_GUEST_USER_ID });

    expect(result.success).toBe(true);
    if (isSuccessResult(result)) {
      expect(result.data?.id).toBe("auth-cart-id");
    }

    expect(mockSupabase.rpcMock).toHaveBeenCalledWith("merge_carts", {
      p_guest_cart_id: guestCartData.id,
      p_auth_cart_id: authCartData.id,
    });

    expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith(VALID_GUEST_USER_ID);
    expect(revalidateTag).toHaveBeenCalledWith("cart");
  });

  it("should create a new cart for the auth user if they don't have one", async () => {
    const guestCartData = createTestCartData({
      id: "guest-cart-id-2",
      user_id: VALID_GUEST_USER_ID,
      cart_items: [
        {
          id: "test-item-3",
          product_id: VALID_PRODUCT_ID,
          quantity: 3,
          name: "Test 2",
          price: 20,
          image_url: "img2.jpg",
        },
      ],
    });

    const mockSupabase = createCompleteSupabaseMock({
      authUser: { id: VALID_AUTH_USER_ID },
      guestCartData: { id: guestCartData.id },
      authCartData: null, // Auth user has no cart
    });
    mockedCreateSupabaseServerClient.mockResolvedValue(mockSupabase);
    mockGetActiveUserId.mockResolvedValue(VALID_AUTH_USER_ID);

    mockGetCart.mockResolvedValue(
      createSuccessResult({
        id: guestCartData.id,
        user_id: VALID_AUTH_USER_ID,
        items: guestCartData.cart_items,
      })
    );

    const result = await migrateAndGetCart({ guestUserId: VALID_GUEST_USER_ID });

    expect(result.success).toBe(true);
    expect(mockSupabase.updateMock).toHaveBeenCalledWith({ user_id: VALID_AUTH_USER_ID });
  });

  it("should handle RPC error during migration", async () => {
    const mockSupabase = createCompleteSupabaseMock({
      authUser: { id: VALID_AUTH_USER_ID },
      guestCartData: { id: "guest-cart" },
      authCartData: { id: "auth-cart" },
      rpcError: { message: "RPC merge_carts failed" },
    });

    mockedCreateSupabaseServerClient.mockResolvedValue(mockSupabase);
    mockGetActiveUserId.mockResolvedValue(VALID_AUTH_USER_ID);

    const result = await migrateAndGetCart({ guestUserId: VALID_GUEST_USER_ID });

    expect(result.success).toBe(false);
    if (isTestGeneralError(result)) {
      expect(result.error).toContain("RPC merge_carts failed");
    }
    // User should not be deleted if migration fails
    expect(mockAdminClient.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it("should handle authenticated user not found", async () => {
    const mockSupabase = createCompleteSupabaseMock({
      authUser: null, // No authenticated user
    });

    mockedCreateSupabaseServerClient.mockResolvedValue(mockSupabase);
    mockGetActiveUserId.mockResolvedValue(null);

    const result = await migrateAndGetCart({ guestUserId: VALID_GUEST_USER_ID });

    expect(result.success).toBe(false);
    if (isTestGeneralError(result)) {
      expect(result.error).toBe("Authenticated user not found.");
    }
  });

  it("should return current cart if guest user has no cart", async () => {
    const authCurrentCartData = createTestCartData({
      id: "auth-current-cart",
      user_id: VALID_AUTH_USER_ID,
    });

    const mockSupabase = createCompleteSupabaseMock({
      authUser: { id: VALID_AUTH_USER_ID },
      guestCartData: null, // Guest has no cart
      authCartData: { id: "auth-current-cart" },
    });

    mockedCreateSupabaseServerClient.mockResolvedValue(mockSupabase);
    mockGetActiveUserId.mockResolvedValue(VALID_AUTH_USER_ID);
    mockGetCart.mockResolvedValue(createSuccessResult(authCurrentCartData, "Current cart"));

    const result = await migrateAndGetCart({ guestUserId: VALID_GUEST_USER_ID });

    expect(result.success).toBe(true);
    if (isSuccessResult(result) && result.data) {
      expect(result.data.id).toBe("auth-current-cart");
    }

    // No migration operations should occur
    expect(mockSupabase.insertMock).not.toHaveBeenCalled();
    expect(mockSupabase.updateMock).not.toHaveBeenCalled();
    expect(mockSupabase.rpcMock).not.toHaveBeenCalled();
    // ✅ deleteUser EST appelé dans le finally block
    expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith(VALID_GUEST_USER_ID);
  });

  it("should return current cart when guest and auth IDs are the same", async () => {
    const sameUserId = VALID_AUTH_USER_ID;
    const currentCartData = createTestCartData({
      id: "current-cart-for-same-user",
      user_id: sameUserId,
    });

    const mockSupabase = createCompleteSupabaseMock({
      authUser: { id: sameUserId },
    });

    mockedCreateSupabaseServerClient.mockResolvedValue(mockSupabase);
    mockGetActiveUserId.mockResolvedValue(sameUserId);
    mockGetCart.mockResolvedValue(createSuccessResult(currentCartData, "Same user cart"));

    const result = await migrateAndGetCart({ guestUserId: sameUserId });

    expect(result.success).toBe(true);
    if (isSuccessResult(result) && result.data) {
      expect(result.data.id).toBe("current-cart-for-same-user");
    }

    // Should not call admin functions for same user
    expect(mockAdminClient.auth.admin.getUserById).not.toHaveBeenCalled();
  });

  it("should return validation error if guestUserId is empty", async () => {
    const result = await migrateAndGetCart({ guestUserId: "" });

    expect(result.success).toBe(false);
    expect(isTestValidationError(result)).toBe(true);
    if (isTestValidationError(result)) {
      expect(result.errors.guestUserId).toBeDefined();
    }
  });
});
