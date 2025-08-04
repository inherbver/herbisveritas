// jest.setup.ts - Version finale complète
import React from "react";
import "@testing-library/jest-dom";

// Polyfills pour Node.js
import { TextEncoder, TextDecoder } from "util";
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Polyfill pour Response (requis pour les tests microservices)
if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    body: any;
    init: any;
    constructor(body?: any, init: any = {}) {
      this.body = body;
      this.init = init;
    }
    get status() { return this.init?.status || 200; }
  } as any;
}

// Mock global fetch for Stripe and other HTTP clients
if (typeof global.fetch === 'undefined') {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
    })
  ) as any;
}

// Mock global Request for API Gateway tests
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    url: string;
    method: string;
    headers: any;
    constructor(url: string, init: any = {}) {
      this.url = url;
      this.method = init.method || 'GET';
      this.headers = init.headers || {};
    }
  } as any;
}

// Variables d'environnement pour les tests
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://esgirafriwoildqcwtjm.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.STRIPE_SECRET_KEY = "sk_test_mock_123456789";
process.env.STRIPE_PUBLISHABLE_KEY = "pk_test_mock_123456789";

// Mock Next.js cache et revalidation functions
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
  unstable_cache: jest.fn((fn) => fn),
}));

// =====================================
// MOCKS NEXT-INTL
// =====================================

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
};

const MockLink = React.forwardRef<
  HTMLAnchorElement,
  { children: React.ReactNode; href?: string; locale?: string; [key: string]: any }
>(({ children, href, locale, ...props }, ref) => {
  return React.createElement(
    "a",
    {
      ref,
      href: href || "#",
      "data-testid": "mock-link",
      "data-locale": locale,
      ...props,
    },
    children as React.ReactNode
  );
});

MockLink.displayName = "MockLink";

// Mock next-intl for client components
jest.mock("next-intl", () => ({
  useTranslations: jest.fn(
    (namespace?: string) => (key: string) => (namespace ? `${namespace}.${key}` : key)
  ),
  getTranslations: jest.fn(async (options?: string | { namespace?: string }) => {
    const namespace = typeof options === "string" ? options : options?.namespace;
    return (key: string) => (namespace ? `${namespace}.${key}` : key);
  }),
  useMessages: jest.fn(() => ({})),
  useLocale: jest.fn(() => "en"),
  useNow: jest.fn(() => new Date("2024-01-01")),
  useTimeZone: jest.fn(() => "UTC"),
  useFormatter: jest.fn(() => ({
    dateTime: (_date: Date) => `formatted_${_date.toISOString().split("T")[0]}_en-US`,
    number: (num: number) => num.toString(),
    relativeTime: (_date: Date) => "relative time",
  })),
  useRouter: jest.fn(() => mockRouter),
  usePathname: jest.fn(() => "/"),
  Link: MockLink,
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("next-intl/server", () => ({
  getTranslations: jest
    .fn()
    .mockImplementation(async (options?: { namespace?: string; locale?: string } | string) => {
      let namespace: string | undefined;

      if (typeof options === "string") {
        namespace = options;
      } else if (options && typeof options === "object") {
        namespace = options.namespace;
      }

      return (key: string) => {
        const fullKey = namespace ? `${namespace}.${key}` : key;

        // Utiliser la même fonction mockTranslate que pour le côté client
        const translations: Record<string, string> = {
          // Auth
          "Auth.validation.emailAlreadyExists": "Un compte existe déjà avec cette adresse email.",
          "Auth.validation.genericSignupError":
            "Une erreur est survenue lors de l'inscription. Veuillez réessayer.",
          "Auth.passwordsDoNotMatch": "Les mots de passe ne correspondent pas.",
          "Auth.UpdatePassword.errorMessage": "Erreur lors de la mise à jour du mot de passe.",
          "Auth.UpdatePassword.successMessage": "Mot de passe mis à jour avec succès.",

          // ContactPage - sections principales
          "ContactPage.defaultHeroHeading": "Contactez-nous",
          "ContactPage.defaultHeroSubheading": "Nous sommes là pour vous aider",
          "ContactPage.nextMarketHeroHeading": "Prochain marché",
          "ContactPage.nextMarketHeroSubheading": "Retrouvez-nous bientôt",
          "ContactPage.coordinatesTitle": "Nos coordonnées",
          "ContactPage.socialMediaTitle": "Réseaux sociaux",
          "ContactPage.marketsAgendaTitle": "Agenda des marchés",
          "ContactPage.partnerShopsTitle": "Boutiques partenaires",

          // ContactPage - détails
          "ContactPage.emailTitle": "Email",
          "ContactPage.phoneTitle": "Téléphone",
          "ContactPage.addressTitle": "Adresse",
          "ContactPage.cityLabel": "Ville",
          "ContactPage.dateLabel": "Date",
          "ContactPage.hoursLabel": "Horaires",
          "ContactPage.addressLabel": "Adresse",
          "ContactPage.noUpcomingMarketsForFilter": "Aucun marché à venir",
          "ContactPage.seeAllMarketsButton": "Voir tous les marchés",
          "ContactPage.defaultHeroImageAlt": "Image de fond par défaut",
          "ContactPage.nextMarketHeroImageAlt": "Image du prochain marché",

          // Filtres et autres
          "Filters.filterByCity": "Filtrer par ville",
        };

        return translations[fullKey] || fullKey;
      };
    }),
  getMessages: jest.fn(async () => ({})),
  getLocale: jest.fn(async () => "en"),
  getNow: jest.fn(async () => new Date("2024-01-01")),
  getTimeZone: jest.fn(async () => "UTC"),
  setRequestLocale: jest.fn(),
}));

jest.mock("next-intl/navigation", () => ({
  createSharedPathnamesNavigation: jest.fn(() => ({
    useRouter: jest.fn(() => mockRouter),
    usePathname: jest.fn(() => "/"),
    Link: MockLink,
    redirect: jest.fn(),
    permanentRedirect: jest.fn(),
  })),
}));

jest.mock("@/i18n/navigation", () => ({
  useRouter: jest.fn(() => mockRouter),
  usePathname: jest.fn(() => "/"),
  Link: MockLink,
  redirect: jest.fn(),
  permanentRedirect: jest.fn(),
}));

// =====================================
// MOCKS SUPABASE
// =====================================

// Mock de base pour Supabase client
const createMockSupabaseClient = () => ({
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: null },
      error: null,
    }),
    getSession: jest.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    }),
    signInWithPassword: jest.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" },
    }),
    signUp: jest.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "User already exists" },
    }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    overlaps: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
  })),
  rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn().mockResolvedValue({ data: null, error: null }),
      download: jest.fn().mockResolvedValue({ data: null, error: null }),
      remove: jest.fn().mockResolvedValue({ data: null, error: null }),
      getPublicUrl: jest.fn(() => ({ data: { publicUrl: "mock-url" } })),
    })),
  },
  removeAllChannels: jest.fn(),
  removeChannel: jest.fn(),
});

