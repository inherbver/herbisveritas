/**
 * Tests for Magazine Actions
 */

import { createArticle, updateArticle, deleteArticle } from "../magazineActions";
import { 
  createMockFormData, 
  testActionWithRedirect,
  setupServerActionMocks 
} from '@/test-utils/server-action-mocks';

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkUserPermission } from "@/lib/auth/server-auth";

// Mock dependencies
jest.mock("@/lib/supabase/server");
jest.mock("@/lib/auth/server-auth");
jest.mock("next/cache");
jest.mock("@/lib/magazine/html-converter");
jest.mock("@/lib/magazine/publication-utils");

const mockSupabaseClient = {
  from: jest.fn(() => mockSupabaseClient),
  select: jest.fn(() => mockSupabaseClient),
  insert: jest.fn(() => mockSupabaseClient),
  update: jest.fn(() => mockSupabaseClient),
  delete: jest.fn(() => mockSupabaseClient),
  eq: jest.fn(() => mockSupabaseClient),
  single: jest.fn(),
  rpc: jest.fn(),
};

(createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabaseClient);
// Mock auth to return a user by default
const mockAuthResponse = {
  data: { user: { id: "user-1" } },
  error: null,
};
mockSupabaseClient.auth = {
  getUser: jest.fn().mockResolvedValue(mockAuthResponse),
};

(checkUserPermission as jest.Mock).mockResolvedValue({
  isAuthorized: true,
  user: { id: "user-1" },
  role: "admin"
});

// Mock the html converter functions
jest.mock("@/lib/magazine/html-converter", () => ({
  convertTipTapToHTML: jest.fn().mockReturnValue("<p>Test content</p>"),
  calculateReadingTime: jest.fn().mockReturnValue(5),
  extractExcerpt: jest.fn().mockReturnValue("Test excerpt"),
}));

// Mock publication utils
jest.mock("@/lib/magazine/publication-utils", () => ({
  canPerformPublicationAction: jest.fn().mockReturnValue(true),
  validateArticleForPublication: jest.fn().mockReturnValue(true),
  getPublicationActionMessage: jest.fn().mockReturnValue("Article created successfully"),
}));

// Mock data
const mockArticle = {
  id: "article-1",
  title: "Test Article",
  slug: "test-article",
  excerpt: "Test excerpt",
  content: { type: "doc", content: [] },
  html_content: "<p>Test content</p>",
  status: "draft" as const,
  reading_time: 5,
  featured_image: "https://test.com/image.jpg",
  author_id: "user-1",
  category_id: "cat-1",
  is_featured: false,
  meta_description: "Test meta",
  meta_keywords: ["test"],
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
  tag_ids: ["tag-1"],
  is_featured: false,
  meta_description: "Test meta",
  meta_keywords: ["test"],
  published_at: null,
};

// Setup des mocks standards pour Server Actions
setupServerActionMocks();

