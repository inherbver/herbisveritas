# Implémentation du Panier d'Achat HerbisVeritas

## Vue d'ensemble

Le système de panier d'achat HerbisVeritas combine des **Server Actions** Next.js pour la logique métier principale (communication avec la base de données) et un store d'état côté client **Zustand** (`src/stores/cartStore.ts`) pour une expérience utilisateur réactive et la gestion locale de l'état du panier. Supabase sert de backend pour la persistance des données et l'authentification (y compris pour les utilisateurs invités).

## Architecture

### 1. État Côté Client (Zustand - `src/stores/cartStore.ts`)

- **Rôle :** Gère l'état local du panier (liste des articles, quantités), fournit des actions pour manipuler cet état localement, et interagit avec les Server Actions pour la synchronisation avec le backend.
- **Types Clés (dans `src/types/cart.ts`) :**
  - `CartItem`: Représente un article dans le panier côté client.
    - `id?: string`: L'identifiant unique de l'article dans la table `cart_items` de la base de données (UUID). Optionnel car un article ajouté localement n'a pas d'ID BDD avant synchronisation.
    - `productId: string`: L'identifiant du produit (ex: SKU ou ID de la table `products`).
    - `name: string`, `price: number`, `image?: string`, `slug?: string`: Autres détails du produit.
    - `quantity: number`.
  - `CartState`: Définit la structure de l'état du store Zustand (items, isLoading, error).
  - `CartActions`: Interface pour les actions du store (`addItem`, `removeItem`, `updateItemQuantity`, `clearCart`, `_setItems`, `_setIsLoading`, `_setError`).
- **Actions Principales du Store :**
  - `addItem(itemDetails: { productId: string; name: string; price: number; image?: string; slug?: string }, quantityToAdd: number = 1)`: Ajoute un article au store local. Si l'article (basé sur `productId`) existe déjà, sa quantité est mise à jour.
  - `removeItem(cartItemId: string)`: Supprime un article du store local en utilisant son `cart_item_id` (le `id` de `CartItem`).
  - `updateItemQuantity(cartItemId: string, newQuantity: number)`: Met à jour la quantité d'un article dans le store local via son `cart_item_id`. Si `newQuantity <= 0`, l'article est supprimé.
  - `clearCart()`: Vide le panier localement.
  - `_setItems(items: CartItem[])`, `_setIsLoading(loading: boolean)`, `_setError(error: string | null)`: Actions "internes" pour mettre à jour l'état, typiquement après un appel à une Server Action.

### 2. Actions Côté Serveur (`src/actions/cartActions.ts`)

