# Documentation Technique - HerbisVeritas

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