describe("magazineActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createArticle", () => {
    it("should create an article successfully", async () => {
      // Mock pour la vérification du slug (doit retourner null pour slug inexistant)
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });
      // Mock pour la création de l'article
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockArticle,
        error: null,
      });

      const result = await createArticle(mockArticleFormData);

      expect(result?.success ?? true).toBe(true);
      expect(result.data).toEqual(mockArticle);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("articles");
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Test Article",
          slug: "test-article",
          excerpt: "Test excerpt",
          status: "draft",
          html_content: "<p>Test content</p>",
          reading_time: 5,
        })
      );
    });

    it("should handle unauthorized user", async () => {
      (checkUserPermission as jest.Mock).mockResolvedValue({
        isAuthorized: false,
        error: "Permission refusée"
      });

      const result = await createArticle(mockArticleFormData);

      expect(result?.success).toBe(false);
      expect(result.error).toContain("Permission refusée");
    });

    it("should handle missing title", async () => {
      const invalidData = { ...mockArticleFormData, title: "" };

      const result = await createArticle(invalidData);

      expect(result?.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle missing content", async () => {
      const invalidData = { ...mockArticleFormData, content: null as any };

      const result = await createArticle(invalidData);

      expect(result?.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle database errors", async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: "Database error", code: "500" },
      });

      const result = await createArticle(mockArticleFormData);

      expect(result?.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should generate slug from title if not provided", async () => {
      // Mock pour la vérification du slug (doit retourner null)
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });
      // Mock pour la création de l'article
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockArticle,
        error: null,
      });

      const dataWithoutSlug = { ...mockArticleFormData, slug: undefined };
      const result = await createArticle(dataWithoutSlug);

      expect(result?.success ?? true).toBe(true);
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: expect.any(String),
        })
      );
    });
  });

  describe("updateArticle", () => {
    it("should update an article successfully", async () => {
      const updatedArticle = { ...mockArticle, title: "Updated Article" };
      mockSupabaseClient.single.mockResolvedValue({
        data: updatedArticle,
        error: null,
      });

      const updateData = { ...mockArticleFormData, title: "Updated Article" };
      const result = await updateArticle("article-1", updateData);

      expect(result?.success ?? true).toBe(true);
      expect(result.data).toEqual(updatedArticle);
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Updated Article",
          html_content: "<p>Test content</p>",
          reading_time: 5,
        })
      );
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith("id", "article-1");
    });

    it("should handle unauthorized user", async () => {
      (checkUserPermission as jest.Mock).mockResolvedValue({
        isAuthorized: false,
        error: "Permission refusée"
      });

      const result = await updateArticle("article-1", mockArticleFormData);

      expect(result?.success).toBe(false);
      expect(result.error).toContain("Permission refusée");
    });

    it("should handle empty article ID", async () => {
      const result = await updateArticle("", mockArticleFormData);

      expect(result?.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle missing title", async () => {
      const invalidData = { ...mockArticleFormData, title: "" };

      const result = await updateArticle("article-1", invalidData);

      expect(result?.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle missing content", async () => {
      const invalidData = { ...mockArticleFormData, content: null as any };

      const result = await updateArticle("article-1", invalidData);

      expect(result?.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle database errors", async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: "Update failed", code: "400" },
      });

      const result = await updateArticle("article-1", mockArticleFormData);

      expect(result?.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle tags relationship update", async () => {
      // Mock pour la vérification du slug
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });
      // Mock pour la mise à jour
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockArticle,
        error: null,
      });

      // Mock the RPC call for updating tags
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: null,
      });

      const dataWithTags = { ...mockArticleFormData, tag_ids: ["tag-1", "tag-2"] };
      const result = await updateArticle("article-1", dataWithTags);

      expect(result?.success ?? true).toBe(true);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith("update_article_tags", {
        article_id: "article-1",
        tag_ids: ["tag-1", "tag-2"],
      });
    });
  });

  describe("deleteArticle", () => {
    it("should delete an article successfully", async () => {
      // Mock pour delete().eq() - retourne directement le résultat
      mockSupabaseClient.eq.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await deleteArticle("article-1");

      expect(result?.success ?? true).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("articles");
      expect(mockSupabaseClient.delete).toHaveBeenCalled();
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith("id", "article-1");
    });

    it("should handle unauthorized user", async () => {
      (checkUserPermission as jest.Mock).mockResolvedValue({
        isAuthorized: false,
        error: "Permission refusée"
      });

      const result = await deleteArticle("article-1");

      expect(result?.success).toBe(false);
      expect(result.error).toContain("Permission refusée");
    });

    it("should handle empty article ID", async () => {
      const result = await deleteArticle("");

      expect(result?.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle database errors", async () => {
      mockSupabaseClient.eq.mockResolvedValue({
        data: null,
        error: { message: "Delete failed", code: "400" },
      });

      const result = await deleteArticle("article-1");

      expect(result?.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle article not found", async () => {
      mockSupabaseClient.eq.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "Article not found" },
      });

      const result = await deleteArticle("non-existent");

      expect(result?.success).toBe(false);
      expect(result.error).toContain("not found");
    });
  });
});
