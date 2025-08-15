import { jest } from "@jest/globals";
import {
  getOrdersListAction,
  getOrderDetailsAction,
  updateOrderStatusAction,
  cancelOrderAction,
  getOrderStatsAction,
} from "../orderActions";

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
  rpc: jest.fn(),
};

const mockQuery = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  or: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  single: jest.fn(),
  update: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
};

// Mock des utilitaires
jest.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}));

jest.mock("@/lib/auth/admin-service", () => ({
  checkAdminRole: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

import { checkAdminRole } from "@/lib/auth/admin-service";

describe("Order Actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient.from.mockReturnValue(mockQuery);
  });

  describe("getOrdersListAction", () => {
    const mockUser = { id: "user-123" };
    const mockOrders = [
      {
        id: "order-1",
        user_id: "user-456",
        status: "processing",
        total_amount: 59.99,
        created_at: "2024-01-01T10:00:00Z",
        user: {
          id: "user-456",
          first_name: "Jean",
          last_name: "Dupont",
          email: "jean@example.com",
        },
        items: [],
      },
    ];

    it("should return orders list for admin user", async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
      });
      checkAdminRole.mockResolvedValue(true);
      mockQuery.single.mockResolvedValue({
        data: mockOrders,
        error: null,
        count: 1,
      });

      // Act
      const result = await getOrdersListAction({
        page: 1,
        limit: 25,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.orders).toHaveLength(1);
      expect(result.data?.total_count).toBe(1);
    });

    it("should reject non-admin user", async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
      });
      checkAdminRole.mockResolvedValue(false);

      // Act
      const result = await getOrdersListAction();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Accès non autorisé");
    });

    it("should handle filters correctly", async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
      });
      checkAdminRole.mockResolvedValue(true);
      mockQuery.single.mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      });

      const options = {
        filters: {
          status: ["processing", "shipped"] as const,
          search: "ORDER-123",
          min_amount: 50,
          max_amount: 100,
        },
      };

      // Act
      await getOrdersListAction(options);

      // Assert
      expect(mockQuery.in).toHaveBeenCalledWith("status", ["processing", "shipped"]);
      expect(mockQuery.or).toHaveBeenCalledWith(
        "order_number.ilike.%ORDER-123%,id.ilike.%ORDER-123%"
      );
      expect(mockQuery.gte).toHaveBeenCalledWith("total_amount", 50);
      expect(mockQuery.lte).toHaveBeenCalledWith("total_amount", 100);
    });
  });

  describe("getOrderDetailsAction", () => {
    const mockUser = { id: "user-123" };
    const mockOrderDetails = {
      id: "order-1",
      user_id: "user-456",
      status: "processing",
      total_amount: 59.99,
      user: {
        id: "user-456",
        email: "jean@example.com",
        first_name: "Jean",
        last_name: "Dupont",
      },
      items: [
        {
          id: "item-1",
          product_id: "product-1",
          quantity: 2,
          price_at_purchase: 29.99,
        },
      ],
    };

    it("should return order details for admin user", async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
      });
      checkAdminRole.mockResolvedValue(true);
      mockQuery.single.mockResolvedValue({
        data: mockOrderDetails,
        error: null,
      });

      // Act
      const result = await getOrderDetailsAction("order-1");

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockOrderDetails);
      expect(mockQuery.eq).toHaveBeenCalledWith("id", "order-1");
    });

    it("should reject non-admin user", async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
      });
      checkAdminRole.mockResolvedValue(false);

      // Act
      const result = await getOrderDetailsAction("order-1");

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Accès non autorisé");
    });
  });

  describe("updateOrderStatusAction", () => {
    const mockUser = { id: "user-123" };

    it("should update order status successfully", async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
      });
      checkAdminRole.mockResolvedValue(true);
      mockQuery.update.mockResolvedValue({
        error: null,
      });

      const updateData = {
        status: "shipped" as const,
        notes: "Expédié avec transporteur X",
      };

      // Act
      const result = await updateOrderStatusAction("order-1", updateData);

      // Assert
      expect(result.success).toBe(true);
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "shipped",
          notes: "Expédié avec transporteur X",
        })
      );
      expect(mockQuery.eq).toHaveBeenCalledWith("id", "order-1");
    });

    it("should log audit event", async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
      });
      checkAdminRole.mockResolvedValue(true);
      mockQuery.update.mockResolvedValue({ error: null });

      const updateData = {
        status: "shipped" as const,
        notes: "Test update",
      };

      // Act
      await updateOrderStatusAction("order-1", updateData);

      // Assert
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("audit_logs");
      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-123",
          event_type: "update_order_status",
          data: expect.objectContaining({
            target_id: "order-1",
            new_status: "shipped",
          }),
        })
      );
    });
  });

  describe("cancelOrderAction", () => {
    const mockUser = { id: "user-123" };

    it("should cancel order and restore stock", async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
      });
      checkAdminRole.mockResolvedValue(true);

      // Mock order status check
      mockQuery.select.mockReturnValueOnce({
        ...mockQuery,
        single: jest.fn().mockResolvedValue({
          data: { status: "processing" },
          error: null,
        }),
      });

      // Mock order items for stock restoration
      mockQuery.select.mockReturnValueOnce({
        ...mockQuery,
        eq: jest.fn().mockResolvedValue({
          data: [
            { product_id: "product-1", quantity: 2 },
            { product_id: "product-2", quantity: 1 },
          ],
          error: null,
        }),
      });

      mockQuery.update.mockResolvedValue({ error: null });
      mockSupabaseClient.rpc.mockResolvedValue({ error: null });

      // Act
      const result = await cancelOrderAction("order-1", "Client request");

      // Assert
      expect(result.success).toBe(true);
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "cancelled",
          notes: "Client request",
        })
      );

      // Verify stock restoration calls
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith("increment_product_stock", {
        product_id: "product-1",
        quantity_to_add: 2,
      });
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith("increment_product_stock", {
        product_id: "product-2",
        quantity_to_add: 1,
      });
    });

    it("should prevent cancellation of delivered orders", async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
      });
      checkAdminRole.mockResolvedValue(true);

      mockQuery.select.mockReturnValueOnce({
        ...mockQuery,
        single: jest.fn().mockResolvedValue({
          data: { status: "delivered" },
          error: null,
        }),
      });

      // Act
      const result = await cancelOrderAction("order-1", "Test");

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Cette commande ne peut pas être annulée");
    });
  });

  describe("getOrderStatsAction", () => {
    const mockUser = { id: "user-123" };
    const mockOrdersData = [
      {
        status: "processing",
        payment_status: "succeeded",
        total_amount: 59.99,
        created_at: new Date().toISOString(),
      },
      {
        status: "delivered",
        payment_status: "succeeded",
        total_amount: 89.99,
        created_at: "2024-01-01T10:00:00Z",
      },
      {
        status: "cancelled",
        payment_status: "failed",
        total_amount: 39.99,
        created_at: "2024-01-01T10:00:00Z",
      },
    ];

    it("should calculate order statistics correctly", async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
      });
      checkAdminRole.mockResolvedValue(true);
      mockQuery.select.mockResolvedValue({
        data: mockOrdersData,
        error: null,
      });

      // Act
      const result = await getOrderStatsAction();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        total_orders: 3,
        processing_orders: 1,
        delivered_orders: 1,
        cancelled_orders: 1,
        total_revenue: 149.98, // 59.99 + 89.99 (succeeded payments only)
        orders_today: 1,
        revenue_today: 59.99,
      });
    });

    it("should handle empty orders data", async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
      });
      checkAdminRole.mockResolvedValue(true);
      mockQuery.select.mockResolvedValue({
        data: [],
        error: null,
      });

      // Act
      const result = await getOrderStatsAction();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        total_orders: 0,
        pending_orders: 0,
        processing_orders: 0,
        shipped_orders: 0,
        delivered_orders: 0,
        cancelled_orders: 0,
        total_revenue: 0,
        average_order_value: 0,
        orders_today: 0,
        revenue_today: 0,
      });
    });
  });
});
