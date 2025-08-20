# Architecture HerbisVeritas E-commerce

Guide technique complet de l'architecture et des patterns utilisés  
Date de mise à jour : 19 août 2025

## Vue d'ensemble

HerbisVeritas est une plateforme e-commerce moderne construite avec une Clean Architecture et des technologies de pointe pour garantir performance, maintenabilité et évolutivité.

### Stack Technologique

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│                 │    │                 │    │                 │
│ Next.js 15      │◄──►│ Server Actions  │◄──►│ Supabase        │
│ TypeScript      │    │ Zod Validation  │    │ PostgreSQL      │
│ Tailwind CSS    │    │ Stripe          │    │ RLS Policies    │
│ shadcn/ui       │    │ Next-intl       │    │ Auth System     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🏛️ Architecture Layers

### 1. **Présentation Layer** - Interface Utilisateur

```typescript
src/
├── app/[locale]/          # Pages Next.js 15 avec App Router
├── components/
│   ├── ui/                # Composants shadcn/ui
│   ├── common/            # Composants réutilisables
│   ├── features/          # Composants métier
│   └── layout/            # Navigation et mise en page
```

**Principles** :

- **Server Components par défaut** - Performance optimisée
- **Client Components** uniquement si interactivité requise
- **Composition over Inheritance** - Composants modulaires
- **Props drilling évité** avec Zustand pour l'état global

### 2. **Business Logic Layer** - Règles Métier

```typescript
src/
├── actions/               # Server Actions Next.js
├── services/              # Services métier
├── lib/
│   ├── validators/        # Schémas Zod
│   └── types/            # Définitions TypeScript
```

**Patterns utilisés** :

- **Result Pattern** pour la gestion d'erreurs
- **Repository Pattern** pour l'abstraction des données
- **Factory Pattern** pour la création d'objets complexes
- **Strategy Pattern** pour les différents moyens de paiement

### 3. **Data Access Layer** - Accès aux Données

```typescript
src/
├── lib/
│   ├── supabase/          # Clients et requêtes
│   │   ├── client.ts      # Client côté navigateur
│   │   ├── server.ts      # Client côté serveur
│   │   └── admin.ts       # Client administrateur
│   └── stripe/            # API Stripe
```

**Caractéristiques** :

- **Row Level Security (RLS)** pour la sécurité
- **Type Safety** avec génération automatique des types
- **Connection Pooling** optimisé
- **Query Optimization** avec index appropriés

## 🔄 Data Flow Architecture

### Flux de données typique :

1. **User Input** → Form/Component
2. **Validation** → Zod Schema
3. **Server Action** → Business Logic
4. **Service Layer** → Data Operations
5. **Database** → Supabase with RLS
6. **Response** → Result Pattern
7. **UI Update** → Optimistic Updates

## 🛡️ Sécurité Architecture

### Authentification & Autorisation

```typescript
// Middleware de sécurité
export async function middleware(request: NextRequest) {
  // 1. Authentification Supabase
  const { user } = await supabase.auth.getUser();

  // 2. Autorisation basée sur les rôles
  const adminCheck = await checkAdminRole(user.id);

  // 3. Protection CSRF
  const csrfValid = await CSRFProtection.validateToken(request);

  // 4. Rate Limiting
  await rateLimitCheck(user.id);
}
```

### Layers de Sécurité

1. **Network Level** : HTTPS, CORS, CSP
2. **Application Level** : CSRF, Rate Limiting, Input Sanitization
3. **Database Level** : RLS Policies, Constraints
4. **Authentication** : JWT, Refresh Tokens
5. **Audit** : Security Events Logging

## 📱 State Management Architecture

### Zustand Stores Pattern

```typescript
// Pattern de store typique
interface CartStore {
  // State
  items: CartItem[];
  isLoading: boolean;

  // Actions
  addItem: (item: CartItem) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  clear: () => Promise<void>;

  // Computed
  total: number;
  itemCount: number;
}

// Implémentation avec optimistic updates
const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  isLoading: false,

  addItem: async (item) => {
    // Optimistic update
    set((state) => ({ items: [...state.items, item] }));

    try {
      await addItemToCart(item);
    } catch (error) {
      // Rollback on error
      set((state) => ({
        items: state.items.filter((i) => i.id !== item.id),
      }));
      throw error;
    }
  },

  get total() {
    return get().items.reduce((sum, item) => sum + item.total, 0);
  },
}));
```

