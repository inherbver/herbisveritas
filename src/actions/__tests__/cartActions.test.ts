/**
 * Tests for Cart Server Actions
 */

import {
  addToCartAction,
  removeFromCartAction,
  updateQuantityAction,
  clearCartAction,
  getCartAction,
  syncCartAction,
} from "../cartActions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Mock dependencies
jest.mock("@/lib/supabase/server");
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(() => mockSupabaseClient),
  select: jest.fn(() => mockSupabaseClient),
  eq: jest.fn(() => mockSupabaseClient),
  single: jest.fn(),
  insert: jest.fn(() => mockSupabaseClient),
  update: jest.fn(() => mockSupabaseClient),
  delete: jest.fn(() => mockSupabaseClient),
  upsert: jest.fn(() => mockSupabaseClient),
};

(createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabaseClient);

// Mock cart data
const mockCart = {
  id: "cart-123",
  user_id: "user-123",
  items: [
    {
      id: "item-1",
      product_id: "prod-1",
      quantity: 2,
      price: 29.99,
      product: {
        id: "prod-1",
        name: "Test Product",
        price: 29.99,
        stock: 100,
        image_url: "test.jpg",
      },
    },
  ],
  created_at: "2024-01-01",
  updated_at: "2024-01-01",
};

const mockProduct = {
  id: "prod-1",
  name: "Test Product",
  slug: "test-product",
  price: 29.99,
  stock: 100,
  is_active: true,
  image_url: "test.jpg",
};

