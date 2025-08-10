# Stratégie de Tests - HerbisVeritas

## 📊 État Actuel

- **Couverture : 0%**
- **Tests existants : 1** (mobile-touch-area.test.tsx)
- **Framework : Jest + React Testing Library**

## 🎯 Objectif

Atteindre **80% de couverture** sur les fonctionnalités critiques en 4 semaines.

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

## 🛠️ Configuration Requise

### 1. **Jest Config Update**

```javascript
// jest.config.cjs
module.exports = {
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
  },
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.stories.tsx",
    "!src/app/layout.tsx",
    "!src/app/**/layout.tsx",
    "!src/i18n/**",
  ],
};
```

### 2. **Testing Utilities**

```typescript
// src/test-utils/index.tsx
import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';

export function renderWithProviders(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
}

// src/test-utils/mocks.ts
export const mockSupabase = {
  auth: {
    getUser: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn()
  }))
};
```

### 3. **GitHub Actions CI**

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

## 📈 Métriques de Succès

### Critères d'Acceptation

- ✅ 80% coverage sur business logic
- ✅ 100% coverage sur auth & payments
- ✅ Tous les tests passent en < 60s
- ✅ 0 test flaky
- ✅ CI/CD pipeline fonctionnel

### KPIs

- **MTTR** (Mean Time To Repair) : < 2h
- **Test Execution Time** : < 60s
- **Build Success Rate** : > 95%
- **Coverage Trend** : +20% par semaine

## 🚀 Quick Start

```bash
# Run all tests
npm test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch

# E2E tests
npm run test:e2e

# Update snapshots
npm run test -- -u
```

## 📝 Best Practices

1. **AAA Pattern** : Arrange, Act, Assert
2. **Test Isolation** : Chaque test indépendant
3. **Mock External Services** : Supabase, Stripe, etc.
4. **Test User Behavior** : Pas l'implémentation
5. **Descriptive Names** : `should_create_order_when_payment_succeeds`
6. **Data Builders** : Pour les fixtures complexes
7. **Snapshot Sparingly** : Seulement pour UI stable

## 🔧 Tools & Libraries

- **Jest** : Test runner
- **React Testing Library** : Component testing
- **MSW** : API mocking
- **Playwright** : E2E testing
- **Faker.js** : Test data generation
- **Jest-Extended** : Additional matchers
- **Testing-Library/User-Event** : User interactions

## 📊 Coverage Reports

Les rapports sont disponibles dans :

- `coverage/lcov-report/index.html` (local)
- Codecov.io (CI/CD)
- GitHub Actions artifacts

## 🏆 Milestones

- [ ] Week 1: 30% coverage - Business critical
- [ ] Week 2: 50% coverage - Services & API
- [ ] Week 3: 65% coverage - UI Components
- [ ] Week 4: 80% coverage - E2E & Integration
- [ ] Bonus: 90% coverage - Edge cases

---

_Dernière mise à jour : ${new Date().toISOString().split('T')[0]}_
