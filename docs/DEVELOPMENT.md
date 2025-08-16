# Guide de Développement - HerbisVeritas

## Vue d'Ensemble

Ce guide détaille les workflows, conventions et bonnes pratiques pour le développement sur HerbisVeritas. Il s'adresse aux développeurs rejoignant l'équipe et sert de référence pour les standards du projet.

## Table des Matières

- [Configuration Initiale](#configuration-initiale)
- [Workflow de Développement](#workflow-de-développement)
- [Standards de Code](#standards-de-code)
- [Patterns et Conventions](#patterns-et-conventions)
- [Tests](#tests)
- [Debugging](#debugging)
- [Déploiement](#déploiement)
- [Bonnes Pratiques](#bonnes-pratiques)

## Configuration Initiale

### Prérequis

- **Node.js 20+** avec npm
- **Git** configuré avec SSH
- **VSCode** (recommandé) avec extensions TypeScript
- **Compte Supabase** avec accès au projet
- **Compte Stripe** pour tests de paiement

### Setup du Projet

```bash
# 1. Cloner et installer
git clone git@github.com:inherbver/herbisveritas.git
cd herbisveritas
npm install

# 2. Configuration environnement
cp .env.example .env.local
# Remplir les variables d'environnement

# 3. Vérifier le setup
npm run typecheck
npm run lint
npm run test

# 4. Démarrer le serveur
npm run dev
```

### Variables d'Environnement Requises

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

## Workflow de Développement

### Git Flow Simplifié

```mermaid
gitgraph
    commit id: "Initial"
    branch feature/nouvelle-fonctionnalite
    checkout feature/nouvelle-fonctionnalite
    commit id: "feat: ajout composant"
    commit id: "test: tests unitaires"
    commit id: "docs: mise à jour"
    checkout main
    merge feature/nouvelle-fonctionnalite
    commit id: "merge feature"
```

### Processus de Développement

#### 1. Création de Branche

```bash
# Checkout et update main
git checkout main
git pull origin main

# Créer branche feature
git checkout -b feature/nom-fonctionnalite
# ou
git checkout -b fix/nom-bug
```

#### 2. Développement

```bash
# Commits fréquents avec messages conventionnels
git add .
git commit -m "feat(auth): ajout validation email"

# Push réguliers
git push origin feature/nom-fonctionnalite
```

#### 3. Tests et Validation

```bash
# Avant chaque commit
npm run typecheck   # Vérification TypeScript
npm run lint        # ESLint
npm run test        # Tests unitaires
npm run build       # Build de production
```

### Messages de Commit Conventionnels

Format : `type(scope): description`

```bash
# Types autorisés
feat(auth): ajout authentification Google
fix(cart): correction calcul total
docs(api): mise à jour documentation
style(ui): amélioration responsive
refactor(store): simplification logique panier
test(orders): ajout tests intégration
chore(deps): mise à jour dépendances
```

## Standards de Code

### TypeScript

#### Configuration Stricte

```typescript
// tsconfig.json - règles appliquées
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

#### Typage Recommandé

```typescript
// ✅ Bon - Types explicites
interface UserProfile {
  id: string;
  email: string;
  role: 'user' | 'admin' | 'editor';
  preferences: {
    theme: 'light' | 'dark';
    language: 'fr' | 'en' | 'de' | 'es';
  };
}

// ✅ Bon - Utility types
type CreateUserInput = Omit<UserProfile, 'id'>;
type UpdateUserInput = Partial<Pick<UserProfile, 'email' | 'preferences'>>;

// ❌ Éviter - any
function processData(data: any) { ... }

// ✅ Préférer - Generic ou unknown
function processData<T>(data: T): T { ... }
function processData(data: unknown): unknown { ... }
```

### Conventions de Nommage

```typescript
// Composants - PascalCase
export function ProductCard({ product }: ProductCardProps) {}

// Hooks - camelCase avec use prefix
export function useCartItems() {}

// Constants - SCREAMING_SNAKE_CASE
const MAX_CART_ITEMS = 99;
const API_ENDPOINTS = {
  PRODUCTS: '/api/products'
} as const;

// Server Actions - camelCase avec Action suffix
export async function createOrderAction() {}

// Types/Interfaces - PascalCase
interface CartItem {}
type OrderStatus = 'pending' | 'paid';

// Files - kebab-case
// product-card.tsx
// cart-display.tsx
// order-actions.ts
```

## Patterns et Conventions

### Structure des Composants

```typescript
// Template standard pour composants
import { type ComponentProps } from 'react';
import { cn } from '@/lib/utils';

// 1. Types et interfaces
interface ProductCardProps {
  product: Product;
  className?: string;
  onAddToCart?: (productId: string) => void;
}

// 2. Composant principal
export function ProductCard({ 
  product, 
  className,
  onAddToCart
}: ProductCardProps) {
  // 3. Hooks et state
  const [isLoading, setIsLoading] = useState(false);
  
  // 4. Fonctions internes
  const handleAddToCart = async () => {
    setIsLoading(true);
    try {
      await onAddToCart?.(product.id);
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 5. Render
  return (
    <div className={cn("border rounded-lg p-4", className)}>
      <h3>{product.name}</h3>
      <p>{product.price}€</p>
      <button onClick={handleAddToCart} disabled={isLoading}>
        Ajouter au panier
      </button>
    </div>
  );
}

// 6. Exports additionnels si nécessaire
export type { ProductCardProps };
```

### Server Actions Pattern

```typescript
// Pattern standard pour toutes les Server Actions
export async function createProductAction(
  prevState: unknown,
  formData: FormData
): Promise<ActionResult<Product>> {
  try {
    // 1. Validation des entrées
    const validatedFields = ProductSchema.safeParse({
      name: formData.get('name'),
      price: formData.get('price'),
      description: formData.get('description')
    });
    
    if (!validatedFields.success) {
      return createValidationErrorResult(
        validatedFields.error.flatten().fieldErrors
      );
    }
    
    // 2. Authentification/autorisation
    const user = await getAuthenticatedUser();
    await verifyPermission(user.id, 'products:create');
    
    // 3. Logique métier
    const product = await productService.create(validatedFields.data);
    
    // 4. Invalidation cache
    revalidateTag('products');
    
    // 5. Audit logging
    await logEvent('PRODUCT_CREATED', user.id, { 
      productId: product.id 
    });
    
    // 6. Retour succès
    return createSuccessResult(product, "Produit créé avec succès");
    
  } catch (error) {
    console.error('Error creating product:', error);
    return createGeneralErrorResult(
      "Impossible de créer le produit",
      "Une erreur inattendue s'est produite"
    );
  }
}
```

## Tests

### Stratégie de Test

```typescript
// Tests unitaires - composants
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCard } from './product-card';

describe('ProductCard', () => {
  const mockProduct = {
    id: '1',
    name: 'Test Product',
    price: 29.99,
    description: 'Test description'
  };
  
  it('should render product information', () => {
    render(<ProductCard product={mockProduct} />);
    
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('29.99€')).toBeInTheDocument();
  });
  
  it('should call onAddToCart when button clicked', async () => {
    const mockOnAddToCart = jest.fn();
    render(<ProductCard product={mockProduct} onAddToCart={mockOnAddToCart} />);
    
    fireEvent.click(screen.getByText('Ajouter au panier'));
    
    expect(mockOnAddToCart).toHaveBeenCalledWith('1');
  });
});
```

## Debugging

### Outils de Debug

```typescript
// 1. Debug Server Actions
export async function debugAction() {
  console.log('🚀 Action started');
  
  try {
    const result = await someOperation();
    console.log('✅ Operation successful:', result);
    return result;
  } catch (error) {
    console.error('❌ Operation failed:', error);
    throw error;
  }
}

// 2. Debug RLS avec Supabase
const supabase = createClient();
supabase
  .from('products')
  .select('*')
  .then(({ data, error }) => {
    if (error) console.error('RLS Error:', error);
    console.log('RLS Success:', data);
  });
```

## Déploiement

### Pre-deploy Checklist

```bash
# 1. Validation complète
npm run typecheck
npm run lint
npm run test
npm run build

# 2. Test de build local
npm run start

# 3. Vérification variables d'environnement
echo $NEXT_PUBLIC_SUPABASE_URL
echo $STRIPE_SECRET_KEY
```

## Bonnes Pratiques

### Performance

```typescript
// 1. Lazy loading composants lourds
const AdminDashboard = lazy(() => import('@/components/admin/dashboard'));

// 2. Memoization pour calculs coûteux
const expensiveValue = useMemo(() => {
  return heavyCalculation(data);
}, [data]);

// 3. Images optimisées
import Image from 'next/image';

<Image
  src={product.imageUrl}
  alt={product.name}
  width={300}
  height={200}
  placeholder="blur"
/>
```

### Sécurité

```typescript
// 1. Validation côté serveur obligatoire
export async function serverAction(formData: FormData) {
  const validation = schema.safeParse(data);
  if (!validation.success) {
    throw new Error('Invalid input');
  }
}

// 2. ARIA labels obligatoires
<button aria-label="Ajouter au panier">
  <PlusIcon />
</button>
```

## Conclusion

Ce guide de développement établit les standards pour maintenir la qualité et la cohérence du code HerbisVeritas. L'adoption de ces pratiques garantit :

- **Code maintenable** et prévisible
- **Sécurité** et performance optimales  
- **Collaboration** efficace en équipe
- **Déploiements** fiables et sécurisés