## 🚀 Performance Architecture

### Optimisations Implémentées

1. **Next.js 15 Optimizations**
   - Server Components pour réduire le JavaScript côté client
   - Streaming pour le loading progressif
   - Image Optimization avec WebP/AVIF

2. **Database Optimizations**

   ```sql
   -- Index critiques pour les requêtes fréquentes
   CREATE INDEX CONCURRENTLY idx_products_active_created
   ON products(is_active, created_at DESC)
   WHERE is_active = true;

   -- Vues optimisées pour éviter les requêtes N+1
   CREATE VIEW cart_with_product_details AS
   SELECT ci.*, p.name, p.price, (ci.quantity * p.price) as line_total
   FROM cart_items ci
   JOIN products p ON ci.product_id = p.id;
   ```

3. **Client-Side Optimizations**
   - Code Splitting automatique
   - Lazy Loading des composants
   - Memoization avec React.memo

### Métriques de Performance

- **LCP (Largest Contentful Paint)** : < 2.5s
- **FID (First Input Delay)** : < 100ms
- **CLS (Cumulative Layout Shift)** : < 0.1
- **Time to Interactive** : < 3s

## 🧪 Testing Architecture

### Stratégie de Test

```typescript
src/
├── __tests__/             # Tests d'intégration
├── components/            # Tests unitaires composants
├── actions/__tests__/     # Tests Server Actions
├── services/__tests__/    # Tests services métier
└── test-utils/           # Utilitaires de test
    ├── factories/        # Data factories
    ├── mocks/           # Mocks consolidés
    └── helpers/         # Test helpers
```

### Types de Tests

1. **Unit Tests** - Logique métier isolée
2. **Integration Tests** - Flux de données complets
3. **E2E Tests** - Parcours utilisateur avec Playwright
4. **Security Tests** - Tests de sécurité automatisés

## 🌐 Internationalization Architecture

### Structure i18n

```typescript
src/
├── i18n/
│   ├── config.ts          # Configuration next-intl
│   └── messages/
│       ├── fr/            # Français (défaut)
│       ├── en/            # Anglais
│       ├── de/            # Allemand
│       └── es/            # Espagnol
```

### Pattern d'utilisation

```typescript
// Server Component
import { getTranslations } from 'next-intl/server';

export default async function ProductPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations('ProductPage');

  return <h1>{t('title')}</h1>;
}

// Client Component
import { useTranslations } from 'next-intl';

export function ProductCard() {
  const t = useTranslations('ProductCard');

  return <button>{t('addToCart')}</button>;
}
```

## 🔧 Development Patterns

### Error Handling Pattern

```typescript
// Result Pattern pour la gestion d'erreurs
type Result<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
      code?: string;
    };

// Utilisation
export async function createOrder(data: OrderData): Promise<Result<Order>> {
  try {
    // Validation
    const validData = orderSchema.parse(data);

    // Business logic
    const order = await orderService.create(validData);

    return { success: true, data: order };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      code: error.code,
    };
  }
}
```

### Service Pattern

```typescript
// Service abstrait de base
export abstract class BaseService<T, CreateT, UpdateT> {
  abstract create(data: CreateT): Promise<Result<T>>;
  abstract findById(id: string): Promise<Result<T>>;
  abstract update(id: string, data: UpdateT): Promise<Result<T>>;
  abstract delete(id: string): Promise<Result<void>>;
}

// Implémentation concrète
export class ProductService extends BaseService<
  Product,
  CreateProduct,
  UpdateProduct
> {
  async create(data: CreateProduct): Promise<Result<Product>> {
    // Implémentation spécifique
  }
}
```

## 📦 Deployment Architecture

### Environnements

