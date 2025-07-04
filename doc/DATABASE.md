# Guide de la Base de Données HerbisVeritas

## 1. Introduction

Ce document est la référence centrale pour l'architecture, la structure et les principes de fonctionnement de la base de données PostgreSQL du projet HerbisVeritas, hébergée sur Supabase. Il vise à fournir une compréhension claire des données, de leurs relations et des règles de sécurité.

**Principes Fondamentaux :**

- **Source de Vérité :** Les fichiers de **migration Supabase** constituent l'unique source de vérité pour le schéma de la base de données (tables, fonctions, RLS). Ce document en est une représentation lisible et commentée.
- **Gestion des Rôles :** Le rôle d'un utilisateur (`admin`, `dev`, `user`) est déterminé par la revendication (claim) `app_metadata.role` présente dans son JWT. C'est la source de vérité pour les politiques RLS et la logique applicative.
- **Timestamps :** La plupart des tables possèdent des colonnes `created_at` et `updated_at` gérées automatiquement.

---

## 2. Schéma `public`

### 2.1. Types Énumérés (ENUMs)

- **`public.app_role`**: Définit les rôles applicatifs (`admin`, `dev`, `user`).
- **`public.order_status`**: Définit les statuts d'une commande (`pending`, `processing`, `shipped`, `delivered`, `cancelled`, `refunded`).

### 2.2. Structure des Tables

#### `public.profiles`

Étend `auth.users` avec des données spécifiques à l'application.

- **Colonnes Clés :**
  - `id` (UUID, PK) : Référence `auth.users.id`.
  - `role` (TEXT, DEFAULT 'user') : Rôle par défaut à la création. **Note :** Cette colonne n'est plus la source de vérité pour les permissions. C'est le claim JWT `app_metadata.role` qui est utilisé.
  - `first_name`, `last_name`, `phone`, `avatar_url` (TEXT).
- **RLS :**
  - Les utilisateurs peuvent lire et modifier leur propre profil.
  - Les administrateurs ont un accès complet.
- **Logique :** Un profil est créé automatiquement via le trigger `handle_new_user` lors de l'inscription.

#### `public.addresses`

Stocke les adresses de livraison et de facturation des utilisateurs.

- **Colonnes Clés :**
  - `id` (UUID, PK).
  - `user_id` (UUID, FK -> `auth.users`).
  - `address_line1`, `city`, `postal_code`, `country`, etc. (TEXT).
- **RLS :**
  - Les utilisateurs peuvent gérer (CRUD) leurs propres adresses.
  - Les administrateurs ont un accès complet.

#### `public.products`

Contient les données de base, non-traduisibles, des produits.

- **Colonnes Clés :**
  - `id` (TEXT, PK) : Identifiant unique (ex: `pdct_1`).
  - `slug` (TEXT, UNIQUE) : Pour les URLs.
  - `price` (NUMERIC).
  - `stock` (INTEGER).
  - `unit` (TEXT) : Unité de mesure (ex: 'kg', 'piece').
  - `is_active`, `is_new`, `is_on_promotion` (BOOLEAN).
  - `image_url` (TEXT).
  - `inci_list` (TEXT[]).
- **RLS :**
  - Lecture publique pour les produits actifs (`is_active = true`).
  - Accès complet pour les administrateurs/développeurs.

#### `public.product_translations`

Stocke les contenus traduisibles des produits.

- **Colonnes Clés :**
  - `id` (UUID, PK).
  - `product_id` (TEXT, FK -> `public.products`).
  - `locale` (TEXT) : Code de la langue (ex: 'fr', 'en').
  - `name`, `short_description` (TEXT).
- **RLS :**
  - Lecture publique.
  - Accès en écriture pour les administrateurs/développeurs.

#### `public.carts` & `public.cart_items`

Gèrent les paniers d'achat.

- **`carts` Colonnes Clés :**
  - `id` (UUID, PK).
  - `user_id` (UUID, FK -> `auth.users`) : Clé étrangère vers `auth.users`. N'est **jamais `NULL`**, car même les visiteurs anonymes ont un `id` utilisateur grâce aux sessions anonymes de Supabase.
- **`cart_items` Colonnes Clés :**
  - `id` (UUID, PK).
  - `cart_id` (UUID, FK -> `public.carts`).
  - `product_id` (TEXT).
  - `quantity` (INTEGER).
- **RLS :**
  - La politique est unifiée : tout utilisateur (anonyme ou authentifié) ne peut accéder qu'au panier correspondant à son `auth.uid()`.
  - Les administrateurs ont un accès complet.
  - Aucun privilège `service_role` n'est nécessaire pour les opérations sur le panier.

#### `public.orders` & `public.order_items`

Historique des commandes.

- **`orders` Colonnes Clés :**
  - `id` (UUID, PK).
  - `user_id` (UUID, FK -> `auth.users`).
  - `status` (`order_status`).
  - `total_amount` (NUMERIC).
  - `stripe_checkout_session_id` (TEXT).
