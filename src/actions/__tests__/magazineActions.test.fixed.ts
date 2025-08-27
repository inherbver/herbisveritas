/**
 * Tests for Magazine Actions - Fixed Version
 */

import { createArticle, updateArticle, deleteArticle } from "../magazineActions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkUserPermission } from "@/lib/auth/server-auth";

// Mock dependencies
jest.mock("@/lib/supabase/server");
jest.mock("@/lib/auth/server-auth");
jest.mock("next/cache");
jest.mock("@/lib/magazine/html-converter");
jest.mock("@/lib/magazine/publication-utils");

// Mock data
const mockArticle = {
  id: "article-1",
  title: "Test Article",
  slug: "test-article",
  excerpt: "Test excerpt",
  content: { type: "doc", content: [] },
  content_html: "<p>Test content</p>",
  status: "draft" as const,
  reading_time: 5,
  featured_image: "https://test.com/image.jpg",
  author_id: "user-1",
  category_id: "cat-1",
  published_at: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const mockArticleFormData = {
  title: "Test Article",
  slug: "test-article",
  excerpt: "Test excerpt",
  content: { type: "doc", content: [] },
  status: "draft" as const,
  featured_image: "https://test.com/image.jpg",
  category_id: "cat-1",
  tags: ["tag-1"],
  seo_title: "Test SEO Title",
  seo_description: "Test SEO Description",
  published_at: null,
};

describe("magazineActions - Fixed", () => {
  let mockSupabaseClient: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a proper chainable mock for Supabase
    mockSupabaseClient = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: jest.fn(),
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      eq: jest.fn(),
      single: jest.fn(),
      rpc: jest.fn(),
    };
    
    // Make chainable methods return the client for chaining
    const chainableMethods = ['from', 'select', 'insert', 'update', 'delete', 'eq'];
    chainableMethods.forEach(method => {
      mockSupabaseClient[method].mockReturnValue(mockSupabaseClient);
    });
    
    (createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabaseClient);
    
    // Default auth mock - authorized
    (checkUserPermission as jest.Mock).mockResolvedValue({
      isAuthorized: true,
      user: { id: "user-1" },
      role: "admin"
    });
    
    // Mock HTML converter functions
    jest.mock("@/lib/magazine/html-converter", () => ({
      convertTipTapToHTML: jest.fn().mockReturnValue("<p>Test content</p>"),
      calculateReadingTime: jest.fn().mockReturnValue(5),
      extractExcerpt: jest.fn().mockReturnValue("Test excerpt"),
    }));
    
    // Mock publication utils
    jest.mock("@/lib/magazine/publication-utils", () => ({
      canPerformPublicationAction: jest.fn().mockReturnValue(true),
      validateArticleForPublication: jest.fn().mockReturnValue(true),
      getPublicationActionMessage: jest.fn().mockReturnValue("Success"),
    }));
  });

  describe("createArticle", () => {
    it("should create an article successfully", async () => {
      // Setup mocks for successful creation
      // First call: check slug uniqueness (should return null)
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null, // No existing article with this slug
        error: null,
      });
      
      // Second call: create article (returns created article)
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockArticle,
        error: null,
      });
      
      // Mock for tags insertion
      mockSupabaseClient.insert.mockImplementation((data) => {
        // If it's tags, don't call single
        if (Array.isArray(data) && data[0]?.article_id) {
          return Promise.resolve({ data: null, error: null });
        }
        return mockSupabaseClient;
      });

      const result = await createArticle(mockArticleFormData);

      expect(result).toEqual({
        success: true,
        data: mockArticle,
        message: "Article créé avec succès"
      });
      
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("articles");
      expect(mockSupabaseClient.insert).toHaveBeenCalled();
    });

    it("should handle unauthorized user", async () => {
      (checkUserPermission as jest.Mock).mockResolvedValue({
        isAuthorized: false,
        error: "Not authenticated"
      });

      const result = await createArticle(mockArticleFormData);

      expect(result?.success).toBe(false);
      expect(result.error).toContain("Not authenticated");
    });

    it("should handle slug conflict", async () => {
      // Mock existing article with same slug
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: "existing-article" }, // Article exists
        error: null,
      });

      const result = await createArticle(mockArticleFormData);

      expect(result?.success).toBe(false);
      expect(result.error).toContain("slug existe déjà");
    });
  });

  describe("updateArticle", () => {
    it("should update an article successfully", async () => {
      const updatedArticle = { ...mockArticle, title: "Updated Article" };
      
      // Mock neq to return the client for chaining
      mockSupabaseClient.neq = jest.fn().mockReturnValue(mockSupabaseClient);
      
      // First call: check slug uniqueness with .neq().single() 
      // Should return null (no conflicting article)
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });
      
      // Second call: update article with .select().single()
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: updatedArticle,
        error: null,
      });
      
      // Mock for tags deletion
      mockSupabaseClient.delete.mockImplementation(() => {
        mockSupabaseClient.eq.mockResolvedValueOnce({ data: null, error: null });
        return mockSupabaseClient;
      });
      
      // Mock for tags insertion  
      mockSupabaseClient.insert.mockImplementation((data) => {
        if (Array.isArray(data) && data[0]?.article_id) {
          return Promise.resolve({ data: null, error: null });
        }
        return mockSupabaseClient;
      });

      const updateData = { ...mockArticleFormData, title: "Updated Article" };
      const result = await updateArticle("article-1", updateData);

      // Add debug logging if test fails
      if (!result.success) {
        console.log('Update failed with:', result);
      }
      
      expect(result).toEqual({
        success: true,
        data: updatedArticle,
        message: "Article mis à jour avec succès"
      });
      
      expect(mockSupabaseClient.update).toHaveBeenCalled();
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith("id", "article-1");
    });

    it("should handle unauthorized user", async () => {
      (checkUserPermission as jest.Mock).mockResolvedValue({
        isAuthorized: false,
        error: "Permission denied"
      });

      const result = await updateArticle("article-1", mockArticleFormData);

      expect(result?.success).toBe(false);
      expect(result.error).toContain("Permission denied");
    });
  });

  describe("deleteArticle", () => {
    it("should delete an article successfully", async () => {
      // For delete, the chain ends with eq() returning the result
      mockSupabaseClient.eq.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await deleteArticle("article-1");

      expect(result).toEqual({
        success: true,
        data: null,
        message: "Article supprimé avec succès"
      });
      
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("articles");
      expect(mockSupabaseClient.delete).toHaveBeenCalled();
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith("id", "article-1");
    });

    it("should handle unauthorized user", async () => {
      (checkUserPermission as jest.Mock).mockResolvedValue({
        isAuthorized: false,
        error: "Unauthorized"
      });

      const result = await deleteArticle("article-1");

      expect(result?.success).toBe(false);
      expect(result.error).toContain("Unauthorized");
    });

    it("should handle database errors", async () => {
      mockSupabaseClient.eq.mockResolvedValueOnce({
        data: null,
        error: { message: "Delete failed", code: "400" },
      });

      const result = await deleteArticle("article-1");

      expect(result?.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});