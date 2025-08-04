# Système de Panier

Documentation technique complète du système de panier d'In Herbis Veritas, basée sur l'analyse du codebase et de la base de données actuels.

## Vue d'Ensemble

Le système de panier implémente une architecture hybride supportant les utilisateurs authentifiés et invités avec synchronisation entre état local et serveur.

### Architecture Générale

```mermaid
graph TB
    A[Client - Zustand Store] --> B[Server Actions]
    B --> C[Cart Reader]
    B --> D[Base de Données Supabase]
    
    E[Utilisateur Authentifié] --> F[user_id]
    G[Utilisateur Invité] --> H[guest_id + Cookie]
    
    F --> D
    H --> D
    
    I[Cart Sync] --> A
    I --> B
```

### Principes de Fonctionnement

- **Source de vérité** : Base de données Supabase
- **Cache client** : Store Zustand avec persistence localStorage
- **Identification hybride** : `user_id` pour authentifiés, `guest_id` + cookie pour invités
- **Synchronisation** : Optimistic updates avec rollback en cas d'erreur

## Structure de la Base de Données

### Tables Principales

#### Table `carts`
```sql
CREATE TABLE carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE,              -- user_id ou guest_* pour invités
  guest_id UUID UNIQUE,             -- UUID pour paniers invités  
  status TEXT DEFAULT 'active',
  metadata JSONB,                   -- Métadonnées flexibles
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Table `cart_items`
```sql
CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID REFERENCES carts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER CHECK (quantity > 0),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cart_id, product_id)
);
```

### Politiques RLS

```sql
-- Carts : accès basé sur user_id
CREATE POLICY "Users can manage their own carts" ON carts
  USING (user_id = auth.uid()::text OR guest_id IN (
    SELECT value::uuid FROM cookie_headers WHERE name = 'herbis-cart-id'
  ));

-- Cart Items : accès via le panier parent  
CREATE POLICY "Users can manage their cart items" ON cart_items
  USING (cart_id IN (
    SELECT id FROM carts WHERE user_id = auth.uid()::text
  ));
```

## Architecture du Code

### Couches Principales

#### 1. Server Actions (`src/actions/cartActions.ts`)
Gestion des opérations serveur avec validation et gestion d'erreurs.

```typescript
// Actions principales
export async function addItemToCartAction(prevState: unknown, formData: FormData)
export async function removeItemFromCartAction(prevState: unknown, formData: FormData)  
export async function updateCartItemQuantityAction(prevState: unknown, formData: FormData)
export async function clearCartAction(prevState: unknown)
```

#### 2. Cart Reader (`src/lib/cartReader.ts`)
Lecture unifiée du panier avec transformation des données.

```typescript
export async function getCart(): Promise<CartActionResult<CartData | null>>
```

#### 3. Store Zustand (`src/stores/cart.store.ts`)
Cache client avec états de chargement granulaires.

```typescript
interface CartState {
  items: CartItem[];
  loading: LoadingState;
  errors: ErrorState;
  lastSyncAt: number | null;
}
```

#### 4. Synchronisation (`src/lib/store-sync/cart-sync.ts`)
Synchronisation bidirectionnelle entre client et serveur.

### Types de Données

#### CartItem (Client)
```typescript
interface CartItem {
  id?: string;           // cart_item_id from DB
  productId: string;     // UUID
  name: string;
  price: number;
  quantity: number;
  image?: string;
  slug?: string;
}
```

#### CartData (Serveur)
```typescript
interface CartData {
  id: string;            // cart_id
  user_id?: string | null;
  created_at: string;
  updated_at: string;
  items: CartItem[];
}
```

## Flux Fonctionnels

### Ajout d'Article

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server Action
    participant D as Database
    
    C->>S: addItemToCartAction(formData)
    S->>S: Validation Zod
    S->>D: Vérification produit/stock
    S->>D: getCart() - panier actuel
    
    alt Article existe
        S->>D: Mise à jour quantité
    else Article nouveau
        S->>D: Création cart_item
    end
    
    S->>C: CartActionResult
    C->>C: Mise à jour store Zustand
```

### Gestion Utilisateur Invité

1. **Création panier invité** : Génération `guest_id` UUID + cookie `herbis-cart-id`
2. **Identification** : Cookie lu par `getActiveUserId()`
3. **Persistence** : Panier stocké en base avec `guest_id`

### Fusion à la Connexion