- **`order_items` Colonnes Clés :**
  - `order_id` (UUID, FK -> `public.orders`).
  - `product_id` (TEXT).
  - `quantity` (INTEGER).
  - `price_at_purchase` (NUMERIC).
- **RLS :**
  - Les utilisateurs peuvent lire leurs propres commandes.
  - Accès complet pour les administrateurs et le `service_role` (pour la création via webhook).

#### `public.featured_hero_items`

Gère le contenu dynamique du composant "Hero" de la page d'accueil.

- **Colonnes Clés :**
  - `title`, `description`, `cta_text`, `cta_link`, `image_url`.
  - `target_roles` (TEXT[]) : Rôles ciblés par cet élément.
- **RLS :**
  - Les utilisateurs peuvent lire les éléments correspondant à leur rôle.
  - Accès complet pour les administrateurs.

#### `public.audit_logs`

Journalise les événements de sécurité et les actions administratives critiques.

- **Colonnes Clés :**
  - `id` (BIGINT, PK) : Identifiant unique.
  - `event_type` (TEXT) : Type d'événement (ex: `role_change`, `unauthorized_access_attempt`).
  - `user_id` (UUID, FK -> `auth.users`) : L'utilisateur (souvent un admin) qui a déclenché l'événement.
  - `data` (JSONB) : Données détaillées (cible, changements, justification, IP, etc.).
- **RLS :**
  - **Lecture :** Les administrateurs peuvent lire tous les journaux (`SELECT`).
  - **Insertion :** Les administrateurs peuvent insérer de nouveaux journaux (`INSERT`).
  - **Mise à jour :** Les journaux sont immuables (`UPDATE` interdit).
  - **Suppression :** Les journaux ne peuvent pas être supprimés (`DELETE` interdit).
- **Logique :** Les insertions sont effectuées par les Edge Functions (via `service_role`) et par les API Routes sécurisées (via la politique d'insertion pour les admins).

---

## 3. Fonctions et Logique de la Base de Données

### 3.1. Fonctions RPC (Remote Procedure Call)

Exposées via l'API Supabase et utilisées par les Server Actions.

- **`check_email_exists(email_to_check)`**: Vérifie si un email existe déjà dans `auth.users`. `SECURITY DEFINER`.
- **`create_product_with_translations(...)`**: Crée un produit et ses traductions de manière atomique.
- **`update_product_with_translations(...)`**: Met à jour un produit et ses traductions.
- **`add_or_update_cart_item(...)`**: Ajoute/met à jour un article dans un panier.
- **`merge_carts(anonymous_user_id UUID, authenticated_user_id UUID)`**: Fusionne le panier d'un utilisateur anonyme avec celui d'un utilisateur authentifié. Appelée par l'action `migrateAndGetCart` lors de la connexion.
- **`get_my_custom_role()`**: Retourne le rôle de l'utilisateur actuel à partir du JWT. Base de nombreuses RLS.
- **`is_current_user_admin()` / `is_current_user_dev()`**: Fonctions booléennes utilitaires pour les RLS.
- **`current_user_id()`**: Retourne l'`id` de l'utilisateur authentifié.
- **`custom_access_token_hook(event)`**: Ajoute le claim personnalisé `role` au JWT lors de la connexion.

### 3.2. Triggers

Automatisent certaines actions.

- **`handle_new_user`**: Sur `auth.users`, crée une entrée correspondante dans `public.profiles`.
- **`trigger_set_timestamp`**: Sur de nombreuses tables, met à jour automatiquement la colonne `updated_at` lors d'une modification.

---

## 4. Politiques de Sécurité (Row Level Security - RLS)

La sécurité est appliquée de manière centralisée via RLS sur presque toutes les tables.

- **Principe du Moindre Privilège :** Par défaut, aucun accès n'est autorisé. Des politiques sont ajoutées pour autoriser explicitement des actions.
- **Isolation des Données Utilisateur :** Les politiques garantissent que les utilisateurs ne peuvent accéder et modifier que leurs propres données (profil, adresses, panier, commandes). La condition `user_id = current_user_id()` est omniprésente.
- **Accès Administrateur :** Les utilisateurs avec le rôle `admin` (vérifié via `is_current_user_admin()`) ont des droits étendus sur la plupart des tables.
- **Accès Anonyme et Invité :** Les utilisateurs anonymes (via les sessions anonymes Supabase) ont un accès en lecture seule aux données publiques (produits). Leurs opérations sur leur propre panier sont directement contrôlées par les politiques RLS basées sur leur `auth.uid()`, sans nécessiter de privilèges élevés.

---

## 5. Conventions et Bonnes Pratiques

- **Nommage :** `snake_case` pour tous les objets de la base de données.
- **Migrations :** Toute modification de schéma doit passer par un fichier de migration Supabase.
- **Sécurité :** Utiliser des fonctions `SECURITY DEFINER` avec précaution, en spécifiant toujours `SET search_path`.
- **Performance :** Utiliser des index sur les clés étrangères et les colonnes fréquemment interrogées.

---

**FIN DU DOCUMENT**
