# Guide Développeur HerbisVeritas - Post Refactoring

## 🎯 Vue d'ensemble

Ce guide fournit toutes les informations nécessaires pour développer efficacement sur HerbisVeritas après le refactoring des phases 1-3. Il couvre l'architecture modernisée, les patterns établis, et les meilleures pratiques à suivre.

## 📚 Table des Matières

1. [Setup & Onboarding](#setup--onboarding)
2. [Architecture Post-Refactoring](#architecture-post-refactoring) 
3. [Patterns de Développement](#patterns-de-développement)
4. [Cookbook Solutions Communes](#cookbook-solutions-communes)
5. [Guidelines Contribution](#guidelines-contribution)
6. [Performance & Sécurité](#performance--sécurité)
7. [Testing & Quality](#testing--quality)
8. [Troubleshooting](#troubleshooting)

---

## Setup & Onboarding

### Prérequis Techniques
```bash
# Versions minimales
Node.js >= 18.17.0
npm >= 9.0.0
Git >= 2.40.0

# Outils recommandés
VS Code + Extensions Pack
```

### Installation Rapide (< 5 minutes)
```bash
# 1. Clone & install
git clone https://github.com/herbisveritas/herbisveritas.git
cd herbisveritas
npm install

# 2. Configuration environnement
cp .env.example .env.local
# Remplir les variables Supabase

# 3. Setup base de données
npm run db:migrate

# 4. Démarrage dev
npm run dev
```

### Validation Setup
```bash
# Tests de santé complets
npm run health-check

# Validation configuration
npm run validate-setup

# Lint & type-check
npm run lint && npm run type-check
```

### Premier Code Review
Votre première contribution doit passer par :
1. **Feature branch** depuis `main`
2. **Tests unitaires** pour tout nouveau code
3. **Review obligatoire** par 2 développeurs seniors
4. **Pipeline CI/CD** vert complet

---

## Architecture Post-Refactoring

### Vue d'ensemble Simplifiée
```
HerbisVeritas Architecture (2025)
├── 🏗️ Foundation
│   ├── Next.js 15 (App Router)
│   ├── Supabase (DB + Auth + Storage)  
│   ├── TypeScript Strict
│   └── Tailwind + shadcn/ui
├── 🔄 State Management
│   ├── Server Components (default)
│   ├── Zustand (client state)
│   └── Server Actions (mutations)
├── 🛡️ Security
│   ├── RLS Policies
│   ├── Rate Limiting
│   └── Input Validation (Zod)
└── ⚡ Performance
    ├── Multi-level Caching
    ├── DB Indexes Optimized
    └── Bundle Optimization
```

### Hiérarchie des Composants (Post-Phase 1)
```
src/components/
├── ui/                    # Design System (shadcn/ui)
│   ├── button.tsx        # Composants atomiques purs
│   ├── form.tsx          # Pas de logique métier
│   └── modal.tsx         # Réutilisables partout
├── common/               # Composants transversaux
│   ├── optimized-image.tsx  # Infrastructure technique
│   ├── error-boundary.tsx   # Pas feature-specific
│   └── dynamic-loader.tsx   # Performance helpers
├── features/             # Composants métier par domaine
│   ├── shop/            # Logique e-commerce
│   ├── admin/           # Interface administration
│   ├── auth/            # Authentification
│   └── magazine/        # Content management
└── layout/              # Structure pages uniquement
    ├── header.tsx       # Composition pure
    ├── footer.tsx       # Pas de logique métier
    └── sidebar.tsx      # Navigation
```

### State Management Unifié (Post-Phase 1)
```typescript
// Pattern Result pour toutes les opérations
import { Result, ok, err } from '@/lib/core/result';

// Server Actions typées
export async function createProduct(data: ProductData): Promise<Result<Product, ProductError>> {
  // Validation + business logic + error handling
}

// Zustand pour l'état client
export const useCartStore = create<CartState>((set) => ({
  items: [],
  addItem: (product) => set((state) => ({ 
    items: [...state.items, product] 
  }))
}));

// React Server Components pour les données
export default async function ProductsPage() {
  const products = await getProducts(); // Direct DB call
  return <ProductGrid products={products} />;
}
```

---

## Patterns de Développement

### 1. Server Actions avec Result Pattern
```typescript
// ✅ Pattern recommandé
export async function updateProductAction(
  id: string, 
  data: ProductUpdateData
): Promise<Result<Product, ProductError>> {
  try {
    // 1. Validation input
    const validatedData = productUpdateSchema.parse(data);
    
    // 2. Authorization check
    const canUpdate = await checkPermission('products:update');
    if (!canUpdate) {
      return err(new ProductError('UNAUTHORIZED', 'Cannot update product'));
    }
    
    // 3. Business logic
    const product = await updateProduct(id, validatedData);
    
    // 4. Success response
    logger.info('Product updated', { productId: id });
    return ok(product);
    
  } catch (error) {
    // 5. Error handling
    logger.error('Product update failed', { error, id, data });
    return err(new ProductError('UPDATE_FAILED', 'Failed to update product'));
  }
}

// ✅ Usage côté client
const handleUpdate = async (data: ProductUpdateData) => {
  const result = await updateProductAction(product.id, data);
  
  if (result.isError) {
    setError(result.error.message);
    return;
  }
  
  // Success handling
  setProduct(result.data);
  toast.success('Product updated successfully');
};
```

### 2. Composants avec Performance Optimization
```typescript
// ✅ Composant optimisé
interface ProductCardProps {
  product: Product;
  priority?: boolean; // Pour lazy loading
  onAction?: (action: string) => void;
}

export function ProductCard({ product, priority = false, onAction }: ProductCardProps) {
  // Memoization des calculs coûteux
  const formattedPrice = useMemo(() => 
    formatPrice(product.price), [product.price]
  );
  
  // Callbacks stables
  const handleClick = useCallback(() => 
    onAction?.('view'), [onAction]
  );
  
  return (
    <Card onClick={handleClick}>
      {/* Image optimisée avec lazy loading */}
      <OptimizedImage
        src={product.image_url}
        alt={product.name}
        priority={priority}
        sizes="(max-width: 768px) 100vw, 300px"
      />
      
      <CardContent>
        <h3>{product.name}</h3>
        <Price value={formattedPrice} />
      </CardContent>
    </Card>
  );
}
```

### 3. Cache Strategy (Post-Phase 2)
```typescript
// ✅ Pattern cache multi-niveaux
import { cache } from '@/lib/cache/cache-service';

// Server Component avec cache
export default async function ProductsPage() {
  const products = await cache.get(
    'products:active',
    () => getActiveProducts(),
    { ttl: 300, tags: ['products'] }
  );
  
  return <ProductGrid products={products} />;
}

// Invalidation cache après mutation
export async function createProductAction(data: ProductData) {
  const result = await createProduct(data);
  
  if (result.isOk) {
    // Invalidation intelligente par tags
    await cache.invalidate(['products']);
  }
  
  return result;
}
```

### 4. Error Handling Unifié
```typescript
// ✅ Composant avec gestion d'erreur
'use client';

export function ProductForm({ product }: ProductFormProps) {
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = async (data: ProductData) => {
    setError(null);
    
    const result = await updateProductAction(product.id, data);
    
    if (result.isError) {
      // Error handling typé
      switch (result.error.code) {
        case 'VALIDATION_ERROR':
          setError('Données invalides. Veuillez vérifier le formulaire.');
          break;
        case 'UNAUTHORIZED':
          setError('Vous n\'avez pas les permissions nécessaires.');
          break;
        default:
          setError('Une erreur inattendue s\'est produite.');
      }
      return;
    }
    
    // Success
    toast.success('Produit mis à jour avec succès');
    router.push('/admin/products');
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {error && <Alert variant="destructive">{error}</Alert>}
      {/* Form fields */}
    </form>
  );
}
```

---

## Cookbook Solutions Communes

### Ajouter une Nouvelle Page
```bash
# 1. Créer la page
touch src/app/[locale]/nouvelle-page/page.tsx

# 2. Ajouter les traductions
echo '{"title": "Nouvelle Page"}' > src/i18n/messages/fr/NouvellePage.json

# 3. Créer les composants nécessaires
mkdir src/components/features/nouvelle-page
touch src/components/features/nouvelle-page/nouvelle-page-content.tsx

# 4. Tests
touch src/components/features/nouvelle-page/__tests__/nouvelle-page-content.test.tsx
```

### Ajouter une Server Action
```typescript
// 1. Créer l'action dans le bon fichier
// src/actions/nouvelleFeatureActions.ts

export async function createItemAction(data: ItemData): Promise<Result<Item, ItemError>> {
  try {
    // Validation
    const validatedData = itemSchema.parse(data);
    
    // Authorization
    const user = await getCurrentUser();
    if (!user) {
      return err(new ItemError('UNAUTHORIZED', 'Authentication required'));
    }
    
    // Business logic
    const item = await createItem(validatedData);
    
    // Cache invalidation
    await cache.invalidate(['items']);
    
    return ok(item);
  } catch (error) {
    logger.error('Item creation failed', { error, data });
    return err(new ItemError('CREATION_FAILED', 'Failed to create item'));
  }
}

// 2. Types (src/types/item.ts)
export interface ItemData {
  name: string;
  description?: string;
}

export class ItemError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

// 3. Validation (src/lib/validators/item.validator.ts)
export const itemSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional()
});

// 4. Tests
describe('createItemAction', () => {
  it('creates item successfully', async () => {
    const result = await createItemAction({ name: 'Test Item' });
    expect(result.isOk).toBe(true);
  });
});
```

### Optimiser une Page Lente
```typescript
// 1. Identifier le problème
npm run analyze:performance

// 2. Ajouter du cache
const data = await cache.get(
  'expensive-operation',
  () => expensiveQuery(),
  { ttl: 600 }
);

// 3. Lazy loading pour composants lourds
const HeavyComponent = dynamic(() => import('./heavy-component'), {
  loading: () => <Skeleton />,
  ssr: false
});

// 4. Pagination si large dataset
const products = await getProductsPaginated({ page: 1, limit: 25 });

// 5. Virtualization si nécessaire
import { VirtualizedGrid } from '@/components/common/virtualized-grid';
```

### Ajouter une Feature Admin
```typescript
// 1. Route protégée
// src/app/[locale]/admin/nouvelle-feature/page.tsx
export default async function NouvelleFeaturePage() {
  // Authorization check automatique via middleware
  return <NouvelleFeatureContent />;
}

// 2. Composant admin
// src/components/features/admin/nouvelle-feature.tsx
export function NouvelleFeatureContent() {
  const { data, isLoading, error } = useAdminData('nouvelle-feature');
  
  if (isLoading) return <AdminSkeleton />;
  if (error) return <AdminError error={error} />;
  
  return (
    <AdminLayout>
      <AdminHeader title="Nouvelle Feature" />
      <AdminContent data={data} />
    </AdminLayout>
  );
}

// 3. Navigation (src/components/features/admin/admin-sidebar.tsx)
const sidebarItems = [
  // Ajouter l'item de navigation
  { href: '/admin/nouvelle-feature', label: 'Nouvelle Feature', icon: Icon }
];
```

---

## Guidelines Contribution

### Workflow Git
```bash
# 1. Feature branch depuis main
git checkout main
git pull origin main
git checkout -b feature/nouvelle-fonctionnalite

# 2. Développement avec commits atomiques
git add -A
git commit -m "feat(scope): description claire en français"

# 3. Push et Pull Request
git push -u origin feature/nouvelle-fonctionnalite
# Créer PR via GitHub avec template
```

### Standards de Code

#### TypeScript
```typescript
// ✅ Types explicites
interface ProductProps {
  product: Product;
  onUpdate: (product: Product) => void;
}

// ✅ Pas de 'any'
function processData(data: unknown): ProcessedData {
  if (isValidData(data)) {
    return processValidData(data);
  }
  throw new Error('Invalid data');
}

// ✅ Gestion d'erreur robuste
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  logger.error('Operation failed', { error });
  throw new OperationError('Operation failed');
}
```

#### React Composants
```typescript
// ✅ Props interface claire
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

// ✅ Composant optimisé
export const Button = memo(({ variant = 'primary', ...props }: ButtonProps) => {
  return (
    <button 
      className={cn(buttonVariants({ variant, size }))}
      {...props}
    />
  );
});

Button.displayName = 'Button';
```

### Code Review Checklist

#### Sécurité ✅
- [ ] Pas de données sensibles en dur
- [ ] Validation des inputs (Zod schemas)
- [ ] Authorization checks présents
- [ ] Rate limiting appliqué si nécessaire

#### Performance ✅  
- [ ] Pas de requêtes N+1
- [ ] Cache approprié ajouté
- [ ] Images optimisées
- [ ] Bundles size vérifiée

#### Qualité ✅
- [ ] Tests unitaires présents
- [ ] Types TypeScript corrects
- [ ] ESLint warnings supprimées
- [ ] Documentation mise à jour

#### UX ✅
- [ ] Loading states gérés
- [ ] Error states gérés  
- [ ] Accessibilité vérifiée
- [ ] Mobile responsive

---

## Performance & Sécurité

### Performance Monitoring
```typescript
// Métriques automatiques dans les composants
import { usePerformanceMonitor } from '@/hooks/use-performance-monitor';

export function ExpensiveComponent() {
  const { startTimer, endTimer } = usePerformanceMonitor('expensive-component');
  
  useEffect(() => {
    startTimer();
    
    // Expensive operation
    expensiveOperation();
    
    endTimer();
  }, []);
}

// Budget performance par page
export const PERFORMANCE_BUDGETS = {
  '/shop': { lcp: 2000, fid: 100 },
  '/admin': { lcp: 3000, fid: 150 },
  '/': { lcp: 1500, fid: 100 }
};
```

### Sécurité Best Practices
```typescript
// ✅ Server Action sécurisée
@withRateLimit('ADMIN')
export async function sensitiveAdminAction(data: AdminActionData) {
  // 1. Authentication
  const user = await getCurrentUser();
  if (!user) {
    return err(new SecurityError('UNAUTHORIZED'));
  }
  
  // 2. Authorization
  const isAdmin = await checkAdminRole(user.id);
  if (!isAdmin) {
    return err(new SecurityError('FORBIDDEN'));
  }
  
  // 3. Input validation
  const validatedData = adminActionSchema.parse(data);
  
  // 4. Audit logging
  await logSecurityEvent('ADMIN_ACTION', {
    userId: user.id,
    action: 'sensitiveAdminAction',
    data: validatedData
  });
  
  // 5. Business logic
  return await executeAdminAction(validatedData);
}
```

---

## Testing & Quality

### Structure Tests
```
src/
├── components/
│   └── __tests__/           # Tests composants
├── actions/
│   └── __tests__/           # Tests Server Actions
├── lib/
│   └── __tests__/           # Tests utilities
└── __tests__/
    ├── integration/         # Tests d'intégration
    └── e2e/                # Tests Playwright
```

### Exemples Tests Types

#### Test Composant
```typescript
// src/components/features/shop/__tests__/product-card.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCard } from '../product-card';

describe('ProductCard', () => {
  const mockProduct = {
    id: '1',
    name: 'Test Product',
    price: 1000,
    image_url: '/test.jpg'
  };

  it('renders product information', () => {
    render(<ProductCard product={mockProduct} />);
    
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('10,00 €')).toBeInTheDocument();
  });

  it('calls onAction when clicked', () => {
    const onAction = jest.fn();
    render(<ProductCard product={mockProduct} onAction={onAction} />);
    
    fireEvent.click(screen.getByRole('article'));
    expect(onAction).toHaveBeenCalledWith('view');
  });
});
```

#### Test Server Action
```typescript
// src/actions/__tests__/productActions.test.ts
import { createProductAction } from '../productActions';
import { mockSupabase } from '@/test-utils/mocks';

describe('createProductAction', () => {
  beforeEach(() => {
    mockSupabase.reset();
  });

  it('creates product successfully', async () => {
    const productData = {
      name: 'New Product',
      price: 1500,
      description: 'Test description'
    };

    mockSupabase.from('products').insert.mockResolvedValue({
      data: { id: '1', ...productData },
      error: null
    });

    const result = await createProductAction(productData);

    expect(result.isOk).toBe(true);
    expect(result.data).toMatchObject(productData);
  });

  it('handles validation errors', async () => {
    const invalidData = { name: '' }; // Invalid: missing required fields

    const result = await createProductAction(invalidData);

    expect(result.isError).toBe(true);
    expect(result.error.code).toBe('VALIDATION_ERROR');
  });
});
```

#### Test E2E
```typescript
// tests/e2e/shop-flow.spec.ts
import { test, expect } from '@playwright/test';

test('complete shopping flow', async ({ page }) => {
  // Navigation vers shop
  await page.goto('/shop');
  
  // Ajout produit au panier
  await page.click('[data-testid="product-card"]:first-child');
  await page.click('[data-testid="add-to-cart"]');
  
  // Vérification panier
  await page.click('[data-testid="cart-button"]');
  await expect(page.locator('[data-testid="cart-items"]')).toBeVisible();
  
  // Checkout
  await page.click('[data-testid="checkout-button"]');
  await expect(page).toHaveURL(/.*checkout/);
});
```

### Quality Gates
```bash
# Avant chaque commit
npm run pre-commit-checks

# Pipeline CI/CD
npm run ci:full-suite

# Metrics quality
npm run quality:report
```

---

## Troubleshooting

### Problèmes Communs

#### Performance Dégradée
```bash
# 1. Analyse bundle
npm run analyze

# 2. Performance profiling
npm run dev:profile

# 3. Database slow queries
npm run db:slow-queries

# 4. Cache hit rate
npm run cache:stats
```

#### Erreurs de Build
```bash
# 1. Clean install
rm -rf node_modules package-lock.json
npm install

# 2. Type check
npm run type-check

# 3. Lint fix
npm run lint:fix

# 4. Clear Next.js cache
rm -rf .next
npm run build
```

#### Problèmes de Base de Données
```sql
-- 1. Vérifier connexions
SELECT COUNT(*) FROM pg_stat_activity;

-- 2. Requêtes lentes
SELECT query, mean_exec_time 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- 3. Cache hit ratio
SELECT 
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) AS cache_hit_ratio
FROM pg_statio_user_tables;
```

### Debug Tools

#### Development
```typescript
// Console spécialisé par environment
if (process.env.NODE_ENV === 'development') {
  console.log('🔍 Debug info:', { user, data });
}

// Performance measuring
const start = performance.now();
await expensiveOperation();
console.log('⏱️ Operation took:', performance.now() - start, 'ms');

// Error boundary avec détails
export function DevErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      FallbackComponent={({ error, resetErrorBoundary }) => (
        <div className="p-4 border border-red-500 rounded">
          <h2>Erreur de développement</h2>
          <pre className="text-xs">{error.stack}</pre>
          <button onClick={resetErrorBoundary}>Retry</button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
```

#### Production Monitoring
```typescript
// Sentry integration
import { captureException } from '@sentry/nextjs';

export function handleError(error: Error, context: Record<string, any>) {
  if (process.env.NODE_ENV === 'production') {
    captureException(error, { extra: context });
  } else {
    console.error('Error:', error, 'Context:', context);
  }
}

// Performance metrics
export function trackPerformance(name: string, value: number) {
  if (typeof window !== 'undefined' && 'gtag' in window) {
    window.gtag('event', 'timing_complete', {
      name,
      value: Math.round(value)
    });
  }
}
```

### Support & Escalation

#### Niveaux de Support
1. **Documentation** : Ce guide + ADRs + README
2. **Équipe** : Discussion Slack #dev-herbisveritas  
3. **Senior Dev** : Review code + architecture questions
4. **Tech Lead** : Décisions techniques majeures
5. **Emergency** : Incidents production critiques

#### Contacts Urgents
- **Tech Lead** : @tech-lead-slack
- **DevOps** : @devops-team
- **Security** : @security-officer
- **Product** : @product-owner

---

## 🚀 Next Steps

### Pour Nouveaux Développeurs
1. **Semaine 1** : Setup + premier bug fix
2. **Semaine 2** : Première feature simple
3. **Semaine 3** : Code review d'une feature complexe
4. **Semaine 4** : Feature complète en autonomie

### Pour Développeurs Expérimentés
1. **Architecture reviews** : Participer aux décisions techniques
2. **Mentoring** : Aider l'onboarding des nouveaux
3. **Performance** : Optimisations continues
4. **Innovation** : Proposer des améliorations

### Ressources Additionnelles
- [Architecture Decision Records](./ADR/)
- [API Documentation](./API.md)
- [Database Schema](./DATABASE.md)
- [Security Guidelines](./SECURITY.md)
- [Performance Benchmarks](../benchmarks/)

---

**Guide Développeur HerbisVeritas v2.0**  
*Dernière mise à jour : 16 août 2025*  
*Architecture modernisée - Phases 1-3 refactoring*