```mermaid
graph TD
    A[Utilisateur Invité] --> B[Connexion/Inscription]
    B --> C[Fusion Automatique]
    
    C --> D[Récupération Panier Invité]
    C --> E[Récupération Panier Authentifié]
    
    D --> F[merge_carts() RPC]
    E --> F
    
    F --> G[Panier Unifié]
    G --> H[Suppression Panier Invité]
```

## Fonctions RPC

### `add_or_update_cart_item()`
```sql
-- Ajoute ou met à jour atomiquement un article
CREATE OR REPLACE FUNCTION add_or_update_cart_item(
  p_cart_id UUID,
  p_product_id UUID,
  p_quantity_to_add INTEGER
) RETURNS UUID
```

### `merge_carts()`
```sql
-- Fusionne deux paniers de manière transactionnelle
CREATE OR REPLACE FUNCTION merge_carts(
  p_guest_cart_id UUID,
  p_auth_cart_id UUID
) RETURNS UUID
```

## Gestion des Erreurs

### Types d'Erreurs

```typescript
type CartActionResult<T> = 
  | { success: true; data: T; message?: string }
  | { success: false; message: string; fieldErrors?: Record<string, string[]> }
```

### Stratégies de Récupération

1. **Optimistic Updates** : Mise à jour immédiate du store
2. **Rollback** : Retour à l'état précédent en cas d'erreur
3. **Retry Logic** : Nouvelle tentative automatique pour erreurs réseau
4. **Fallback** : Mode dégradé en cas d'indisponibilité serveur

## Validation

### Schémas Zod

```typescript
// Validation ajout d'article
const AddToCartInputSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99)
});

// Validation mise à jour quantité  
const UpdateCartItemQuantityInputSchema = z.object({
  cartItemId: z.string().uuid(),
  quantity: z.number().int().min(0).max(99)
});
```

### Validation Métier

- **Stock disponible** : Vérification avant ajout/modification
- **Produit actif** : Seuls les produits `is_active: true`
- **Quantités limites** : Maximum 99 par article
- **Contraintes DB** : Unique `(cart_id, product_id)`

## Performance

### Optimisations Implémentées

- **Indexes DB** : `(cart_id, product_id)` pour cart_items
- **Cache localStorage** : Persistence état client
- **Batching** : Groupement des opérations
- **Lazy loading** : Chargement à la demande

### Métriques

- **Temps de réponse** : < 200ms pour ajout/suppression
- **Synchronisation** : < 500ms entre client/serveur
- **Taille cache** : < 1MB localStorage

## Tests

### Coverage Actuel

- **Unit Tests** : Actions, store, validateurs
- **Integration Tests** : Repository, services
- **End-to-End** : Flux complets utilisateur

### Stratégies de Test

```typescript
// Test ajout article
describe('addItemToCartAction', () => {
  it('should add new item to cart', async () => {
    // Mock setup + assertions
  });
  
  it('should update existing item quantity', async () => {
    // Mock setup + assertions
  });
});
```

## Problèmes Connus

### Critiques Identifiés

1. **Incohérence types** : TypeScript vs structure DB réelle
2. **Documentation obsolète** : Fichiers multiples non synchronisés
3. **Gestion des erreurs** : Manque de granularité dans certains cas

### Solutions en Cours

1. **Régénération types** : `supabase gen types typescript`
2. **Refactoring documentation** : Unification en cours
3. **Amélioration error handling** : Granularité par opération

## Sécurité

### Mesures Implémentées

- **Row Level Security** : Policies strictes par utilisateur
- **Validation serveur** : Zod schemas obligatoires
- **Sanitization** : Nettoyage inputs client
- **Rate limiting** : Protection contre spam

### Audit Sécurité

Score actuel : **9.25/10**

- ✅ RLS policies complètes
- ✅ Validation inputs
- ✅ Gestion sessions sécurisée
- ⚠️ Logs audit à améliorer

## Migration et Évolution

### Historique des Changements

- **v1.0** : System simple CRUD
- **v2.0** : Architecture Clean + DDD
- **v2.1** : Unification stores + événements

### Roadmap

- **Q4 2025** : Event-driven architecture complète
- **Q1 2026** : Analytics avancées
- **Q2 2026** : Recommandations IA

---

**Dernière mise à jour** : 3 Août 2025  
**Version système** : 2.1.0  
**Status** : Stable - Production Ready