- **Development** : Local avec Supabase local
- **Staging** : Vercel Preview avec Supabase staging
- **Production** : Vercel Production avec Supabase production

## 🔮 Évolutions Futures

### Architectures Envisagées

1. **Microservices** - Pour la montée en charge
2. **Event Sourcing** - Pour l'audit complet
3. **CQRS** - Pour la séparation lecture/écriture
4. **GraphQL** - Pour l'API unifiée

### Migrations Planifiées

- Migration vers **Next.js 16** dès disponibilité
- Adoption de **React Server Actions** avancées
- Intégration **Supabase Edge Functions** pour la logique métier
- **PWA** pour l'expérience mobile native

---

## 🏆 Conclusion

Cette architecture moderne garantit :

- ✅ **Performance** optimale avec Server Components
- ✅ **Sécurité** enterprise-grade avec RLS et CSRF
- ✅ **Maintenabilité** avec Clean Architecture
- ✅ **Évolutivité** pour la croissance future
- ✅ **Developer Experience** avec TypeScript strict

L'architecture est prête pour une montée en charge significative tout en maintenant la qualité et la sécurité.

---

_Document maintenu par l'équipe technique HerbisVeritas_

## Vue d'ensemble

**HerbisVeritas** est une plateforme e-commerce moderne spécialisée dans les cosmétiques naturels, construite avec Next.js 15 et Supabase. L'application utilise une architecture server-first avec des patterns de sécurité robustes et une séparation claire des responsabilités.

### Stack Technologique

- **Framework** : Next.js 15 avec App Router et Server Components
- **Backend** : Supabase (PostgreSQL, Auth, Storage, RLS)
- **Frontend** : React 19, TypeScript 5, Tailwind CSS, shadcn/ui
- **État** : Zustand pour l'état global client
- **Validation** : Zod avec React Hook Form
- **i18n** : next-intl (FR, EN, DE, ES)
- **Paiements** : Stripe
- **Tests** : Jest, Testing Library, Playwright

## Architecture

### Principes Architecturaux

- **Server Components First** : Optimisation SEO et performance
- **Clean Architecture** : Séparation entities/services/adapters/controllers
- **Security by Design** : RLS, middleware de protection, audit logging
- **Type Safety** : TypeScript strict, validation Zod runtime

### Structure des Dossiers

```
src/
├── app/[locale]/              # Next.js App Router avec i18n
├── components/                # Components React par domaine
│   ├── auth/                  # Authentification & autorisation
│   ├── common/                # Composants réutilisables
│   ├── domain/                # Composants spécifiques au domaine
│   ├── features/              # Composants par fonctionnalité
│   ├── forms/                 # Formulaires
│   ├── layout/                # Layout et navigation
│   └── ui/                    # shadcn/ui components
├── actions/                   # Server Actions pour mutations
├── lib/                       # Utilitaires et services
│   ├── auth/                  # Services d'authentification
│   ├── core/                  # Utilitaires de base
│   ├── supabase/              # Clients et requêtes DB
│   ├── storage/               # Upload et stockage
│   └── stripe/                # Traitement paiements
├── services/                  # Logique métier
├── stores/                    # Stores Zustand
├── types/                     # Définitions TypeScript
└── middleware.ts              # Protection routes et i18n
```

## Base de Données

### Schéma Principal (27 tables)

#### Utilisateurs et Profils

- **profiles** : Profils utilisateurs avec système de rôles (`user`, `editor`, `admin`, `dev`)
- **addresses** : Adresses multiples par utilisateur
- **audit_logs** : Journal des événements de sécurité

#### E-commerce

- **products** : Catalogue avec prix, stock, statuts
- **product_translations** : Traductions multilingues (FR, EN, DE, ES)
- **categories** : Classification des produits
- **carts** : Paniers utilisateurs authentifiés et invités (`user_id` ou `guest_id`)
- **cart_items** : Articles dans les paniers (partagé guest/user)
- **orders** : Commandes avec statuts et paiements
- **order_items** : Articles commandés avec prix historique

#### Contenu

