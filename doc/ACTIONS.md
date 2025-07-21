# Documentation de l'API (Server Actions)

## 1. Introduction

L'API de HerbisVeritas n'est pas une API REST ou GraphQL traditionnelle. Elle est implémentée en utilisant des **Server Actions** de Next.js. Ces actions sont des fonctions asynchrones qui s'exécutent côté serveur et peuvent être appelées directement depuis des composants client ou serveur.

- **Localisation :** Toutes les actions sont situées dans le répertoire `src/actions/`.
- **Sécurité :** L'accès aux données est contrôlé par les **Row Level Security (RLS)** de Supabase. Les actions vérifient l'identité de l'utilisateur (`auth.uid()`) et son rôle (`app_metadata.role`) pour déterminer les permissions.
- **Validation :** La validation des données d'entrée est systématiquement effectuée avec **Zod**.
- **Type de Retour :** La plupart des actions retournent un objet `ActionResult` avec un statut (`success` ou `error`) et des données ou un message d'erreur.

---

## 2. Actions d'Authentification (`src/actions/authActions.ts`)

Gère l'inscription, la connexion, la déconnexion et la gestion des mots de passe. Ces actions interagissent principalement avec Supabase Auth et déclenchent des logiques annexes comme la fusion des paniers.

- **`loginAction(prevState, formData)`**
  - **Description :** Connecte un utilisateur avec email et mot de passe. Si l'utilisateur avait un panier en tant qu'invité, cette action tente de migrer ce panier vers son compte authentifié.
  - **Paramètres :** `formData` contenant `email` et `password`.
  - **Comportement :** En cas de succès, redirige vers la page de profil. En cas d'échec, retourne un `AuthActionResult` avec les erreurs.

- **`signUpAction(prevState, formData)`**
  - **Description :** Inscrit un nouvel utilisateur. Valide les entrées, vérifie si l'utilisateur existe déjà (en se basant sur la réponse de Supabase), et envoie un email de confirmation. La création du profil dans `public.profiles` est gérée par un trigger SQL.
  - **Paramètres :** `formData` contenant `email`, `password`, `confirmPassword`.
  - **Retourne :** `AuthActionResult` avec un message de succès invitant à vérifier l'email, ou des erreurs de validation/génériques.

- **`logoutAction()`**
  - **Description :** Déconnecte l'utilisateur actuel.
  - **Paramètres :** Aucun.
  - **Comportement :** Appelle `supabase.auth.signOut()` et redirige vers la page d'accueil avec des paramètres dans l'URL (`?logged_out=true` ou `?logout_error=true`) pour informer l'interface du résultat. Ne retourne pas de valeur.

- **`requestPasswordResetAction(prevState, formData)`**
  - **Description :** Déclenche le flux de "mot de passe oublié". Envoie un email à l'utilisateur avec un lien pour réinitialiser son mot de passe. Pour des raisons de sécurité, retourne toujours un message de succès pour ne pas révéler si un email existe dans la base de données.
  - **Paramètres :** `formData` contenant `email`.
  - **Retourne :** `AuthActionResult` avec un message de succès générique.

- **`updatePasswordAction(prevState, formData)`**
  - **Description :** Met à jour le mot de passe d'un utilisateur authentifié (par exemple, après une demande de réinitialisation).
  - **Paramètres :** `formData` contenant le nouveau `password` et `confirmPassword`.
  - **Retourne :** `AuthActionResult` indiquant le succès ou l'échec.

- **`resendConfirmationEmailAction(email)`**
  - **Description :** Renvoie l'email de confirmation d'inscription pour un utilisateur donné.
  - **Paramètres :** `email` (chaîne de caractères).
  - **Retourne :** `AuthActionResult` indiquant le succès ou l'échec.

---

## 3. Actions du Panier (`src/actions/cartActions.ts`)

Gère toutes les opérations sur le panier. Ces actions sont conçues pour les utilisateurs authentifiés (y compris anonymes créés par Supabase Auth) et s'appuient sur l'ID utilisateur actif (`activeUserId`) pour identifier le panier correct.

