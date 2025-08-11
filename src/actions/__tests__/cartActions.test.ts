/**
 * Tests for Cart Actions - Server Actions with FormData
 */

import {
  addItemToCart,
  removeItemFromCart,
  updateCartItemQuantity,
  removeItemFromCartFormAction,
  updateCartItemQuantityFormAction,
  migrateAndGetCart,
  clearCartAction,
} from "../cartActions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCart } from "@/lib/cartReader";
import { getActiveUserId } from "@/utils/authUtils";
import { revalidateTag } from "next/cache";
import {
  createFormData,
  createSupabaseMock,
  expectSuccessResult,
  expectErrorResult,
  expectValidationErrorResult,
  buildMockCart,
} from "@/test-utils/formDataHelpers";

// Mock dependencies
jest.mock("@/lib/supabase/server");
jest.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: jest.fn(),
}));
jest.mock("@/lib/cartReader");
jest.mock("@/utils/authUtils");
jest.mock("next/cache");
jest.mock("@/lib/core/logger", () => ({
  LogUtils: {
    createUserActionContext: jest.fn(() => ({ userId: "user-123" })),
    logOperationStart: jest.fn(),
    logOperationSuccess: jest.fn(),
    logOperationError: jest.fn(),
  },
}));

describe("cartActions", () => {
  let mockSupabase: ReturnType<typeof createSupabaseMock>;
  let mockSupabaseAdmin: ReturnType<typeof createSupabaseMock>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Supabase mocks
    mockSupabase = createSupabaseMock();
    mockSupabaseAdmin = createSupabaseMock();

    (createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabase);
    const { createSupabaseAdminClient } = require("@/lib/supabase/admin");
    createSupabaseAdminClient.mockReturnValue(mockSupabaseAdmin);

    // Setup default user
    (getActiveUserId as jest.Mock).mockResolvedValue("user-123");

    // Setup default cart response - must return success for successful operations
    (getCart as jest.Mock).mockResolvedValue({
      success: true,
      data: buildMockCart(),
    });
  });

  describe("addItemToCart", () => {
    it("should add item to existing cart successfully", async () => {
      // Arrange - existing cart found
      mockSupabase.maybeSingle.mockResolvedValue({
        data: { id: "cart-123" },
        error: null,
      });

      mockSupabase.rpc.mockResolvedValue({ error: null });

      const formData = createFormData({
        productId: "b84a3bfb-1aa8-4e85-8bcb-1451524d90dc",
        quantity: "2",
      });

      // Act
      const result = await addItemToCart(null, formData);

      // Assert
      expectSuccessResult(result, "Article ajouté au panier");
      expect(mockSupabase.rpc).toHaveBeenCalledWith("add_or_update_cart_item", {
        p_cart_id: "cart-123",
        p_product_id: "b84a3bfb-1aa8-4e85-8bcb-1451524d90dc",
        p_quantity_to_add: 2,
      });
      expect(revalidateTag).toHaveBeenCalledWith("cart");
    });

    it("should create new cart if none exists", async () => {
      // Arrange - no existing cart
      mockSupabase.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      // Mock cart creation
      mockSupabase.single.mockResolvedValue({
        data: { id: "new-cart-123" },
        error: null,
      });

      mockSupabase.rpc.mockResolvedValue({ error: null });

      const formData = createFormData({
        productId: "12345678-1234-1234-1234-123456789013",
        quantity: "1",
      });

      // Act
      const result = await addItemToCart(null, formData);

      // Assert
      expectSuccessResult(result);
      expect(mockSupabase.insert).toHaveBeenCalledWith({ user_id: "user-123" });
      expect(mockSupabase.rpc).toHaveBeenCalledWith("add_or_update_cart_item", {
        p_cart_id: "new-cart-123",
        p_product_id: "12345678-1234-1234-1234-123456789013",
        p_quantity_to_add: 1,
      });
    });

    it("should handle validation errors", async () => {
      const formData = createFormData({
        productId: "", // Invalid
        quantity: "0", // Invalid
      });

      const result = await addItemToCart(null, formData);

      expectValidationErrorResult(result);
      expect(result.message).toContain("Erreur de validation");
      expect(mockSupabase.rpc).not.toHaveBeenCalled();
    });

    it("should handle user identification failure", async () => {
      (getActiveUserId as jest.Mock).mockResolvedValue(null);

      const formData = createFormData({
        productId: "b84a3bfb-1aa8-4e85-8bcb-1451524d90dc", // Valid UUID
        quantity: "1",
      });

      const result = await addItemToCart(null, formData);

      expectErrorResult(result, "User identification failed");
    });

    it("should handle RPC errors", async () => {
      mockSupabase.maybeSingle.mockResolvedValue({
        data: { id: "cart-123" },
        error: null,
      });

      mockSupabase.rpc.mockResolvedValue({
        error: { message: "Product not found" },
      });

      const formData = createFormData({
        productId: "b84a3bfb-1aa8-4e85-8bcb-1451524d90dc", // Valid UUID
        quantity: "1",
      });

      const result = await addItemToCart(null, formData);

      expectErrorResult(result, "Erreur lors de l'ajout au panier");
    });
  });

  describe("removeItemFromCart", () => {
    it("should remove cart item successfully", async () => {
      // The key is that after the delete chain, we need to resolve with success
      // The mock chain should end with a resolved value, not the intermediate steps
      mockSupabase.delete.mockReturnValue(mockSupabase); // Return for chaining
      mockSupabase.eq.mockResolvedValue({ error: null }); // Final resolution

      const result = await removeItemFromCart({
        cartItemId: "b84a3bfb-1aa8-4e85-8bcb-1451524d90dc",
      });

      expectSuccessResult(result, "Article supprimé");
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith("id", "b84a3bfb-1aa8-4e85-8bcb-1451524d90dc");
      expect(revalidateTag).toHaveBeenCalledWith("cart");
    });

    it("should handle validation errors", async () => {
      const result = await removeItemFromCart({ cartItemId: "" });

      expectValidationErrorResult(result);
      expect(result.message).toContain("Erreur de validation");
    });

    it("should handle delete errors", async () => {
      mockSupabase.delete.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockResolvedValue({
        error: { message: "Item not found" },
      });

      const result = await removeItemFromCart({
        cartItemId: "b84a3bfb-1aa8-4e85-8bcb-1451524d90dc",
      });

      expectErrorResult(result, "Erreur lors de la suppression");
    });
  });

  describe("updateCartItemQuantity", () => {
    it("should update quantity successfully", async () => {
      mockSupabase.update.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockResolvedValue({ error: null });

      const result = await updateCartItemQuantity({
        cartItemId: "b84a3bfb-1aa8-4e85-8bcb-1451524d90dc",
        quantity: 5,
      });

      expectSuccessResult(result, "Quantité mise à jour");
      expect(mockSupabase.update).toHaveBeenCalledWith({ quantity: 5 });
      expect(mockSupabase.eq).toHaveBeenCalledWith("id", "b84a3bfb-1aa8-4e85-8bcb-1451524d90dc");
    });

    it("should remove item when quantity is 0", async () => {
      mockSupabase.delete.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockResolvedValue({ error: null });

      const result = await updateCartItemQuantity({
        cartItemId: "b84a3bfb-1aa8-4e85-8bcb-1451524d90dc",
        quantity: 0,
      });

      expectSuccessResult(result, "Article supprimé");
      expect(mockSupabase.delete).toHaveBeenCalled();
    });

    it("should handle validation errors", async () => {
      const result = await updateCartItemQuantity({
        cartItemId: "",
        quantity: -1,
      });

      expectValidationErrorResult(result);
      expect(result.message).toContain("Erreur de validation");
    });
  });

  describe("Form Actions", () => {
    describe("removeItemFromCartFormAction", () => {
      it("should process FormData and remove item", async () => {
        mockSupabase.delete.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockResolvedValue({ error: null });

        const formData = createFormData({ cartItemId: "b84a3bfb-1aa8-4e85-8bcb-1451524d90dc" });
        const result = await removeItemFromCartFormAction(null, formData);

        expectSuccessResult(result, "Article supprimé");
      });

      it("should handle missing cartItemId", async () => {
        const formData = createFormData({});
        const result = await removeItemFromCartFormAction(null, formData);

        expectErrorResult(result, "ID de l'article est requis");
      });
    });

    describe("updateCartItemQuantityFormAction", () => {
      it("should process FormData and update quantity", async () => {
        mockSupabase.update.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockResolvedValue({ error: null });

        const formData = createFormData({
          cartItemId: "b84a3bfb-1aa8-4e85-8bcb-1451524d90dc",
          quantity: "3",
        });
        const result = await updateCartItemQuantityFormAction(null, formData);

        expectSuccessResult(result, "Quantité mise à jour");
      });

      it("should handle invalid quantity", async () => {
        const formData = createFormData({
          cartItemId: "b84a3bfb-1aa8-4e85-8bcb-1451524d90dc",
          quantity: "invalid",
        });
        const result = await updateCartItemQuantityFormAction(null, formData);

        expectErrorResult(result, "nombre positif");
      });
    });
  });

  describe("migrateAndGetCart", () => {
    it("should migrate guest cart to authenticated user", async () => {
      // Mock guest cart exists
      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: { id: "guest-cart-123" }, error: null }) // guest cart
        .mockResolvedValueOnce({ data: { id: "auth-cart-123" }, error: null }); // auth cart

      mockSupabase.rpc.mockResolvedValue({ error: null });
      mockSupabaseAdmin.auth.admin.deleteUser.mockResolvedValue({ error: null });

      const result = await migrateAndGetCart({
        guestUserId: "12345678-1234-1234-1234-123456789014",
      });

      expectSuccessResult(result);
      expect(mockSupabase.rpc).toHaveBeenCalledWith("merge_carts", {
        p_guest_cart_id: "guest-cart-123",
        p_auth_cart_id: "auth-cart-123",
      });
      expect(mockSupabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith(
        "12345678-1234-1234-1234-123456789014"
      );
    });

    it("should handle no guest cart scenario", async () => {
      mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });

      const result = await migrateAndGetCart({
        guestUserId: "12345678-1234-1234-1234-123456789014",
      });

      expectSuccessResult(result);
      expect(mockSupabase.rpc).not.toHaveBeenCalled();
    });

    it("should handle validation errors", async () => {
      const result = await migrateAndGetCart({
        guestUserId: "invalid-uuid",
      });

      expectValidationErrorResult(result);
      expect(result.message).toContain("ID invité invalide");
    });

    it("should handle same user scenario", async () => {
      // Clear all previous mocks to ensure clean state
      jest.clearAllMocks();

      // Use valid UUIDs - same UUID for both guest and authenticated user
      const sameUserId = "b84a3bfb-1aa8-4e85-8bcb-1451524d90dc";

      // Setup fresh mocks
      (getActiveUserId as jest.Mock).mockResolvedValue(sameUserId);

      // For same user scenario, getCart should return success
      (getCart as jest.Mock).mockResolvedValue({
        success: true,
        data: buildMockCart(),
      });

      // Mock a fresh Supabase client that won't be called
      const freshMock = createSupabaseMock();
      (createSupabaseServerClient as jest.Mock).mockResolvedValue(freshMock);

      const result = await migrateAndGetCart({
        guestUserId: sameUserId, // Same as authenticated user
      });

      expectSuccessResult(result);
      // The from method should not be called for same user scenario
      expect(freshMock.from).not.toHaveBeenCalled();
    });
  });

  describe("clearCartAction", () => {
    it("should clear cart successfully", async () => {
      // Create separate mock for the second chain to avoid conflicts
      const mockSupabaseForDelete = createSupabaseMock();
      mockSupabaseForDelete.delete.mockReturnValue(mockSupabaseForDelete);
      mockSupabaseForDelete.eq.mockResolvedValue({ error: null });

      // First mock returns cart lookup
      mockSupabase.maybeSingle.mockResolvedValue({
        data: { id: "cart-123" },
        error: null,
      });

      // Second from() call should return our delete mock
      mockSupabase.from
        .mockReturnValueOnce(mockSupabase) // First call for cart lookup
        .mockReturnValueOnce(mockSupabaseForDelete); // Second call for delete

      const result = await clearCartAction(null);

      expectSuccessResult(result, "Panier vidé avec succès");
      expect(mockSupabaseForDelete.delete).toHaveBeenCalled();
      expect(mockSupabaseForDelete.eq).toHaveBeenCalledWith("cart_id", "cart-123");
      expect(revalidateTag).toHaveBeenCalledWith("cart");
    });

    it("should handle no active cart", async () => {
      mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });

      const result = await clearCartAction(null);

      expectSuccessResult(result, "Aucun panier actif à vider");
      expect(mockSupabase.delete).not.toHaveBeenCalled();
    });

    it("should handle unauthenticated user", async () => {
      (getActiveUserId as jest.Mock).mockResolvedValue(null);

      const result = await clearCartAction(null);

      expectErrorResult(result, "User not authenticated");
    });
  });
});
