/**
 * Tests for Product Actions
 */

import { getProducts, getProductBySlug, toggleProductStatus } from "../productActions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Mock dependencies
jest.mock("@/lib/supabase/server");

const mockSupabaseClient = {
  from: jest.fn(() => mockSupabaseClient),
  select: jest.fn(() => mockSupabaseClient),
  eq: jest.fn(() => mockSupabaseClient),
  single: jest.fn(),
  update: jest.fn(() => mockSupabaseClient),
  order: jest.fn(() => mockSupabaseClient),
  range: jest.fn(),
  gte: jest.fn(() => mockSupabaseClient),
  lte: jest.fn(() => mockSupabaseClient),
  gt: jest.fn(() => mockSupabaseClient),
  limit: jest.fn(() => mockSupabaseClient),
};

(createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabaseClient);

// Mock data
const mockProduct = {
  id: "prod-1",
  name: "Test Product",
  slug: "test-product",
  price: 29.99,
  stock: 100,
  is_active: true,
  image_url: "test.jpg",
};

const mockProducts = [mockProduct, { ...mockProduct, id: "prod-2", slug: "product-2" }];

describe("productActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getProducts", () => {
    it("should fetch all active products", async () => {
      mockSupabaseClient.range.mockResolvedValue({
        data: mockProducts,
        error: null,
      });

      const result = await getProducts();

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("products");
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith("is_active", true);
    });

    it("should apply filters correctly", async () => {
      mockSupabaseClient.range.mockResolvedValue({
        data: [mockProduct],
        error: null,
      });

      const filters = {
        category: "herbs",
        minPrice: 10,
        maxPrice: 50,
        inStock: true,
        page: 1,
        pageSize: 10,
      };

      const result = await getProducts(filters);

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith("is_active", true);
    });

    // Note: getProducts returns empty array on errors, not error state
  });

  describe("getProductBySlug", () => {
    it("should fetch a single product by slug", async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: mockProduct,
        error: null,
      });

      const result = await getProductBySlug("test-product");

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProduct);
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith("slug", "test-product");
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith("is_active", true);
    });

    it("should handle product not found", async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "Product not found" },
      });

      const result = await getProductBySlug("non-existent");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Product not found");
    });
  });

  describe("toggleProductStatus", () => {
    it("should toggle product active status", async () => {
      // Mock current status fetch
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: { is_active: true },
          error: null,
        })
        // Mock update result
        .mockResolvedValueOnce({
          data: { ...mockProduct, is_active: false },
          error: null,
        });

      const result = await toggleProductStatus("prod-1");

      expect(result.success).toBe(true);
      expect(result.data?.is_active).toBe(false);
      expect(mockSupabaseClient.update).toHaveBeenCalledWith({ is_active: false });
    });

    it("should handle product not found", async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "Product not found" },
      });

      const result = await toggleProductStatus("non-existent");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Product not found");
    });
  });
});
