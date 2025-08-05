# Architecture E-Commerce - Documentation Technique

## Vue d'ensemble

Cette documentation détaille l'architecture complète de l'application e-commerce basée sur Next.js 15 avec une approche Clean Architecture et Domain-Driven Design (DDD).

## Stack Technique

### Core Framework

- **Next.js 15** avec App Router et Server Components
- **TypeScript** en mode strict
- **React 18** avec Concurrent Features

### Backend & Data

- **Supabase** (PostgreSQL + Auth + Storage + RLS)
- **Prisma/Supabase Client** pour l'ORM
- **Row Level Security (RLS)** pour la sécurité des données

### State Management & Architecture

- **Zustand** pour l'état global côté client
- **Server Actions** pour les mutations
- **Result Pattern** pour la gestion d'erreurs type-safe
- **Dependency Injection** personnalisé
- **Repository Pattern** avec abstraction des données

### Styling & UI

- **Tailwind CSS** + **shadcn/ui**
- **Lucide React** pour les icônes
- **next-intl** pour l'internationalisation (fr, en, de, es)

### Testing & Quality

- **Jest** + **MSW** pour les tests unitaires et d'intégration
- **ESLint** + **Prettier** pour la qualité du code
- **TypeScript** strict mode

## Architecture des Couches

```
src/
├── app/[locale]/              # 🌐 Presentation Layer (Next.js App Router)
├── components/                # 🎨 UI Components (shadcn/ui + custom)
├── actions/                   # 🔄 Application Layer (Server Actions)
├── lib/
│   ├── domain/               # 🏛️ Domain Layer (Business Logic)
│   │   ├── entities/         # Domain Entities avec Value Objects
│   │   ├── services/         # Domain Services
│   │   └── value-objects/    # Value Objects (Money, Quantity, etc.)
│   ├── infrastructure/       # 🔧 Infrastructure Layer
│   │   ├── repositories/     # Data Access Layer
│   │   └── container/        # Dependency Injection
│   ├── core/                 # 🎯 Core Utilities
│   │   ├── result.ts         # Result Pattern
│   │   ├── errors.ts         # Error Hierarchy
│   │   └── logger.ts         # Logging System
│   └── security/             # 🛡️ Security Layer
└── stores/                   # 📦 Client State (Zustand)
```

## Couche Domain (Métier)

### Entities & Value Objects

#### Cart Entity

```typescript
// src/lib/domain/entities/cart.entity.ts
export class Cart {
  constructor(
    public readonly userId: string,
    public readonly id?: string,
    private items: CartItem[] = [],
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date()
  ) {}

  addItem(
    itemId: string,
    productRef: ProductReference,
    quantity: Quantity
  ): Result<Cart, BusinessError>;
  removeItem(itemId: string): Result<Cart, BusinessError>;
  updateQuantity(itemId: string, quantity: Quantity): Result<Cart, BusinessError>;
  getTotalQuantity(): Quantity;
  getSubtotal(): Money;
  isEmpty(): boolean;
  getUnavailableItems(): CartItem[];
}
```

#### Value Objects

```typescript
// src/lib/domain/value-objects/money.ts
export class Money {
  constructor(private readonly _amount: number) {
    if (amount < 0) throw new ValidationError("Le montant ne peut pas être négatif");
  }

  get amount(): number {
    return this._amount;
  }
  add(other: Money): Money;
  multiply(factor: number): Money;
  format(locale = "fr-FR", currency = "EUR"): string;
}

// src/lib/domain/value-objects/quantity.ts
export class Quantity {
  constructor(private readonly _value: number) {
    if (!Number.isInteger(value) || value < 0) {
      throw new ValidationError("La quantité doit être un entier positif");
    }
  }

  get value(): number {
    return this._value;
  }
  add(other: Quantity): Quantity;
  isZero(): boolean;
}
```

### Domain Services

#### Cart Domain Service

```typescript
// src/lib/domain/services/cart.service.ts
export class CartDomainService {
  constructor(
    private cartRepository: CartRepository,
    private productRepository: ProductRepository,
    private userRepository: UserRepository,
    private eventPublisher: EventPublisher
  ) {}

  async addItemToCart(
    userId: string,
    productId: string,
    quantity: number
  ): Promise<Result<Cart, BusinessError>>;
  async removeItemFromCart(
    userId: string,
    cartItemId: string
  ): Promise<Result<Cart, BusinessError>>;
  async updateItemQuantity(
    userId: string,
    cartItemId: string,
    quantity: number
  ): Promise<Result<Cart, BusinessError>>;
  async clearCart(userId: string): Promise<Result<Cart, BusinessError>>;
  async mergeCarts(fromUserId: string, toUserId: string): Promise<Result<Cart, BusinessError>>;
  async getCartByUserId(userId: string): Promise<Result<Cart | null, BusinessError>>;
}
```

