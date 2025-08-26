/**
 * Mocks centralisés pour les Server Actions Next.js
 * Fournit des helpers standardisés pour tester les actions serveur
 */

/**
 * Mock du décorateur withRateLimit
 * Retourne simplement la fonction sans limiter
 */
export const mockWithRateLimit = () => (fn: any) => fn;

/**
 * Mock de redirect de Next.js
 * Simule le comportement de redirect en lançant une erreur
 */
export const mockRedirect = (url: string) => {
  throw new Error('NEXT_REDIRECT');
};

/**
 * Helper pour créer un FormData mocké compatible avec les Server Actions
 */
export class MockServerFormData implements FormData {
  private data: Map<string, any> = new Map();

  append(key: string, value: any): void {
    const existing = this.data.get(key);
    if (existing) {
      if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        this.data.set(key, [existing, value]);
      }
    } else {
      this.data.set(key, value);
    }
  }

  delete(key: string): void {
    this.data.delete(key);
  }

  get(key: string): FormDataEntryValue | null {
    const value = this.data.get(key);
    if (Array.isArray(value)) {
      return value[0];
    }
    return value || null;
  }

  getAll(key: string): FormDataEntryValue[] {
    const value = this.data.get(key);
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }

  has(key: string): boolean {
    return this.data.has(key);
  }

  set(key: string, value: any): void {
    this.data.set(key, value);
  }

  forEach(callbackfn: (value: FormDataEntryValue, key: string, parent: FormData) => void): void {
    this.data.forEach((value, key) => {
      if (Array.isArray(value)) {
        value.forEach(v => callbackfn(v, key, this));
      } else {
        callbackfn(value, key, this);
      }
    });
  }

  entries(): IterableIterator<[string, FormDataEntryValue]> {
    const entries: [string, FormDataEntryValue][] = [];
    this.data.forEach((value, key) => {
      if (Array.isArray(value)) {
        value.forEach(v => entries.push([key, v]));
      } else {
        entries.push([key, value]);
      }
    });
    return entries[Symbol.iterator]();
  }

  keys(): IterableIterator<string> {
    return this.data.keys();
  }

  values(): IterableIterator<FormDataEntryValue> {
    const values: FormDataEntryValue[] = [];
    this.data.forEach(value => {
      if (Array.isArray(value)) {
        values.push(...value);
      } else {
        values.push(value);
      }
    });
    return values[Symbol.iterator]();
  }

  [Symbol.iterator](): IterableIterator<[string, FormDataEntryValue]> {
    return this.entries();
  }
}

/**
 * Helper pour créer facilement un FormData mocké avec des données
 */
export function createMockFormData(data: Record<string, string | File | Blob>): FormData {
  const formData = new MockServerFormData() as any;
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });
  return formData;
}

/**
 * Setup les mocks standards pour les Server Actions
 */
export function setupServerActionMocks() {
  // Mock rate limiter
  jest.mock('@/lib/security/rate-limit-decorator', () => ({
    withRateLimit: jest.fn(() => mockWithRateLimit())
  }));

  // Mock redirect
  jest.mock('next/navigation', () => ({
    redirect: jest.fn(mockRedirect),
    useRouter: jest.fn(() => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
    })),
    usePathname: jest.fn(() => '/'),
    useSearchParams: jest.fn(() => new URLSearchParams()),
  }));

  // Mock cookies
  jest.mock('next/headers', () => ({
    cookies: jest.fn(() => ({
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      has: jest.fn(),
      getAll: jest.fn(() => []),
    })),
    headers: jest.fn(() => new Headers()),
  }));

  // Mock next-intl server
  jest.mock('next-intl/server', () => ({
    getTranslations: jest.fn().mockResolvedValue((key: string) => key),
    getLocale: jest.fn().mockResolvedValue('fr'),
  }));
}

/**
 * Helper pour tester les actions qui redirigent en cas de succès
 */
export async function testActionWithRedirect<T>(
  action: (...args: any[]) => Promise<T>,
  ...args: any[]
): Promise<T | { success: true }> {
  try {
    const result = await action(...args);
    // Si l'action retourne undefined (cas d'une redirection sans erreur),
    // on considère que c'est un succès
    if (result === undefined) {
      return { success: true } as any;
    }
    return result;
  } catch (error: any) {
    if (error.message === 'NEXT_REDIRECT') {
      // Traiter la redirection comme un succès
      return { success: true } as any;
    }
    throw error;
  }
}

/**
 * Helper pour créer un mock Supabase Auth complet
 */
export function createMockSupabaseAuth() {
  return {
    signInWithPassword: jest.fn().mockResolvedValue({
      data: { user: { id: 'user-1' }, session: {} },
      error: null
    }),
    signUp: jest.fn().mockResolvedValue({
      data: { user: { id: 'new-user' }, session: null },
      error: null
    }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    getUser: jest.fn().mockResolvedValue({
      data: { user: null },
      error: null
    }),
    getSession: jest.fn().mockResolvedValue({
      data: { session: null },
      error: null
    }),
    onAuthStateChange: jest.fn(),
    resetPasswordForEmail: jest.fn().mockResolvedValue({ error: null }),
    updateUser: jest.fn().mockResolvedValue({
      data: { user: null },
      error: null
    }),
  };
}

export default {
  MockServerFormData,
  createMockFormData,
  setupServerActionMocks,
  testActionWithRedirect,
  createMockSupabaseAuth,
  mockWithRateLimit,
  mockRedirect,
};