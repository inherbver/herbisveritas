// Mock Supabase client
export const mockSupabaseClient = {
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: null },
      error: null,
    }),
    getSession: jest.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    }),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    resetPasswordForEmail: jest.fn(),
    updateUser: jest.fn(),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
  },
  from: jest.fn((table: string) => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  })),
  storage: {
    from: jest.fn((bucket: string) => ({
      upload: jest.fn().mockResolvedValue({ data: { path: "test-path" }, error: null }),
      getPublicUrl: jest
        .fn()
        .mockReturnValue({ data: { publicUrl: "https://test.url/image.jpg" } }),
      remove: jest.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
  rpc: jest.fn(),
};

// Mock Next.js router
export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  refresh: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  prefetch: jest.fn(),
  pathname: "/",
  query: {},
  asPath: "/",
  locale: "fr",
  locales: ["fr", "en", "de", "es"],
  defaultLocale: "fr",
};

// Mock product data
export const mockProduct = {
  id: "prod-1",
  name: "Test Product",
  slug: "test-product",
  description: "Test description",
  price: 29.99,
  stock: 10,
  active: true,
  category: "test-category",
  images: ["image1.jpg"],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Mock cart item
export const mockCartItem = {
  id: "item-1",
  productId: "prod-1",
  name: "Test Product",
  price: 29.99,
  quantity: 2,
  image: "image1.jpg",
  slug: "test-product",
  stock: 10,
};

// Mock user
export const mockUser = {
  id: "user-1",
  email: "test@example.com",
  role: "user",
  created_at: new Date().toISOString(),
};

// Mock admin user
export const mockAdminUser = {
  ...mockUser,
  id: "admin-1",
  email: "admin@example.com",
  role: "admin",
};

// Mock address
export const mockAddress = {
  id: "addr-1",
  user_id: "user-1",
  name: "John Doe",
  street: "123 Test St",
  city: "Paris",
  postal_code: "75001",
  country: "FR",
  phone: "+33123456789",
  is_default: true,
  is_billing: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Mock order
export const mockOrder = {
  id: "order-1",
  user_id: "user-1",
  status: "pending",
  total: 59.98,
  items: [mockCartItem],
  shipping_address: mockAddress,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Utility to create mock fetch response
export const mockFetch = (data: any, ok = true) => {
  return jest.fn().mockResolvedValue({
    ok,
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
    status: ok ? 200 : 400,
    statusText: ok ? "OK" : "Bad Request",
  });
};

// Mock localStorage
export const mockLocalStorage = () => {
  const store: { [key: string]: string } = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
  };
};