## Couche Infrastructure

### Repository Pattern

#### Cart Repository

```typescript
// src/lib/infrastructure/repositories/cart.repository.ts
export class SupabaseCartRepository implements CartRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findByUserId(userId: string): Promise<Result<Cart | null, Error>>;
  async findByUserIdWithItems(userId: string): Promise<Result<Cart | null, Error>>;
  async save(cart: Cart): Promise<Result<Cart, Error>>;
  async delete(userId: string): Promise<Result<void, Error>>;
}
```

### Dependency Injection

#### Container System

```typescript
// src/lib/infrastructure/container/container.ts
export class Container {
  registerSingleton<T>(token: string, factory: ServiceFactory<T>): Container;
  registerTransient<T>(token: string, factory: ServiceFactory<T>): Container;
  registerScoped<T>(token: string, factory: ServiceFactory<T>): Container;
  resolve<T>(token: string): T;
  createScope(): ContainerScope;
}

// Configuration
export const SERVICE_TOKENS = {
  CART_DOMAIN_SERVICE: "CartDomainService",
  CART_REPOSITORY: "CartRepository",
  PRODUCT_REPOSITORY: "ProductRepository",
  // ...
} as const;
```

## Couche Application

### 🎉 Server Actions Harmonisés (Phase 2 Terminée)

**STATUT :** ✅ **TOUS les Server Actions harmonisés vers ActionResult<T>**

| Module              | Statut       | Pattern         | Complexité   | Services métier       |
| ------------------- | ------------ | --------------- | ------------ | --------------------- |
| **cartActions**     | ✅ Harmonisé | ActionResult<T> | Élevée       | CartDomainService     |
| **productActions**  | ✅ Harmonisé | ActionResult<T> | Moyenne      | withPermissionSafe    |
| **authActions**     | ✅ Harmonisé | ActionResult<T> | Moyenne      | ValidationError typée |
| **magazineActions** | ✅ Harmonisé | ActionResult<T> | Élevée       | Business rules        |
| **userActions**     | ✅ Harmonisé | ActionResult<T> | Faible       | Admin permissions     |
| **adminActions**    | ✅ Harmonisé | ActionResult<T> | Faible       | Audit trails          |
| **addressActions**  | ✅ Harmonisé | ActionResult<T> | Moyenne      | i18n + sync           |
| **stripeActions**   | ✅ Harmonisé | ActionResult<T> | **Critique** | CheckoutOrchestrator  |

### Pattern Server Action Unifié

```typescript
// Pattern standard appliqué à TOUS les Server Actions
export async function standardServerAction(...params: any[]): Promise<ActionResult<T>> {
  const context = LogUtils.createUserActionContext(userId, "operation", "domain");
  LogUtils.logOperationStart("operation", context);

  try {
    // 1. Validation des paramètres avec erreurs typées
    if (!validation) {
      throw new ValidationError("Message user-friendly", "field_name");
    }

    // 2. Autorisation et permissions
    const hasPermission = await checkPermission(permission);
    if (!hasPermission) {
      throw new AuthenticationError("Permission refusée");
    }

    // 3. Logique métier via services
    const result = await domainService.executeOperation(params);

    // 4. Logging de succès avec métriques
    LogUtils.logOperationSuccess("operation", { ...context, metrics });
    return ActionResult.ok(result, "Opération réussie");
  } catch (error) {
    // 5. Gestion d'erreurs unifiée
    LogUtils.logOperationError("operation", error, context);
    return ActionResult.error(
      ErrorUtils.isAppError(error) ? ErrorUtils.formatForUser(error) : "Erreur inattendue"
    );
  }
}
```

### Services Métier pour Complexités

#### CheckoutOrchestrator (StripeActions)

```typescript
// src/lib/domain/services/checkout.service.ts
export class CheckoutOrchestrator {
  async processCheckout(
    params: CheckoutSessionParams
  ): Promise<ActionResult<CheckoutSessionResult>> {
    // Pipeline de validation complexe
    const validation = await this.validateCheckoutRequest(params);
    const session = await this.createStripeCheckoutSession(params);
    const metadata = await this.saveCheckoutSessionMetadata(session, params);

    return ActionResult.ok({
      sessionUrl: session.url, // ✅ Redirection côté client
      sessionId: session.id,
    });
  }
}
```

#### ProductValidationService

```typescript
// src/lib/domain/services/product-validation.service.ts
export class ProductValidationService {
  async validateCartProducts(items: CartItem[]): Promise<ActionResult<CartValidationResult>> {
    // Validation stock, disponibilité, prix avec erreurs métier typées
    for (const item of items) {
      if (product.stock_quantity < item.quantity) {
        throw new CheckoutBusinessError(
          CheckoutErrorCode.INSUFFICIENT_STOCK,
          `Stock insuffisant pour ${product.name}`
        );
      }
    }
  }
}
```

