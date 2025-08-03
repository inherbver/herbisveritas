import { revalidateTag } from "next/cache";
import { createSupabaseServerClient } from '../../lib/supabase/server';
import { createSupabaseAdminClient } from '../../lib/supabase/server-admin';
import { ValidationErrorResult, GeneralErrorResult, createSuccessResult, isSuccessResult } from '../../lib/cart-helpers';
import { CartItem, CartData } from '../../types/cart';

// Mock des modules externes
jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
}));
jest.mock("../../lib/supabase/server");
jest.mock("../../lib/supabase/server-admin");
jest.mock("../../lib/cartReader");
jest.mock("../../utils/authUtils");
jest.mock("crypto", () => ({
  randomUUID: jest.fn(() => "mock-uuid-123"),
}));

// Import des fonctions à tester
import { 
  addItemToCartAction, 
  removeItemFromCartAction,
  updateCartItemQuantityAction,
  clearCartAction,
  migrateAndGetCart 
} from "../cartActions";
import { getCart } from "../../lib/cartReader";
import { getActiveUserId } from "../../utils/authUtils";

// Mocks typés
const mockGetCart = getCart as jest.Mock;
const mockGetActiveUserId = getActiveUserId as jest.Mock;
const mockedCreateSupabaseServerClient = createSupabaseServerClient as jest.Mock;
const mockedCreateSupabaseAdminClient = createSupabaseAdminClient as jest.Mock;
const mockRevalidateTag = revalidateTag as jest.Mock;

// UUIDs valides pour les tests
const VALID_AUTH_USER_ID = "123e4567-e89b-12d3-a456-426614174000";
const VALID_PRODUCT_ID = "550e8400-e29b-41d4-a716-446655440000";
const VALID_CART_ITEM_ID = "789e0123-e89b-12d3-a456-426614174000";

// Utility function to create FormData from object
function createFormData(data: Record<string, string | undefined>): FormData {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      formData.append(key, value);
    }
  });
  return formData;
}

// Factory pour créer des données de test cohérentes
function createTestCartData(overrides: Partial<CartData> = {}): CartData {
  return {
    id: "test-cart-123",
    user_id: VALID_AUTH_USER_ID,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    items: [
      {
        id: VALID_CART_ITEM_ID,
        productId: VALID_PRODUCT_ID,
        name: "Test Product",
        price: 10.99,
        quantity: 1,
        image: "test.jpg",
      },
    ],
    ...overrides,
  };
}

function createTestProduct(overrides: any = {}) {
  return {
    id: VALID_PRODUCT_ID,
    name: "Test Product",
    price: 10.99,
    image_url: "test.jpg",
    stock: 10,
    slug: "test-product",
    is_active: true,
    ...overrides,
  };
}

function createTestCartItem(overrides: any = {}) {
  return {
    id: VALID_CART_ITEM_ID,
    product_id: VALID_PRODUCT_ID,
    quantity: 1,
    name: "Test Product",
    price: 10.99,
    image_url: "test.jpg",
    cart_id: "test-cart-123",
    products: {
      stock: 10,
      name: "Test Product",
    },
    ...overrides,
  };
}

