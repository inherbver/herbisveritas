import { revalidateTag } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server-admin";
import { isSuccessResult, isValidationError, createSuccessResult } from "@/lib/cart-helpers";
import { CartData } from "@/types/cart";

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
function createTestCartData(overrides: Partial<CartData> = {}): CartData {
  return {
    id: "test-cart-123",
    user_id: VALID_AUTH_USER_ID,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: [
      {
        id: "item-1",
        productId: VALID_PRODUCT_ID,
        name: "Test Product",
        price: 10.99,
        quantity: 1,
        image: "test.jpg",
        slug: "test-product",
      },
    ],
    ...overrides,
  };
}

// ✅ Mock Supabase corrigé et simplifié
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
) {
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

  // ✅ Créer des mocks séparés et les exposer
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

  const mockClient: Record<string, unknown> = {
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
const isTestGeneralError = (result: {
  success: boolean;
  error?: string;
}): result is { success: false; error: string } => {
  return result.success === false && "error" in result;
};

const isTestValidationError = (result: {
  success: boolean;
  errors?: Record<string, string[] | undefined>;
}): result is { success: false; errors: Record<string, string[] | undefined> } => {
  return result.success === false && "errors" in result;
};

describe("addItemToCart - Simplified", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCart.mockReset();
    // ✅ Setup par défaut - getActiveUserId retourne directement l'ID
    mockGetActiveUserId.mockResolvedValue(VALID_AUTH_USER_ID);
  });

  it("should add item and return updated cart", async () => {
    const formData = new FormData();
    formData.append("productId", VALID_PRODUCT_ID);
    formData.append("quantity", "1");

    const finalUpdatedCartData = createTestCartData({
      id: "existing-cart-456",
      user_id: VALID_AUTH_USER_ID,
    });

    // Mock existing cart found
    const mockSupabase = createCompleteSupabaseMock({
      authUser: { id: VALID_AUTH_USER_ID },
      authCartData: { id: "existing-cart-456" },
      rpcError: null,
    });

    mockedCreateSupabaseServerClient.mockResolvedValue(mockSupabase);
    // ✅ Mock getCart pour retourner le panier final après RPC
    mockGetCart.mockResolvedValue(createSuccessResult(finalUpdatedCartData, "Cart updated"));

    const result = await addItemToCart({}, formData);

    expect(result.success).toBe(true);
    if (isSuccessResult(result) && result.data) {
      expect(result.data.items).toHaveLength(1);
      expect(result.data.items[0].productId).toBe(VALID_PRODUCT_ID);
    }

    expect(mockSupabase.rpcMock).toHaveBeenCalledWith("add_or_update_cart_item", {
      p_cart_id: "existing-cart-456",
      p_product_id: VALID_PRODUCT_ID,
      p_quantity_to_add: 1,
    });
    expect(revalidateTag).toHaveBeenCalledWith("cart");
  });

  it("should create new cart if none exists and add item", async () => {
    const formData = new FormData();
    formData.append("productId", VALID_PRODUCT_ID);
    formData.append("quantity", "2");

    const newCartData = createTestCartData({
      id: "new-cart-789",
      user_id: VALID_AUTH_USER_ID,
      items: [
        {
          id: "new-item-1",
          productId: VALID_PRODUCT_ID,
          name: "New Product",
          price: 20.99,
          quantity: 2,
          image: "test.jpg",
          slug: "test-product",
        },
      ],
    });

    // Mock no existing cart, but successful cart creation
    const mockSupabase = createCompleteSupabaseMock({
      authUser: { id: VALID_AUTH_USER_ID },
      authCartData: null, // No existing cart
      newCartId: "new-cart-789", // Successful creation
      rpcError: null,
    });

    mockedCreateSupabaseServerClient.mockResolvedValue(mockSupabase);
    mockGetCart.mockResolvedValue(createSuccessResult(newCartData, "New cart created"));

    const result = await addItemToCart({}, formData);

    expect(result.success).toBe(true);
    if (isSuccessResult(result) && result.data) {
      expect(result.data.id).toBe("new-cart-789");
      expect(result.data.items[0].productId).toBe(VALID_PRODUCT_ID);
    }

    expect(mockSupabase.insertMock).toHaveBeenCalledWith({
      user_id: VALID_AUTH_USER_ID,
    });
    expect(mockSupabase.rpcMock).toHaveBeenCalledWith("add_or_update_cart_item", {
      p_cart_id: "new-cart-789",
      p_product_id: VALID_PRODUCT_ID,
      p_quantity_to_add: 2,
    });
  });

  it("should return a validation error for invalid form data", async () => {
    const formData = new FormData();
    formData.append("productId", ""); // Test min(1) validation
    formData.append("quantity", "abc");

    const result = await addItemToCart({}, formData);

    expect(result.success).toBe(false);
    expect(isValidationError(result)).toBe(true);
    if (isValidationError(result)) {
      expect(result.errors.productId).toBeDefined();
      expect(result.errors.quantity).toBeDefined();
    }
  });

  it("should return a general error if the RPC call fails", async () => {
    const formData = new FormData();
    formData.append("productId", VALID_PRODUCT_ID);
    formData.append("quantity", "1");

    const mockSupabase = createCompleteSupabaseMock({
      authUser: { id: VALID_AUTH_USER_ID },
      authCartData: { id: "cart-456" },
      rpcError: { message: "Database RPC error" },
    });

    mockedCreateSupabaseServerClient.mockResolvedValue(mockSupabase);

    const result = await addItemToCart({}, formData);

    expect(result.success).toBe(false);
    expect(isTestGeneralError(result)).toBe(true);
    if (isTestGeneralError(result)) {
      expect(result.error).toContain("Database RPC error");
    }
  });

  it("should handle user identification failure", async () => {
    const formData = new FormData();
    formData.append("productId", VALID_PRODUCT_ID);
    formData.append("quantity", "1");

    // ✅ Mock getActiveUserId pour retourner null
    mockGetActiveUserId.mockResolvedValue(null);

    const result = await addItemToCart({}, formData);

    expect(result.success).toBe(false);
    expect(isTestGeneralError(result)).toBe(true);
    if (isTestGeneralError(result)) {
      // ✅ Message d'erreur correct selon cartActions.ts ligne 38-39
      expect(result.error).toBe("User identification failed");
    }
  });
});

