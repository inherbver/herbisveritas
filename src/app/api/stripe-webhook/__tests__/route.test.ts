/**
 * Tests for Stripe Webhook Handler
 */

import { POST } from "../route";
import { headers } from "next/headers";
import Stripe from "stripe";

// Create mock before jest.mock calls to avoid hoisting issues
const mockConstructEvent = jest.fn();

// Mock dependencies
jest.mock("next/headers");
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));
jest.mock("@/lib/admin/event-logger", () => ({
  logEvent: jest.fn(),
}));

jest.mock("stripe", () => {
  const mockConstructEventFunction = jest.fn();
  return jest.fn(() => ({
    webhooks: {
      constructEvent: mockConstructEventFunction,
    },
  }));
});
jest.mock("next/server", () => {
  const MockNextResponse = class MockNextResponse {
    public body: unknown;
    public status: number;
    public headers: Record<string, string>;

    constructor(
      body?: unknown,
      init?: { status?: number; headers?: Record<string, string> },
    ) {
      this.body = body;
      this.status = init?.status || 200;
      this.headers = init?.headers || { "Content-Type": "application/json" };
    }

    static json(
      data: unknown,
      init?: { status?: number; headers?: Record<string, string> },
    ) {
      return new MockNextResponse(JSON.stringify(data), {
        status: init?.status || 200,
        headers: init?.headers || { "Content-Type": "application/json" },
      });
    }

    async json() {
      return typeof this.body === "string" ? JSON.parse(this.body) : this.body;
    }

    async text() {
      return typeof this.body === "string"
        ? this.body
        : JSON.stringify(this.body);
    }
  };

  return {
    NextResponse: MockNextResponse,
  };
});

// Mock global Request and Response if needed
if (!global.Request) {
  global.Request = class MockRequest {
    constructor(
      public input: string | URL,
      public init?: {
        body?: string;
        method?: string;
        headers?: Record<string, string>;
      },
    ) {}
    async text() {
      return this.init?.body || "";
    }
    async json() {
      return JSON.parse(this.init?.body || "{}");
    }
  } as any;
}

if (!global.Response) {
  global.Response = class MockResponse {
    constructor(
      public body?: unknown,
      public init?: { status?: number; headers?: Record<string, string> },
    ) {}
    get status() {
      return this.init?.status || 200;
    }
    async json() {
      return typeof this.body === "string" ? JSON.parse(this.body) : this.body;
    }
    async text() {
      return typeof this.body === "string"
        ? this.body
        : JSON.stringify(this.body);
    }
  } as any;
}

const mockHeaders = {
  get: jest.fn(),
};

const mockSupabaseClient: any = {
  from: jest.fn(function (this: any) {
    return this;
  }),
  select: jest.fn(function (this: any) {
    return this;
  }),
  eq: jest.fn(function (this: any) {
    return this;
  }),
  single: jest.fn(),
  insert: jest.fn(function (this: any) {
    return this;
  }),
  update: jest.fn(function (this: any) {
    return this;
  }),
  delete: jest.fn(() => mockSupabaseClient),
};

// Mock Stripe instance will be created in tests

// Mock environment variables
const originalEnv = process.env;

// Mock data
const mockCheckoutSession: Stripe.Checkout.Session = {
  id: "cs_test_123",
  object: "checkout.session",
  amount_total: 6598, // 65.98 EUR in cents
  currency: "eur",
  customer_email: "test@example.com",
  payment_intent: "pi_test_123",
  payment_status: "paid",
  client_reference_id: "cart-123",
  metadata: {
    shippingAddressId: "addr-1",
    shippingMethodId: "shipping-1",
    userId: "user-123",
  },
  shipping_cost: {
    amount_total: 599, // 5.99 EUR in cents
  },
} as any;

const mockCart = {
  id: "cart-123",
  user_id: "user-123",
  items: [
    {
      product_id: "prod-1",
      quantity: 2,
      product: {
        id: "prod-1",
        name: "Test Product",
        price: 29.99,
        image_url: "/images/test.jpg",
      },
    },
  ],
};

const mockOrder = {
  id: "order-123",
};