- **Rôle :** Gèrent toute la logique métier nécessitant une interaction avec la base de données Supabase (création/récupération de panier, ajout/modification/suppression d'articles en BDD).
- **Types Clés (dans `src/types/cart.ts` et `src/actions/cartActions.ts`) :**
  - `ServerCartItem`: Représente un article tel que stocké/retourné par le serveur.
    - `id: string`: Le `cart_item_id` (UUID).
    - `product_id: string`.
    - `quantity: number`.
    - `products: ProductDetails | null`: Détails du produit joints. `ProductDetails` contient `id`, `name`, `price`, `image_url`, etc.
  - `CartData`: Représente l'ensemble du panier tel que retourné par les Server Actions (ex: `getCart`) et utilisé côté client. Il inclut `id` du panier, `user_id`, et surtout `items: CartItem[]` (articles du panier déjà transformés pour le client).
  - `CartActionResult<T>`: Type de retour standard pour les Server Actions, indiquant succès/échec, message, et données (`T` étant typiquement `CartData | null` ou des erreurs de validation).
- **Actions Serveur Principales :**
  - `getCart(): Promise<CartActionResult<CartData | null>>`: Récupère le panier de l'utilisateur actif. Crée un panier (et gère la session anonyme si besoin) si aucun n'existe. Les données brutes du serveur (avec une structure `cart_items` contenant des `ServerCartItem`-like) sont transformées : chaque `ServerCartItem` (avec ses `products` imbriqués) est converti en `CartItem` (structure client aplatie), et le résultat est stocké dans la propriété `items` de l'objet `CartData` retourné.
  - `addItemToCart(formData: FormData): Promise<CartActionResult<CartData | null>>`: Ajoute un produit au panier en BDD ou met à jour sa quantité. Utilise la fonction RPC `add_or_update_cart_item`. Valide les entrées avec Zod.
  - `removeItemFromCart(formData: FormData): Promise<CartActionResult<CartData | null>>`: Supprime un article du panier en BDD. Valide les entrées.
  - `updateCartItemQuantity(formData: FormData): Promise<CartActionResult<CartData | null>>`: Met à jour la quantité d'un article en BDD. Valide les entrées.
- **Gestion des Utilisateurs :**
  - Utilise `getActiveUserId()` pour obtenir l'UID de l'utilisateur (authentifié ou anonyme Supabase).
  - La table `carts` a une colonne `user_id` pour l'UID.
- **Validation :** Schémas Zod (`src/lib/schemas/cartSchemas.ts`) pour valider les entrées des Server Actions.

### 3. Interaction Client-Serveur

- Les composants React (ex: `CartDisplay`, `ProductCard`, `ProductDetailDisplay`) interagissent principalement avec le store Zustand.
- Le store Zustand, ou les composants directement (surtout pour les actions initiées par des formulaires comme dans `ProductDetailDisplay`), appellent les Server Actions.
- Après une Server Action réussie, l'état du store Zustand est mis à jour (`_setItems`, `_setIsLoading`, `_setError`) avec les données fraîches du serveur pour refléter les changements dans l'interface utilisateur.
- `revalidateTag('cart')` est utilisé après les mutations serveur pour invalider le cache Next.js.

## Points Clés et Complexités

1.  **Double Gestion d'ID (`productId` vs `cart_item_id`) :**

    - `productId`: Identifie le produit de manière unique dans le catalogue. Utilisé pour vérifier si un _type_ de produit est déjà dans le panier lors de l'ajout.
    - `cart_item_id` (stocké comme `id` dans `CartItem` du store Zustand et `ServerCartItem`): Identifiant unique (UUID) de la _ligne_ spécifique dans la table `cart_items` de la BDD. **Crucial pour les opérations de mise à jour et de suppression d'un article spécifique du panier.**
    - **Complexité :** S'assurer que les composants et le store utilisent le bon identifiant pour la bonne opération. Les actions du store `removeItem` et `updateItemQuantity` opèrent sur `cart_item_id`. L'action `addItem` opère initialement sur `productId` pour la logique d'existence, mais l'objet `CartItem` résultant (s'il provient du serveur) aura un `cart_item_id`.

2.  **Synchronisation État Client (Zustand) et Serveur (Supabase) :**

    - Le store Zustand offre une réactivité immédiate. Les Server Actions assurent la persistance.
    - **Complexité :** Maintenir la cohérence. Après chaque Server Action modifiant le panier, `getCart` est typiquement rappelé (ou ses données sont retournées directement) pour mettre à jour l'état Zustand avec les données serveur les plus récentes. Cela évite les désynchronisations. La gestion des états de chargement et d'erreur pendant ces synchronisations est importante.

3.  **Gestion Optimiste vs. Pessimiste des Mises à Jour :**

    - Actuellement, l'approche semble plutôt pessimiste : l'UI attend le retour de la Server Action avant de refléter pleinement le changement (bien que le store Zustand puisse être mis à jour immédiatement pour certaines actions simples, la "vérité" vient du serveur).
    - **Complexité (potentielle) :** Implémenter des mises à jour optimistes (mettre à jour l'UI immédiatement, puis annuler si l'action serveur échoue) ajouterait de la complexité mais améliorerait la sensation de réactivité. Ce n'est pas explicitement l'approche actuelle mais un point à considérer.

4.  **Transformation des Données entre Client et Serveur :**

    - La transformation principale a lieu dans `getCart` : les `ServerCartItem` (avec des détails de produit imbriqués dans `products`) récupérés de la base de données sont convertis en une liste de `CartItem` (structure client plate avec `name`, `price`, `image` au premier niveau). Cette liste est ensuite assignée à la propriété `items` de l'objet `CartData`.
    - La fonction utilitaire `transformServerCartToClientItems` (dans `src/lib/cart-helpers.ts`) effectue une transformation similaire et peut être utilisée si l'on dispose d'un tableau brut de `ServerCartItem[]` à convertir.
    - Exemple de détail de transformation : `ServerCartItem.products.image_url` devient `CartItem.image`.
    - Les prix peuvent nécessiter un parsing (ex: si stockés comme chaînes formatées en BDD, bien qu'actuellement des nombres soient attendus).
    - **Complexité :** Assurer des transformations de types robustes et une gestion des cas où les données (par exemple, un produit lié supprimé) ne sont pas dans le format attendu.

5.  **Gestion des Utilisateurs Anonymes et Authentifiés :**

    - La logique `getActiveUserId` et la création transparente de sessions anonymes par Supabase simplifient cela, mais il faut s'assurer que les politiques RLS sont correctement appliquées pour les deux types d'utilisateurs.
    - **Complexité :** Moins une complexité de code qu'une complexité de configuration et de test pour s'assurer que la sécurité et l'isolation des données sont maintenues.

6.  **Flux d'Actions avec `useActionState` (pour les formulaires) :**
    - Dans `ProductDetailDisplay`, `useActionState` est utilisé pour gérer l'état de la Server Action `addItemToCart` initiée par un formulaire.
    - **Complexité :** Comprendre le cycle de vie de `useActionState`, gérer l'état initial, les états `pending`, et les résultats (succès/erreur) pour mettre à jour l'UI (via `toast`) et le store Zustand.

## Schéma de la Base de Données (Résumé Pertinent)

```sql
-- Table des paniers
CREATE TABLE public.carts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table des articles du panier
CREATE TABLE public.cart_items (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY, -- cart_item_id
  cart_id uuid REFERENCES carts(id) ON DELETE CASCADE NOT NULL,
  product_id TEXT NOT NULL, -- Référence à l'ID du produit (pas une FK directe pour flexibilité)
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(cart_id, product_id) -- Assure qu'un produit n'apparaît qu'une fois par panier; la quantité est gérée.
);
```

(Note: La contrainte `UNIQUE(cart_id, product_id)` et la référence `REFERENCES products(id)` dans `cart_items` peuvent varier selon l'implémentation exacte en BDD. La description ci-dessus reflète une approche commune.)

## Tests

- La page `src/app/test-cart-actions/page.tsx` peut être utilisée pour des tests manuels des Server Actions.
- Des tests unitaires (Vitest/Jest) pour les fonctions utilitaires, la logique de transformation, et potentiellement les actions du store Zustand.
- Des tests d'intégration (Playwright/Cypress) pour les flux utilisateurs complets sont cruciaux.
