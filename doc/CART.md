# Gestion du Panier d'Achat

## 1. Principes Fondamentaux

Le système de panier est **hybride** pour offrir une expérience fluide aux invités et aux utilisateurs authentifiés.

- **Utilisateurs Authentifiés :** Leur panier est persisté en base de données dans les tables `public.carts` et `public.cart_items`. C'est la source de vérité.
- **Utilisateurs Invités (Anonymes) :** Leur panier est géré via une session anonyme créée par Supabase Auth. Les données sont également stockées en base de données, liées à cet `user_id` anonyme.
- **Synchronisation :** Lors de la connexion, le panier de la session anonyme est automatiquement conservé et associé au nouvel `user_id` authentifié. Il n'y a pas de fusion complexe car le panier est déjà en base de données.
- **État Client :** Un store **Zustand** (`src/stores/cartStore.ts`) sert de cache côté client pour une réactivité immédiate de l'interface. Il est synchronisé avec le backend via des **Server Actions**.

---

## 2. Architecture Détaillée

### 2.1. État Côté Client (Zustand)

- **Fichier :** `src/stores/cartStore.ts`
- **Rôle :** Gérer l'état local du panier (articles, quantités, état de chargement) et déclencher les appels aux Server Actions.
- **Actions Clés :** `addItem`, `removeItem`, `updateItemQuantity`, `clearCart`. Ces actions modifient l'état local et appellent leurs homologues côté serveur pour la persistance.

### 2.2. Logique Côté Serveur (Server Actions)

- **Fichier :** `src/actions/cartActions.ts`
- **Rôle :** Gérer toute la logique métier et les interactions avec la base de données.
- **Actions Clés :**
  - `getCart()`: Récupère le panier complet de l'utilisateur (invité ou authentifié).
  - `addItemToCart()`: Ajoute ou met à jour un article.
  - `removeItemFromCart()`: Supprime un article.
  - `updateCartItemQuantity()`: Modifie la quantité d'un article.
- **Documentation :** Pour une description complète de chaque action, voir la [documentation des actions du panier](./ACTIONS.md#3-actions-du-panier-srcactionscartactionsts).

### 2.3. Structure de la Base de Données

Les tables `public.carts` et `public.cart_items` sont au cœur du système.

```sql
-- Table des paniers
CREATE TABLE public.carts (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  -- ... timestamps
);

-- Table des articles du panier
CREATE TABLE public.cart_items (
  id uuid PRIMARY KEY, -- cart_item_id
  cart_id uuid REFERENCES carts(id) ON DELETE CASCADE NOT NULL,
  product_id TEXT NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  -- ... timestamps
  UNIQUE(cart_id, product_id)
);
```

- **Documentation :** Pour le schéma complet, les triggers et les politiques RLS, consultez le [guide de la base de données](./DATABASE.md#table-publiccarts).

---

## 3. Flux de Données Typiques

**Scénario : Un utilisateur (invité ou authentifié) ajoute un article.**

1.  **UI :** L'utilisateur clique sur "Ajouter au panier".
2.  **Zustand Store :** L'action `addItem` du store est appelée. Elle peut optionnellement mettre à jour l'UI de manière optimiste.
3.  **Server Action :** L'action `addItemToCart` est appelée avec les détails du produit.
4.  **Backend (Supabase) :**
    - L'action vérifie l'UID de l'utilisateur (invité ou non).
    - Elle exécute une fonction RPC (`add_or_update_cart_item`) qui insère ou met à jour l'article dans `public.cart_items`.
    - Les politiques RLS s'assurent que l'utilisateur ne modifie que son propre panier.
5.  **Retour & Synchronisation :** La Server Action retourne le nouvel état du panier.
6.  **Zustand Store :** Le store est mis à jour avec les données du serveur, qui devient la nouvelle source de vérité pour l'UI.

---

## 4. Points d'Implémentation Clés

- **Gestion des ID :** Il est crucial de distinguer `productId` (l'identifiant du produit dans le catalogue) de `cart_item_id` (l'identifiant de la ligne dans la table `cart_items`). Le premier est utilisé pour l'ajout, le second pour la mise à jour et la suppression.

- **Transformation des Données :** Les données de la base de données (`ServerCartItem` avec des objets `products` imbriqués) sont transformées en une structure plate (`CartItem`) plus facile à consommer pour le client.

- **Gestion des Sessions :** L'utilisation de `supabase.auth.getUser()` et des sessions anonymes de Supabase simplifie grandement la gestion des invités. Le [flux d'authentification](./AUTHFLOW.md) garantit une transition transparente.

- **Mises à Jour Pessimistes :** L'approche actuelle est majoritairement pessimiste : l'UI attend la confirmation du serveur avant de consolider un changement, garantissant la cohérence des données.

---

## 5. Tests

- **Tests Manuels :** La page `src/app/test-cart-actions/page.tsx` permet de tester rapidement les Server Actions.
- **Tests Automatisés :** Des tests unitaires (Vitest) pour les fonctions utilitaires et des tests d'intégration (Playwright/Cypress) pour les flux complets sont recommandés pour assurer la robustesse du système.
