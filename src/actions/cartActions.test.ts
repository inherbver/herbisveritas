import { revalidateTag } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSuccessResult, isGeneralError, isValidationError } from "@/lib/cart-helpers";
import { getCart, addItemToCart } from "./cartActions";

// Mock des modules externes
jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
}));

jest.mock("@/lib/supabase/server");

jest.mock("@/lib/supabase/server-admin", () => ({
  createSupabaseAdminClient: jest.fn(() => ({
    auth: {
      admin: {
        getUserById: jest.fn(),
        deleteUser: jest.fn(),
      },
    },
  })),
}));

const mockedCreateSupabaseServerClient = createSupabaseServerClient as jest.Mock;

// ✅ Types pour les erreurs et données mock
interface MockError {
  message: string;
  code?: string;
}

interface MockCartData {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  cart_items: Array<{
    id: string;
    product_id: string;
    quantity: number;
    products: {
      id: string;
      name: string;
      price: number;
      image_url: string;
      slug: string;
    } | null;
  }>;
}

// Mock Factory Robuste et Configurable
function createMockSupabaseClient(
  config: {
    authUser?: { id: string } | null;
    authError?: MockError | null;
    anonUser?: { id: string } | null;
    anonError?: MockError | null;
    existingCart?: { id: string } | null;
    cartError?: MockError | null;
    newCart?: { id: string } | null;
    newCartError?: MockError | null;
    rpcError?: MockError | null;
    getCartData?: MockCartData | null;
    getCartError?: MockError | null;
  } = {}
) {
  const {
    authUser = { id: "default-user-id" },
    authError = null,
    anonUser = { id: "anon-user-id" },
    anonError = null,
    existingCart = { id: "existing-cart-id" },
    cartError = null,
    newCart = { id: "new-cart-id" },
    newCartError = null,
    rpcError = null,
    getCartData = null,
    getCartError = null,
  } = config;

  return {
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
    from: jest.fn().mockImplementation((tableName: string) => {
      if (tableName === "carts") {
        return {
          select: jest.fn().mockImplementation((selectString: string) => {
            if (selectString === "id") {
              return {
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: existingCart,
                    error: cartError,
                  }),
                }),
              };
            } else if (selectString.includes("cart_items")) {
              return {
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    maybeSingle: jest.fn().mockResolvedValue({
                      data: getCartData,
                      error: getCartError,
                    }),
                  }),
                }),
              };
            }
            return {
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
              }),
            };
          }),
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: newCart,
                error: newCartError,
              }),
            }),
          }),
        };
      }

      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      };
    }),
    rpc: jest.fn().mockResolvedValue({
      error: rpcError,
    }),
  };
}

