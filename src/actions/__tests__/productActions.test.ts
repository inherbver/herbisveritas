/**
 * Tests for Product Actions
 */

import {
  getProducts,
  getProductBySlug,
  toggleProductStatus,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStatus,
} from "../productActions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Mock dependencies
jest.mock("@/lib/supabase/server");
jest.mock("@/lib/auth/server-actions-auth");
jest.mock("@/utils/revalidation");

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
  rpc: jest.fn(),
  delete: jest.fn(() => mockSupabaseClient),
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
  status: "active",
  unit: "pièce",
  inci_list: "test ingredients",
  is_new: false,
  is_on_promotion: false,
};

const mockProductFormValues = {
  id: "prod-1",
  slug: "test-product",
  price: 29.99,
  stock: 100,
  unit: "pièce",
  image_url: "test.jpg",
  inci_list: "test ingredients",
  status: "active" as const,
  is_new: false,
  is_on_promotion: false,
  translations: [
    {
      locale: "fr",
      name: "Test Product",
      description: "Test description",
      category: "herbs",
    },
  ],
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

  describe("createProduct", () => {
    const { withPermissionSafe } = await import("@/lib/auth/server-actions-auth");
    const { revalidateProductPages } = await import("@/utils/revalidation");

    beforeEach(() => {
      // Mock withPermissionSafe to return a function that calls the original with mocked permissions
      withPermissionSafe.mockImplementation((permission, fn) => {
        return async (...args) => {
          // Simulate permission check passed
          return await fn(...args);
        };
      });
      revalidateProductPages.mockResolvedValue(undefined);
    });

    it("should create a product successfully", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockProduct,
        error: null,
      });

      const result = await createProduct(mockProductFormValues);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProduct);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        "create_product_with_translations_v2",
        expect.objectContaining({
          product_data: expect.objectContaining({
            name: "Test Product",
            slug: "test-product",
            price: 29.99,
            is_active: true,
            status: "active",
          }),
          translations_data: expect.arrayContaining([
            expect.objectContaining({
              locale: "fr",
              name: "Test Product",
            }),
          ]),
        })
      );
    });

    it("should handle validation errors", async () => {
      const invalidData = { ...mockProductFormValues, price: -10 };

      const result = await createProduct(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("invalides");
    });

    it("should handle missing French translation", async () => {
      const dataWithoutFrench = {
        ...mockProductFormValues,
        translations: [
          { locale: "en", name: "Test Product", description: "desc", category: "herbs" },
        ],
      };

      const result = await createProduct(dataWithoutFrench);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle database errors", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: "Database error", code: "500" },
      });

      const result = await createProduct(mockProductFormValues);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("updateProduct", () => {
    const { withPermissionSafe } = require("@/lib/auth/server-actions-auth");
    const { revalidateProductPages } = require("@/utils/revalidation");

    beforeEach(() => {
      withPermissionSafe.mockImplementation((permission, fn) => fn);
      revalidateProductPages.mockResolvedValue(undefined);
    });

    it("should update a product successfully", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await updateProduct(mockProductFormValues);

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        "update_product_with_translations",
        expect.objectContaining({
          p_id: "prod-1",
          p_slug: "test-product",
          p_price: 29.99,
          p_is_active: true,
          p_status: "active",
        })
      );
    });

    it("should handle missing product ID", async () => {
      const dataWithoutId = { ...mockProductFormValues, id: undefined };

      const result = await updateProduct(dataWithoutId);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle validation errors", async () => {
      const invalidData = { ...mockProductFormValues, stock: -5 };

      const result = await updateProduct(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("invalides");
    });

    it("should handle database errors", async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: "Update failed", code: "400" },
      });

      const result = await updateProduct(mockProductFormValues);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("deleteProduct", () => {
    const { withPermissionSafe } = require("@/lib/auth/server-actions-auth");
    const { revalidateProductPages } = require("@/utils/revalidation");

    beforeEach(() => {
      withPermissionSafe.mockImplementation((permission, fn) => fn);
      revalidateProductPages.mockResolvedValue(undefined);
    });

    it("should delete a product successfully", async () => {
      // Mock fetch product for slug
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { slug: "test-product" },
        error: null,
      });

      // Mock delete operation
      mockSupabaseClient.delete.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await deleteProduct("prod-1");

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("products");
      expect(mockSupabaseClient.delete).toHaveBeenCalled();
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith("id", "prod-1");
    });

    it("should handle empty product ID", async () => {
      const result = await deleteProduct("");

      expect(result.success).toBe(false);
      expect(result.error).toContain("required");
    });

    it("should handle product not found during fetch", async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "Product not found" },
      });

      mockSupabaseClient.delete.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await deleteProduct("non-existent");

      expect(result.success).toBe(true); // Should still succeed even if product not found during fetch
    });

    it("should handle database errors during deletion", async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: { slug: "test-product" },
        error: null,
      });

      mockSupabaseClient.delete.mockResolvedValue({
        data: null,
        error: { message: "Delete failed", code: "400" },
      });

      const result = await deleteProduct("prod-1");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("updateProductStatus", () => {
    const { withPermissionSafe } = require("@/lib/auth/server-actions-auth");
    const { revalidateProductPages } = require("@/utils/revalidation");

    beforeEach(() => {
      withPermissionSafe.mockImplementation((permission, fn) => fn);
      revalidateProductPages.mockResolvedValue(undefined);
    });

    it("should update product status successfully", async () => {
      const updatedProduct = { ...mockProduct, status: "inactive", is_active: false };
      mockSupabaseClient.single.mockResolvedValue({
        data: updatedProduct,
        error: null,
      });

      const result = await updateProductStatus({ productId: "prod-1", status: "inactive" });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedProduct);
      expect(mockSupabaseClient.update).toHaveBeenCalledWith({
        status: "inactive",
        is_active: false,
      });
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith("id", "prod-1");
    });

    it("should handle validation errors", async () => {
      const result = await updateProductStatus({ productId: "", status: "active" });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle invalid status", async () => {
      const result = await updateProductStatus({
        productId: "prod-1",
        status: "invalid" as any,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle database errors", async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: "Update failed", code: "400" },
      });

      const result = await updateProductStatus({ productId: "prod-1", status: "active" });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