describe("Stripe Webhook Handler", () => {
  let mockStripe: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset environment
    process.env = {
      ...originalEnv,
      STRIPE_SECRET_KEY: "sk_test_123",
      STRIPE_WEBHOOK_SECRET: "whsec_test_123",
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service_role_key",
    };

    // Setup mocks
    (headers as jest.Mock).mockResolvedValue(mockHeaders);
    const { createClient } = await import("@supabase/supabase-js");
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);
    
    // Setup event logger mock
    const { logEvent } = await import("@/lib/admin/event-logger");
    (logEvent as jest.Mock).mockResolvedValue(undefined);

    // Get stripe instance to access mocked constructEvent
    const StripeConstructor = Stripe as any;
    mockStripe = new StripeConstructor();

    mockHeaders.get.mockReturnValue("whsec_test_signature");
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("POST", () => {
    it("should process checkout.session.completed event successfully", async () => {
      const mockEvent: Stripe.Event = {
        id: "evt_test_123",
        object: "event",
        type: "checkout.session.completed",
        data: {
          object: mockCheckoutSession,
        },
        created: Date.now(),
        livemode: false,
        pending_webhooks: 1,
        api_version: "2025-06-30.basil",
        request: null,
      } as any;

      const mockRequest = {
        text: jest.fn().mockResolvedValue("webhook body"),
      } as any;

      // Mock successful webhook verification
      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      // Mock database operations with proper chaining
      // First call: check existing order
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: null, error: null }) // No existing order
        .mockResolvedValueOnce({ data: mockCart, error: null }) // Cart data
        .mockResolvedValueOnce({ data: mockOrder, error: null }); // Order creation

      // Order items insert operation
      mockSupabaseClient.insert.mockReturnValue(mockSupabaseClient); // For chaining
      // Final mock for .insert().select().single() chain
      // mockSupabaseClient.single is already set up above

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.received).toBe(true);
      expect(responseData.orderId).toBe("order-123");
      expect(responseData.message).toBe("Order created successfully");

      // Verify order was created with correct data
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
        user_id: "user-123",
        stripe_checkout_session_id: "cs_test_123",
        status: "processing",
        total_amount: 65.98,
        currency: "EUR",
        payment_status: "succeeded",
        payment_intent_id: "pi_test_123",
        shipping_address_id: "addr-1",
        shipping_method_id: "shipping-1",
        shipping_amount: 5.99,
      });
    });

    it("should handle invalid webhook signature", async () => {
      const mockRequest = {
        text: jest.fn().mockResolvedValue("invalid body"),
      } as any;

      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);

      const responseText = await response.text();
      expect(responseText).toContain("Webhook Error: Invalid signature");
    });

    it("should handle existing order (idempotency)", async () => {
      const mockEvent: Stripe.Event = {
        id: "evt_test_123",
        object: "event",
        type: "checkout.session.completed",
        data: {
          object: mockCheckoutSession,
        },
      } as any;

      const mockRequest = {
        text: jest.fn().mockResolvedValue("webhook body"),
      } as any;

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      // Mock existing order
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: "existing-order-123" },
        error: null,
      });

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.received).toBe(true);
      expect(responseData.message).toBe("Order already processed.");
    });

    it("should handle missing cart in session", async () => {
      const sessionWithoutCart = {
        ...mockCheckoutSession,
        client_reference_id: null,
      };

      const mockEvent: Stripe.Event = {
        id: "evt_test_123",
        object: "event",
        type: "checkout.session.completed",
        data: {
          object: sessionWithoutCart,
        },
      } as any;

      const mockRequest = {
        text: jest.fn().mockResolvedValue("webhook body"),
      } as any;

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      // Mock no existing order
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(500);

      const responseText = await response.text();
      expect(responseText).toContain("Cart ID not found");
    });

    it("should handle empty cart", async () => {
      const emptyCart = {
        ...mockCart,
        items: [],
      };

      const mockEvent: Stripe.Event = {
        id: "evt_test_123",
        object: "event",
        type: "checkout.session.completed",
        data: {
          object: mockCheckoutSession,
        },
      } as any;

      const mockRequest = {
        text: jest.fn().mockResolvedValue("webhook body"),
      } as any;

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: null, error: null }) // No existing order
        .mockResolvedValueOnce({ data: emptyCart, error: null }); // Empty cart

      const response = await POST(mockRequest);

      expect(response.status).toBe(500);

      const responseText = await response.text();
      expect(responseText).toContain("Cart cart-123 is empty");
    });

    it("should handle duplicate order creation (database constraint)", async () => {
      const mockEvent: Stripe.Event = {
        id: "evt_test_123",
        object: "event",
        type: "checkout.session.completed",
        data: {
          object: mockCheckoutSession,
        },
      } as any;

      const mockRequest = {
        text: jest.fn().mockResolvedValue("webhook body"),
      } as any;

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: null, error: null }) // No existing order check
        .mockResolvedValueOnce({ data: mockCart, error: null }) // Cart data
        .mockResolvedValueOnce({
          data: null,
          error: { code: "23505", message: "Duplicate key" }, // Duplicate constraint
        });

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.received).toBe(true);
      expect(responseData.message).toBe(
        "Order already processed (idempotency).",
      );
    });

    it("should ignore non-checkout.session.completed events", async () => {
      const mockEvent: Stripe.Event = {
        id: "evt_test_123",
        object: "event",
        type: "payment_intent.succeeded",
        data: {
          object: {} as any,
        },
      } as any;

      const mockRequest = {
        text: jest.fn().mockResolvedValue("webhook body"),
      } as any;

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.received).toBe(true);

      // Verify no database operations were performed
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });
  });
});
