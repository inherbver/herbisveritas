import {
  getProducts,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
} from "../productActions";

// Mock revalidation
jest.mock("@/utils/revalidation", () => ({
  revalidateProductPages: jest.fn(),
}));

// Mock auth
jest.mock("@/lib/auth/server-actions-auth", () => ({
  withPermissionSafe: jest.fn((permission, handler) => handler),
}));

// Mock Supabase
const mockSupabaseClient = {
  from: jest.fn(),
  rpc: jest.fn(),
};

jest.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: jest.fn(() => mockSupabaseClient),
}));

const mockProduct = {
  id: "prod-1",
  name: "Test Product",
  slug: "test-product",
  price: 29.99,
  stock: 100,
  unit: "piece",
  image_url: "test.jpg",
  inci_list: null,
  status: "active",
  is_active: true,
  is_new: false,
  is_on_promotion: false,
  created_at: "2024-01-01",
  updated_at: "2024-01-01",
};

describe("productActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getProducts", () => {
    it("should fetch all active products", async () => {
      const mockProducts = [mockProduct, { ...mockProduct, id: "prod-2", slug: "product-2" }];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockProducts,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await getProducts();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProducts);
      expect(mockQuery.eq).toHaveBeenCalledWith("is_active", true);
    });

    it("should apply filters correctly", async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [mockProduct],
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await getProducts({
        category: "herbs",
        minPrice: 10,
        maxPrice: 50,
        inStock: true,
      });

      expect(mockQuery.eq).toHaveBeenCalledWith("category", "herbs");
      expect(mockQuery.eq).toHaveBeenCalledWith("is_active", true);
      expect(mockQuery.gte).toHaveBeenCalledWith("price", 10);
      expect(mockQuery.lte).toHaveBeenCalledWith("price", 50);
      expect(mockQuery.gt).toHaveBeenCalledWith("stock", 0);
    });

    it("should handle database errors", async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await getProducts();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Database error");
    });

    it("should handle pagination", async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [mockProduct],
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await getProducts({ page: 2, pageSize: 10 });

      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(mockQuery.range).toHaveBeenCalledWith(10, 19);
    });
  });

  describe("getProductBySlug", () => {
    it("should fetch a single product by slug", async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProduct,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await getProductBySlug("test-product");

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProduct);
      expect(mockQuery.eq).toHaveBeenCalledWith("slug", "test-product");
      expect(mockQuery.eq).toHaveBeenCalledWith("is_active", true);
    });

    it("should handle product not found", async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116", message: "Product not found" },
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await getProductBySlug("non-existent");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Product not found");
    });
  });

  describe("createProduct", () => {
    it("should create a new product", async () => {
      const productData = {
        slug: "new-product",
        price: 19.99,
        stock: 50,
        unit: "piece",
        image_url: "new.jpg",
        inci_list: null,
        status: "active",
        is_new: true,
        is_on_promotion: false,
        translations: [
          {
            locale: "fr",
            name: "Nouveau Produit",
            description: "Description",
          },
        ],
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: { ...mockProduct, id: "new-id" },
        error: null,
      });

      const result = await createProduct(productData);

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        "create_product_with_translations_v2",
        expect.any(Object)
      );
    });

    it("should validate required fields", async () => {
      const invalidData = {
        price: -10, // Invalid price
        translations: [],
      };

      const result = await createProduct(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle image upload", async () => {
      const productData = {
        slug: "new-product",
        price: 19.99,
        stock: 50,
        unit: "piece",
        image_url: "new.jpg",
        inci_list: null,
        status: "active",
        is_new: true,
        is_on_promotion: false,
        translations: [
          {
            locale: "fr",
            name: "Nouveau Produit",
            description: "Description",
          },
        ],
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: { ...mockProduct, id: "new-id" },
        error: null,
      });

      const result = await createProduct(productData);

      expect(result.success).toBe(true);
    });

    it("should require admin permission", async () => {
      const productData = {
        slug: "new-product",
        price: 19.99,
        stock: 50,
        unit: "piece",
        status: "active",
        translations: [
          {
            locale: "fr",
            name: "Nouveau Produit",
            description: "Description",
          },
        ],
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: "Permission denied" },
      });

      const result = await createProduct(productData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("updateProduct", () => {
    it("should update an existing product", async () => {
      const updateData = {
        id: "prod-1",
        slug: "updated-product",
        price: 39.99,
        stock: 75,
        unit: "piece",
        image_url: "updated.jpg",
        inci_list: null,
        status: "active",
        is_new: false,
        is_on_promotion: true,
        translations: [
          {
            locale: "fr",
            name: "Produit Mis à Jour",
            description: "Description mise à jour",
          },
        ],
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await updateProduct(updateData);

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        "update_product_with_translations",
        expect.any(Object)
      );
    });

    it("should handle partial updates", async () => {
      const partialUpdate = {
        id: "prod-1",
        slug: "test-product",
        price: 35.99,
        stock: 100,
        unit: "piece",
        status: "active",
        translations: [
          {
            locale: "fr",
            name: "Test Product",
            description: "Description",
          },
        ],
      };

      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await updateProduct(partialUpdate);

      expect(result.success).toBe(true);
    });

    it("should validate price is positive", async () => {
      const invalidUpdate = {
        id: "prod-1",
        slug: "test-product",
        price: -5,
        stock: 100,
        unit: "piece",
        status: "active",
        translations: [
          {
            locale: "fr",
            name: "Test Product",
            description: "Description",
          },
        ],
      };

      const result = await updateProduct(invalidUpdate);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("deleteProduct", () => {
    it("should soft delete a product", async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { slug: "test-product" },
          error: null,
        }),
        delete: jest.fn().mockReturnThis(),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await deleteProduct("prod-1");

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("products");
    });

    it("should handle product not found", async () => {
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116", message: "Not found" },
        }),
      };

      const mockDeleteQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: null,
        }),
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockSelectQuery)
        .mockReturnValueOnce(mockDeleteQuery);

      const result = await deleteProduct("non-existent");

      expect(result.success).toBe(true); // Still succeeds even if not found
    });
  });

  describe("toggleProductStatus", () => {
    it("should toggle product active status", async () => {
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { is_active: true },
          error: null,
        }),
      };

      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockProduct, is_active: false },
          error: null,
        }),
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockSelectQuery)
        .mockReturnValueOnce(mockUpdateQuery);

      const result = await toggleProductStatus("prod-1");

      expect(result.success).toBe(true);
      expect(result.data?.is_active).toBe(false);
    });

    it("should handle concurrent updates gracefully", async () => {
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { is_active: true },
          error: null,
        }),
      };

      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Row has been updated" },
        }),
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockSelectQuery)
        .mockReturnValueOnce(mockUpdateQuery);

      const result = await toggleProductStatus("prod-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Concurrent update");
    });
  });
});
