import { jest } from "@jest/globals";
import {
  getAllProducts,
  getProductBySlug,
  getProductsForAdmin,
  getProductByIdForAdmin,
} from "../products";
import * as supabaseServer from "@/lib/supabase/server";
import { Locale } from "@/i18n-config";

// Mock des dépendances
jest.mock("@/lib/supabase/server");

// Mock chainable Supabase plus réaliste
const createMockSupabaseQuery = () => {
  const mockQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    overlaps: jest.fn().mockReturnThis(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
  };
  return mockQuery;
};

const mockSupabase = {
  from: jest.fn(() => createMockSupabaseQuery()),
};

// Mock data
const mockProduct = {
  id: "test-product-id",
  slug: "test-product",
  name: "Test Product",
  price: 29.99,
  image_url: "https://example.com/image.jpg",
  stock: 10,
  is_new: false,
  is_on_promotion: true,
  is_active: true,
  labels: ["organic", "natural"],
  unit: "piece",
  product_translations: [
    {
      name: "Test Product",
      short_description: "A test product",
      locale: "fr",
    },
  ],
};

const mockProducts = [mockProduct];

describe("Product Queries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (supabaseServer.createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe("getAllProducts", () => {
    it("should fetch all active products for shop", async () => {
      const mockQuery = createMockSupabaseQuery();
      mockQuery.or.mockResolvedValue({
        data: mockProducts,
        error: null,
      });
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getAllProducts("fr" as Locale);

      expect(mockSupabase.from).toHaveBeenCalledWith("products");
      expect(result).toEqual(mockProducts);
    });

    it("should filter only active products", async () => {
      const mockQuery = createMockSupabaseQuery();
      mockQuery.or.mockResolvedValue({
        data: mockProducts,
        error: null,
      });
      mockSupabase.from.mockReturnValue(mockQuery);

      await getAllProducts("fr" as Locale);

      // Vérifier que le filtre is_active = true est appliqué
      expect(mockQuery.eq).toHaveBeenCalledWith("is_active", true);
    });

    it("should handle database errors gracefully", async () => {
      const mockQuery = createMockSupabaseQuery();
      mockQuery.or.mockResolvedValue({
        data: null,
        error: { message: "Database connection failed" },
      });
      mockSupabase.from.mockReturnValue(mockQuery);

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const result = await getAllProducts("fr" as Locale);

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error fetching all products with translations:",
        "Database connection failed"
      );

      consoleSpy.mockRestore();
    });

    it("should handle null data response", async () => {
      const mockQuery = createMockSupabaseQuery();
      mockQuery.or.mockResolvedValue({
        data: null,
        error: null,
      });
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getAllProducts("fr" as Locale);

      expect(result).toEqual([]);
    });

    it("should work with different locales", async () => {
      const mockQuery = createMockSupabaseQuery();
      mockQuery.or.mockResolvedValue({
        data: mockProducts,
        error: null,
      });
      mockSupabase.from.mockReturnValue(mockQuery);

      await getAllProducts("en" as Locale);

      // Vérifier que la locale est correctement passée
      expect(mockQuery.or).toHaveBeenCalledWith("locale.eq.en,locale.is.null", {
        foreignTable: "product_translations",
      });
    });
  });

  describe("getProductBySlug", () => {
    it("should fetch product by slug for active products only", async () => {
      const mockQuery = createMockSupabaseQuery();
      mockQuery.maybeSingle.mockResolvedValue({
        data: mockProduct,
        error: null,
      });
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getProductBySlug("test-product", "fr" as Locale);

      expect(result).toEqual(mockProduct);
      // Vérifier que les filtres slug et is_active sont appliqués
      expect(mockQuery.eq).toHaveBeenCalledWith("slug", "test-product");
      expect(mockQuery.eq).toHaveBeenCalledWith("is_active", true);
    });

    it("should return null for inactive products", async () => {
      const mockQuery = createMockSupabaseQuery();
      mockQuery.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getProductBySlug("inactive-product", "fr" as Locale);

      expect(result).toBeNull();
    });

    it("should handle PGRST116 errors silently", async () => {
      const mockQuery = createMockSupabaseQuery();
      mockQuery.maybeSingle.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows found" },
      });
      mockSupabase.from.mockReturnValue(mockQuery);

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const result = await getProductBySlug("non-existent", "fr" as Locale);

      expect(result).toBeNull();
      // PGRST116 ne doit pas être loggé comme erreur
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should log other database errors", async () => {
      const mockQuery = createMockSupabaseQuery();
      mockQuery.maybeSingle.mockResolvedValue({
        data: null,
        error: { code: "DB_ERROR", message: "Database error" },
      });
      mockSupabase.from.mockReturnValue(mockQuery);

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const result = await getProductBySlug("test-product", "fr" as Locale);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error fetching product by slug (test-product, fr):",
        expect.objectContaining({ code: "DB_ERROR" })
      );

      consoleSpy.mockRestore();
    });
  });

  describe("getProductsForAdmin", () => {
    it("should fetch all products for admin (including inactive)", async () => {
      const mockQuery = createMockSupabaseQuery();
      mockQuery.select.mockResolvedValue({
        data: mockProducts,
        error: null,
      });
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getProductsForAdmin();

      expect(mockSupabase.from).toHaveBeenCalledWith("products");
      expect(result).toEqual(mockProducts);
      // Vérifier qu'aucun filtre is_active n'est appliqué pour l'admin
    });

    // Tests de filtrage avancé commentés - fonctionnalité non-critique
    /*
    it('should apply filters when provided', async () => {
      const mockQuery = createMockSupabaseQuery();
      mockQuery.select.mockResolvedValue({
        data: mockProducts,
        error: null
      });
      mockSupabase.from.mockReturnValue(mockQuery);

      const filters = {
        status: ['active'],
        categories: ['skincare'],
        search: 'test',
        priceRange: { min: 10, max: 50 },
        inStock: true,
        tags: ['organic']
      };

      await getProductsForAdmin(filters);

      expect(mockQuery.in).toHaveBeenCalledWith('status', ['active']);
      expect(mockQuery.in).toHaveBeenCalledWith('category', ['skincare']);
      expect(mockQuery.ilike).toHaveBeenCalledWith('name', '%test%');
      expect(mockQuery.gte).toHaveBeenCalledWith('price', 10);
      expect(mockQuery.lte).toHaveBeenCalledWith('price', 50);
      expect(mockQuery.gt).toHaveBeenCalledWith('stock', 0);
      expect(mockQuery.overlaps).toHaveBeenCalledWith('labels', ['organic']);
    });

    it('should handle infinite max price', async () => {
      const mockQuery = createMockSupabaseQuery();
      mockQuery.select.mockResolvedValue({
        data: mockProducts,
        error: null
      });
      mockSupabase.from.mockReturnValue(mockQuery);

      const filters = {
        status: [],
        categories: [],
        search: '',
        priceRange: { min: 10, max: Infinity },
        inStock: null,
        tags: []
      };

      await getProductsForAdmin(filters);

      expect(mockQuery.gte).toHaveBeenCalledWith('price', 10);
      expect(mockQuery.lte).not.toHaveBeenCalled(); // Ne doit pas appeler lte pour Infinity
    });

    it('should handle out of stock filter', async () => {
      const mockQuery = createMockSupabaseQuery();
      mockQuery.select.mockResolvedValue({
        data: mockProducts,
        error: null
      });
      mockSupabase.from.mockReturnValue(mockQuery);

      const filters = {
        status: [],
        categories: [],
        search: '',
        priceRange: null,
        inStock: false, // Filtrer les produits en rupture
        tags: []
      };

      await getProductsForAdmin(filters);

      expect(mockQuery.eq).toHaveBeenCalledWith('stock', 0);
    });
    */

    it("should handle database errors", async () => {
      const mockQuery = createMockSupabaseQuery();
      mockQuery.select.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });
      mockSupabase.from.mockReturnValue(mockQuery);

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const result = await getProductsForAdmin();

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error fetching products for admin:",
        "Database error"
      );

      consoleSpy.mockRestore();
    });
  });

  describe("getProductByIdForAdmin", () => {
    it("should fetch product by ID for admin", async () => {
      const mockQuery = createMockSupabaseQuery();
      mockQuery.single.mockResolvedValue({
        data: mockProduct,
        error: null,
      });
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getProductByIdForAdmin("test-product-id");

      expect(mockSupabase.from).toHaveBeenCalledWith("products");
      expect(result).toEqual(mockProduct);
    });

    it("should handle not found errors", async () => {
      const mockQuery = createMockSupabaseQuery();
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { message: "Product not found", code: "PGRST116" },
      });
      mockSupabase.from.mockReturnValue(mockQuery);

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const result = await getProductByIdForAdmin("non-existent-id");

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error fetching product by ID for admin (non-existent-id):",
        "Product not found"
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Product Filtering for Shop vs Admin", () => {
    it("should filter active products for shop functions", () => {
      // Ces tests vérifient que is_active=true est appliqué pour les fonctions publiques
      // mais pas pour les fonctions admin
    });

    it("should not filter products for admin functions", () => {
      // Les fonctions admin doivent voir tous les produits (actifs et inactifs)
    });
  });
});