- **`addItemToCart(prevState, formData)`**
  - **Description :** Ajoute un produit au panier de l'utilisateur actif ou met à jour sa quantité. Si aucun panier n'existe pour l'utilisateur, il en crée un. Utilise la fonction RPC `add_or_update_cart_item` pour la logique de base de données.
  - **Paramètres :** `formData` contenant `productId` et `quantity`.
  - **Retourne :** `CartActionResult` avec l'état mis à jour du panier (`CartData`) ou une erreur.

- **`removeItemFromCart(input)`**
  - **Description :** Supprime un article spécifique du panier de l'utilisateur en se basant sur son `cartItemId`.
  - **Paramètres :** `input` objet contenant `cartItemId`.
  - **Retourne :** `CartActionResult` avec l'état mis à jour du panier (`CartData`) ou une erreur.

- **`updateCartItemQuantity(input)`**
  - **Description :** Met à jour la quantité d'un article spécifique dans le panier. Si la quantité est mise à 0, l'action appelle `removeItemFromCart`.
  - **Paramètres :** `input` objet contenant `cartItemId` et `quantity`.
  - **Retourne :** `CartActionResult` avec l'état mis à jour du panier (`CartData`) ou une erreur.

- **`migrateAndGetCart(input)`**
  - **Description :** Action critique appelée par `loginAction` après une connexion réussie. Elle gère la migration du panier d'un utilisateur anonyme vers son nouveau compte authentifié.
  - **Logique :**
    1. Récupère le panier de l'invité (`guestUserId`).
    2. Récupère le panier de l'utilisateur authentifié.
    3. Si l'utilisateur authentifié n'a pas de panier, le panier de l'invité lui est assigné.
    4. Si les deux ont un panier, leurs contenus sont fusionnés via la fonction RPC `merge_carts`.
    5. L'ancien utilisateur anonyme est ensuite supprimé.
  - **Paramètres :** `input` objet contenant `guestUserId`.
  - **Retourne :** `CartActionResult` avec l'état final du panier (`CartData`) ou une erreur.

---

## 4. Actions des Adresses (`src/actions/addressActions.ts`)

Gère l'ajout et la mise à jour des adresses de livraison et facturation des utilisateurs.

