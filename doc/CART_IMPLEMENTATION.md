# Implémentation du Panier d'Achat

## Vue d'ensemble

Le système de panier d'achat repose principalement sur des **Server Actions** Next.js pour la logique métier principale (ajout, modification, suppression d'articles). Supabase est utilisé comme backend pour la persistance des données et l'authentification, y compris pour les utilisateurs invités (anonymes). Une gestion d'état côté client (par exemple, avec Zustand) peut être utilisée pour optimiser l'expérience utilisateur et refléter les changements de manière réactive.

## Architecture Côté Serveur

### Actions Serveur (`src/actions/cartActions.ts`)

Les fonctionnalités principales du panier sont implémentées en tant que Server Actions, assurant que la logique métier s'exécute côté serveur.

- **`getCart(): Promise<CartActionResult<CartData | null>>`**: Récupère le panier de l'utilisateur actif (authentifié ou invité). Crée un panier (et une session anonyme si nécessaire pour un invité) si aucun n'existe.
- **`addItemToCart(input: AddToCartInput): Promise<CartActionResult<CartData | null>>`**: Ajoute un produit au panier ou met à jour sa quantité. Utilise la fonction RPC `add_or_update_cart_item`.
- **`removeItemFromCart(input: RemoveFromCartInput): Promise<CartActionResult<CartData | null>>`**: Supprime un article spécifique du panier. Utilise également la fonction RPC `add_or_update_cart_item` (en passant une quantité qui mènera à la suppression).
- **`updateCartItemQuantity(input: UpdateCartItemQuantityInput): Promise<CartActionResult<CartData | null>>`**: Met à jour la quantité d'un article spécifique dans le panier. Utilise la fonction RPC `add_or_update_cart_item`.

Chaque action retourne un objet `CartActionResult` indiquant le succès/échec, des messages, et les données du panier mises à jour ou les erreurs de validation.

### Gestion des Utilisateurs

- **Utilisateurs Authentifiés**: Identifiés par leur `auth.uid()` standard.
- **Utilisateurs Invités (Anonymes)**:
  - Une session anonyme Supabase est créée si nécessaire (par exemple, lors du premier appel à `getCart` ou `addItemToCart` par un utilisateur non identifié).
  - Ces utilisateurs anonymes ont également un `auth.uid()` unique.
  - La fonction `getActiveUserId()` (dans `src/actions/cartActions.ts`) gère la récupération de l'UID de l'utilisateur actif, qu'il soit pleinement authentifié ou anonyme.
- La table `carts` utilise une seule colonne `user_id` qui stocke l'`auth.uid()` pour les deux types d'utilisateurs.

### Validation des Données

- La validation des entrées des Server Actions est effectuée à l'aide de schémas Zod (définis dans `src/lib/schemas/cartSchemas.ts`).
- Cela inclut la validation des `productId` (TEXT) et `cartItemId` (UUID).

### Types de Données Principaux (TypeScript)

Ces types sont définis dans `src/actions/cartActions.ts`:

