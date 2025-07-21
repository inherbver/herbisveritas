# Gestion du Panier d'Achat

## 1. Principes Fondamentaux

Le système de panier est unifié et sécurisé, supportant à la fois les utilisateurs authentifiés et les invités avec une approche hybride.

- **Source de Vérité Unique :** La base de données Supabase est la seule source de vérité. Le panier de chaque utilisateur est stocké dans les tables `public.carts` et `public.cart_items`.

- **Double Identification :**
  - **Utilisateurs authentifiés :** Identifiés par `auth.uid()` dans le champ `user_id`
  - **Utilisateurs invités :** Identifiés par un UUID stocké dans un cookie `herbis-cart-id` et référencé dans le champ `guest_id`

- **Gestion Hybride :** Le système combine sessions Supabase pour les utilisateurs authentifiés et cookies pour les invités, offrant une expérience fluide dans les deux cas.

- **Fusion à la Connexion :** Lorsqu'un utilisateur anonyme se connecte, son panier est automatiquement et de manière transactionnelle fusionné avec son panier authentifié (s'il en avait un), garantissant qu'aucun article n'est perdu.

- **État Client (Zustand) :** Un store Zustand (`src/stores/cartStore.ts`) sert de **cache côté client** avec persistence localStorage. Il offre une réactivité immédiate de l'interface mais se synchronise systématiquement avec l'état du serveur après chaque action.

---

## 2. Architecture Détaillée

### 2.1. Logique Côté Serveur (Server Actions)

- **Fichier :** `src/actions/cartActions.ts`
- **Rôle :** Centralise toute la logique métier du panier. C'est le seul point d'entrée pour toute modification.
- **Actions Clés :**
  - `getCart()`: Récupère le panier de l'utilisateur courant (via `getActiveUserId()`).
  - `addItemToCart(prevState, formData)`: Ajoute un article au panier via FormData.
  - `removeItemFromCart(input)`: Retire un article du panier par `cartItemId`.
  - `updateCartItemQuantity(input)`: Met à jour la quantité d'un article.
  - `removeItemFromCartFormAction(prevState, formData)`: Version FormAction de suppression.
  - `updateCartItemQuantityFormAction(prevState, formData)`: Version FormAction de mise à jour.
  - `migrateAndGetCart(input)`: Action cruciale de fusion appelée à la connexion.
  - `clearCartAction(prevState)`: Vide complètement le panier de l'utilisateur.
- **Utilitaires :**
  - `getActiveUserId()`: Fonction helper qui détermine l'ID utilisateur actif (authentifié ou invité).
- **Documentation :** Pour les détails complets, voir la [documentation des actions](./ACTIONS.md).

### 2.2. Logique de Fusion (Base de Données)

- **Fonction RPC :** `public.merge_carts(p_guest_cart_id UUID, p_auth_cart_id UUID)`
- **Rôle :** Fonction PostgreSQL transactionnelle qui fusionne les articles d'un panier invité dans un panier authentifié. Elle gère les conflits (en additionnant les quantités) et supprime le panier source à la fin. Cela garantit l'atomicité et la cohérence des données.

- **Fonction RPC :** `public.add_or_update_cart_item(p_cart_id UUID, p_product_id UUID, p_quantity_to_add INTEGER)`
- **Rôle :** Fonction PostgreSQL qui ajoute un nouvel article au panier ou met à jour la quantité d'un article existant de manière atomique.

### 2.3. Structure de la Base de Données

Les tables `public.carts` et `public.cart_items` sont au cœur du système. Les champs `user_id` et `guest_id` permettent l'identification des paniers authentifiés et invités.

```sql
-- Table des paniers
CREATE TABLE public.carts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, -- NULLABLE pour paniers invités
  guest_id uuid, -- UUID pour identifier les paniers invités via cookie
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  metadata jsonb, -- Champ flexible pour métadonnées
  status text DEFAULT 'active' NOT NULL, -- 'active', 'completed', 'abandoned'
  CONSTRAINT unique_user_cart UNIQUE (user_id),
  CONSTRAINT unique_guest_cart UNIQUE (guest_id)
);

-- Table des articles du panier
CREATE TABLE public.cart_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cart_id uuid REFERENCES public.carts(id) ON DELETE CASCADE NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id), -- UUID, pas TEXT
  quantity integer NOT NULL CHECK (quantity > 0),
  added_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(cart_id, product_id)
);
```

- **Politiques RLS :** Des politiques de sécurité au niveau des lignes (RLS) strictes garantissent qu'un utilisateur ne peut accéder et modifier **que son propre panier** (`user_id = auth.uid()`).

### 2.4. Store Zustand (`src/stores/cartStore.ts`)

Le store client offre :

- **Persistence localStorage** avec gestion des migrations de versions
- **Actions optimistes** pour une UX réactive
- **Gestion d'erreurs** robuste avec logging
- **Sélecteurs mémorisés** pour les calculs de totaux
- **Synchronisation bidirectionnelle** avec le serveur via `_setItems()`

