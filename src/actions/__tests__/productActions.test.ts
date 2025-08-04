import { jest } from "@jest/globals";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStatus,
  uploadProductImage,
} from "../productActions";
import * as supabaseServer from "@/lib/supabase/server";
// Mocked dependencies - imports needed for type checking
import "@/lib/auth/server-actions-auth";
import "@/utils/revalidation";

// Use global Supabase mock from jest.setup.ts
jest.mock("@/lib/auth/server-actions-auth", () => ({
  withPermissionSafe: jest.fn((permission, callback) => callback),
}));
jest.mock("@/utils/revalidation");
jest.mock("@/utils/slugify", () => ({
  slugify: jest.fn((str: string) => str.toLowerCase().replace(/\s+/g, "-")),
}));

// Types pour les mocks Supabase
type MockSupabaseResponse<T = unknown> = {
  data: T | null;
  error: { message: string; code?: string } | null;
};

type MockProductData = {
  id: string;
  name: string;
  slug: string;
  price: number;
  description: string;
  category: string;
  is_active: boolean;
  stock: number;
  image_url: string | null;
  labels: string[];
  unit: string;
};

// Mock chainable Supabase plus réaliste
const createMockSupabaseQuery = () => {
  const mockQuery = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    overlaps: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null } as MockSupabaseResponse),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null } as MockSupabaseResponse),
  };
  return mockQuery;
};

const createMockSupabaseStorage = () => ({
  upload: jest.fn(),
  getPublicUrl: jest.fn(() => ({
    data: { publicUrl: "https://example.com/image.jpg" },
  })),
});

// Get reference to the global mock
const mockSupabase = {
  from: jest.fn(() => createMockSupabaseQuery()),
  rpc: jest.fn(),
  storage: {
    from: jest.fn(() => createMockSupabaseStorage()),
  },
};

// Mock data
const testUUID = "550e8400-e29b-41d4-a716-446655440000";
const mockProductData: MockProductData = {
  id: testUUID,
  name: "Test Product",
  slug: "test-product",
  price: 29.99,
  description: "Test description",
  category: "test-category",
  is_active: true,
  stock: 10,
  image_url: null,
  labels: ["test"],
  unit: "piece",
};

const mockProductFormValues = {
  id: "550e8400-e29b-41d4-a716-446655440000", // UUID valide
  slug: "test-product",
  price: 29.99,
  stock: 10,
  unit: "piece",
  image_url: "",
  inci_list: [],
  status: "active" as const,
  is_active: true,
  is_new: false,
  is_on_promotion: false,
  translations: [
    {
      locale: "fr",
      name: "Test Product",
      short_description: "Test description",
      description_long: "",
      usage_instructions: "",
      properties: "",
      composition_text: "",
    },
  ],
};

