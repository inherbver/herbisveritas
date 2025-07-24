import { getCart, type ServerProduct } from "../cartReader";
import { type SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveUserId } from "@/utils/authUtils";
import { isSuccessResult, isGeneralErrorResult } from "../cart-helpers";
import { cookies } from "next/headers";

// Mock des dépendances
jest.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: jest.fn(),
}));

jest.mock("../authUtils", () => ({
  getActiveUserId: jest.fn(),
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

// Cast des mocks pour le typage
const mockedGetActiveUserId = getActiveUserId as jest.Mock;
const mockedCreateSupabaseServerClient = createSupabaseServerClient as jest.Mock;
const mockedCookies = cookies as jest.Mock;

// Données de test
const VALID_USER_ID = "user-123";
const GUEST_CART_ID = "guest-cart-uuid";

const mockProduct: ServerProduct = {
  id: "prod-123",
  name: "Test Product",
  price: 100,
  image_url: "/test-image.jpg",
  slug: "test-product",
};

const mockCartData = {
  id: "cart-abc",
  user_id: VALID_USER_ID,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  cart_items: [
    {
      id: "item-1",
      product_id: "prod-123",
      quantity: 2,
      products: mockProduct,
    },
    {
      id: "item-3", // Item invalide sans détails produit
      product_id: "prod-3",
      quantity: 1,
      products: null,
    },
  ],
};

describe("getCart", () => {
  let mockSupabaseClient: jest.Mocked<SupabaseClient>;
  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});

    // Configure le mock du client pour retourner le query builder
    mockSupabaseClient = {
      from: jest.fn().mockReturnValue(mockQueryBuilder),
    } as unknown as jest.Mocked<SupabaseClient>;
    mockedCreateSupabaseServerClient.mockResolvedValue(mockSupabaseClient);
  });

  it("should return success with null data if no user and no guest cart cookie", async () => {
    mockedGetActiveUserId.mockResolvedValue(null);
    mockedCookies.mockReturnValue({ get: () => undefined });

    const result = await getCart();

    expect(result.success).toBe(true);
    if (isSuccessResult(result)) {
      expect(result.data).toBeNull();
      expect(result.message).toBe("Aucun panier invité trouvé.");
    }
  });

  it("should query for a guest cart using cookie id", async () => {
    mockedGetActiveUserId.mockResolvedValue(null);
    mockedCookies.mockReturnValue({ get: () => ({ value: GUEST_CART_ID }) });
    mockQueryBuilder.maybeSingle.mockResolvedValue({ data: null, error: null });

    await getCart();

    expect(mockSupabaseClient.from).toHaveBeenCalledWith("carts");
    expect(mockQueryBuilder.select).toHaveBeenCalledWith(expect.any(String));
    expect(mockQueryBuilder.eq).toHaveBeenCalledWith("id", GUEST_CART_ID);
    expect(mockQueryBuilder.is).toHaveBeenCalledWith("user_id", null);
    expect(mockQueryBuilder.maybeSingle).toHaveBeenCalled();
  });

  it("should query for a user cart using user id", async () => {
    mockedGetActiveUserId.mockResolvedValue(VALID_USER_ID);
    mockQueryBuilder.maybeSingle.mockResolvedValue({ data: null, error: null });

    await getCart();

    expect(mockSupabaseClient.from).toHaveBeenCalledWith("carts");
    expect(mockQueryBuilder.select).toHaveBeenCalledWith(expect.any(String));
    expect(mockQueryBuilder.eq).toHaveBeenCalledWith("user_id", VALID_USER_ID);
    expect(mockQueryBuilder.maybeSingle).toHaveBeenCalled();
  });

  it("should return an error if the Supabase query fails", async () => {
    mockedGetActiveUserId.mockResolvedValue(VALID_USER_ID);
    const queryError = { message: "Database error" };
    mockQueryBuilder.maybeSingle.mockResolvedValue({ data: null, error: queryError });

    const result = await getCart();

    expect(result.success).toBe(false);
    expect(isGeneralErrorResult(result)).toBe(true);
    if (isGeneralErrorResult(result)) {
      expect(result.error).toContain(queryError.message);
    }
  });

  it("should return success with null data if no cart is found in DB", async () => {
    mockedGetActiveUserId.mockResolvedValue(VALID_USER_ID);
    mockQueryBuilder.maybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await getCart();

    expect(result.success).toBe(true);
    if (isSuccessResult(result)) {
      expect(result.data).toBeNull();
      expect(result.message).toBe("Aucun panier actif trouvé.");
    }
  });

  it("should return a cart and filter out items with missing product data", async () => {
    mockedGetActiveUserId.mockResolvedValue(VALID_USER_ID);
    mockQueryBuilder.maybeSingle.mockResolvedValue({ data: mockCartData, error: null });

    const result = await getCart();

    expect(result.success).toBe(true);
    if (isSuccessResult(result) && result.data) {
      expect(result.data.id).toBe(mockCartData.id);
      expect(result.data.items.length).toBe(1); // item-3 est filtré
      expect(result.data.items[0].productId).toBe(mockProduct.id);
      // Test de la transformation de l'URL de l'image
      expect(result.data.items[0].image).toContain(mockProduct.image_url?.substring(1));
    }
    expect(console.error).toHaveBeenCalledWith(
      "Données produit manquantes pour l'article ID: item-3"
    );
  });

  it("should correctly handle null image_url from DB", async () => {
    mockedGetActiveUserId.mockResolvedValue(VALID_USER_ID);
    const cartWithNullImage = {
      ...mockCartData,
      cart_items: [
        {
          ...mockCartData.cart_items[0],
          products: { ...mockProduct, image_url: null },
        },
      ],
    };
    mockQueryBuilder.maybeSingle.mockResolvedValue({ data: cartWithNullImage, error: null });

    const result = await getCart();

    expect(result.success).toBe(true);
    if (isSuccessResult(result) && result.data) {
      expect(result.data.items[0].image).toBeUndefined();
    }
  });
});