- **articles** : Système magazine/blog avec SEO
- **tags** et **article_tags** : Taxonomie
- **featured_hero_items** : Contenu mis en avant

#### Logistique

- **pickup_points** : Points de retrait Colissimo
- **shipping_methods** : Méthodes de livraison
- **markets** : Marchés et événements

#### Support

- **partners** : Partenaires commerciaux
- **newsletter_subscribers** : Abonnés newsletter
- **legal_documents** : Documents légaux
- **login_attempts** : Limitation connexions

### Sécurité RLS

Toutes les tables sont protégées par Row Level Security :

- **Administrateurs** : Accès complet via `is_current_user_admin()`
- **Utilisateurs** : Accès limité à leurs données
- **Invités** : Lecture publique uniquement

### Types de Données Personnalisés

```sql
app_role: 'user', 'editor', 'admin', 'dev'
event_severity: 'INFO', 'WARNING', 'ERROR', 'CRITICAL'
order_status_type: 'pending_payment', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
payment_status_type: 'pending', 'succeeded', 'failed', 'refunded'
```

### Fonctions Métier

#### Gestion Panier

- `add_or_update_cart_item()` : Ajout/mise à jour articles (guest et user)
- `merge_guest_cart_to_user()` : Fusion automatique panier guest→user
- `get_or_create_cart()` : Récupération/création panier guest ou user

#### Administration

- `cleanup_expired_guest_carts()` : Nettoyage paniers expirés
- `cleanup_old_anonymous_users()` : Purge utilisateurs anonymes
- `create_missing_profiles()` : Récupération profils manquants

#### Produits

- `create_product_with_translations_v2()` : Création avec traductions
- `update_product_with_translations()` : Mise à jour complète

### Stockage (Storage)

| Bucket     | Public | Limite | Usage             |
| ---------- | ------ | ------ | ----------------- |
| `products` | ✓      | ∞      | Images produits   |
| `magazine` | ✓      | 4MB    | Contenu éditorial |
| `contact`  | ✓      | ∞      | Page contact      |
| `about`    | ✓      | ∞      | Page à propos     |

## Authentification et Autorisation

### Système de Rôles

```typescript
type UserRole = "user" | "editor" | "admin" | "dev";
```

### Protection des Routes

- **Middleware** : Protection `/admin` et `/profile`
- **Vérification** : Base de données avec cache en mémoire
- **Audit** : Logging des tentatives d'accès non autorisées

### Pattern d'Autorisation

```typescript
// Vérification admin avec cache
export async function checkAdminRole(
  userId: string,
): Promise<AdminCheckResult> {
  // 1. Vérification cache en mémoire
  // 2. Consultation base de données
  // 3. Mise à jour cache
  // 4. Logging sécurité si nécessaire
}
```

## Server Actions

### Pattern Standard

```typescript
export async function actionName(
  prevState: unknown,
  formData: FormData,
): Promise<ActionResult<DataType>> {
  // 1. Validation Zod
  // 2. Vérification permissions
  // 3. Logique métier
  // 4. Gestion d'erreurs standardisée
}
```

### Actions Principales

- **authActions.ts** : Connexion, inscription, mot de passe
- **cartActions.ts** : Gestion panier avec optimistic updates
- **productActions.ts** : CRUD produits avec traductions
- **orderActions.ts** : Processus de commande

## Gestion d'État

### Stores Zustand

#### CartStore

```typescript
interface CartStore {
  items: CartItem[];
  isLoading: boolean;
  error: string | null;

  // Actions
  addItem: (itemDetails, quantity) => void;
  removeItem: (cartItemId) => void;
  updateQuantity: (productId, quantity) => void;
  clearCart: () => void;
}
```

**Fonctionnalités** :

- Persistance localStorage avec versioning
- Synchronisation bidirectionnelle avec serveur
- Gestion d'erreurs robuste

#### Autres Stores

- **AddressStore** : Gestion adresses utilisateur
- **ProfileStore** : Données profil avec synchronisation

## Gestion des Paniers Guest

### Vue d'ensemble

Le système permet aux utilisateurs non authentifiés de :