describe("Cart Actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("getCart", () => {
    it("should return the cart for an authenticated user", async () => {
      const mockUserId = "user-abc-123";
      const mockCartData = {
        id: "cart-def-456",
        user_id: mockUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        cart_items: [
          {
            id: "item-1",
            product_id: "prod-aaa",
            quantity: 2,
            products: {
              id: "prod-aaa",
              name: "Test Product A",
              price: 10.99,
              image_url: "image.jpg",
              slug: "test-product-a",
            },
          },
        ],
      };

      const mockClient = createMockSupabaseClient({
        authUser: { id: mockUserId },
        getCartData: mockCartData,
      });

      mockedCreateSupabaseServerClient.mockImplementation(() => mockClient);

      const result = await getCart();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(result.data?.id).toBe("cart-def-456");
        expect(result.data?.items.length).toBe(1);
        expect(result.data?.items[0].name).toBe("Test Product A");
      }
    });

    it("should return null when no cart exists", async () => {
      const mockClient = createMockSupabaseClient({
        authUser: { id: "user-no-cart" },
        getCartData: null,
      });

      mockedCreateSupabaseServerClient.mockImplementation(() => mockClient);

      const result = await getCart();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it("should handle user identification failure", async () => {
      const mockClient = createMockSupabaseClient({
        authUser: null,
        anonUser: null,
        anonError: { message: "Anonymous signin failed" },
      });

      mockedCreateSupabaseServerClient.mockImplementation(() => mockClient);

      const result = await getCart();

      expect(result.success).toBe(false);
    });
  });

  describe("addItemToCart", () => {
    const mockUserId = "user-abc-123";
    const mockProductId = "10e5352e-f98b-4de4-9642-4a3517724a87";
    const mockCartId = "cart-def-456";

    it("should add an item and return the updated cart", async () => {
      const formData = new FormData();
      formData.append("productId", mockProductId);
      formData.append("quantity", "1");

      const mockUpdatedCartData = {
        id: mockCartId,
        user_id: mockUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        cart_items: [
          {
            id: "item-1",
            product_id: mockProductId,
            quantity: 1,
            products: {
              id: mockProductId,
              name: "Test Product",
              price: 10.99,
              image_url: "test.jpg",
              slug: "test-product",
            },
          },
        ],
      };

      const mockClient = createMockSupabaseClient({
        authUser: { id: mockUserId },
        existingCart: { id: mockCartId },
        rpcError: null,
        getCartData: mockUpdatedCartData,
      });

      mockedCreateSupabaseServerClient.mockImplementation(() => mockClient);

      const result = await addItemToCart({}, formData);

      expect(result.success).toBe(true);
      expect(isSuccessResult(result)).toBe(true);

      if (isSuccessResult(result)) {
        expect(result.data).toBeDefined();
        expect(result.data?.items.length).toBe(1);
        expect(result.data?.items[0].productId).toBe(mockProductId);
      }

      expect(revalidateTag).toHaveBeenCalledWith("cart");
    });

    it("should create new cart if none exists", async () => {
      const formData = new FormData();
      formData.append("productId", mockProductId);
      formData.append("quantity", "2");

      const mockNewCartData = {
        id: "new-cart-id",
        user_id: mockUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        cart_items: [],
      };

      const mockClient = createMockSupabaseClient({
        authUser: { id: mockUserId },
        existingCart: null,
        newCart: { id: "new-cart-id" },
        rpcError: null,
        getCartData: mockNewCartData,
      });

      mockedCreateSupabaseServerClient.mockImplementation(() => mockClient);

      const result = await addItemToCart({}, formData);

      expect(result.success).toBe(true);
      expect(isSuccessResult(result)).toBe(true);
    });

    it("should return a validation error for invalid form data", async () => {
      const formData = new FormData();
      formData.append("productId", "not-a-valid-uuid");
      formData.append("quantity", "abc");

      const mockClient = createMockSupabaseClient({
        authUser: { id: mockUserId },
      });

      mockedCreateSupabaseServerClient.mockImplementation(() => mockClient);

      const result = await addItemToCart({}, formData);

      expect(result.success).toBe(false);
      expect(isValidationError(result)).toBe(true);

      if (isValidationError(result)) {
        expect(result.errors).toBeDefined();
        expect(result.errors.productId).toBeDefined();
        expect(result.errors.quantity).toBeDefined();
      }

      expect(mockClient.rpc).not.toHaveBeenCalled();
    });

    it("should return a general error if the RPC call fails", async () => {
      const formData = new FormData();
      formData.append("productId", mockProductId);
      formData.append("quantity", "1");

      const mockClient = createMockSupabaseClient({
        authUser: { id: mockUserId },
        existingCart: { id: mockCartId },
        rpcError: { message: "Database RPC error" },
      });

      mockedCreateSupabaseServerClient.mockImplementation(() => mockClient);

      const result = await addItemToCart({}, formData);

      expect(result.success).toBe(false);
      expect(isGeneralError(result)).toBe(true);

      if (isGeneralError(result)) {
        expect(result.error).toContain("Database RPC error");
      }

      expect(mockClient.rpc).toHaveBeenCalledWith("add_or_update_cart_item", {
        p_cart_id: mockCartId,
        p_product_id: mockProductId,
        p_quantity_to_add: 1,
      });
    });

    it("should handle cart creation failure", async () => {
      const formData = new FormData();
      formData.append("productId", mockProductId);
      formData.append("quantity", "1");

      const mockClient = createMockSupabaseClient({
        authUser: { id: mockUserId },
        existingCart: null,
        newCart: null,
        newCartError: { message: "Failed to create cart" },
      });

      mockedCreateSupabaseServerClient.mockImplementation(() => mockClient);

      const result = await addItemToCart({}, formData);

      expect(result.success).toBe(false);
      expect(isGeneralError(result)).toBe(true);

      if (isGeneralError(result)) {
        expect(result.error).toContain("Failed to create cart");
      }
    });

    it("should handle user identification failure", async () => {
      const formData = new FormData();
      formData.append("productId", mockProductId);
      formData.append("quantity", "1");

      const mockClient = createMockSupabaseClient({
        authUser: null,
        anonUser: null,
        anonError: { message: "Auth failed" },
      });

      mockedCreateSupabaseServerClient.mockImplementation(() => mockClient);

      const result = await addItemToCart({}, formData);

      expect(result.success).toBe(false);
      expect(isGeneralError(result)).toBe(true);

      if (isGeneralError(result)) {
        expect(result.error).toBe("User identification failed");
      }
    });
  });
});
