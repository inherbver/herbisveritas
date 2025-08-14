# Stratégie de Tests - HerbisVeritas

## 📊 État Actuel

- **Couverture : 30%+ minimum requis (configuré progressivement)**
- **Tests existants : 22 suites de tests** (actions, stores, services, components)
- **Framework : Jest + React Testing Library + MSW + Playwright**
- **Coverage critiques : 80%** pour authentification et panier
- **Architecture : Next.js 15, Server Components, Supabase RLS**

## 🎯 Philosophie de Test

HerbisVeritas adopte une approche **pragmatique et business-oriented** pour les tests :

### Principes Fondamentaux

1. **Test Driven Business Value** : Prioriser les tests sur les fonctionnalités critiques e-commerce
2. **Quality Gates** : Couverture de 80% minimum sur auth, panier, et paiements
3. **Fast Feedback** : Tests rapides (< 60s) avec parallélisation
4. **Real User Scenarios** : Tests comportementaux plutôt qu'implémentation
5. **Zero Flakiness** : Tests déterministes et robustes

## 📅 Plan de Déploiement

### Semaine 1 : Tests Critiques Business (30% coverage)

#### 1. **Cart & Checkout** (PRIORITÉ MAXIMALE)

```typescript
// src/stores/__tests__/cartStore.test.ts
- addItem, removeItem, updateQuantity
- calculateTotal, applyDiscount
- persistance localStorage
- sync avec Supabase

// src/actions/__tests__/cartActions.test.ts
- syncCartWithDatabase
- createOrderFromCart
- handleCheckout

// src/components/features/shop/__tests__/cart-display.test.tsx
- Affichage des items
- Mise à jour quantités
- Suppression items
```

#### 2. **Authentication** (CRITIQUE)

```typescript
// src/actions/__tests__/authActions.test.ts
- login, register, logout
- resetPassword, updatePassword
- session management

// src/lib/auth/__tests__/server-auth.test.ts
- checkUserPermission
- validateSession
- refreshToken
```

#### 3. **Product Management**

```typescript
// src/actions/__tests__/productActions.test.ts
- getProducts avec filtres
- createProduct, updateProduct
- deleteProduct avec RLS

// src/components/features/shop/__tests__/product-card.test.tsx
- Affichage produit
- Add to cart
- Stock management
```

### Semaine 2 : Services & API (50% coverage)

#### 4. **Supabase Integration**

```typescript
// src/lib/supabase/__tests__/queries.test.ts
- Database queries
- RLS policies
- Error handling

// src/services/__tests__/checkout.service.test.ts
- Payment processing
- Order creation
- Email notifications
```

#### 5. **Stripe Integration**

```typescript
// src/actions/__tests__/stripeActions.test.ts
- createPaymentIntent
- handleWebhook
- refund processing
```

#### 6. **Admin Functions**

```typescript
// src/lib/auth/__tests__/admin-service.test.ts
- checkAdminRole
- audit logging
- permissions
```

### Semaine 3 : UI Components (65% coverage)

#### 7. **Forms & Validation**

```typescript
// src/components/forms/__tests__/
- login-form.test.tsx
- register-form.test.tsx
- address-form.test.tsx
- Validation Zod
- Error handling
```

#### 8. **Magazine Features**

```typescript
// src/actions/__tests__/magazineActions.test.ts
- CRUD articles
- Publishing workflow
- Categories & tags
```

#### 9. **Profile Management**

```typescript
// src/actions/__tests__/profileActions.test.ts
-updateProfile - addressManagement - orderHistory;
```

### Semaine 4 : E2E & Integration (80% coverage)

#### 10. **Playwright E2E Tests**

```typescript
// tests/e2e/
-complete -
  purchase -
  flow.spec.ts -
  user -
  registration.spec.ts -
  admin -
  product -
  management.spec.ts -
  multi -
  language.spec.ts;
```

#### 11. **API Routes**

```typescript
// src/app/api/__tests__/
- stripe-webhook.test.ts
- admin endpoints
```

#### 12. **Hooks & Utilities**

```typescript
// src/hooks/__tests__/
-useAuth.test.ts - useCart.test.ts - useAddresses.test.ts;
```

