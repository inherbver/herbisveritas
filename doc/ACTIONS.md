# Documentation de l'API (Server Actions)

## 1. Introduction

L'API de HerbisVeritas n'est pas une API REST ou GraphQL traditionnelle. Elle est implémentée en utilisant des **Server Actions** de Next.js. Ces actions sont des fonctions asynchrones qui s'exécutent côté serveur et peuvent être appelées directement depuis des composants client ou serveur.

- **Localisation :** Toutes les actions sont situées dans le répertoire `src/actions/`.
- **Sécurité :** L'accès aux données est contrôlé par les **Row Level Security (RLS)** de Supabase. Les actions vérifient l'identité de l'utilisateur (`auth.uid()`) et son rôle (`app_metadata.role`) pour déterminer les permissions.
- **Validation :** La validation des données d'entrée est systématiquement effectuée avec **Zod**.
- **Type de Retour :** La plupart des actions retournent un objet `ActionResult` avec un statut (`success` ou `error`) et des données ou un message d'erreur.

---

## 2. Actions d'Authentification (`src/actions/auth.ts`)

Gère l'inscription, la connexion et la déconnexion. Ces actions interagissent principalement avec les tables `auth.users` et [`public.profiles`](./DATABASE.md#table-publicprofiles).

- **`loginAction(prevState, formData)`**

  - **Description :** Connecte un utilisateur avec email et mot de passe.
  - **Paramètres :** `formData` contenant `email` et `password`.
  - **Retourne :** `ActionResult` indiquant le succès ou l'échec de la connexion.

- **`signUpAction(prevState, formData)`**

  - **Description :** Inscrit un nouvel utilisateur.
  - **Paramètres :** `formData` contenant `email`, `password`, `firstName`, `lastName`.
  - **Retourne :** `ActionResult` avec un message de succès invitant à vérifier l'email, ou un message d'erreur.

- **`logoutAction()`**
  - **Description :** Déconnecte l'utilisateur actuel.
  - **Paramètres :** Aucun.
  - **Retourne :** `ActionResult` indiquant le succès ou l'échec de la déconnexion.

---

## 3. Actions du Panier (`src/actions/cartActions.ts`)

Gère toutes les opérations liées au panier d'achat. Ces actions manipulent les tables [`public.carts`](./DATABASE.md#table-publiccarts) et [`public.cart_items`](./DATABASE.md#table-publiccart_items).

- **`getCart()`**

  - **Description :** Récupère le panier de l'utilisateur actuel (authentifié ou invité). Crée un panier en base de données s'il n'existe pas.
  - **Paramètres :** Aucun.
  - **Retourne :** `Promise<CartData | null>`.

- **`addItemToCart(itemDetails, quantity)`**

  - **Description :** Ajoute un produit au panier ou met à jour sa quantité s'il est déjà présent. Utilise la fonction RPC `add_or_update_cart_item` en base de données.
  - **Paramètres :** `itemDetails` (objet avec les détails du produit), `quantity` (nombre).
  - **Retourne :** `Promise<ActionResult<CartData>>`.

- **`removeItemFromCart(cartItemId)`**

  - **Description :** Supprime un article spécifique du panier.
  - **Paramètres :** `cartItemId` (UUID de l'article dans la table `cart_items`).
  - **Retourne :** `Promise<ActionResult<CartData>>`.

- **`updateCartItemQuantity(cartItemId, newQuantity)`**
  - **Description :** Met à jour la quantité d'un article spécifique dans le panier.
  - **Paramètres :** `cartItemId` (UUID de l'article), `newQuantity` (nombre).
  - **Retourne :** `Promise<ActionResult<CartData>>`.

---

## 4. Actions du Profil Utilisateur (`src/actions/profileActions.ts`)

Gère la mise à jour des informations du profil utilisateur, qui sont stockées dans la table [`public.profiles`](./DATABASE.md#table-publicprofiles).

- **`updateUserProfile(prevState, formData)`**

  - **Description :** Met à jour les informations de base de l'utilisateur (prénom, nom, etc.).
  - **Paramètres :** `formData` contenant les champs du profil.
  - **Retourne :** `ActionResult` indiquant le succès ou l'échec.

- **`updatePassword(prevState, formData)`**
  - **Description :** Met à jour le mot de passe de l'utilisateur. Ce flux est sécurisé et nécessite la vérification de l'ancien mot de passe.
  - **Paramètres :** `formData` contenant `currentPassword`, `newPassword`, `confirmNewPassword`.
  - **Retourne :** `ActionResult`.

---

## 5. Actions des Adresses (`src/actions/addressActions.ts`)

Gère les adresses de livraison et de facturation de l'utilisateur, stockées dans la table [`public.addresses`](./DATABASE.md#table-publicaddresses).

- **`addAddress(prevState, formData)`**

  - **Description :** Ajoute une nouvelle adresse au profil de l'utilisateur.
  - **Paramètres :** `formData` avec les détails de l'adresse.
  - **Retourne :** `ActionResult`.

- **`updateAddress(prevState, formData)`**

  - **Description :** Met à jour une adresse existante.
  - **Paramètres :** `formData` avec les détails de l'adresse, incluant l'`id` de l'adresse à modifier.
  - **Retourne :** `ActionResult`.

- **`deleteAddress(addressId)`**
  - **Description :** Supprime une adresse.
  - **Paramètres :** `addressId` (UUID de l'adresse).
  - **Retourne :** `ActionResult`.

---

## 6. Actions de Revalidation (`src/actions/revalidationActions.ts`)

Contient des actions spécifiques pour invalider le cache de Next.js.

- **`revalidateTags(tags)`**

  - **Description :** Invalide le cache pour un ou plusieurs tags. Utilisé après des mutations de données pour s'assurer que les vues sont à jour.
  - **Paramètres :** `tags` (tableau de chaînes de caractères).
  - **Retourne :** `Promise<void>`.

- **`revalidatePaths(paths)`**
  - **Description :** Invalide le cache pour un ou plusieurs chemins (routes).
  - **Paramètres :** `paths` (tableau de chaînes de caractères).
  - **Retourne :** `Promise<void>`.

---

## 7. Actions de Paiement Stripe (`src/actions/stripeActions.ts`)

Gère la création de sessions de paiement avec Stripe.

- **`createStripeCheckoutSession()`**

  - **Description :** Crée une session de checkout Stripe pour le panier de l'utilisateur. Cette action sécurisée côté serveur récupère le panier, valide les prix des produits en base de données pour éviter toute manipulation, et initialise la session de paiement. Elle est conçue pour être appelée par un composant client, qui redirige ensuite l'utilisateur vers la page de paiement hébergée par Stripe.
  - **Paramètres :** Aucun.
  - **Retourne :** `Promise<ActionResult>` contenant le `sessionId` en cas de succès, ou un message d'erreur.