describe("migrateAndGetCart - Simplified", () => {
  let mockAdminClient: {
    auth: {
      admin: {
        getUserById: jest.Mock;
        deleteUser: jest.Mock;
      };
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCart.mockReset();

    // ✅ Setup de base pour les tests de migration
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

  it("should transfer guest cart ownership when auth user has no cart", async () => {
    const migratedCartData = createTestCartData({
      id: "guest-cart-id-123",
      user_id: VALID_AUTH_USER_ID,
    });

    const mockSupabase = createCompleteSupabaseMock({
      authUser: { id: VALID_AUTH_USER_ID },
      guestCartData: { id: "guest-cart-id-123" },
      authCartData: null, // Auth user has no cart
      updateError: null,
    });

    mockedCreateSupabaseServerClient.mockResolvedValue(mockSupabase);
    mockGetCart.mockResolvedValue(createSuccessResult(migratedCartData, "Cart migrated"));

    const result = await migrateAndGetCart({ guestUserId: VALID_GUEST_USER_ID });

    expect(result.success).toBe(true);
    if (isSuccessResult(result) && result.data) {
      expect(result.data.id).toBe("guest-cart-id-123");
      expect(result.data.user_id).toBe(VALID_AUTH_USER_ID);
    }

    expect(mockSupabase.updateMock).toHaveBeenCalledWith({
      user_id: VALID_AUTH_USER_ID,
    });
    expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith(VALID_GUEST_USER_ID);
    expect(revalidateTag).toHaveBeenCalledWith("cart");
  });

  it("should merge carts via RPC when both users have carts", async () => {
    const finalMergedCartData = createTestCartData({
      id: "auth-cart-id-789",
      user_id: VALID_AUTH_USER_ID,
      items: [
        {
          id: "merged-item-1",
          productId: VALID_PRODUCT_ID,
          name: "Merged Product",
          price: 20.99,
          quantity: 2,
          image: "test.jpg",
          slug: "test-product",
        },
      ],
    });

    const mockSupabase = createCompleteSupabaseMock({
      authUser: { id: VALID_AUTH_USER_ID },
      guestCartData: { id: "guest-cart-id-456" },
      authCartData: { id: "auth-cart-id-789" },
      rpcError: null,
    });

    mockedCreateSupabaseServerClient.mockResolvedValue(mockSupabase);
    mockGetCart.mockResolvedValue(createSuccessResult(finalMergedCartData, "Carts merged"));

    const result = await migrateAndGetCart({ guestUserId: VALID_GUEST_USER_ID });

    expect(result.success).toBe(true);
    if (isSuccessResult(result)) {
      expect(result.data?.id).toBe("auth-cart-id-789");
      expect(result.data?.items[0].name).toBe("Merged Product");
    }

    expect(mockSupabase.rpcMock).toHaveBeenCalledWith("merge_carts", {
      p_guest_cart_id: "guest-cart-id-456",
      p_auth_cart_id: "auth-cart-id-789",
    });
    expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith(VALID_GUEST_USER_ID);
    expect(revalidateTag).toHaveBeenCalledWith("cart");
  });

  it("should handle update failure during ownership transfer", async () => {
    const mockSupabase = createCompleteSupabaseMock({
      authUser: { id: VALID_AUTH_USER_ID },
      guestCartData: { id: "guest-cart-fail" },
      authCartData: null,
      updateError: { message: "Update failed" },
    });

    mockedCreateSupabaseServerClient.mockResolvedValue(mockSupabase);

    const result = await migrateAndGetCart({ guestUserId: VALID_GUEST_USER_ID });

    expect(result.success).toBe(false);
    if (isTestGeneralError(result)) {
      expect(result.error).toContain("Update failed");
    }

    expect(mockAdminClient.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it("should handle RPC failure during merge", async () => {
    const mockSupabase = createCompleteSupabaseMock({
      authUser: { id: VALID_AUTH_USER_ID },
      guestCartData: { id: "guest-cart-rpc-fail" },
      authCartData: { id: "auth-cart-rpc-fail" },
      rpcError: { message: "RPC merge failed" },
    });

    mockedCreateSupabaseServerClient.mockResolvedValue(mockSupabase);

    const result = await migrateAndGetCart({ guestUserId: VALID_GUEST_USER_ID });

    expect(result.success).toBe(false);
    if (isTestGeneralError(result)) {
      expect(result.error).toContain("RPC merge failed");
    }
  });

  it("should return error for invalid guest user (admin client error)", async () => {
    const mockSupabase = createCompleteSupabaseMock({
      authUser: { id: VALID_AUTH_USER_ID },
    });

    mockedCreateSupabaseServerClient.mockResolvedValue(mockSupabase);

    mockAdminClient.auth.admin.getUserById.mockResolvedValue({
      data: { user: null },
      error: { message: "User not found" },
    });

    const result = await migrateAndGetCart({ guestUserId: VALID_GUEST_USER_ID });

    expect(result.success).toBe(false);
    if (isTestGeneralError(result)) {
      expect(result.error).toBe("Utilisateur invité invalide ou non trouvé.");
    }
  });

  it("should handle non-anonymous guest user", async () => {
    const mockSupabase = createCompleteSupabaseMock({
      authUser: { id: VALID_AUTH_USER_ID },
    });

    mockedCreateSupabaseServerClient.mockResolvedValue(mockSupabase);

    mockAdminClient.auth.admin.getUserById.mockResolvedValue({
      data: { user: { id: VALID_GUEST_USER_ID, is_anonymous: false } },
      error: null,
    });

    const result = await migrateAndGetCart({ guestUserId: VALID_GUEST_USER_ID });

    expect(result.success).toBe(false);
    if (isTestGeneralError(result)) {
      expect(result.error).toBe("L'ID invité ne correspond pas à un utilisateur anonyme.");
    }
  });

  it("should handle authenticated user not found", async () => {
    const mockSupabase = createCompleteSupabaseMock({
      authUser: null, // No authenticated user
    });

    mockedCreateSupabaseServerClient.mockResolvedValue(mockSupabase);

    const result = await migrateAndGetCart({ guestUserId: VALID_GUEST_USER_ID });

    expect(result.success).toBe(false);
    if (isTestGeneralError(result)) {
      expect(result.error).toBe("Migration impossible : utilisateur non authentifié.");
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