## 🏗️ Architecture de Test

### Stack Technologique

- **Jest 29.7.0** : Test runner avec support Next.js 15
- **React Testing Library 16.3.0** : Component testing avec hooks
- **MSW 2.10.2** : API mocking pour Supabase et services externes
- **Playwright 1.54.2** : E2E testing cross-browser
- **TypeScript** : Types stricts pour tous les tests

### Configuration Jest Actuelle

```javascript
// jest.config.cjs - Configuration finale
const nextJest = require("next/jest");

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jest-environment-jsdom",

  // Fix ESM issues avec Supabase
  transformIgnorePatterns: [
    "node_modules/(?!(isows|@supabase/realtime-js|@supabase/supabase-js)/)",
  ],

  // Coverage progressive avec seuils critiques
  coverageThreshold: {
    global: {
      statements: 30, // Start achievable, increase progressively
      branches: 25,
      functions: 30,
      lines: 30,
    },
    "./src/stores/": {
      statements: 80, // CRITICAL: Cart store
      branches: 75,
      functions: 80,
      lines: 80,
    },
    "./src/actions/authActions.ts": {
      statements: 80, // CRITICAL: Authentication
      branches: 75,
      functions: 80,
      lines: 80,
    },
    "./src/actions/cartActions.ts": {
      statements: 80, // CRITICAL: Cart operations
      branches: 75,
      functions: 80,
      lines: 80,
    },
  },

  // Performance optimizations
  maxWorkers: "50%",
  testTimeout: 15000,
};
```

## 🎭 Stratégies de Mocking

### 1. **Supabase Integration Mocking**

Approche multicouche pour les tests Supabase :

```typescript
// jest.setup.ts - Mocks globaux complets
const createMockSupabaseClient = () => ({
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: null },
      error: null,
    }),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
  },
  from: jest.fn(() => {
    const queryMethods = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      // Make awaitable for direct queries
      then: jest.fn().mockResolvedValue({ data: [], error: null }),
    };
    return queryMethods;
  }),
  rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn().mockResolvedValue({ data: null, error: null }),
      getPublicUrl: jest.fn(() => ({ data: { publicUrl: "mock-url" } })),
    })),
  },
});

// Mock des trois clients Supabase
jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => createMockSupabaseClient()),
}));
jest.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: jest.fn(() => createMockSupabaseClient()),
}));
jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(() => createMockSupabaseClient()),
}));
```

### 2. **Next.js 15 & Server Components**

```typescript
// Mock Next.js navigation et i18n
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  })),
  usePathname: jest.fn(() => "/"),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

// Mock next-intl pour composants server et client
jest.mock("next-intl", () => ({
  useTranslations: jest.fn(
    (namespace?: string) => (key: string) => (namespace ? `${namespace}.${key}` : key)
  ),
  getTranslations: jest.fn(async (options) => {
    const namespace = typeof options === "string" ? options : options?.namespace;
    return (key: string) => (namespace ? `${namespace}.${key}` : key);
  }),
  useLocale: jest.fn(() => "fr"),
}));

// Mock Server Actions auth wrapper
jest.mock("@/lib/auth/server-actions-auth", () => ({
  withPermissionSafe: jest.fn((permission, callback) => callback),
  withPermission: jest.fn((permission, callback) => callback),
}));
```

### 3. **Stripe & External APIs**

```typescript
// Mock Stripe avec tous les services utilisés
jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: jest.fn(),
    },
    checkout: {
      sessions: {
        create: jest.fn(),
        retrieve: jest.fn(),
      },
    },
    customers: {
      create: jest.fn(),
      update: jest.fn(),
    },
    refunds: {
      create: jest.fn(),
    },
    paymentIntents: {
      retrieve: jest.fn(),
    },
  }));
});

// Mock global Request/Response pour API routes
global.Request = class MockRequest {
  constructor(
    public input: any,
    public init?: any
  ) {}
  async text() {
    return this.init?.body || "";
  }
  async json() {
    return JSON.parse(this.init?.body || "{}");
  }
} as any;
```

### 4. **Testing Utilities & Providers**

