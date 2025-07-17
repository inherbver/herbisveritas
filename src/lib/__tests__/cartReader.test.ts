import { getCart } from "../cartReader";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveUserId } from "../authUtils";
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
const GUEST_CART_ID = "guest-cart-456";
const mockCartFromDB = {
  id: "cart-abc",
  user_id: VALID_USER_ID,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  cart_items: [
    {
      id: "item-1",
      product_id: "prod-1",
      quantity: 2,
      products: {
        id: "prod-1",
        name: "Produit 1",
        price: 100,
        image_url: "/img1.png",
        slug: "produit-1",
      },
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
  let mockSupabaseClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});

    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(),
    };
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
    mockSupabaseClient.maybeSingle.mockResolvedValue({ data: null, error: null });

    await getCart();

    expect(mockSupabaseClient.eq).toHaveBeenCalledWith("id", GUEST_CART_ID);
    expect(mockSupabaseClient.is).toHaveBeenCalledWith("user_id", null);
  });

  it("should return an error if the Supabase query fails", async () => {
    mockedGetActiveUserId.mockResolvedValue(VALID_USER_ID);
    const queryError = { message: "Database error" };
    mockSupabaseClient.maybeSingle.mockResolvedValue({ data: null, error: queryError });

    const result = await getCart();

    expect(result.success).toBe(false);
    expect(isGeneralErrorResult(result)).toBe(true);
    if (isGeneralErrorResult(result)) {
      expect(result.error).toContain(queryError.message);
    }
  });

  it("should return success with null data if no cart is found in DB", async () => {
    mockedGetActiveUserId.mockResolvedValue(VALID_USER_ID);
    mockSupabaseClient.maybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await getCart();

    expect(result.success).toBe(true);
    if (isSuccessResult(result)) {
      expect(result.data).toBeNull();
      expect(result.message).toBe("Aucun panier actif trouvé.");
    }
  });

  it("should return a cart and filter out items with missing product data", async () => {
    mockedGetActiveUserId.mockResolvedValue(VALID_USER_ID);
    mockSupabaseClient.maybeSingle.mockResolvedValue({ data: mockCartFromDB, error: null });

    const result = await getCart();

    expect(result.success).toBe(true);
    if (isSuccessResult(result) && result.data) {
      expect(result.data.id).toBe(mockCartFromDB.id);
      expect(result.data.items.length).toBe(1); // item-3 est filtré
      expect(result.data.items[0].productId).toBe("prod-1");
      expect(result.data.items[0].image).toBe("/img1.png");
    }
    expect(console.error).toHaveBeenCalledWith(
      "Données produit manquantes pour l'article ID: item-3",
    );
  });

  it("should correctly handle null image_url from DB", async () => {
    mockedGetActiveUserId.mockResolvedValue(VALID_USER_ID);
    const cartWithNullImage = {
      ...mockCartFromDB,
      cart_items: [
        {
          ...mockCartFromDB.cart_items[0],
          products: { ...mockCartFromDB.cart_items[0].products, image_url: null },
        },
      ],
    };
    mockSupabaseClient.maybeSingle.mockResolvedValue({ data: cartWithNullImage, error: null });

    const result = await getCart();

    expect(result.success).toBe(true);
    if (isSuccessResult(result) && result.data) {
      expect(result.data.items[0].image).toBeUndefined();
    }
  });
});