### 2.5. Lecture du Panier (`src/lib/cartReader.ts`)

- **getCart()** : Fonction centralisée qui récupère le panier depuis la base de données
- **Support dual** : Utilisateurs authentifiés (via `user_id`) et invités (via cookie `herbis-cart-id`)
- **Transformation des données** : Conversion des données brutes Supabase vers le format `CartData`
- **Gestion des images** : Construction automatique des URLs d'images depuis le storage Supabase

---

## 3. Flux de Données Clés

### 3.0. Architecture Générale

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   UI Components │◄──►│  Zustand Store   │◄──►│   Server Actions    │
│  (React Forms)  │    │ (Client Cache)   │    │  (cartActions.ts)   │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
                                                            ▲
                                                            │
                                                            ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   localStorage  │    │   cartReader.ts  │    │   Supabase DB       │
│  (Persistence)  │    │ (Data Reading)   │    │ (Source of Truth)   │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
```

### 3.1. Flux d'Ajout au Panier (Unifié)

Le flux est identique pour un invité et un utilisateur authentifié.

1.  **UI :** L'utilisateur clique sur "Ajouter au panier".
2.  **Zustand Store :** L'action `addItem` du store est appelée. Elle met à jour l'UI de manière optimiste.
3.  **Server Action :** Le composant appelle `addItemToCart` avec un `FormData` contenant `productId` et `quantity`.
4.  **Backend (Supabase) :**
    - L'action utilise `getActiveUserId()` pour identifier l'utilisateur (authentifié ou invité).
    - Création automatique d'un panier si nécessaire.
    - Appel RPC `add_or_update_cart_item` pour la logique d'ajout/mise à jour.
    - La politique RLS vérifie que l'opération concerne le bon utilisateur.
5.  **Synchronisation :**
    - `revalidateTag("cart")` invalide le cache Next.js.
    - Appel à `getCart()` pour récupérer l'état mis à jour.
    - Retour du nouvel état complet au client pour synchronisation du store Zustand.

### 3.2. Flux de Connexion et Fusion

Ce flux est orchestré par l'action `loginAction` dans `authActions.ts`.

1.  **Capture de l'ID Invité :** Avant la connexion, l'ID de l'utilisateur invité (`guestUserId`) est récupéré de la session Supabase courante.
2.  **Connexion :** L'utilisateur se connecte avec succès. Supabase établit une nouvelle session authentifiée.
3.  **Appel à la Migration :** `loginAction` appelle `migrateAndGetCart({ guestUserId })`.
4.  **Logique de Migration (Serveur) :**
    - `migrateAndGetCart` récupère les paniers invité et authentifié.
    - **Cas 1 :** Pas de panier authentifié → Transfert de propriété du panier invité.
    - **Cas 2 :** Les deux paniers existent → Appel RPC `merge_carts(p_guest_cart_id, p_auth_cart_id)`.
    - **Cas 3 :** Pas de panier invité → Retour du panier authentifié existant.
5.  **Nettoyage :** L'utilisateur invité anonyme est supprimé via `supabaseAdmin.auth.admin.deleteUser()`.
6.  **Synchronisation Finale :** Le store Zustand client est mis à jour avec l'état final du panier fusionné.

---

## 4. Points d'Implémentation Clés

### 4.1. Sécurité et Identité

- **RLS (Row Level Security) :** Politiques strictes sur `carts` et `cart_items` basées sur `user_id = auth.uid()`
- **Identification Hybride :** `getActiveUserId()` gère l'identification unifiée (utilisateurs authentifiés via `auth.uid()`, invités via cookies)
- **Validation Zod :** Tous les inputs sont validés avec des schémas Zod définis dans `cart.validator.ts`

### 4.2. Performance et Robustesse

- **Cache Next.js :** Utilisation de `revalidateTag("cart")` pour l'invalidation ciblée du cache
- **Opérations Atomiques :** Les fonctions RPC garantissent la cohérence des données
- **Gestion d'erreurs :** Architecture de résultats typés avec `CartActionResult<T>`
- **Logging :** Traçabilité complète des opérations de migration avec IDs uniques

### 4.3. Expérience Utilisateur

- **Mise à jour optimiste :** Le store Zustand met à jour l'UI immédiatement
- **Persistence locale :** Conservation du panier en localStorage avec migrations de versions
- **Synchronisation bidirectionnelle :** Le serveur reste la source de vérité, le client se synchronise
- **Transitions fluides :** La fusion de paniers est transparente pour l'utilisateur

### 4.4. Architecture de Données

- **Types TypeScript :** Définition claire avec `CartData`, `CartItem`, `CartActionResult`
- **Transformation de données :** Conversion automatique entre formats serveur et client
- **Support multi-format :** Actions compatibles FormData et objets typés
- **URLs d'images :** Construction automatique des URLs Supabase Storage