```typescript
// src/test-utils/index.tsx - Render avec tous les providers
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "next-themes";

function AllTheProviders({ children }) {
  return (
    <NextIntlClientProvider locale="fr" messages={messages}>
      <ThemeProvider attribute="class" defaultTheme="light">
        {children}
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}

export const customRender = (ui: React.ReactElement, options?) =>
  render(ui, { wrapper: AllTheProviders, ...options });
```

## 🧪 Types de Tests & Patterns

### 1. **Server Actions Testing**

Pattern standardisé pour tester les Server Actions avec RLS :

```typescript
// src/actions/__tests__/productActions.test.ts
describe("productActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getProducts", () => {
    it("should return products with correct filters", async () => {
      // Setup mock data
      const mockProducts = [mockProduct];
      mockSupabaseClient
        .from()
        .select()
        .eq()
        .order()
        .range.mockResolvedValue({ data: mockProducts, error: null });

      // Test action
      const result = await getProducts({
        page: 1,
        limit: 10,
        category: "herbs",
      });

      // Verify database queries
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("products");
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProducts);
    });
  });
});
```

### 2. **Zustand Store Testing**

Pattern pour tester les stores avec persistance :

```typescript
// src/stores/__tests__/cartStore.test.ts
describe("cartStore", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [], isLoading: false, error: null });
    localStorageMock.clear();
  });

  it("should persist cart to localStorage", () => {
    const { addItem } = useCartStore.getState();

    addItem(mockProductDetails, 2);

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "cart-storage",
      expect.stringContaining(mockProductDetails.productId)
    );
  });
});
```

### 3. **API Route Testing**

Pattern pour tester les API routes avec webhooks :

```typescript
// src/app/api/stripe-webhook/__tests__/route.test.ts
describe("/api/stripe-webhook", () => {
  it("should handle payment success webhook", async () => {
    const mockRequest = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify(mockWebhookPayload),
      headers: { "stripe-signature": "test-signature" },
    });

    const response = await POST(mockRequest);
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.received).toBe(true);
  });
});
```

### 4. **E2E Testing avec Playwright**

Configuration pour tests e-commerce complets :

```typescript
// playwright.config.ts - Configuration actuelle
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://localhost:3003",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
```

Exemple de test E2E critique :

```typescript
// tests/e2e/checkout-flow.spec.ts
test("complete purchase flow", async ({ page }) => {
  // Navigate to product
  await page.goto("/fr/boutique/produit-test");

  // Add to cart
  await page.getByRole("button", { name: "Ajouter au panier" }).click();

  // Go to checkout
  await page.getByTestId("cart-icon").click();
  await page.getByRole("button", { name: "Commander" }).click();

  // Fill shipping info
  await page.fill('[data-testid="shipping-name"]', "Test User");
  await page.fill('[data-testid="shipping-email"]', "test@example.com");

  // Complete payment (mock Stripe)
  await page.getByRole("button", { name: "Payer" }).click();

  // Verify success
  await expect(page.getByText("Commande confirmée")).toBeVisible();
});
```

## 📈 Tests Critiques E-Commerce

### Fonctionnalités Prioritaires (100% Coverage)

#### 1. **Authentification & Sécurité**

- ✅ Login/Register/Logout flow
- ✅ Role-based access (admin/user) avec RLS
- ✅ Password reset & email verification
- ✅ Session management & token refresh
- ✅ Admin permission verification avec `checkAdminRole()`

#### 2. **Panier & Commandes**

- ✅ Add/Remove items avec validation stock
- ✅ Quantity updates & price calculations
- ✅ Cart persistence (localStorage + Supabase sync)
- ✅ Checkout flow complet
- ✅ Order status updates & history

#### 3. **Paiements Stripe**

- ✅ Payment Intent creation
- ✅ Webhook handling (payment_succeeded, payment_failed)
- ✅ Refund processing
- ✅ Customer creation & management

#### 4. **Gestion Produits**

- ✅ CRUD operations avec RLS
- ✅ Image upload avec validation
- ✅ Stock management & inventory
- ✅ Category & search filtering

### MSW Handlers pour APIs Externes