// Mock factory simplifié pour Supabase
function createMockSupabaseClient(config: {
  productResponse?: { data: any; error: any };
  cartResponse?: { data: any; error: any };
  cartItemResponse?: { data: any; error: any };
  insertResponse?: { data: any; error: any };
  updateResponse?: { error: any };
  deleteResponse?: { error: any };
} = {}) {
  const {
    productResponse = { data: createTestProduct(), error: null },
    cartResponse = { data: null, error: null },
    cartItemResponse = { data: null, error: null },
    insertResponse = { data: { id: "mock-uuid-123" }, error: null },
    updateResponse = { error: null },
    deleteResponse = { error: null },
  } = config;

  const mockQuery = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
  };

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: VALID_AUTH_USER_ID } },
        error: null,
      }),
    },
    from: jest.fn().mockImplementation((table: string) => {
      const chainMock = { ...mockQuery };
      
      if (table === "products") {
        chainMock.single.mockResolvedValue(productResponse);
      } else if (table === "carts") {
        chainMock.single.mockResolvedValue(cartResponse);
        chainMock.maybeSingle.mockResolvedValue(cartResponse);
        chainMock.insert.mockResolvedValue(insertResponse);
        chainMock.delete.mockImplementation(() => ({
          eq: jest.fn().mockResolvedValue(deleteResponse),
        }));
      } else if (table === "cart_items") {
        chainMock.single.mockResolvedValue(cartItemResponse);
        chainMock.insert.mockResolvedValue(insertResponse);
        chainMock.update.mockImplementation(() => ({
          eq: jest.fn().mockResolvedValue(updateResponse),
        }));
        chainMock.delete.mockImplementation(() => ({
          eq: jest.fn().mockResolvedValue(deleteResponse),
        }));
      }
      
      return chainMock;
    }),
  };
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

