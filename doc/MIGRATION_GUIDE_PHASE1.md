# Guide de Migration - Phase 1 : Refactoring Architectural

Ce guide détaille la migration de l'architecture existante vers le nouveau système avec Result Pattern, validation en couches et découplage store/actions.

## 🎯 Vue d'ensemble des changements

### Avant (Architecture actuelle)

```typescript
// Couplage fort entre store et actions
const useCartStore = create((set, get) => ({
  addItem: async (item) => {
    await addToCartAction(item.productId, item.quantity); // Couplage direct
    await syncCart(); // Synchronisation manuelle
  }
}));

// Gestion d'erreurs inconsistante
export async function addToCartAction(productId: string, quantity: number) {
  try {
    // Logique métier mélangée
    const result = await supabase.from('cart_items').insert({...});
    if (result.error) throw result.error;
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error.message }; // Format inconsistant
  }
}
```

### Après (Architecture refactorisée)

```typescript
// Store découplé - gestion d'état pure
const useCartStore = create((set, get) => ({
  items: [],
  loading: { add: false, remove: false, ... },
  errors: { add: null, remove: null, ... },

  setItems: (items) => set({ items }),
  addItemOptimistic: (item) => {
    // Mise à jour optimiste immédiate
  }
}));

// Actions avec Result Pattern
export async function addItemToCart(formData: FormData): Promise<ActionResult<CartData>> {
  return ActionResult.fromAsync(async () => {
    // Validation en couches
    const validationResult = await CartValidationCoordinator.validateAddToCart(...);
    if (validationResult.isError()) throw validationResult.getError();

    // Logique métier pure
    const result = await cartService.addItem(validationResult.getValue());
    return result;
  }).then(result => result.match(
    data => ({ success: true, data, message: 'Succès' }),
    error => ({ success: false, error: formatError(error) })
  ));
}

// Synchronisation gérée par le système de sync
const { addItem } = useCartOperations(); // Hook qui gère optimisme + sync
```

## 📋 Plan de migration par étapes

### Étape 1 : Mise en place des fondations

#### 1.1 Installer les nouveaux systèmes

```bash
# Aucune installation nécessaire - tout est en TypeScript pur
```

#### 1.2 Ajouter les nouveaux fichiers

```
src/lib/core/
├── result.ts                 # ✅ Créé
├── errors.ts                 # ✅ Créé
└── logger.ts                 # ✅ Créé

src/lib/validators/
├── api/cart-api.validator.ts       # ✅ Créé
├── domain/cart-domain.validator.ts # ✅ Créé
└── cart-validation-coordinator.ts  # ✅ Créé

src/stores/
└── cart-store-refactored.ts   # ✅ Créé

src/lib/store-sync/
└── cart-sync.ts              # ✅ Créé

src/actions/
└── cart-actions-refactored.ts # ✅ Créé
```

### Étape 2 : Migration progressive des composants

#### 2.1 Identifier les composants utilisant le cart

```bash
# Rechercher les usages du store actuel
grep -r "useCartStore" src/components/
grep -r "cartActions" src/components/
```

#### 2.2 Migrer composant par composant

**Ancien code :**

```typescript
// components/cart/add-to-cart-old.tsx
import useCartStore from '@/stores/cartStore';
import { addItemToCart } from '@/actions/cartActions';

export function AddToCartOld({ product }) {
  const { items, addItem, isLoading } = useCartStore();

  const handleAdd = async () => {
    const result = await addItemToCart(prevState, formData);
    if (result.success) {
      addItem(product); // Store et action séparés
    }
  };

  return (
    <button onClick={handleAdd} disabled={isLoading}>
      {isLoading ? 'Ajout...' : 'Ajouter'}
    </button>
  );
}
```

**Nouveau code :**

```typescript
// components/cart/add-to-cart-new.tsx
import { useCartLoading, useCartErrors } from '@/stores/cart-store-refactored';
import { useCartOperations } from '@/lib/store-sync/cart-sync';

export function AddToCartNew({ product }) {
  const loading = useCartLoading();
  const errors = useCartErrors();
  const { addItem } = useCartOperations(); // Système unifié

  const handleAdd = async () => {
    await addItem(product.id, 1, {
      name: product.name,
      price: product.price,
      image: product.image,
      slug: product.slug,
    });
  };

  return (
    <div>
      <button onClick={handleAdd} disabled={loading.add}>
        {loading.add ? 'Ajout...' : 'Ajouter'}
      </button>
      {errors.add && <div className="error">{errors.add}</div>}
    </div>
  );
}
```

### Étape 3 : Mise à jour des imports

#### 3.1 Remplacement des imports existants

```typescript
// AVANT
import useCartStore from "@/stores/cartStore";
import { addItemToCart, removeItemFromCart } from "@/actions/cartActions";

// APRÈS
import { useCartItems, useCartLoading, useCartErrors } from "@/stores/cart-store-refactored";
import { useCartOperations } from "@/lib/store-sync/cart-sync";
```