### Result Pattern

```typescript
// src/lib/core/result.ts
export abstract class Result<T, E = Error> {
  static ok<T>(value: T): Result<T, never>;
  static error<T, E>(error: E): Result<never, E>;

  abstract isSuccess(): boolean;
  abstract isError(): boolean;
  abstract getValue(): T;
  abstract getError(): E;
  abstract match<U>(onSuccess: (value: T) => U, onError: (error: E) => U): U;
  abstract map<U>(fn: (value: T) => U): Result<U, E>;
  abstract mapError<F>(fn: (error: E) => F): Result<T, F>;
  abstract flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E>;
}

// Interface pour Server Actions
export interface ServerActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type ActionResult<T> = ServerActionResult<T>;
```

## Couche Presentation

### Server Components avec Streaming

```typescript
// src/components/cart/optimized-cart-components.tsx
export async function OptimizedCartPage() {
  const userId = await getActiveUserId();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items - Stream indépendamment */}
        <div className="lg:col-span-2">
          <ErrorBoundary FallbackComponent={CartErrorFallback}>
            <Suspense fallback={<CartSkeleton />}>
              <CartItemsList userId={userId} />
            </Suspense>
          </ErrorBoundary>
        </div>

        {/* Cart Summary - Stream indépendamment */}
        <div>
          <ErrorBoundary FallbackComponent={SummaryErrorFallback}>
            <Suspense fallback={<SummarySkeleton />}>
              <CartSummary userId={userId} />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
```

### Zustand Store Synchronization

```typescript
// src/lib/store-sync/cart-sync.ts
class CartSyncManager {
  async syncWithServer(): Promise<void> {
    const cartData = await getCart();
    if (cartData.success) {
      this.updateStoreFromServerData(cartData.data);
    }
  }

  private updateStoreFromServerData(cartData: CartData): void {
    const store = useCartStore.getState();
    const storeItems: CartItem[] =
      cartData.items?.map((item) => ({
        id: item.id,
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
        slug: item.slug,
      })) || [];

    store.setItems(storeItems);
  }
}
```

## Sécurité

### Security Middleware

```typescript
// src/lib/security/security-middleware.ts
export class SecurityMiddleware {
  checkRateLimit(endpoint: string, context: SecurityContext): Result<void, RateLimitError>;
  checkAuthorization(
    resource: string,
    action: string,
    context: SecurityContext
  ): Result<void, AuthorizationError>;
  sanitizeInput<T>(data: T, rules: SanitizationRule[]): Result<T, ValidationError>;
  detectSuspiciousActivity(context: SecurityContext): Result<void, BusinessError>;

  // Décorateur pour Server Actions
  @withSecurity({
    rateLimit: "cart:add",
    resource: "cart",
    action: "create",
    sanitization: CART_SANITIZATION_RULES,
  })
  async secureAction() {
    /* ... */
  }
}
```

### Validation Coordination

```typescript
// src/lib/validators/cart-validation-coordinator.ts
export class CartValidationCoordinator {
  static async validateAddToCart(
    formData: FormData,
    userContext: UserContext,
    productDetails: ProductDetails
  ): Promise<Result<ValidatedCartInput, ValidationError>> {
    // 1. Validation API (Zod schemas)
    const apiValidation = await this.validateAPIInput(formData);
    if (apiValidation.isError()) return apiValidation;

    // 2. Validation Domain (business rules)
    const domainValidation = await this.validateDomainRules(
      apiValidation.getValue(),
      userContext,
      productDetails
    );
    if (domainValidation.isError()) return domainValidation;

    // 3. Validation Security (rate limiting, permissions)
    const securityValidation = await this.validateSecurity(userContext);
    if (securityValidation.isError()) return securityValidation;

    return Result.ok(domainValidation.getValue());
  }
}
```

## Gestion d'Erreurs

### Hiérarchie d'Erreurs

```typescript
// src/lib/core/errors.ts
export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
  }
}

export class ValidationError extends AppError {
  readonly code = "VALIDATION_ERROR";
  readonly statusCode = 400;
}

export class BusinessError extends AppError {
  readonly code = "BUSINESS_ERROR";
  readonly statusCode = 422;
}

export class AuthorizationError extends AppError {
  readonly code = "AUTHORIZATION_ERROR";
  readonly statusCode = 403;
}

// Utilitaires
export const ErrorUtils = {
  isAppError: (error: unknown): error is AppError => error instanceof AppError,
  formatForUser: (error: AppError): string => {
    /* user-friendly messages */
  },
  formatForLogging: (error: AppError): Record<string, unknown> => {
    /* structured logging */
  },
};
```