1. **Remplir un panier** et naviguer sur le site
2. **Finaliser complètement leur commande** (paiement + livraison)
3. **Migrer automatiquement** leur panier lors de l'inscription
4. **Purger automatiquement** les paniers anciens (>14 jours)

### Architecture Technique

#### Structure Base de Données

```sql
-- Table carts : Support guest et user authentifié
CREATE TABLE public.carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),  -- NULL pour guest
    guest_id UUID,                           -- ID unique pour guest
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB
);

-- Table orders : user_id nullable pour guest checkout
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),  -- Nullable depuis migration 20250624005000
    total_amount NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    stripe_checkout_id TEXT UNIQUE,
    shipping_address_id UUID,
    billing_address_id UUID,
    -- Champs pour guest
    guest_email TEXT,
    guest_phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### Flux de Fonctionnement

**1. Panier Guest**

- Création automatique d'un `guest_id` unique
- Stockage en base avec `user_id = NULL`
- Gestion identique aux paniers authentifiés

**2. Checkout Guest**

```typescript
// Dans stripeActions.ts
const processedAddresses =
  await addressValidationService.validateAndProcessAddresses({
    userId: undefined, // Guest
    shippingAddress,
    billingAddress,
  });

// isGuestCheckout: true déclenche le flux spécialisé
const sessionData = {
  isGuestCheckout: processedAddresses.isGuestCheckout,
  // ...
};
```

**3. Migration Automatique lors Connexion**

```typescript
// Dans authActions.ts - loginAction
if (guestUserId) {
  const migrationResult = await migrateAndGetCart({ guestUserId });
  // Fusion automatique des paniers guest → user
}
```

**4. Purge Automatique**

```typescript
// Edge Function : cleanup-guest-carts
const config = {
  maxAgeHours: 24 * 14, // 14 jours par défaut
  batchSize: 100,
  dryRun: false,
};
```

### Services et Actions

#### CartActions

- **`addItemToCart()`** : Support guest via `guest_id`
- **`migrateAndGetCart()`** : Migration guest → user authentifié
- **`getCart()`** : Récupération panier guest ou user

#### CheckoutOrchestratorService

- **`processCheckout()`** : Orchestre le processus complet
- **Validation addresses** : Support `isGuestCheckout: true`
- **Création commande** : Sans `user_id` pour guest

#### AddressValidationService

```typescript
interface AddressValidationResult {
  isGuestCheckout: boolean;
  shippingAddress: ProcessedAddress;
  billingAddress: ProcessedAddress;
}
```

### Tests et Validation

#### Test E2E Guest Checkout

```typescript
// tests/e2e/checkout-flow.spec.ts
test("guest user can complete full checkout process", async ({ page }) => {
  // Navigation → Boutique
  // Ajout produits au panier
  // Remplissage adresses livraison/facturation
  // Informations contact (email, téléphone)
  // Finalisation paiement Stripe
});
```

#### Tests Unitaires

- **Migration panier** : `cartActions.test.ts`
- **Validation addresses** : `address-validation.service.test.ts`
- **Checkout orchestration** : `checkout-orchestrator.service.test.ts`

### Edge Functions

#### cleanup-guest-carts

```typescript
// Purge automatique des paniers expirés
interface CleanupConfig {
  dryRun?: boolean;
  maxAgeHours?: number; // 14 jours par défaut
  batchSize?: number; // 100 par défaut
}

