/**
 * Mocks Supabase avancés pour les tests
 * Support pour RLS policies, auth state, et opérations CRUD
 */

import type { UserWithProfile } from './factories/UserFactory'
import type { CartWithItems } from './factories/CartFactory'
import { ProductFactory } from './factories/ProductFactory'

interface MockSupabaseOptions {
  user?: UserWithProfile | null
  cart?: CartWithItems | null
  customResponses?: Record<string, any>
}

/**
 * Crée un client Supabase mocké avec des réponses réalistes
 */
export function createMockSupabaseClient(options: MockSupabaseOptions = {}) {
  const { user, cart, customResponses = {} } = options
  
  // État d'authentification mocké
  const authState = {
    user: user?.user || null,
    session: user ? {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_in: 3600,
      token_type: 'bearer',
      user: user.user,
    } : null,
  }
  
  // Base de données mocquée
  const mockDatabase = {
    users: user ? [user.user] : [],
    profiles: user ? [user.profile] : [],
    products: ProductFactory.mixedCategories(),
    carts: cart ? [cart.cart] : [],
    cart_items: cart ? cart.items : [],
    orders: [],
    order_items: [],
    addresses: [],
  }
  
  const queryMethods = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    
    // Filtres
    eq: jest.fn((column: string, value: any) => {
      // Simulation RLS - vérification des permissions
      if (column === 'user_id' && !authState.user) {
        return {
          ...queryMethods,
          then: jest.fn().mockResolvedValue({ data: [], error: { message: 'RLS: access denied' } }),
        }
      }
      return queryMethods
    }),
    in: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    overlaps: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    and: jest.fn().mockReturnThis(),
    
    // Modificateurs de résultat
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    
    // Exécution
    single: jest.fn().mockResolvedValue({ 
      data: mockDatabase.products[0] || null, 
      error: null 
    }),
    maybeSingle: jest.fn().mockResolvedValue({ 
      data: mockDatabase.products[0] || null, 
      error: null 
    }),
    
    // Support pour await direct
    then: jest.fn((callback: (result: any) => any) => {
      const result = { data: mockDatabase.products, error: null }
      return Promise.resolve(callback ? callback(result) : result)
    }),
    catch: jest.fn().mockReturnThis(),
  }
  
  // Mock du client principal
  const mockClient = {
    // Auth
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: authState.user },
        error: null,
      }),
      getSession: jest.fn().mockResolvedValue({
        data: { session: authState.session },
        error: null,
      }),
      signInWithPassword: jest.fn().mockImplementation(({ email, password }) => {
        if (email === 'test@example.com' && password === 'correct-password') {
          return Promise.resolve({
            data: { user: authState.user, session: authState.session },
            error: null,
          })
        }
        return Promise.resolve({
          data: { user: null, session: null },
          error: { message: 'Invalid login credentials' },
        })
      }),
      signUp: jest.fn().mockImplementation(({ email }) => {
        if (email === 'existing@example.com') {
          return Promise.resolve({
            data: { user: null, session: null },
            error: { message: 'User already registered' },
          })
        }
        return Promise.resolve({
          data: { user: authState.user, session: authState.session },
          error: null,
        })
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      updateUser: jest.fn().mockResolvedValue({
        data: { user: authState.user },
        error: null,
      }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      setSession: jest.fn().mockResolvedValue({
        data: { session: authState.session },
        error: null,
      }),
    },
    
    // Database
    from: jest.fn((table: string) => {
      // Personnalisation par table
      const tableQueryMethods = { ...queryMethods }
      
      // Simulation des RLS policies
      if (table === 'profiles' && !authState.user) {
        tableQueryMethods.then = jest.fn().mockResolvedValue({
          data: [],
          error: { message: 'RLS: access denied for profiles' },
        })
      }
      
      if (table === 'cart_items') {
        tableQueryMethods.then = jest.fn().mockResolvedValue({
          data: cart?.items || [],
          error: null,
        })
      }
      
      if (table === 'products') {
        tableQueryMethods.then = jest.fn().mockResolvedValue({
          data: mockDatabase.products,
          error: null,
        })
      }
      
      // Support des réponses personnalisées
      if (customResponses[table]) {
        tableQueryMethods.then = jest.fn().mockResolvedValue(customResponses[table])
      }
      
      return tableQueryMethods
    }),
    
    // RPC (stored procedures)
    rpc: jest.fn().mockImplementation((functionName: string, params: any = {}) => {
      // Simulation de fonctions RPC communes
      if (functionName === 'get_cart_total') {
        const total = cart?.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0) || 0
        return Promise.resolve({ data: total, error: null })
      }
      
      if (functionName === 'check_admin_role') {
        return Promise.resolve({ 
          data: user?.profile?.is_admin || false, 
          error: null 
        })
      }
      
      if (functionName === 'migrate_guest_cart') {
        return Promise.resolve({
          data: { success: true, items_migrated: cart?.items.length || 0 },
          error: null,
        })
      }
      
      // Support des réponses personnalisées
      if (customResponses[functionName]) {
        return Promise.resolve(customResponses[functionName])
      }
      
      return Promise.resolve({ data: null, error: null })
    }),
    
    // Storage
    storage: {
      from: jest.fn((bucket: string) => ({
        upload: jest.fn().mockResolvedValue({
          data: { 
            path: `${bucket}/mock-file-${Date.now()}.jpg`,
            id: 'mock-file-id',
            fullPath: `${bucket}/mock-file-${Date.now()}.jpg`,
          },
          error: null,
        }),
        download: jest.fn().mockResolvedValue({
          data: new Blob(['mock file content'], { type: 'image/jpeg' }),
          error: null,
        }),
        remove: jest.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: jest.fn((path: string) => ({
          data: { publicUrl: `https://mock-storage.com/${bucket}/${path}` },
        })),
        list: jest.fn().mockResolvedValue({
          data: [
            { name: 'file1.jpg', id: 'file1', updated_at: '2024-01-01', size: 1024 },
            { name: 'file2.jpg', id: 'file2', updated_at: '2024-01-01', size: 2048 },
          ],
          error: null,
        }),
      })),
    },
    
    // Realtime (pour les tests de souscriptions)
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      unsubscribe: jest.fn().mockReturnThis(),
    })),
    removeAllChannels: jest.fn(),
    removeChannel: jest.fn(),
  }
  
  return mockClient
}