```typescript
// src/mocks/handlers.ts - À développer
export const handlers = [
  // Stripe API mocks
  http.post("https://api.stripe.com/v1/payment_intents", () => {
    return HttpResponse.json({
      id: "pi_test_123",
      status: "requires_payment_method",
      client_secret: "pi_test_123_secret_test",
    });
  }),

  // Colissimo API mocks
  http.post("https://api.colissimo.fr/tracking", () => {
    return HttpResponse.json({
      status: "delivered",
      tracking_number: "TEST123",
    });
  }),
];
```

### Coverage Requirements & Métriques

#### Seuils de Couverture Actuels

```javascript
// Configuration progressive dans jest.config.cjs
coverageThreshold: {
  global: { statements: 30, branches: 25, functions: 30, lines: 30 },

  // CRITICAL PATHS - 80% required
  "./src/stores/": { statements: 80, branches: 75, functions: 80, lines: 80 },
  "./src/actions/authActions.ts": { statements: 80, branches: 75, functions: 80, lines: 80 },
  "./src/actions/cartActions.ts": { statements: 80, branches: 75, functions: 80, lines: 80 },
}
```

#### KPIs & Métriques

- **Test Execution Time** : < 60s (actuellement 15s timeout par test)
- **Jest Workers** : 50% des CPU cores pour performance
- **Zero Flaky Tests** : Tous les tests déterministes
- **E2E Success Rate** : > 95% avec 2 retries en CI

## 🚀 Commandes de Test

### Jest (Unit & Integration Tests)

```bash
# Run all tests
npm test

# Watch mode pendant le développement
npm test -- --watch

# Coverage report
npm test -- --coverage

# Tests spécifiques
npm test -- --testPathPattern=cartStore
npm test -- --testNamePattern="should add item"

# Debug mode
npm test -- --verbose
```

### Playwright (E2E Tests)

```bash
# Run E2E tests
npx playwright test

# UI Mode pour debugging
npx playwright test --ui

# Tests spécifiques
npx playwright test checkout-flow.spec.ts

# Debug avec browser ouvert
npx playwright test --debug
```

### Commands Avancées

```bash
# Test coverage avec seuils
npm test -- --coverage --coverageThreshold='{"global":{"statements":80}}'

# Performance testing
npm test -- --detectOpenHandles --forceExit

# Update snapshots
npm test -- --updateSnapshot
```

## 📝 Best Practices & Guidelines

### Patterns de Test HerbisVeritas

1. **AAA Pattern** : Arrange, Act, Assert - Structure claire
2. **Test Isolation** : `beforeEach` avec cleanup complet des mocks
3. **Mock Strategy** : Mock external services, pas les types internes
4. **Test User Behavior** : Tester les résultats, pas l'implémentation
5. **Descriptive Names** : `should_create_order_when_payment_succeeds`

### Règles Spécifiques Next.js 15

```typescript
// ✅ BON - Mock Server Actions auth wrapper
jest.mock("@/lib/auth/server-actions-auth", () => ({
  withPermissionSafe: jest.fn((permission, callback) => callback),
}));

// ✅ BON - Test le comportement
expect(mockSupabaseClient.from).toHaveBeenCalledWith("products");

// ❌ MAUVAIS - Test l'implémentation
expect(component.state.products).toBeDefined();
```

### Data Builders pour E-Commerce

```typescript
// src/test-utils/builders.ts
export const buildMockProduct = (overrides = {}) => ({
  id: "prod-1",
  name: "Test Product",
  price: 29.99,
  stock: 10,
  is_active: true,
  ...overrides,
});

export const buildMockOrder = (overrides = {}) => ({
  id: "order-1",
  status: "pending",
  total: 59.98,
  items: [buildMockCartItem()],
  ...overrides,
});
```

### Debugging Tests

```typescript
// Debug Supabase queries dans les tests
const mockFrom = jest.fn(() => mockQueryBuilder);
mockSupabaseClient.from = mockFrom;

// After test
console.log("Database calls:", mockFrom.mock.calls);
```

## 🔧 Stack Technologique Complet

### Testing Framework

- **Jest 29.7.0** : Test runner avec Next.js integration
- **React Testing Library 16.3.0** : Component testing moderne
- **@testing-library/user-event 14.6.1** : User interactions
- **@testing-library/jest-dom 6.6.3** : DOM matchers

