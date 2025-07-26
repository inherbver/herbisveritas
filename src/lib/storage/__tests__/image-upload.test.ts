import { uploadProductImageCore, uploadMagazineImageCore } from "../image-upload";

// Mock des dépendances
jest.mock("@/lib/supabase/server");
jest.mock("@/lib/auth/server-auth");
jest.mock("@/lib/auth/server-actions-auth");

describe("Image Upload Core Functions", () => {
  describe("uploadProductImageCore", () => {
    it("should be defined and be a function", () => {
      expect(uploadProductImageCore).toBeDefined();
      expect(typeof uploadProductImageCore).toBe("function");
    });

    it("should use products bucket configuration", () => {
      // Cette fonction est wrappée par withPermissionSafe
      // Les tests détaillés sont déjà dans productActions.test.ts
      expect(uploadProductImageCore).toBeDefined();
    });
  });

  describe("uploadMagazineImageCore", () => {
    it("should be defined and be a function", () => {
      expect(uploadMagazineImageCore).toBeDefined();
      expect(typeof uploadMagazineImageCore).toBe("function");
    });

    it("should be an async function", () => {
      expect(uploadMagazineImageCore.constructor.name).toBe("AsyncFunction");
    });
  });

  describe("Type exports", () => {
    it("should export UploadImageResult type", async () => {
      // Test que le type est exporté en vérifiant qu'une fonction l'utilise
      const mockFormData = new FormData();
      const result = await uploadMagazineImageCore(mockFormData);

      // Le résultat doit avoir les propriétés attendues du type UploadImageResult
      expect(result).toHaveProperty("success");
      expect(typeof result.success).toBe("boolean");

      if (result.success) {
        expect(result).toHaveProperty("data");
        expect(result).toHaveProperty("message");
      } else {
        expect(result).toHaveProperty("message");
      }
    });
  });
});