/**
 * Mock pour simuler des erreurs Supabase
 */
export function createErrorMockSupabaseClient(errorScenarios: Record<string, any> = {}) {
  const baseMock = createMockSupabaseClient()
  
  // Override des méthodes avec des erreurs
  Object.entries(errorScenarios).forEach(([method, error]) => {
    if (method.includes('.')) {
      const [service, operation] = method.split('.')
      if (baseMock[service as keyof typeof baseMock]) {
        const serviceObj = baseMock[service as keyof typeof baseMock] as any
        if (serviceObj[operation]) {
          serviceObj[operation] = jest.fn().mockResolvedValue({
            data: null,
            error,
          })
        }
      }
    }
  })
  
  return baseMock
}

/**
 * Helpers pour configurer des scénarios de test spécifiques
 */
export const supabaseTestScenarios = {
  /**
   * Utilisateur non authentifié
   */
  unauthenticated: () => createMockSupabaseClient(),
  
  /**
   * Utilisateur authentifié avec panier
   */
  authenticatedWithCart: (user: UserWithProfile, cart: CartWithItems) =>
    createMockSupabaseClient({ user, cart }),
  
  /**
   * Erreurs d'authentification
   */
  authErrors: () => createErrorMockSupabaseClient({
    'auth.signInWithPassword': { message: 'Invalid login credentials' },
    'auth.signUp': { message: 'Email already registered' },
  }),
  
  /**
   * Erreurs de base de données
   */
  databaseErrors: () => createErrorMockSupabaseClient({
    'from.insert': { message: 'Duplicate key value violates unique constraint' },
    'from.update': { message: 'Permission denied' },
  }),
  
  /**
   * Erreurs de storage
   */
  storageErrors: () => createErrorMockSupabaseClient({
    'storage.upload': { message: 'File too large' },
    'storage.download': { message: 'File not found' },
  }),
}