# Gestion du Panier d'Achat

## 1. Principes Fondamentaux

Le système de panier est entièrement unifié et sécurisé grâce à l'utilisation des **sessions Supabase**, y compris les **sessions anonymes** pour les utilisateurs invités.

- **Source de Vérité Unique :** La base de données Supabase est la seule source de vérité. Le panier de chaque utilisateur, qu'il soit invité ou authentifié, est stocké dans les tables `public.carts` et `public.cart_items`.

- **Identification par `auth.uid()` :** Chaque visiteur du site se voit attribuer une session Supabase (anonyme ou authentifiée) et donc un identifiant unique (`auth.uid()`). Le panier est systématiquement lié à cet identifiant, ce qui simplifie la logique et la sécurité.

- **Pas de Stockage Local d'ID :** Le système n'a pas besoin de stocker un `cartId` dans le `localStorage`. L'identifiant de l'utilisateur (`auth.uid()`) suffit à récupérer son panier à tout moment.

- **Fusion à la Connexion :** Lorsqu'un utilisateur anonyme se connecte, son panier est automatiquement et de manière transactionnelle fusionné avec son panier authentifié (s'il en avait un), garantissant qu'aucun article n'est perdu.

- **État Client (Zustand) :** Un store Zustand (`src/stores/cartStore.ts`) sert de **cache côté client**. Il offre une réactivité immédiate de l'interface mais se synchronise systématiquement avec l'état du serveur après chaque action.

---

## 2. Architecture Détaillée

### 2.1. Logique Côté Serveur (Server Actions)

- **Fichier :** `src/actions/cartActions.ts`
- **Rôle :** Centralise toute la logique métier du panier. C'est le seul point d'entrée pour toute modification.
- **Actions Clés :**
  - `getCart()`: Récupère le panier de l'utilisateur courant (`auth.uid()`).
  - `addItemToCart()`: Ajoute un article au panier.
  - `removeItemFromCart()`: Retire un article du panier.
  - `updateCartItemQuantity()`: Met à jour la quantité d'un article.
  - `migrateAndGetCart(anonymousUserId)`: Action interne cruciale, appelée à la connexion, qui orchestre la fusion des paniers.
- **Documentation :** Pour les détails complets, voir la [documentation des actions](./ACTIONS.md).

### 2.2. Logique de Fusion (Base de Données)

- **Fonction RPC :** `public.merge_carts(source_cart_id, destination_cart_id)`
- **Rôle :** Fonction PostgreSQL transactionnelle qui fusionne les articles d'un panier source (anonyme) dans un panier de destination (authentifié). Elle gère les conflits (en additionnant les quantités) et supprime le panier source à la fin. Cela garantit l'atomicité et la cohérence des données.

### 2.3. Structure de la Base de Données

Les tables `public.carts` et `public.cart_items` sont au cœur du système. Le champ `user_id` est la clé de voûte de la sécurité.

```sql
-- Table des paniers
CREATE TABLE public.carts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  -- user_id est toujours lié à un utilisateur (anonyme ou authentifié)
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table des articles du panier
CREATE TABLE public.cart_items (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  cart_id uuid REFERENCES public.carts(id) ON DELETE CASCADE NOT NULL,
  product_id TEXT NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  ...
  UNIQUE(cart_id, product_id)
);
```

- **Politiques RLS :** Des politiques de sécurité au niveau des lignes (RLS) strictes garantissent qu'un utilisateur ne peut accéder et modifier **que son propre panier** (`user_id = auth.uid()`).

---

## 3. Flux de Données Clés

### 3.1. Flux d'Ajout au Panier (Unifié)

Le flux est identique pour un invité et un utilisateur authentifié.

1.  **UI :** L'utilisateur clique sur "Ajouter au panier".
2.  **Zustand Store :** L'action `addItem` du store est appelée. Elle met à jour l'UI de manière optimiste.
3.  **Server Action :** Le store appelle `addItemToCart` avec les détails du produit.
4.  **Backend (Supabase) :**
    - L'action s'exécute sous l'identité de l'utilisateur (`auth.uid()`).
    - La politique RLS sur `carts` et `cart_items` vérifie que l'opération ne concerne que le panier de cet utilisateur.
    - L'article est ajouté ou mis à jour en base de données.
5.  **Retour & Synchronisation :** La Server Action retourne le nouvel état complet du panier, qui met à jour et synchronise le store Zustand.

### 3.2. Flux de Connexion et Fusion

Ce flux est orchestré par l'action `loginAction`.

1.  **Capture de l'ID Anonyme :** Juste avant de procéder à la connexion, l'ID de l'utilisateur anonyme (`anonymous_user_id`) est récupéré de la session en cours.
2.  **Connexion :** L'utilisateur se connecte avec succès. Supabase établit une nouvelle session authentifiée.
3.  **Appel à la Migration :** `loginAction` appelle immédiatement `migrateAndGetCart(anonymous_user_id)`.
4.  **Logique de Migration (Serveur) :**
    a. `migrateAndGetCart` récupère le panier de l'utilisateur nouvellement authentifié et celui de l'ancien `anonymous_user_id`.
    b. Elle appelle la fonction RPC `merge_carts` en base de données, qui transfère de manière transactionnelle les articles du panier anonyme vers le panier de l'utilisateur.
    c. Le panier anonyme est supprimé.
5.  **Synchronisation Finale :** `loginAction` reçoit le panier final fusionné et le transmet au client. Le store Zustand est mis à jour, reflétant l'état correct du panier de l'utilisateur connecté.

---

## 4. Points d'Implémentation Clés

- **Sécurité RLS :** La sécurité repose entièrement sur les politiques RLS et le principe que `auth.uid()` est la seule source de vérité pour l'identité.
- **Atomicité :** La fonction `merge_carts` garantit que la fusion est une opération atomique, prévenant toute perte de données ou état incohérent.
- **Simplicité :** Cette architecture est plus simple et plus robuste que la gestion manuelle d'ID d'invités, car elle s'appuie directement sur les fonctionnalités natives de Supabase.
