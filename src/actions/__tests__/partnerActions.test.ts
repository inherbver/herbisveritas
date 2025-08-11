/**
 * Tests for Partner Actions
 */

import { createPartner, updatePartner, deletePartner } from "../partnerActions";
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

const mockPartner = {
  id: "partner-1",
  name: "Test Partner",
  description: "Test partner description",
  website_url: "https://test.com",
  logo_url: "https://test.com/logo.jpg",
  contact_email: "contact@test.com",
  is_active: true,
  display_order: 1,
};

const createFormData = (data: Record<string, string>) => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });
  return formData;
};

describe("partnerActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
    });
  });

  describe("createPartner", () => {
    it("should create a partner successfully", async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: mockPartner,
        error: null,
      });

      const formData = createFormData({
        name: "Test Partner",
        description: "Test partner description",
        website_url: "https://test.com",
        logo_url: "https://test.com/logo.jpg",
        contact_email: "contact@test.com",
        display_order: "1",
      });

      const result = await createPartner(formData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: mockPartner.id });
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("partners");
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Test Partner",
          description: "Test partner description",
          website_url: "https://test.com",
          logo_url: "https://test.com/logo.jpg",
          contact_email: "contact@test.com",
          display_order: 1,
        })
      );
    });

    it("should handle unauthenticated user", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const formData = createFormData({
        name: "Test Partner",
      });

      const result = await createPartner(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("authentifié");
    });

    it("should handle non-admin user", async () => {
      (checkAdminRole as jest.Mock).mockResolvedValue(false);

      const formData = createFormData({
        name: "Test Partner",
      });

      const result = await createPartner(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("autorisé");
    });

    it("should handle validation errors", async () => {
      const formData = createFormData({
        name: "", // Empty name should fail validation
      });

      const result = await createPartner(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle database errors", async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: "Database error", code: "500" },
      });

      const formData = createFormData({
        name: "Test Partner",
        description: "Test partner description",
        website_url: "https://test.com",
        contact_email: "contact@test.com",
        display_order: "1",
      });

      const result = await createPartner(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("updatePartner", () => {
    it("should update a partner successfully", async () => {
      const updatedPartner = { ...mockPartner, name: "Updated Partner" };
      mockSupabaseClient.single.mockResolvedValue({
        data: updatedPartner,
        error: null,
      });

      const formData = createFormData({
        id: "partner-1",
        name: "Updated Partner",
        description: "Updated description",
        website_url: "https://updated.com",
        contact_email: "updated@test.com",
        display_order: "2",
      });

      const result = await updatePartner(formData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: updatedPartner.id });
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Updated Partner",
          description: "Updated description",
          website_url: "https://updated.com",
          contact_email: "updated@test.com",
          display_order: 2,
        })
      );
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith("id", "partner-1");
    });

    it("should handle missing partner ID", async () => {
      const formData = createFormData({
        name: "Updated Partner",
      });

      const result = await updatePartner(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle unauthenticated user", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const formData = createFormData({
        id: "partner-1",
        name: "Updated Partner",
      });

      const result = await updatePartner(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("authentifié");
    });

    it("should handle non-admin user", async () => {
      (checkAdminRole as jest.Mock).mockResolvedValue(false);

      const formData = createFormData({
        id: "partner-1",
        name: "Updated Partner",
      });

      const result = await updatePartner(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("autorisé");
    });

    it("should handle database errors", async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: "Update failed", code: "400" },
      });

      const formData = createFormData({
        id: "partner-1",
        name: "Updated Partner",
        description: "Updated description",
        website_url: "https://updated.com",
        contact_email: "updated@test.com",
        display_order: "2",
      });

      const result = await updatePartner(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("deletePartner", () => {
    it("should delete a partner successfully", async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await deletePartner("partner-1");

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("partners");
      expect(mockSupabaseClient.delete).toHaveBeenCalled();
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith("id", "partner-1");
    });

    it("should handle unauthenticated user", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const result = await deletePartner("partner-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("authentifié");
    });

    it("should handle non-admin user", async () => {
      (checkAdminRole as jest.Mock).mockResolvedValue(false);

      const result = await deletePartner("partner-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("autorisé");
    });

    it("should handle empty partner ID", async () => {
      const result = await deletePartner("");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle database errors", async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: "Delete failed", code: "400" },
      });

      const result = await deletePartner("partner-1");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