// Mock Supabase client
jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => createMockSupabaseClient()),
}));

// Mock Supabase server
jest.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: jest.fn(() => createMockSupabaseClient()),
}));

// Mock Supabase server admin
jest.mock("@/lib/supabase/server-admin", () => ({
  createSupabaseAdminClient: jest.fn(() => createMockSupabaseClient()),
}));

// =====================================
// MOCKS NEXT.JS
// =====================================

// Mock Next.js redirect
jest.mock("next/navigation", () => ({
  redirect: jest.fn((_url: string) => {
    // Ne rien faire dans le test, juste enregistrer l'appel
  }),
  permanentRedirect: jest.fn((_url: string) => {
    // Ne rien faire
  }),
  useRouter: jest.fn(() => mockRouter),
  usePathname: jest.fn(() => "/"),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

// Mock Next.js cookies
jest.mock("next/headers", () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    has: jest.fn(),
    getAll: jest.fn(() => []),
  })),
  headers: jest.fn(() => ({
    get: jest.fn(),
    has: jest.fn(),
    forEach: jest.fn(),
  })),
}));

// =====================================
// MOCKS DATE-FNS (CORRECTION CRITIQUE)
// =====================================

// CORRECTION: Mock complet de date-fns pour résoudre les erreurs ESM
jest.mock("date-fns", () => ({
  ...jest.requireActual("date-fns"), // Import du vrai module pour garder les vraies fonctions
  // Optionnel: override de certaines fonctions pour les tests
  format: jest.fn((date: Date, _formatStr: string, _options?: unknown) => {
    // Garder la vraie fonction mais avec un format prévisible pour les tests
    return `formatted_${date.toISOString().split("T")[0]}_en-US`;
  }),
}));

// Mock complet des locales date-fns
jest.mock("date-fns/locale/fr", () => ({
  ...jest.requireActual("date-fns/locale/fr"),
}));

jest.mock("date-fns/locale/en-US", () => ({
  ...jest.requireActual("date-fns/locale/en-US"),
}));

// =====================================
// MOCKS AUTH ET UTILS
// =====================================

// Mock auth server actions pour les tests productActions seulement
jest.mock("@/lib/auth/server-actions-auth", () => ({
  withPermissionSafe: jest.fn((permission, callback) => callback),
  withPermission: jest.fn((permission, callback) => callback),
}));

// Mock revalidation utils
jest.mock("@/utils/revalidation", () => ({
  revalidateProductPages: jest.fn(),
}));

// Mock slugify
jest.mock("@/utils/slugify", () => ({
  slugify: jest.fn((str: string) => str.toLowerCase().replace(/\s+/g, "-")),
}));

// =====================================
// AUTRES MOCKS
// =====================================

// Supprimer les warnings React act()
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("Warning: An update to") ||
        args[0].includes("Warning: Each child in a list"))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

console.log("Jest setup fully loaded with complete next-intl and Supabase mocks");