- **`addAddress(data, locale)`**
  - **Description :** Ajoute une nouvelle adresse au profil de l'utilisateur authentifié. Synchronise automatiquement le flag `billing_address_is_different` dans le profil.
  - **Paramètres :** `data` (objet `AddressFormData` contenant les détails de l'adresse), `locale` (chaîne de caractères pour les traductions).
  - **Retourne :** `ActionResult` indiquant le succès ou l'échec.
  - **Comportement :** Revalide les chemins `/profile/addresses` et `/checkout`, puis appelle `syncProfileAddressFlag`.

- **`updateAddress(addressId, data, locale)`**
  - **Description :** Met à jour une adresse existante. La politique RLS et la requête (`.eq("user_id", user.id)`) garantissent que l'utilisateur ne peut modifier que ses propres adresses. Synchronise automatiquement le flag `billing_address_is_different`.
  - **Paramètres :** `addressId` (UUID de l'adresse à modifier), `data` (objet `AddressFormData`), `locale`.
  - **Retourne :** `ActionResult` indiquant le succès ou l'échec.
  - **Comportement :** Revalide les chemins `/profile/addresses` et `/checkout`, puis appelle `syncProfileAddressFlag`.

---

## 5. Actions du Profil (`src/actions/profileActions.ts`)

Gère la mise à jour des informations du profil utilisateur.

- **`updateUserProfile(prevState, formData)`**
  - **Description :** Met à jour les informations de base du profil de l'utilisateur (prénom, nom, numéro de téléphone). Ne gère pas le mot de passe ni les adresses. Utilise le schéma de validation `accountInfoSchema`.
  - **Paramètres :** `prevState` (`UpdateProfileFormState`), `formData` contenant `first_name`, `last_name`, `phone_number`, `locale`.
  - **Retourne :** `UpdateProfileFormState` avec un message de succès/erreur, les erreurs de validation éventuelles, et une `resetKey` pour le reset du formulaire.
  - **Comportement :** Effectue un upsert dans la table `profiles` et revalide les chemins `/profile/account` et `/profile/account/edit`.

- **`updatePassword(values)`**
  - **Description :** Met à jour le mot de passe de l'utilisateur via `supabase.auth.updateUser()`. Valide le nouveau mot de passe avec `passwordUpdateSchema` (minimum 8 caractères).
  - **Paramètres :** `values` (objet contenant `newPassword` et optionnellement `currentPassword`).
  - **Retourne :** `UpdatePasswordResult` indiquant le succès ou l'échec avec codes d'erreur.

- **`syncProfileAddressFlag(locale, userId?)`**
  - **Description :** Action utilitaire qui met à jour le champ `billing_address_is_different` sur le profil de l'utilisateur. Compare les adresses de livraison et facturation par défaut pour déterminer si elles sont différentes.
  - **Paramètres :** `locale`, `userId` (optionnel, utilise l'utilisateur courant si non fourni).
  - **Retourne :** Un objet avec `success`, `message` ou `error`.
  - **Comportement :** Récupère toutes les adresses utilisateur, compare les adresses effectives, met à jour le profil et revalide les chemins concernés.

---

## 6. Actions des Produits (`src/actions/productActions.ts`)

Gère le cycle de vie complet des produits. **Toutes ces actions sont réservées aux administrateurs** et protégées par le wrapper `withPermissionSafe`, qui vérifie les permissions de l'utilisateur (ex: `products:create`, `products:update`).

- **`createProduct(data)`**
  - **Description :** Crée un nouveau produit avec ses traductions via la fonction RPC `create_product_with_translations_v2`.
  - **Paramètres :** `data` (objet `ProductFormValues` contenant toutes les informations du produit).
  - **Retourne :** Un objet indiquant le succès ou l'échec, avec les données du produit créé.

- **`updateProduct(data)`**
  - **Description :** Met à jour un produit existant et ses traductions via la fonction RPC `update_product_with_translations`.
  - **Paramètres :** `data` (objet `ProductFormValues` avec l'ID du produit).
  - **Retourne :** Un objet indiquant le succès ou l'échec.

- **`deleteProduct(productId)`**
  - **Description :** Supprime un produit de la base de données.
  - **Paramètres :** `productId` (UUID du produit).
  - **Retourne :** Un objet indiquant le succès ou l'échec.

- **`updateProductStatus(data)`**
  - **Description :** Modifie le statut d'un produit (`active`, `inactive`, `discontinued`). Contient une logique métier pour empêcher de discontinuer un produit s'il est présent dans des commandes en cours.
  - **Paramètres :** `data` (objet contenant `productId` et `status`).
  - **Retourne :** Un objet indiquant le succès ou l'échec.

- **`uploadProductImage(formData)`**
  - **Description :** Téléverse une image dans le bucket de stockage Supabase `products` et retourne son URL publique.
  - **Paramètres :** `formData` contenant le `file` et le `fileName`.
  - **Retourne :** `UploadImageResult` avec l'URL de l'image ou une erreur.

---

## 6. Actions d'Administration (`src/actions/adminActions.ts`)

Gère les actions spécifiques aux administrateurs pour la gestion des utilisateurs. **Toutes ces actions sont protégées par le wrapper `withPermissionSafe`** qui vérifie les permissions de l'utilisateur.

- **`setUserRole({ userId, newRole, reason })`**
  - **Description :** Modifie le rôle d'un utilisateur via une Edge Function Supabase. Cette action est hautement sécurisée et utilise un secret interne pour l'authentification avec la fonction Edge.
  - **Permission requise :** `users:update:role`
  - **Paramètres :** Objet `SetUserRoleParams` contenant `userId` (UUID de l'utilisateur), `newRole` ("user", "dev", ou "admin"), `reason` (justification du changement).
  - **Retourne :** Objet avec `error: string | null`.
  - **Comportement :** Appelle la fonction Edge `set-user-role` avec un header d'autorisation interne et les données du changement de rôle.

---

## 7. Actions de Gestion des Utilisateurs (`src/actions/userActions.ts`)

Fournit des fonctionnalités de lecture des données utilisateur pour l'administration.

- **`getUsers()`**
  - **Description :** Récupère la liste complète de tous les utilisateurs du système avec leurs informations de profil. Combine les données d'`auth.users` et de `public.profiles`.
  - **Permission requise :** `users:read:all`
  - **Paramètres :** Aucun.
  - **Retourne :** Tableau d'objets `UserForAdminPanel` contenant `id`, `email`, `full_name`, `role`, `created_at`, `last_sign_in_at`.
  - **Comportement :** Utilise le client admin Supabase pour accéder à `auth.users`, récupère les profils correspondants, et combine les données en priorisant le rôle JWT sur le rôle de profil.

---

## 8. Actions de Paiement (Stripe) (`src/actions/stripeActions.ts`)

Gère l'interaction avec l'API Stripe pour le processus de paiement.

- **`createStripeCheckoutSession()`**
  - **Description :** Crée une session de paiement Stripe pour le panier de l'utilisateur. Cette action est hautement sécurisée : elle récupère le panier, ignore les prix qui pourraient venir du client, et revalide chaque prix en interrogeant la base de données avant de construire la requête à Stripe.
  - **Paramètres :** Aucun (récupère le panier et l'utilisateur depuis la session).
  - **Retourne :** Un objet contenant `sessionId` en cas de succès, ou un `error` en cas d'échec.

---

## 9. Fonctions RPC Utilisées par les Actions

Les Server Actions s'appuient sur plusieurs fonctions RPC (Remote Procedure Call) Postgres pour effectuer des opérations complexes côté base de données :

### Fonctions de Gestion du Panier

- **`add_or_update_cart_item(p_cart_id UUID, p_product_id UUID, p_quantity INTEGER)`**
  - Utilisée par `addItemToCart` pour ajouter ou mettre à jour la quantité d'un produit dans un panier.
- **`merge_carts(p_guest_cart_id UUID, p_user_cart_id UUID)`**
  - Utilisée par `migrateAndGetCart` pour fusionner le contenu de deux paniers lors de la connexion d'un utilisateur.

### Fonctions de Gestion des Produits

- **`create_product_with_translations_v2(...)`**
  - Utilisée par `createProduct` pour créer un produit avec ses traductions dans une transaction atomique.
- **`update_product_with_translations(...)`**
  - Utilisée par `updateProduct` pour mettre à jour un produit et ses traductions simultanément.

### Fonctions de Gestion des Commandes

- **`create_order_from_cart_rpc(...)`**
  - Fonction utilisée pour créer une commande à partir du contenu d'un panier (utilisée dans le processus Stripe).

### Fonctions Utilitaires et de Sécurité

- **`get_my_custom_role()`**
  - Récupère le rôle de l'utilisateur courant pour les vérifications de permissions.
- **`is_current_user_admin()`, `is_current_user_dev()`, `is_service_context()`**
  - Fonctions helper pour les politiques RLS et les vérifications de permissions.

### Fonctions de Nettoyage et Maintenance

- **`cleanup_old_anonymous_users()`, `run_weekly_anonymous_cleanup()`**
  - Fonctions automatiques de nettoyage des utilisateurs anonymes expirés.
- **`log_event()`, `log_auth_event()`, `log_profile_events()`**
  - Fonctions de logging pour l'audit et le monitoring des événements système.

Ces fonctions RPC permettent d'encapsuler la logique métier complexe côté base de données tout en maintenant l'intégrité des données et les performances.
