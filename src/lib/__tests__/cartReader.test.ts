import { getCart } from "./cartReader";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveUserId } from "./authUtils";
import { isSuccessResult, isGeneralError } from "./cart-helpers";

// Mock des dépendances
jest.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: jest.fn(),
}));

jest.mock("./authUtils", () => ({
  getActiveUserId: jest.fn(),
}));

// Cast des mocks pour le typage
const mockedGetActiveUserId = getActiveUserId as jest.Mock;
const mockedCreateSupabaseServerClient = createSupabaseServerClient as jest.Mock;

// Données de test
const VALID_USER_ID = "user-123";
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
      id: "item-2",
      product_id: "prod-2",
      quantity: 1,
      products: {
        id: "prod-2",
        name: "Produit 2",
        price: 200,
        image_url: "/img2.png",
        slug: "produit-2",
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
  let mockSupabaseClient: {
    from: jest.Mock;
    select: jest.Mock;
    eq: jest.Mock;
    order: jest.Mock;
    maybeSingle: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});

    // Mock de base du client Supabase
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(),
    };
    mockedCreateSupabaseServerClient.mockResolvedValue(mockSupabaseClient);
  });

  it("should return an error if user identification fails", async () => {
    mockedGetActiveUserId.mockResolvedValue(null);

    const result = await getCart();

    expect(result.success).toBe(false);
    expect(isGeneralError(result)).toBe(true);
    if (isGeneralError(result)) {
      expect(result.message).toBe("Impossible d'identifier l'utilisateur.");
    }
  });

  it("should return an error if the Supabase query fails", async () => {
    mockedGetActiveUserId.mockResolvedValue(VALID_USER_ID);
    const queryError = { message: "Database error" };
    mockSupabaseClient.maybeSingle.mockResolvedValue({ data: null, error: queryError });

    const result = await getCart();

    expect(result.success).toBe(false);
    expect(isGeneralError(result)).toBe(true);
    if (isGeneralError(result)) {
      expect(result.error).toContain(queryError.message);
    }
  });

  it("should return success with null data if no cart is found", async () => {
    mockedGetActiveUserId.mockResolvedValue(VALID_USER_ID);
    mockSupabaseClient.maybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await getCart();

    expect(result.success).toBe(true);
    if (isSuccessResult(result)) {
      expect(result.data).toBeNull();
      expect(result.message).toBe("Aucun panier actif trouvé.");
    }
  });

  it("should return a cart with correctly transformed items", async () => {
    mockedGetActiveUserId.mockResolvedValue(VALID_USER_ID);
    const dbCart = { ...mockCartFromDB, cart_items: [mockCartFromDB.cart_items[0]] }; // Un seul item valide
    mockSupabaseClient.maybeSingle.mockResolvedValue({ data: dbCart, error: null });

    const result = await getCart();

    expect(result.success).toBe(true);
    if (isSuccessResult(result) && result.data) {
      expect(result.data.id).toBe(dbCart.id);
      expect(result.data.items.length).toBe(1);
      expect(result.data.items[0].productId).toBe("prod-1");
      expect(result.data.items[0].quantity).toBe(2);
      expect(result.data.items[0].name).toBe("Produit 1");
    }
  });

  it("should filter out items with missing product data", async () => {
    mockedGetActiveUserId.mockResolvedValue(VALID_USER_ID);
    mockSupabaseClient.maybeSingle.mockResolvedValue({ data: mockCartFromDB, error: null });

    const result = await getCart();

    expect(result.success).toBe(true);
    if (isSuccessResult(result) && result.data) {
      expect(result.data.items.length).toBe(2); // item-3 est filtré
      expect(result.data.items.find((item) => item.id === "item-3")).toBeUndefined();
    }
    expect(console.error).toHaveBeenCalledWith(
      "Données produit manquantes pour l'article ID: item-3"
    );
  });

  it("should return an empty cart if cart_items is null", async () => {
    mockedGetActiveUserId.mockResolvedValue(VALID_USER_ID);
    const emptyCart = { ...mockCartFromDB, cart_items: null };
    mockSupabaseClient.maybeSingle.mockResolvedValue({ data: emptyCart, error: null });

    const result = await getCart();

    expect(result.success).toBe(true);
    if (isSuccessResult(result) && result.data) {
      expect(result.data.items.length).toBe(0);
    }
  });
});
