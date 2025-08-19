/**
 * Mocks optimisés pour la performance - réponses synchrones
 * Utilisés pour les tests rapides où la logique asynchrone n'est pas critique
 */

export interface FastMockOptions {
  user?: any;
  cart?: any;
  products?: any[];
  failAuth?: boolean;
  failDatabase?: boolean;
}

/**
 * Mock Supabase ultra-rapide avec réponses synchrones
 */
export const createFastSupabaseMock = (options: FastMockOptions = {}) => {
  const {
    user = null,
    cart = null,
    products = [],
    failAuth = false,
    failDatabase = false
  } = options;

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user },
        error: failAuth ? { message: "Auth failed" } : null
      }),
      
      getSession: jest.fn().mockResolvedValue({
        data: { session: user ? { user } : null },
        error: failAuth ? { message: "Session failed" } : null
      }),
      
      signInWithPassword: jest.fn().mockResolvedValue({
        data: failAuth ? null : { user, session: { user } },
        error: failAuth ? { message: "Invalid credentials" } : null
      }),
      
      signUp: jest.fn().mockResolvedValue({
        data: failAuth ? null : { user, session: null },
        error: failAuth ? { message: "Signup failed" } : null
      }),
      
      signOut: jest.fn().mockResolvedValue({
        error: failAuth ? { message: "Signout failed" } : null
      })
    },
    
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: failDatabase ? null : (cart || {}),
        error: failDatabase ? { message: "Database error" } : null
      }),
      then: jest.fn().mockResolvedValue({
        data: failDatabase ? [] : products,
        error: failDatabase ? { message: "Query failed" } : null
      })
    })),
    
    rpc: jest.fn().mockResolvedValue({
      data: failDatabase ? null : {},
      error: failDatabase ? { message: "RPC failed" } : null
    })
  };
};

/**
 * Mock Next.js optimisé
 */
export const createFastNextMocks = () => ({
  redirect: jest.fn(),
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
  cookies: {
    get: jest.fn().mockReturnValue(null),
    set: jest.fn(),
    delete: jest.fn()
  }
});

/**
 * Setup rapide pour tests unitaires simples
 */
export const setupFastTest = (options: FastMockOptions = {}) => {
  const supabaseMock = createFastSupabaseMock(options);
  const nextMocks = createFastNextMocks();
  
  // Mock tous les modules Supabase
  jest.mocked(require('@/lib/supabase/client').createClient).mockReturnValue(supabaseMock);
  jest.mocked(require('@/lib/supabase/server').createSupabaseServerClient).mockResolvedValue(supabaseMock);
  jest.mocked(require('@/lib/supabase/admin').createAdminClient).mockReturnValue(supabaseMock);
  
  return {
    supabase: supabaseMock,
    next: nextMocks,
    cleanup: () => {
      jest.clearAllMocks();
    }
  };
};

/**
 * Scénarios de test pré-configurés
 */
export const fastTestScenarios = {
  authenticatedUser: () => setupFastTest({
    user: { id: 'user-1', email: 'test@test.com' },
    cart: { id: 'cart-1', user_id: 'user-1' },
    products: [{ id: 'prod-1', name: 'Test Product', price: 10 }]
  }),
  
  guestUser: () => setupFastTest({
    user: null,
    cart: { id: 'guest-cart', user_id: null },
    products: [{ id: 'prod-1', name: 'Test Product', price: 10 }]
  }),
  
  authError: () => setupFastTest({
    failAuth: true
  }),
  
  databaseError: () => setupFastTest({
    failDatabase: true
  })
};