describe("cartActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("addToCartAction", () => {
    it("should add item to cart for authenticated user", async () => {
      const formData = new FormData();
      formData.append("productId", "prod-1");
      formData.append("quantity", "2");

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      // Mock product fetch
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockProduct,
        error: null,
      });

      // Mock existing cart
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockCart,
        error: null,
      });

      // Mock cart update
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { ...mockCart, items: [...mockCart.items] },
        error: null,
      });

      const result = await addToCartAction(undefined, formData);

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("products");
      expect(revalidatePath).toHaveBeenCalledWith("/cart");
    });

    it("should add item to guest cart", async () => {
      const formData = new FormData();
      formData.append("productId", "prod-1");
      formData.append("quantity", "1");
      formData.append("guestCartId", "guest-123");

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Mock product fetch
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockProduct,
        error: null,
      });

      // Mock guest cart operations
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116" }, // Not found
      });

      // Mock cart creation
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: "guest-123", items: [] },
        error: null,
      });

      const result = await addToCartAction(undefined, formData);

      expect(result.success).toBe(true);
      expect(result.data?.cartId).toBe("guest-123");
    });

    it("should validate quantity", async () => {
      const formData = new FormData();
      formData.append("productId", "prod-1");
      formData.append("quantity", "-1");

      const result = await addToCartAction(undefined, formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("quantité");
    });

    it("should check product stock", async () => {
      const formData = new FormData();
      formData.append("productId", "prod-1");
      formData.append("quantity", "200");

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      // Mock product with low stock
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { ...mockProduct, stock: 5 },
        error: null,
      });

      const result = await addToCartAction(undefined, formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("stock");
    });
  });

  describe("removeFromCartAction", () => {
    it("should remove item from cart", async () => {
      const formData = new FormData();
      formData.append("itemId", "item-1");

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      // Mock cart fetch
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockCart,
        error: null,
      });

      // Mock item deletion
      mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.delete.mockReturnValue({
        error: null,
      });

      const result = await removeFromCartAction(undefined, formData);

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.delete).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith("/cart");
    });

    it("should handle item not found", async () => {
      const formData = new FormData();
      formData.append("itemId", "non-existent");

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      // Mock cart fetch
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { ...mockCart, items: [] },
        error: null,
      });

      const result = await removeFromCartAction(undefined, formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Article non trouvé");
    });
  });

  describe("updateQuantityAction", () => {
    it("should update item quantity", async () => {
      const formData = new FormData();
      formData.append("itemId", "item-1");
      formData.append("quantity", "5");

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      // Mock cart item fetch
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockCart.items[0],
        error: null,
      });

      // Mock product fetch for stock check
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockProduct,
        error: null,
      });

      // Mock update
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { ...mockCart.items[0], quantity: 5 },
        error: null,
      });

      const result = await updateQuantityAction(undefined, formData);

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.update).toHaveBeenCalled();
    });

    it("should remove item if quantity is 0", async () => {
      const formData = new FormData();
      formData.append("itemId", "item-1");
      formData.append("quantity", "0");

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      // Mock cart item fetch
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockCart.items[0],
        error: null,
      });

      // Mock deletion
      mockSupabaseClient.delete.mockReturnValue({
        error: null,
      });

      const result = await updateQuantityAction(undefined, formData);

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.delete).toHaveBeenCalled();
    });

    it("should validate quantity against stock", async () => {
      const formData = new FormData();
      formData.append("itemId", "item-1");
      formData.append("quantity", "150");

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      // Mock cart item fetch
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockCart.items[0],
        error: null,
      });

      // Mock product with limited stock
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { ...mockProduct, stock: 10 },
        error: null,
      });

      const result = await updateQuantityAction(undefined, formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("stock");
    });
  });

  describe("clearCartAction", () => {
    it("should clear all cart items", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      // Mock cart fetch
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockCart,
        error: null,
      });

      // Mock items deletion
      mockSupabaseClient.delete.mockReturnValue({
        error: null,
      });

      const result = await clearCartAction();

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.delete).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith("/cart");
    });

    it("should handle empty cart", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      // Mock empty cart
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { ...mockCart, items: [] },
        error: null,
      });

      const result = await clearCartAction();

      expect(result.success).toBe(true);
      expect(result.message).toContain("déjà vide");
    });
  });

  describe("getCartAction", () => {
    it("should fetch user cart", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      mockSupabaseClient.single.mockResolvedValue({
        data: mockCart,
        error: null,
      });

      const result = await getCartAction();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCart);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("carts");
    });

    it("should fetch guest cart", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const formData = new FormData();
      formData.append("guestCartId", "guest-123");

      mockSupabaseClient.single.mockResolvedValue({
        data: { ...mockCart, user_id: null, id: "guest-123" },
        error: null,
      });

      const result = await getCartAction(undefined, formData);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe("guest-123");
    });

    it("should return empty cart if not found", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116" },
      });

      const result = await getCartAction();

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe("syncCartAction", () => {
    it("should sync guest cart to user cart", async () => {
      const formData = new FormData();
      formData.append("guestCartId", "guest-123");

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      // Mock guest cart
      const guestCart = {
        ...mockCart,
        id: "guest-123",
        user_id: null,
        items: [
          {
            id: "guest-item-1",
            product_id: "prod-2",
            quantity: 1,
            price: 19.99,
          },
        ],
      };

      // Mock guest cart fetch
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: guestCart,
        error: null,
      });

      // Mock user cart fetch
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockCart,
        error: null,
      });

      // Mock merge operations
      mockSupabaseClient.insert.mockReturnValue({
        select: () => ({ error: null }),
      });

      // Mock guest cart deletion
      mockSupabaseClient.delete.mockReturnValue({
        error: null,
      });

      const result = await syncCartAction(undefined, formData);

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.delete).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith("/cart");
    });

    it("should handle sync without guest cart", async () => {
      const formData = new FormData();
      // No guestCartId provided

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const result = await syncCartAction(undefined, formData);

      expect(result.success).toBe(true);
      expect(result.message).toContain("Aucun panier");
    });

    it("should handle sync for non-authenticated user", async () => {
      const formData = new FormData();
      formData.append("guestCartId", "guest-123");

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await syncCartAction(undefined, formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("authentifié");
    });
  });
});
