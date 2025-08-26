/**
 * Helper pour créer des mocks Supabase réutilisables dans les tests
 */

export interface MockSupabaseOptions {
  user?: any;
  cart?: any;
  orders?: any[];
  products?: any[];
  error?: any;
}

/**
 * Créer un mock chainable pour Supabase
 */
export function createMockSupabaseChain(returnValue: any = { data: null, error: null }) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(returnValue),
    maybeSingle: jest.fn().mockResolvedValue(returnValue),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
    then: jest.fn((resolve) => resolve(returnValue)),
  };
  
  // Make all methods return the chain for chaining
  Object.keys(chain).forEach(key => {
    if (key !== 'single' && key !== 'maybeSingle' && key !== 'then') {
      const originalFn = chain[key as keyof typeof chain];
      chain[key as keyof typeof chain] = jest.fn((...args) => {
        originalFn(...args);
        return chain;
      });
    }
  });
  
  return chain;
}

/**
 * Créer un client Supabase complet mocké
 */
export function createMockSupabaseClient(options: MockSupabaseOptions = {}) {
  const { user, cart, orders = [], products = [], error } = options;
  
  const mockClient = {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: user || null },
        error: error || null,
      }),
      getSession: jest.fn().mockResolvedValue({
        data: { session: user ? { user } : null },
        error: error || null,
      }),
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { user: user || null, session: user ? {} : null },
        error: error || null,
      }),
      signOut: jest.fn().mockResolvedValue({
        error: null,
      }),
      onAuthStateChange: jest.fn((callback) => {
        return {
          data: {
            subscription: {
              unsubscribe: jest.fn(),
            },
          },
        };
      }),
    },
    
    from: jest.fn((table: string) => {
      // Return different data based on table
      switch (table) {
        case 'carts':
          return createMockSupabaseChain({ 
            data: cart?.cart || null, 
            error: error || null 
          });
          
        case 'cart_items':
          return createMockSupabaseChain({ 
            data: cart?.items || [], 
            error: error || null 
          });
          
        case 'orders':
          return createMockSupabaseChain({ 
            data: orders.length > 0 ? orders[0] : null, 
            error: error || null 
          });
          
        case 'products':
          return createMockSupabaseChain({ 
            data: products.length > 0 ? products : null, 
            error: error || null 
          });
          
        case 'profiles':
          return createMockSupabaseChain({ 
            data: user ? { id: user.id, role: 'user' } : null, 
            error: error || null 
          });
          
        default:
          return createMockSupabaseChain({ data: null, error: null });
      }
    }),
    
    storage: {
      from: jest.fn((bucket: string) => ({
        upload: jest.fn().mockResolvedValue({ error: null }),
        remove: jest.fn().mockResolvedValue({ error: null }),
        download: jest.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: jest.fn((path: string) => ({
          data: { publicUrl: `https://example.com/${bucket}/${path}` },
        })),
        list: jest.fn().mockResolvedValue({ data: [], error: null }),
      })),
    },
    
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  };
  
  return mockClient;
}

/**
 * Helper pour configurer rapidement les mocks Supabase dans beforeEach
 */
export function setupSupabaseMocks(mockImplementation?: MockSupabaseOptions) {
  const mockClient = createMockSupabaseClient(mockImplementation);
  
  // Mock createSupabaseServerClient
  jest.mock('@/lib/supabase/server', () => ({
    createSupabaseServerClient: jest.fn().mockResolvedValue(mockClient),
    createSupabaseAdminClient: jest.fn().mockReturnValue(mockClient),
  }));
  
  // Mock createClient
  jest.mock('@/lib/supabase/client', () => ({
    createClient: jest.fn().mockReturnValue(mockClient),
  }));
  
  return mockClient;
}

/**
 * Reset all Supabase mocks
 */
export function resetSupabaseMocks() {
  jest.clearAllMocks();
}

/**
 * Helper pour créer un mock de réponse Supabase avec pagination
 */
export function createPaginatedResponse<T>(
  items: T[],
  page: number = 1,
  pageSize: number = 10
) {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedItems = items.slice(start, end);
  
  return {
    data: paginatedItems,
    error: null,
    count: items.length,
    status: 200,
    statusText: 'OK',
  };
}

/**
 * Helper pour créer une erreur Supabase typée
 */
export function createSupabaseError(
  message: string,
  code?: string,
  details?: string
) {
  return {
    message,
    code: code || 'PGRST000',
    details: details || '',
    hint: '',
    status: 400,
  };
}

export default {
  createMockSupabaseClient,
  createMockSupabaseChain,
  setupSupabaseMocks,
  resetSupabaseMocks,
  createPaginatedResponse,
  createSupabaseError,
};