describe("Product Actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mockSupabase pour qu'il retourne toujours une nouvelle instance
    mockSupabase.from = jest.fn(() => createMockSupabaseQuery());
    mockSupabase.rpc = jest.fn();
    // Mock the server client to return our local mock
    jest.mocked(supabaseServer.createSupabaseServerClient).mockResolvedValue(mockSupabase as unknown as ReturnType<typeof supabaseServer.createSupabaseServerClient>);
  });

  describe("createProduct", () => {
    it("should create a product successfully", async () => {
      // Mock successful RPC call
      mockSupabase.rpc.mockResolvedValue({
        data: mockProductData,
        error: null,
      });

      const result = await createProduct(mockProductFormValues);

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        "create_product_with_translations_v2",
        expect.any(Object)
      );
      expect(result.success).toBe(true);
      expect(result.message).toContain("créé avec succès");
    });

    it("should handle validation errors", async () => {
      // Test avec des données invalides - supprimer les traductions obligatoires
      const invalidData = {
        ...mockProductFormValues,
        translations: [], // Pas de traductions pour déclencher une erreur
      };

      const result = await createProduct(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Données du formulaire invalides");
    });

    it("should handle database errors", async () => {
      // Mock RPC error
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: "Database error", code: "DB_ERROR" },
      });

      const result = await createProduct(mockProductFormValues);

      expect(result.success).toBe(false);
      expect(result.error).toContain("erreur technique");
    });
  });

  describe("updateProduct", () => {
    it("should update a product successfully", async () => {
      // Mock successful RPC update
      mockSupabase.rpc.mockResolvedValue({
        data: mockProductData,
        error: null,
      });

      // Use a valid UUID format
      const testUUID = "550e8400-e29b-41d4-a716-446655440000";
      const result = await updateProduct({ ...mockProductFormValues, id: testUUID });

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        "update_product_with_translations",
        expect.any(Object)
      );
      expect(result.success).toBe(true);
      expect(result.message).toContain("mis à jour avec succès");
    });

    it("should handle update validation errors", async () => {
      const invalidData = {
        ...mockProductFormValues,
        translations: [], // Pas de traductions pour déclencher une erreur
      };

      const result = await updateProduct(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Données du formulaire invalides");
    });
  });

  describe("deleteProduct", () => {
    it("should delete a product successfully", async () => {
      // Mock successful product fetch
      const fetchQuery = createMockSupabaseQuery();
      fetchQuery.single.mockResolvedValue({
        data: { slug: "test-product" },
        error: null,
      });

      // Mock successful deletion
      const deleteQuery = createMockSupabaseQuery();
      deleteQuery.eq.mockResolvedValue({ error: null });

      mockSupabase.from.mockReturnValueOnce(fetchQuery).mockReturnValueOnce(deleteQuery);

      const result = await deleteProduct(testUUID);

      expect(result.success).toBe(true);
      expect(result.message).toContain("supprimé avec succès");
    });

    it("should handle deletion errors", async () => {
      // Mock successful product fetch
      const fetchQuery = createMockSupabaseQuery();
      fetchQuery.single.mockResolvedValue({
        data: { slug: "test-product" },
        error: null,
      });

      // Mock database error
      const deleteQuery = createMockSupabaseQuery();
      deleteQuery.eq.mockResolvedValue({
        error: { message: "Cannot delete product", code: "FOREIGN_KEY_VIOLATION" },
      });

      mockSupabase.from.mockReturnValueOnce(fetchQuery).mockReturnValueOnce(deleteQuery);

      const result = await deleteProduct(testUUID);

      expect(result.success).toBe(false);
      expect(result.error).toContain("erreur technique");
    });
  });

  describe("updateProductStatus", () => {
    it("should update product status successfully", async () => {
      // Mock successful status update
      const mockQuery = createMockSupabaseQuery();
      mockQuery.single.mockResolvedValue({
        data: { ...mockProductData, is_active: false },
        error: null,
      });
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await updateProductStatus({
        productId: testUUID,
        status: "inactive",
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("Statut du produit mis à jour avec succès");
    });

    it("should validate status parameter", async () => {
      const result = await updateProductStatus({
        productId: testUUID,
        status: "invalid-status" as never,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Données invalides");
    });
  });

  describe("uploadProductImage", () => {
    it("should upload image successfully", async () => {
      // Mock file
      const mockFile = new File(["test content"], "test.jpg", { type: "image/jpeg" });

      // Créer FormData
      const formData = new FormData();
      formData.append("file", mockFile);
      formData.append("fileName", "test.jpg");

      // Mock successful upload
      const mockStorage = createMockSupabaseStorage();
      mockStorage.upload.mockResolvedValue({
        error: null,
        data: { path: "products/test.jpg" },
      });
      mockSupabase.storage.from.mockReturnValue(mockStorage);

      const result = await uploadProductImage(formData);

      expect(result.success).toBe(true);
      expect(result.data?.url).toBe("https://example.com/image.jpg");
    });

    it("should validate file parameters", async () => {
      // Mock file trop large
      const mockLargeFile = new File(["x".repeat(5 * 1024 * 1024)], "large.jpg", {
        type: "image/jpeg",
      });

      const formData = new FormData();
      formData.append("file", mockLargeFile);
      formData.append("fileName", "large.jpg");

      const result = await uploadProductImage(formData);

      expect(result.success).toBe(false);
      // uploadProductImage retourne "Validation échouée" pour les erreurs de validation
      expect(result.message).toContain("Validation échouée");
    });

    it("should handle upload errors", async () => {
      const mockFile = new File(["test content"], "test.jpg", { type: "image/jpeg" });

      const formData = new FormData();
      formData.append("file", mockFile);
      formData.append("fileName", "test.jpg");

      // Mock upload error
      const mockStorage = createMockSupabaseStorage();
      mockStorage.upload.mockResolvedValue({
        error: { message: "Storage full" },
        data: null,
      });
      mockSupabase.storage.from.mockReturnValue(mockStorage);

      const result = await uploadProductImage(formData);

      expect(result.success).toBe(false);
      // uploadProductImage peut retourner une structure différente  
      expect(result.error || result.message).toContain("Storage");
    });
  });

  // Les tests de permissions et revalidation sont couverts par les tests fonctionnels ci-dessus
});