\`\`\`typescript
export interface Product {
id: string; // Identifiant du produit (format spécifique au produit, ex: 'prod_abc123')
name: string;
price: number;
image_url?: string;
slug: string;
}

export interface CartItem {
id: string; // Identifiant de l'item dans le panier (cart_item_id, UUID)
product_id: string; // Référence à Product.id (TEXT)
quantity: number;
product: Product; // Détails du produit associés (populés côté client ou serveur si nécessaire)
}

export interface CartData {
id: string; // Identifiant du panier (cart_id, UUID)
user_id: string | null; // auth.uid() de l'utilisateur (authentifié ou anonyme)
created_at: string;
updated_at: string;
cart_items: CartItem[]; // Liste des articles dans le panier
}

// Résultat standard retourné par les actions du panier
export interface CartActionResult<T> {
success: boolean;
message?: string;
error?: string; // Erreur générale ou de base de données
data?: T | { errors?: Record<string, string[] | undefined> }; // Données en cas de succès, ou erreurs de validation Zod
}
\`\`\`

### Interaction avec la Base de Données

- **Fonction RPC `public.add_or_update_cart_item`**:

  - Signature: `(p_cart_id UUID, p_product_id TEXT, p_quantity_to_add INT)`
  - Logique:
    - Recherche un `cart_item` existant pour le `p_cart_id` et `p_product_id`.
    - Si trouvé, met à jour la quantité (`quantity = quantity + p_quantity_to_add`).
    - Si non trouvé et `p_quantity_to_add > 0`, insère un nouvel item.
    - Si la quantité résultante est `<= 0`, supprime l'item.
    - Met à jour `updated_at` pour les tables `cart_items` et `carts`.
    - Retourne les `cart_items` mis à jour du panier.
  - L'identification de l'utilisateur est implicitement gérée par `auth.uid()` via la fonction `public.current_user_id()` utilisée dans les RLS des tables.

- **Sécurité**: Les Row Level Security (RLS) policies sur les tables `carts` et `cart_items` garantissent que les utilisateurs ne peuvent accéder et modifier que leurs propres données de panier. Ceci est basé sur `public.current_user_id()`.

### Gestion du Cache

- Après chaque opération de mutation réussie, `revalidateTag('cart')` est appelé pour invalider le cache Next.js associé aux données du panier.

## Architecture Côté Client (Exemple)

Bien que la logique principale soit côté serveur, le client peut maintenir un état pour une expérience utilisateur réactive, typiquement en appelant les Server Actions et en mettant à jour son état local en fonction des résultats.

### État Global (par exemple avec Zustand)

Un store client peut encapsuler les appels aux Server Actions :

\`\`\`typescript
// Exemple simplifié d'intégration avec Zustand et Server Actions
import { create } from "zustand";
import { getCart, addItemToCart /_ ... autres actions _/ } from "@/actions/cartActions";
import { CartData, CartActionResult } from "@/actions/cartActions";

interface ClientCartState {
cart: CartData | null;
isLoading: boolean;
error: string | null;
fetchCart: () => Promise<void>;
addProduct: (productId: string, quantity: number) => Promise<CartActionResult<CartData | null>>;
// ... autres fonctions d'interaction
}

// Implémentation du store...
// setActionResult helper...
\`\`\`
(Le code détaillé du store Zustand peut être repris de l'ancienne version et adapté pour appeler les Server Actions.)

### Composants React

Les composants React (`CartDisplay.tsx`, etc.) interagiraient avec ce store client ou appelleraient directement les Server Actions.
(La description du composant `CartDisplay.tsx` de l'ancienne version peut être adaptée ici.)

## Schéma de la Base de Données (Résumé)

Les tables principales sont `carts` et `cart_items`.

\`\`\`sql
-- Table des paniers
CREATE TABLE public.carts (
id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- auth.uid() de l'utilisateur (authentifié ou anonyme)
created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table des articles du panier
CREATE TABLE public.cart_items (
id uuid DEFAULT uuid_generate_v4() PRIMARY KEY, -- cart_item_id
cart_id uuid REFERENCES carts(id) ON DELETE CASCADE NOT NULL,
product_id TEXT REFERENCES products(id) ON DELETE CASCADE NOT NULL, -- Référence à products.id (TEXT)
quantity integer NOT NULL CHECK (quantity > 0), -- Suppression gérée si la quantité devient <= 0 par la logique RPC
created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
UNIQUE(cart_id, product_id)
);
\`\`\`
Pour plus de détails, voir [doc/DATABASE.md](cci:7://file:///C:/inherbis/doc/DATABASE.md:0:0-0:0).

## Politiques RLS (Résumé)

- **`carts`**: Les utilisateurs ne peuvent accéder/modifier que leur propre panier (`user_id = public.current_user_id()`).
- **`cart_items`**: L'accès est contrôlé via la propriété du panier parent (le `cart_id` appartenant à l'utilisateur).
  Pour plus de détails, voir [doc/DATABASE.md](cci:7://file:///C:/inherbis/doc/DATABASE.md:0:0-0:0).

## Tests

- La page `src/app/test-cart-actions/page.tsx` sert de page de test manuelle pour invoquer directement les Server Actions.
- Des tests unitaires (par exemple avec Vitest/Jest) pour les Server Actions et la logique de validation Zod sont recommandés.
- Des tests d'intégration (par exemple avec Playwright/Cypress) pour les flux utilisateurs complets.

## Bonnes Pratiques

(La section existante peut être conservée et complétée)

- **Performance**: Utilisation judicieuse de `revalidateTag`, optimisation des requêtes RPC.
- **Sécurité**: Validation Zod exhaustive côté serveur, politiques RLS strictes, échappement des sorties.
- **Expérience Utilisateur**: Retours visuels clairs, gestion des états de chargement et d'erreur.
