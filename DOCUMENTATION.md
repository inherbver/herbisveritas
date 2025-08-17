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
- **carts** : Paniers utilisateurs authentifiés et invités
- **cart_items** : Articles dans les paniers
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

- `add_or_update_cart_item()` : Ajout/mise à jour articles
- `merge_guest_cart_to_user()` : Fusion panier invité→authentifié

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