// Déclenchement :
// - Automatique (cron job)
// - Manuel via interface admin
```

### Points d'Attention

#### Sécurité

- **RLS Policies** : Accès guest contrôlé par `guest_id`
- **Validation stricte** : Tous les inputs guest validés
- **Audit trail** : Logs détaillés des opérations guest

#### Performance

- **Index optimisés** : Sur `guest_id` et `created_at`
- **Purge par batch** : Évite la surcharge système
- **Cache intelligent** : Réduction des requêtes répétitives

#### Monitoring

- **Métriques spécialisées** : Taux de conversion guest
- **Alertes** : Échecs migration ou purge
- **Dashboard admin** : Vue d'ensemble paniers guest

## Internationalisation

### Configuration

```typescript
export const locales = ["fr", "en", "de", "es"] as const;
export const defaultLocale: Locale = "fr";
```

### Structure de Routes

- **Pattern** : `app/[locale]/` pour tous les routes
- **Pathnames** : Localisés par langue (`/shop` → `/boutique`)
- **Middleware** : Détection automatique de locale

### Traductions

- **Structure** : `/src/i18n/messages/[locale]/`
- **Organisation** : Par composant/page
- **Usage** : `useTranslations()` hook

## Intégrations Externes

### Stripe

```typescript
// Configuration centralisée
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-06-30.basil",
  typescript: true,
});
```

**Fonctionnalités** :

- Sessions de paiement sécurisées
- Webhook pour traitement asynchrone
- Gestion des remboursements

### Colissimo

- **Widget** : Intégration iframe pour sélection points de retrait
- **API** : Calcul frais de port et suivi
- **Mock** : Environnement de développement

### Supabase Clients

```typescript
// Client serveur
const supabase = await createSupabaseServerClient();

// Client admin (service_role)
const adminClient = createSupabaseAdminClient();

// Client navigateur
const supabase = createClient();
```

## Validation et Formulaires

### Schemas Zod

```typescript
// Validation réutilisable
export const AddToCartInputSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().min(1).max(10),
});

// Schemas avec i18n
export const createSignupSchema = (
  tPassword: ReturnType<typeof useTranslations>,
  tAuth: ReturnType<typeof useTranslations>,
) =>
  z.object({
    email: z.string().email({ message: tAuth("emailInvalid") }),
    password: createPasswordSchema(tPassword),
  });
```

### Upload de Fichiers

```typescript
// Système centralisé
export async function uploadProductImageCore(
  formData: FormData,
): Promise<UploadImageResult>;

// Validation automatique (4MB max, JPEG/PNG/WebP/GIF)
// Permissions intégrées au système de rôles
// Nommage automatique avec slugify + timestamp
```

## Tests

### Architecture

```
src/
├── __tests__/                 # Tests par fonctionnalité
├── test-utils/                # Utilitaires de test
│   ├── factories/             # Factory pattern
│   ├── TestProviders.tsx      # Providers de test
│   └── supabaseMocks.ts       # Mocks Supabase
└── mocks/                     # MSW handlers
```

### Configuration Jest

```javascript
{
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  }
}
```

### Factory Pattern

```typescript
export class ProductFactory {
  static create(overrides?: Partial<MockProduct>): MockProduct {
    return {
      id: `product-${this.counter++}`,
      name: `Produit Test ${this.counter}`,
      price: 29.99,
      ...overrides,
    };
  }
}
```

## Scripts de Développement

### Développement

```bash
npm run dev              # Serveur développement avec Turbo
npm run build            # Build production
npm run start            # Serveur production
npm run typecheck        # Vérification TypeScript
```

### Qualité

```bash
npm run lint             # ESLint
npm run test             # Tests unitaires
npm run test:coverage    # Couverture de tests
npm run audit-roles      # Audit rôles admin
```

## Configuration Environnement

### Variables Requises

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Application
NEXT_PUBLIC_BASE_URL=
ADMIN_PRINCIPAL_ID=
```

## Standards de Code

### TypeScript

- Mode strict activé
- Pas de type `any` - interfaces explicites
- Validation runtime avec Zod

### Patterns

- Imports absolus avec alias `@/`
- Server Components par défaut
- Error handling avec try-catch systématique
- Commits conventionnels en français

### Sécurité

- RLS sur toutes les tables
- Validation client + serveur
- Audit logging pour actions sensibles
- Protection CSRF via Supabase auth

### Performance

- Edge Runtime où possible
- Optimisation images Next.js + Supabase
- Bundle analysis avec `npm run analyze`
- Caching strategies Next.js

### Accessibilité

- Tags HTML sémantiques prioritaires
- Attributs ARIA complets
- Navigation clavier optimisée
- Zones tactiles mobile