## Testing Strategy

### Tests d'Intégration

```typescript
// src/lib/domain/services/__tests__/cart.service.integration.test.ts
describe("CartDomainService Integration Tests", () => {
  let container: Container;
  let cartService: CartDomainService;
  let mockRepositories: {
    /* ... */
  };

  beforeEach(async () => {
    // Configuration du container de test avec mocks
    const containerResult = ContainerConfiguration.configureTest(mockRepositories);
    container = containerResult.getValue();
    cartService = container.resolve<CartDomainService>(SERVICE_TOKENS.CART_DOMAIN_SERVICE);
  });

  it("should successfully add item to cart with full validation flow", async () => {
    // Test complet avec validation, domain logic, et persistence
  });
});
```

### Tests des Server Actions

```typescript
// src/actions/__tests__/cart-actions-v2.integration.test.ts
describe("Cart Actions V2 Integration Tests", () => {
  beforeEach(() => {
    // Mock des dépendances externes
    mockGetActiveUserId.mockResolvedValue(mockUserId);
    mockCreateRequestScopedContainer.mockResolvedValue({ scope: mockScope });
  });

  it("should handle complete add to cart flow", async () => {
    const formData = new FormData();
    formData.append("productId", "product-123");
    formData.append("quantity", "2");

    const result = await addItemToCartV2({}, formData);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(mockCartDomainService.addItemToCart).toHaveBeenCalled();
  });
});
```

## Patterns Architecturaux Utilisés

### 1. Clean Architecture

- **Séparation des couches** : Domain, Application, Infrastructure, Presentation
- **Inversion de dépendances** : Les couches internes ne dépendent pas des couches externes
- **Independence du framework** : La logique métier est indépendante de Next.js

### 2. Domain-Driven Design (DDD)

- **Entities** : Cart, Product avec logique métier encapsulée
- **Value Objects** : Money, Quantity avec validation intégrée
- **Domain Services** : Orchestration des opérations métier complexes
- **Repository Pattern** : Abstraction de la persistance

### 3. CQRS (Command Query Responsibility Segregation)

- **Commands** : Server Actions pour les mutations
- **Queries** : Server Components pour les lectures
- **Séparation claire** entre lectures et écritures

### 4. Result Pattern

- **Type-safe error handling** : Pas d'exceptions, gestion explicite des erreurs
- **Composition** : Chaînage des opérations avec `map`, `flatMap`
- **Pattern matching** : Gestion élégante des cas de succès/erreur

### 5. Dependency Injection

- **Inversion of Control** : Container personnalisé avec lifetimes
- **Testabilité** : Injection facile de mocks pour les tests
- **Flexibilité** : Configuration différente par environnement

## Performance & Optimisations

### Server Components Streaming

- **Suspense boundaries** : Chargement progressif des composants
- **Error boundaries** : Gestion gracieuse des erreurs
- **Independent streaming** : Chaque section charge indépendamment

### State Management

- **Optimistic updates** : Mise à jour immédiate de l'UI
- **Background sync** : Synchronisation en arrière-plan avec le serveur
- **Cache invalidation** : `revalidateTag` pour la cohérence des données

### Database Optimizations

- **Row Level Security** : Sécurité au niveau base de données
- **Indexed queries** : Index sur les colonnes fréquemment utilisées
- **Connection pooling** : Gestion efficace des connexions

## Monitoring & Observabilité

### Logging Structure

```typescript
// src/lib/core/logger.ts
export const LogUtils = {
  logOperationStart: (operation: string, context: UserActionContext) => void,
  logOperationSuccess: (operation: string, context: UserActionContext) => void,
  logOperationError: (operation: string, error: unknown, context: UserActionContext) => void,
  createUserActionContext: (userId: string, action: string, resource: string) => UserActionContext
};
```

### Security Monitoring

- **Rate limiting** : Protection contre les abus
- **Suspicious activity detection** : Détection d'activités malveillantes
- **Audit logs** : Traçabilité des actions sensibles

## Évolution Future

### Extensibilité

- **Plugin system** : Architecture préparée pour des extensions
- **Multiple payment providers** : Abstraction des moyens de paiement
- **Multi-tenant support** : Architecture scalable pour plusieurs clients

### Scalabilité

- **Microservices ready** : Domain services peuvent être extraits
- **Event-driven architecture** : EventPublisher prêt pour des événements distribués
- **Horizontal scaling** : Stateless design compatible avec la mise à l'échelle

---

Cette architecture offre une base solide pour une application e-commerce moderne, maintenable et évolutive, en suivant les meilleures pratiques de l'industrie.
