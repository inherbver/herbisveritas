import {
  getProducts,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
} from "../productActions";
import { mockSupabaseClient, mockProduct, mockAdminUser } from "@/test-utils/mocks";

// Mock Supabase
jest.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: jest.fn(() => mockSupabaseClient),
}));

jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(() => mockSupabaseClient),
}));

// Mock auth
jest.mock("@/lib/auth/server-auth", () => ({
  checkUserPermission: jest.fn(() => ({ isAuthorized: true, user: mockAdminUser })),
}));

// Mock revalidation
jest.mock("@/utils/revalidation", () => ({
  revalidateProducts: jest.fn(),
  revalidateProduct: jest.fn(),
}));

describe("productActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getProducts", () => {
    it("should fetch all active products", async () => {
      const mockProducts = [mockProduct, { ...mockProduct, id: "prod-2", slug: "product-2" }];

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: mockProducts,
          error: null,
        }),
      });

      const result = await getProducts();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProducts);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("products");
    });

    it("should apply filters correctly", async () => {
      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const inMock = jest.fn().mockReturnThis();
      const orderMock = jest.fn().mockReturnThis();

      mockSupabaseClient.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        in: inMock,
        order: orderMock,
        limit: jest.fn().mockResolvedValue({
          data: [mockProduct],
          error: null,
        }),
      });

      await getProducts({
        category: "herbs",
        minPrice: 10,
        maxPrice: 50,
        inStock: true,
      });

      expect(eqMock).toHaveBeenCalledWith("category", "herbs");
      expect(eqMock).toHaveBeenCalledWith("active", true);
    });

    it("should handle database errors", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        }),
      });

      const result = await getProducts();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Database error");
    });

    it("should handle pagination", async () => {
      const limitMock = jest.fn().mockResolvedValue({
        data: [mockProduct],
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        limit: limitMock,
      });

      await getProducts({ page: 2, pageSize: 10 });

      expect(limitMock).toHaveBeenCalledWith(10);
    });
  });

  describe("getProductBySlug", () => {
    it("should fetch a single product by slug", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProduct,
          error: null,
        }),
      });

      const result = await getProductBySlug("test-product");

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProduct);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("products");
    });

    it("should handle product not found", async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116" },
        }),
      });

      const result = await getProductBySlug("non-existent");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });
  });

  describe("createProduct", () => {
    it("should create a new product", async () => {
      const formData = new FormData();
      formData.append("name", "New Product");
      formData.append("description", "Product description");
      formData.append("price", "29.99");
      formData.append("stock", "100");
      formData.append("category", "herbs");

      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockProduct, name: "New Product" },
          error: null,
        }),
      });

      const result = await createProduct(undefined, formData);

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("products");
    });

    it("should validate required fields", async () => {
      const formData = new FormData();
      formData.append("name", ""); // Empty name

      const result = await createProduct(undefined, formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("name");
    });

    it("should handle image upload", async () => {
      const formData = new FormData();
      formData.append("name", "Product with Image");
      formData.append("description", "Description");
      formData.append("price", "29.99");
      formData.append("stock", "10");
      formData.append("category", "herbs");

      const imageFile = new File(["image"], "product.jpg", { type: "image/jpeg" });
      formData.append("image", imageFile);

      mockSupabaseClient.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: { path: "products/product.jpg" },
          error: null,
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: "https://test.com/product.jpg" },
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProduct,
          error: null,
        }),
      });

      const result = await createProduct(undefined, formData);

      expect(result.success).toBe(true);
    });

    it("should require admin permission", async () => {
      const serverAuth = require("@/lib/auth/server-auth");
      serverAuth.checkUserPermission = jest.fn().mockResolvedValue({
        isAuthorized: false,
        user: null,
      });

      const formData = new FormData();
      formData.append("name", "New Product");

      const result = await createProduct(undefined, formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("permission");
    });
  });

  describe("updateProduct", () => {
    it("should update an existing product", async () => {
      const formData = new FormData();
      formData.append("id", "prod-1");
      formData.append("name", "Updated Product");
      formData.append("price", "39.99");

      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockProduct, name: "Updated Product", price: 39.99 },
          error: null,
        }),
      });

      const result = await updateProduct(undefined, formData);

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("products");
    });

    it("should handle partial updates", async () => {
      const formData = new FormData();
      formData.append("id", "prod-1");
      formData.append("stock", "50"); // Only update stock

      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockProduct, stock: 50 },
          error: null,
        }),
      });

      const result = await updateProduct(undefined, formData);

      expect(result.success).toBe(true);
    });

    it("should validate price is positive", async () => {
      const formData = new FormData();
      formData.append("id", "prod-1");
      formData.append("price", "-10");

      const result = await updateProduct(undefined, formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("price");
    });
  });

  describe("deleteProduct", () => {
    it("should soft delete a product", async () => {
      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockProduct, active: false },
          error: null,
        }),
      });

      const result = await deleteProduct("prod-1");

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("products");
    });

    it("should handle product not found", async () => {
      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116" },
        }),
      });

      const result = await deleteProduct("non-existent");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });
  });

  describe("toggleProductStatus", () => {
    it("should toggle product active status", async () => {
      // First get current status
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockProduct, active: true },
          error: null,
        }),
      });

      // Then update
      mockSupabaseClient.from.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockProduct, active: false },
          error: null,
        }),
      });

      const result = await toggleProductStatus("prod-1");

      expect(result.success).toBe(true);
      expect(result.data?.active).toBe(false);
    });

    it("should handle concurrent updates gracefully", async () => {
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProduct,
          error: null,
        }),
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Concurrent update" },
        }),
      });

      const result = await toggleProductStatus("prod-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("update");
    });
  });
});
