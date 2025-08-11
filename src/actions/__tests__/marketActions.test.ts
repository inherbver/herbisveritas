/**
 * Tests for Market Actions
 */

import { createMarket, updateMarket, deleteMarket } from "../marketActions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkAdminRole } from "@/lib/auth/admin-service";

// Mock dependencies
jest.mock("@/lib/supabase/server");
jest.mock("@/lib/auth/admin-service");
jest.mock("next/cache");

const mockSupabaseClient = {
  from: jest.fn(() => mockSupabaseClient),
  select: jest.fn(() => mockSupabaseClient),
  insert: jest.fn(() => mockSupabaseClient),
  update: jest.fn(() => mockSupabaseClient),
  delete: jest.fn(() => mockSupabaseClient),
  eq: jest.fn(() => mockSupabaseClient),
  single: jest.fn(),
  auth: {
    getUser: jest.fn(),
  },
};

(createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabaseClient);
(checkAdminRole as jest.Mock).mockResolvedValue(true);

// Mock data
const mockUser = {
  id: "user-1",
  email: "admin@test.com",
};

const mockMarket = {
  id: "market-1",
  name: "Test Market",
  address: "123 Test St",
  city: "Test City",
  postal_code: "12345",
  latitude: 48.8566,
  longitude: 2.3522,
  description: "Test market description",
  opening_hours: "9h-18h",
  contact_info: "contact@test.com",
  is_active: true,
};

const createFormData = (data: Record<string, string>) => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });
  return formData;
};

describe("marketActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
    });
  });

  describe("createMarket", () => {
    it("should create a market successfully", async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: mockMarket,
        error: null,
      });

      const formData = createFormData({
        name: "Test Market",
        address: "123 Test St",
        city: "Test City",
        postal_code: "12345",
        latitude: "48.8566",
        longitude: "2.3522",
        description: "Test market description",
        opening_hours: "9h-18h",
        contact_info: "contact@test.com",
      });

      const result = await createMarket(formData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: mockMarket.id });
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("markets");
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Test Market",
          address: "123 Test St",
          city: "Test City",
          postal_code: "12345",
          latitude: 48.8566,
          longitude: 2.3522,
        })
      );
    });

    it("should handle unauthenticated user", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const formData = createFormData({
        name: "Test Market",
      });

      const result = await createMarket(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("authentifié");
    });

    it("should handle non-admin user", async () => {
      (checkAdminRole as jest.Mock).mockResolvedValue(false);

      const formData = createFormData({
        name: "Test Market",
      });

      const result = await createMarket(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("autorisé");
    });

    it("should handle validation errors", async () => {
      const formData = createFormData({
        name: "", // Empty name should fail validation
      });

      const result = await createMarket(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle database errors", async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: "Database error", code: "500" },
      });

      const formData = createFormData({
        name: "Test Market",
        address: "123 Test St",
        city: "Test City",
        postal_code: "12345",
        latitude: "48.8566",
        longitude: "2.3522",
      });

      const result = await createMarket(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("updateMarket", () => {
    it("should update a market successfully", async () => {
      const updatedMarket = { ...mockMarket, name: "Updated Market" };
      mockSupabaseClient.single.mockResolvedValue({
        data: updatedMarket,
        error: null,
      });

      const formData = createFormData({
        id: "market-1",
        name: "Updated Market",
        address: "123 Test St",
        city: "Test City",
        postal_code: "12345",
        latitude: "48.8566",
        longitude: "2.3522",
      });

      const result = await updateMarket(formData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: updatedMarket.id });
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Updated Market",
        })
      );
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith("id", "market-1");
    });

    it("should handle missing market ID", async () => {
      const formData = createFormData({
        name: "Updated Market",
      });

      const result = await updateMarket(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle unauthenticated user", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const formData = createFormData({
        id: "market-1",
        name: "Updated Market",
      });

      const result = await updateMarket(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("authentifié");
    });

    it("should handle non-admin user", async () => {
      (checkAdminRole as jest.Mock).mockResolvedValue(false);

      const formData = createFormData({
        id: "market-1",
        name: "Updated Market",
      });

      const result = await updateMarket(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("autorisé");
    });

    it("should handle database errors", async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: "Update failed", code: "400" },
      });

      const formData = createFormData({
        id: "market-1",
        name: "Updated Market",
        address: "123 Test St",
        city: "Test City",
        postal_code: "12345",
        latitude: "48.8566",
        longitude: "2.3522",
      });

      const result = await updateMarket(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("deleteMarket", () => {
    it("should delete a market successfully", async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await deleteMarket("market-1");

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("markets");
      expect(mockSupabaseClient.delete).toHaveBeenCalled();
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith("id", "market-1");
    });

    it("should handle unauthenticated user", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const result = await deleteMarket("market-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("authentifié");
    });

    it("should handle non-admin user", async () => {
      (checkAdminRole as jest.Mock).mockResolvedValue(false);

      const result = await deleteMarket("market-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("autorisé");
    });

    it("should handle empty market ID", async () => {
      const result = await deleteMarket("");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle database errors", async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: "Delete failed", code: "400" },
      });

      const result = await deleteMarket("market-1");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