#### 3.2 Migration des hooks personnalisés

```typescript
// AVANT
const useCart = () => {
  const store = useCartStore();
  return {
    items: store.items,
    addToCart: store.addItem,
    removeFromCart: store.removeItem,
    // ...
  };
};

// APRÈS
const useCart = () => {
  const items = useCartItems();
  const operations = useCartOperations();
  const loading = useCartLoading();
  const errors = useCartErrors();

  return {
    items,
    ...operations,
    loading,
    errors,
  };
};
```

### Étape 4 : Tests et validation

#### 4.1 Exécuter les tests

```bash
npm test src/lib/core/__tests__/result.test.ts
npm test src/lib/validators/__tests__/cart-validation.test.ts
npm test src/actions/__tests__/cart-actions-refactored.test.ts
```

#### 4.2 Tests d'intégration manuels

1. **Test d'ajout au panier :**
   - Vérifier la mise à jour optimiste
   - Vérifier la synchronisation serveur
   - Tester les cas d'erreur

2. **Test de suppression d'article :**
   - Vérifier la suppression immédiate
   - Tester le rollback en cas d'erreur

3. **Test de mise à jour de quantité :**
   - Vérifier les updates en temps réel
   - Tester les limites de stock

## 🔄 Points de cohabitation

Pendant la migration, les deux systèmes peuvent coexister :

### Routage conditionnel

```typescript
// components/cart/cart-wrapper.tsx
import { useFeatureFlag } from '@/lib/feature-flags';

export function CartWrapper({ children }) {
  const useNewCartSystem = useFeatureFlag('new-cart-system');

  if (useNewCartSystem) {
    return <NewCartProvider>{children}</NewCartProvider>;
  }

  return <OldCartProvider>{children}</OldCartProvider>;
}
```

### Migration par feature flag

```typescript
// lib/feature-flags.ts
export const FEATURE_FLAGS = {
  "new-cart-system": process.env.ENABLE_NEW_CART === "true",
  "new-cart-validation": process.env.ENABLE_NEW_VALIDATION === "true",
} as const;
```

## ⚠️ Points d'attention

### 1. Types et interfaces

```typescript
// Assurer la compatibilité des types
interface CartItem {
  id: string;
  productId: string; // Ancien: product_id
  name: string;
  price: number;
  quantity: number;
  // Nouveaux champs optionnels
  image?: string;
  slug?: string;
}
```

### 2. Gestion des erreurs

```typescript
// Ancien format d'erreur
{ success: false, error: "Message d'erreur" }

// Nouveau format (compatible)
{ success: false, error: "Message d'erreur formaté pour l'utilisateur" }
```

### 3. Estados de loading

```typescript
// Ancien : loading global
{ isLoading: true }

// Nouveau : loading granulaire
{
  loading: {
    add: true,
    remove: false,
    update: false,
    clear: false,
    sync: false
  }
}
```

## 🧪 Validation de la migration

### Checklist de validation

- [ ] Tous les composants utilisent les nouveaux hooks
- [ ] Aucune référence directe à l'ancien store
- [ ] Les tests passent pour les nouveaux systèmes
- [ ] Les erreurs sont correctement gérées et affichées
- [ ] Les états de loading sont appropriés
- [ ] La synchronisation fonctionne correctement
- [ ] Les mises à jour optimistes fonctionnent
- [ ] Le rollback en cas d'erreur fonctionne

### Métriques de succès

- **Performance** : Temps de réponse < 200ms pour les updates optimistes
- **Fiabilité** : 0 erreur non gérée dans les logs
- **UX** : Feedback immédiat pour toutes les actions utilisateur
- **Robustesse** : Gestion correcte des cas d'erreur réseau

## 🚀 Après la migration

### Nettoyage du code legacy

```bash
# Supprimer les anciens fichiers (après validation complète)
rm src/stores/cartStore.ts
rm src/actions/cartActions.ts
rm src/lib/cart-helpers.ts
```

### Optimisations possibles

1. **Preload** : Précharger les données produit pour la validation
2. **Batch operations** : Grouper les opérations pour les mises à jour multiples
3. **Offline support** : Supporter les opérations hors ligne avec sync différée
4. **Performance monitoring** : Ajouter des métriques de performance

## 📚 Ressources additionnelles

### Documentation

- [Result Pattern](./src/lib/core/result.ts) - Documentation inline
- [Validation en couches](./src/lib/validators/) - Exemples d'usage
- [Store sync](./src/lib/store-sync/cart-sync.ts) - Guide d'utilisation

### Exemples d'implémentation

- [Composant exemple complet](./src/components/cart/cart-example-refactored.tsx)
- [Tests d'intégration](./src/actions/__tests__/cart-actions-refactored.test.ts)

Cette migration pose les bases d'une architecture plus robuste, testable et maintenable. La Phase 2 se concentrera sur l'extraction des services métier et l'implémentation du pattern Repository.
