// jest.setup.ts
import "@testing-library/jest-dom";

// Set up environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://esgirafriwoildqcwtjm.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

// Mock the server-side Supabase client as per your suggestion
// Mock Supabase plus complet, incluant les méthodes de cleanup pour éviter les handles ouverts
/* jest.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInAnonymously: jest.fn().mockResolvedValue({ 
        data: { user: { id: 'mock-user-id' } }, 
        error: null 
      })
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
    })),
    rpc: jest.fn(),
    // CRITIQUE : Ajout des méthodes de cleanup pour les connexions temps réel
    removeAllChannels: jest.fn(),
    removeChannel: jest.fn()
  }))
})); */