describe("cartActions.ts - Complete Test Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetActiveUserId.mockResolvedValue(VALID_AUTH_USER_ID);
  });

  describe("addItemToCartAction", () => {
    it("should add a new item to an existing cart successfully", async () => {
      const existingCart = createTestCartData({ items: [] });
      
      mockGetCart.mockResolvedValueOnce(createSuccessResult(existingCart))
                .mockResolvedValueOnce(createSuccessResult(createTestCartData()));
      
      const mockSupabase = createMockSupabaseClient();
      const mockAdminSupabase = createMockSupabaseClient();
      
      mockedCreateSupabaseServerClient.mockResolvedValue(mockSupabase);
      mockedCreateSupabaseAdminClient.mockResolvedValue(mockAdminSupabase);

      const formData = createFormData({
        productId: VALID_PRODUCT_ID,
        quantity: "2",
      });

      const result = await addItemToCartAction(null, formData);

      expect(result.success).toBe(true);
      expect(mockRevalidateTag).toHaveBeenCalledWith("cart");
    });

    it("should update quantity of existing item in cart", async () => {
      const existingCart = createTestCartData();
      
      mockGetCart.mockResolvedValueOnce(createSuccessResult(existingCart))
                .mockResolvedValueOnce(createSuccessResult(createTestCartData()));
      
      const mockSupabase = createMockSupabaseClient();
      const mockAdminSupabase = createMockSupabaseClient();
      
      mockedCreateSupabaseServerClient.mockResolvedValue(mockSupabase);
      mockedCreateSupabaseAdminClient.mockResolvedValue(mockAdminSupabase);

      const formData = createFormData({
        productId: VALID_PRODUCT_ID,
        quantity: "1",
      });

      const result = await addItemToCartAction(null, formData);

      expect(result.success).toBe(true);
    });

    it("should create a new cart if user has no cart", async () => {
      mockGetCart.mockResolvedValueOnce(createSuccessResult(null))
                .mockResolvedValueOnce(createSuccessResult(createTestCartData()));
      
      const mockSupabase = createMockSupabaseClient();
      const mockAdminSupabase = createMockSupabaseClient();
      
      mockedCreateSupabaseServerClient.mockResolvedValue(mockSupabase);
      mockedCreateSupabaseAdminClient.mockResolvedValue(mockAdminSupabase);

      const formData = createFormData({
        productId: VALID_PRODUCT_ID,
        quantity: "1",
      });

      const result = await addItemToCartAction(null, formData);

      expect(result.success).toBe(true);
    });

    it("should return validation error for invalid productId", async () => {
      const formData = createFormData({
        productId: "invalid-uuid",
        quantity: "1",
      });

      const result = await addItemToCartAction(null, formData);

      expect(result.success).toBe(false);
      expect(isTestValidationError(result)).toBe(true);
      if (isTestValidationError(result)) {
        expect(result.errors.productId).toBeDefined();
      }
    });

    it("should return validation error for invalid quantity", async () => {
      const formData = createFormData({
        productId: VALID_PRODUCT_ID,
        quantity: "-1",
      });

      const result = await addItemToCartAction(null, formData);

      expect(result.success).toBe(false);
      expect(isTestValidationError(result)).toBe(true);
      if (isTestValidationError(result)) {
        expect(result.errors.quantity).toBeDefined();
      }
    });

    it("should return error when product not found", async () => {
      mockGetCart.mockResolvedValue(createSuccessResult(null));
      
      const mockSupabase = createMockSupabaseClient({
        productResponse: { data: null, error: { message: "Product not found" } },
      });
      
      mockedCreateSupabaseServerClient.mockResolvedValue(mockSupabase);

      const formData = createFormData({
        productId: VALID_PRODUCT_ID,
        quantity: "1",
      });

      const result = await addItemToCartAction(null, formData);

      expect(result.success).toBe(false);
      if (isTestGeneralError(result)) {
        expect(result.error).toBe("Produit non trouvé ou non disponible.");
      }
    });

    it("should return error when insufficient stock", async () => {
      mockGetCart.mockResolvedValue(createSuccessResult(null));
      
      const mockSupabase = createMockSupabaseClient({
        productResponse: { data: createTestProduct({ stock: 1 }), error: null },
      });
      
      mockedCreateSupabaseServerClient.mockResolvedValue(mockSupabase);

      const formData = createFormData({
        productId: VALID_PRODUCT_ID,
        quantity: "5",
      });

      const result = await addItemToCartAction(null, formData);

      expect(result.success).toBe(false);
      if (isTestGeneralError(result)) {
        expect(result.error).toBe("Stock insuffisant pour ce produit.");
      }
    });
  });

  describe("removeItemFromCartAction", () => {
    it("should remove item from cart successfully", async () => {
      // Mock getCart pour retourner un panier vide après suppression
      mockGetCart.mockResolvedValue(createSuccessResult(createTestCartData({ items: [] })));
      
      const mockAdminSupabase = createMockSupabaseClient({
        deleteResponse: { error: null } // Succès de la suppression
      });
      mockedCreateSupabaseAdminClient.mockResolvedValue(mockAdminSupabase);

      const formData = createFormData({
        cartItemId: VALID_CART_ITEM_ID,
      });

      const result = await removeItemFromCartAction(null, formData);

      expect(result.success).toBe(true);
      expect(mockRevalidateTag).toHaveBeenCalledWith("cart");
    });

    it("should return validation error for invalid cartItemId", async () => {
      const formData = createFormData({
        cartItemId: "invalid-uuid",
      });

      const result = await removeItemFromCartAction(null, formData);

      expect(result.success).toBe(false);
      expect(isTestValidationError(result)).toBe(true);
      if (isTestValidationError(result)) {
        expect(result.errors.cartItemId).toBeDefined();
      }
    });

    it("should handle database error during removal", async () => {
      const mockAdminSupabase = createMockSupabaseClient({
        deleteResponse: { error: { message: "Database error" } },
      });
      mockedCreateSupabaseAdminClient.mockResolvedValue(mockAdminSupabase);

      const formData = createFormData({
        cartItemId: VALID_CART_ITEM_ID,
      });

      const result = await removeItemFromCartAction(null, formData);

      expect(result.success).toBe(false);
      if (isTestGeneralError(result)) {
        expect(result.error).toBe("Erreur lors de la suppression de l'article.");
      }
    });
  });

  describe("updateCartItemQuantityAction", () => {
    it("should update item quantity successfully", async () => {
      const mockSupabase = createMockSupabaseClient({
        cartItemResponse: { data: createTestCartItem(), error: null },
      });
      const mockAdminSupabase = createMockSupabaseClient({
        updateResponse: { error: null } // Succès de la mise à jour
      });
      
      mockedCreateSupabaseServerClient.mockResolvedValue(mockSupabase);
      mockedCreateSupabaseAdminClient.mockResolvedValue(mockAdminSupabase);
      
      // Mock getCart pour retourner le panier mis à jour
      mockGetCart.mockResolvedValue(createSuccessResult(createTestCartData()));

      const formData = createFormData({
        cartItemId: VALID_CART_ITEM_ID,
        quantity: "3",
      });

      const result = await updateCartItemQuantityAction(null, formData);

      expect(result.success).toBe(true);
      expect(mockRevalidateTag).toHaveBeenCalledWith("cart");
    });

    it("should remove item when quantity is 0", async () => {
      // Mock getCart pour retourner un panier vide après suppression
      mockGetCart.mockResolvedValue(createSuccessResult(createTestCartData({ items: [] })));
      
      const mockAdminSupabase = createMockSupabaseClient({
        deleteResponse: { error: null } // Succès de la suppression via removeItemFromCartAction
      });
      mockedCreateSupabaseAdminClient.mockResolvedValue(mockAdminSupabase);

      const formData = createFormData({
        cartItemId: VALID_CART_ITEM_ID,
        quantity: "0",
      });

      const result = await updateCartItemQuantityAction(null, formData);

      expect(result.success).toBe(true);
    });

    it("should return validation error for invalid quantity", async () => {
      const formData = createFormData({
        cartItemId: VALID_CART_ITEM_ID,
        quantity: "101",
      });

      const result = await updateCartItemQuantityAction(null, formData);

      expect(result.success).toBe(false);
      expect(isTestValidationError(result)).toBe(true);
      if (isTestValidationError(result)) {
        expect(result.errors.quantity).toBeDefined();
      }
    });

    it("should return error when cart item not found", async () => {
      const mockSupabase = createMockSupabaseClient({
        cartItemResponse: { data: null, error: { message: "Not found" } },
      });
      
      mockedCreateSupabaseServerClient.mockResolvedValue(mockSupabase);

      const formData = createFormData({
        cartItemId: VALID_CART_ITEM_ID,
        quantity: "2",
      });

      const result = await updateCartItemQuantityAction(null, formData);

      expect(result.success).toBe(false);
      if (isTestGeneralError(result)) {
        expect(result.error).toBe("Article non trouvé dans le panier.");
      }
    });

    it("should return error when insufficient stock", async () => {
      const mockSupabase = createMockSupabaseClient({
        cartItemResponse: { 
          data: createTestCartItem({
            products: { stock: 2, name: "Test Product" }
          }), 
          error: null 
        },
      });
      
      mockedCreateSupabaseServerClient.mockResolvedValue(mockSupabase);

      const formData = createFormData({
        cartItemId: VALID_CART_ITEM_ID,
        quantity: "5",
      });

      const result = await updateCartItemQuantityAction(null, formData);

      expect(result.success).toBe(false);
      if (isTestGeneralError(result)) {
        expect(result.error).toBe("Stock insuffisant pour cette quantité.");
      }
    });
  });

  describe("clearCartAction", () => {
    it("should clear cart successfully", async () => {
      const existingCart = createTestCartData();
      mockGetCart.mockResolvedValue(createSuccessResult(existingCart));
      
      const mockSupabase = createMockSupabaseClient();
      const mockAdminSupabase = createMockSupabaseClient();
      
      mockedCreateSupabaseServerClient.mockResolvedValue(mockSupabase);
      mockedCreateSupabaseAdminClient.mockResolvedValue(mockAdminSupabase);

      const result = await clearCartAction();

      expect(result.success).toBe(true);
      expect(mockRevalidateTag).toHaveBeenCalledWith("cart");
      if (result.success) {
        expect(result.message).toBe("Panier vidé avec succès.");
      }
    });

    it("should handle empty cart gracefully", async () => {
      mockGetCart.mockResolvedValue(createSuccessResult(null));

      const result = await clearCartAction();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.message).toBe("Panier déjà vide.");
      }
    });

    it("should handle database error during cart clearing", async () => {
      const existingCart = createTestCartData();
      mockGetCart.mockResolvedValue(createSuccessResult(existingCart));
      
      const mockSupabase = createMockSupabaseClient();
      const mockAdminSupabase = createMockSupabaseClient({
        deleteResponse: { error: { message: "Database error" } },
      });
      
      mockedCreateSupabaseServerClient.mockResolvedValue(mockSupabase);
      mockedCreateSupabaseAdminClient.mockResolvedValue(mockAdminSupabase);

      const result = await clearCartAction();

      expect(result.success).toBe(false);
      if (isTestGeneralError(result)) {
        expect(result.error).toBe("Erreur lors de la suppression des articles.");
      }
    });
  });

  describe("migrateAndGetCart", () => {
    it("should return current cart when no guest items provided", async () => {
      const currentCart = createTestCartData();
      mockGetCart.mockResolvedValue(createSuccessResult(currentCart));

      const result = await migrateAndGetCart([]);

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.id).toBe(currentCart.id);
      }
    });

    it("should migrate guest items to existing user cart", async () => {
      const guestItems = [
        {
          productId: VALID_PRODUCT_ID,
          quantity: 2,
        },
      ];

      const mockSupabase = createMockSupabaseClient({
        cartResponse: { data: { id: "user-cart-123" }, error: null },
        cartItemResponse: { data: null, error: null },
      });
      const mockAdminSupabase = createMockSupabaseClient();
      
      mockedCreateSupabaseServerClient.mockResolvedValue(mockSupabase);
      mockedCreateSupabaseAdminClient.mockResolvedValue(mockAdminSupabase);
      
      const finalCart = createTestCartData({ id: "user-cart-123" });
      mockGetCart.mockResolvedValue(createSuccessResult(finalCart));

      const result = await migrateAndGetCart(guestItems);

      expect(result.success).toBe(true);
      expect(mockRevalidateTag).toHaveBeenCalledWith("cart");
    });

    it("should handle unauthenticated user", async () => {
      mockGetActiveUserId.mockResolvedValue(null);

      const result = await migrateAndGetCart([{ productId: VALID_PRODUCT_ID, quantity: 1 }]);

      expect(result.success).toBe(false);
      if (isTestGeneralError(result)) {
        expect(result.error).toBe("Utilisateur non authentifié.");
      }
    });
  });

  describe("Error Handling & Edge Cases", () => {
    it("should handle unexpected errors gracefully", async () => {
      mockGetActiveUserId.mockRejectedValue(new Error("Unexpected error"));

      const formData = createFormData({
        productId: VALID_PRODUCT_ID,
        quantity: "1",
      });

      const result = await addItemToCartAction(null, formData);

      expect(result.success).toBe(false);
      if (isTestGeneralError(result)) {
        expect(result.error).toBe("Une erreur inattendue s'est produite.");
      }
    });

    it("should handle missing FormData fields", async () => {
      const formData = new FormData();

      const result = await addItemToCartAction(null, formData);

      expect(result.success).toBe(false);
      expect(isTestValidationError(result)).toBe(true);
    });

    it("should handle malformed FormData", async () => {
      const formData = createFormData({
        productId: VALID_PRODUCT_ID,
        quantity: "not-a-number",
      });

      const result = await addItemToCartAction(null, formData);

      expect(result.success).toBe(false);
      expect(isTestValidationError(result)).toBe(true);
    });
  });

  describe("Integration Tests", () => {
    it("should properly validate all input schemas", async () => {
      const invalidCases = [
        {
          action: addItemToCartAction,
          data: { productId: "invalid", quantity: "-1" },
          expectedErrors: ["productId", "quantity"],
        },
        {
          action: removeItemFromCartAction,
          data: { cartItemId: "invalid" },
          expectedErrors: ["cartItemId"],
        },
        {
          action: updateCartItemQuantityAction,
          data: { cartItemId: "invalid", quantity: "101" },
          expectedErrors: ["cartItemId", "quantity"],
        },
      ];

      for (const testCase of invalidCases) {
        const formData = createFormData(testCase.data);
        const result = await testCase.action(null, formData);
        
        expect(result.success).toBe(false);
        expect(isTestValidationError(result)).toBe(true);
        
        if (isTestValidationError(result)) {
          testCase.expectedErrors.forEach(field => {
            expect(result.errors[field]).toBeDefined();
          });
        }
      }
    });
  });
});