### E2E & API Testing

- **Playwright 1.54.2** : E2E cross-browser avec trace viewer
- **MSW 2.10.2** : API mocking pour développement et tests

### TypeScript & Build

- **TypeScript** : Types stricts pour tous les tests
- **ts-jest 29.3.4** : TypeScript compilation pour Jest
- **jest-environment-jsdom 30.0.0** : DOM environment

### Project-Specific Tools

```bash
# Déjà installé dans package.json
@testing-library/jest-dom: 6.6.3
@testing-library/react: 16.3.0
@testing-library/user-event: 14.6.1
@types/jest: 29.5.14
jest: 29.7.0
jest-environment-jsdom: 30.0.0
msw: 2.10.2
@playwright/test: 1.54.2
```

## 🔍 Security Testing Patterns

### RLS (Row Level Security) Testing

```typescript
// Test des policies Supabase avec différents rôles
describe("RLS Policies", () => {
  it("should restrict admin actions to admin users", async () => {
    // Mock user sans role admin
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1", role: "user" } },
      error: null,
    });

    const result = await deleteProduct("prod-1");

    expect(result.success).toBe(false);
    expect(result.error).toContain("insufficient permissions");
  });
});
```

### Audit Logging Testing

```typescript
// Vérifier que les actions sensibles sont loggées
it("should log admin actions to audit_logs", async () => {
  await createProduct(mockProductData);

  expect(mockSupabaseClient.from).toHaveBeenCalledWith("audit_logs");
  expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
    expect.objectContaining({
      action: "product_create",
      user_id: expect.any(String),
      table_name: "products",
    })
  );
});
```

## 🚨 Troubleshooting & Debugging

### Erreurs Communes

#### 1. **ESM Module Errors**

```bash
# Solution dans jest.config.cjs
transformIgnorePatterns: [
  "node_modules/(?!(isows|@supabase/realtime-js|@supabase/supabase-js)/)"
]
```

#### 2. **Next-Intl Translation Errors**

```typescript
// Mock complet dans jest.setup.ts déjà configuré
// Pas besoin d'actions supplémentaires
```

#### 3. **Timeout Errors**

```bash
# Augmenter le timeout pour tests async
npm test -- --testTimeout=30000
```

### Debug Commands

```bash
# Verbose output avec stack traces
npm test -- --verbose --no-coverage

# Run tests en série pour debugging
npm test -- --runInBand

# Detecter les handles ouverts
npm test -- --detectOpenHandles

# Memory leaks detection
npm test -- --detectLeaks
```

## 📊 Coverage Reports & Monitoring

### Rapports Locaux

```bash
# Generate coverage report
npm test -- --coverage

# Open HTML report
open coverage/lcov-report/index.html
```

### CI/CD Integration (À Configurer)

```yaml
# .github/workflows/test.yml - Recommandé pour le futur
name: Tests & Coverage
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm test -- --coverage --watchAll=false
      - uses: codecov/codecov-action@v4
        if: success()
```

### Performance Monitoring

```typescript
// Performance testing dans les tests
describe("Performance", () => {
  it("should load products in under 100ms", async () => {
    const start = performance.now();
    await getProducts({ limit: 50 });
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100);
  });
});
```

## 🎯 Tests Status Actuel

### ✅ Implémentés (22 suites de tests)

**Actions** : authActions, cartActions, productActions, stripeActions, magazineActions, marketActions, partnerActions

**Stores** : cartStore, profileStore, addressStore

**Services** : cart.service, checkout-orchestrator.service, address-validation.service

**Libraries** : stripe utils, auth validators, formatters

**Components** : mobile-touch-area (UI)

**API Routes** : stripe-webhook handler

### 🎯 Coverage Actuel Estimé

- **Global Coverage** : ~35% (au-dessus du minimum 30%)
- **Critical Paths** : ~80% (authActions, cartActions, stores)
- **Test Suite Count** : 22 suites complètes
- **Total Test Cases** : 150+ individual tests

---

_Stratégie mise à jour pour refléter l'architecture réelle - ${new Date().toLocaleDateString('fr-FR')}_
