# Guide de la Base de Données HerbisVeritas

## Introduction

Ce document décrit l'architecture, la structure, et les principes de fonctionnement de la base de données PostgreSQL du projet HerbisVeritas, hébergée sur Supabase.
L'objectif est de fournir aux développeurs une compréhension claire des données, de leurs relations, des règles de sécurité et des conventions utilisées.

**Conventions Générales Importantes:**

- **Source de Vérité SQL :** Les définitions SQL exactes des tables (schémas détaillés), index, triggers, fonctions et politiques de sécurité au niveau des lignes (RLS) se trouvent dans les **fichiers de migration Supabase**. Ce document se concentre sur la description de la structure logique et du comportement attendu.
- **Gestion des Rôles :** L'identification du rôle d'un utilisateur (ex: 'admin', 'user', 'anon') repose principalement sur la revendication (claim) `app_metadata.role` présente dans le JWT (JSON Web Token) fourni par Supabase Auth. Les fonctions SQL de la base de données utilisent cette information comme source de vérité primaire pour les décisions d'accès.
- **Timestamp `updated_at` :** De nombreuses tables possèdent une colonne `updated_at` qui est automatiquement mise à jour lors de toute modification de la ligne grâce à un trigger standard (voir la section "Fonctions et Triggers Utilitaires Globaux").

L'architecture générale de la base de données est conçue pour une application e-commerce, gérant les profils utilisateurs, un catalogue de produits, les paniers d'achats, les commandes, et les adresses, tout en appliquant une sécurité stricte via RLS.

## Types Énumérés (ENUMs)

Des types ENUM sont utilisés pour définir des ensembles de valeurs constantes et améliorer la lisibilité et la robustesse du schéma.

#### `public.order_status_type`

Définit les différents statuts possibles pour une commande.

```sql
CREATE TYPE public.order_status_type AS ENUM (
  'pending_payment', -- Commande créée, en attente de paiement
  'processing',      -- Paiement reçu, commande en cours de traitement
  'shipped',         -- Commande expédiée
  'delivered',       -- Commande livrée
  'cancelled',       -- Commande annulée
  'refunded'         -- Commande remboursée
);
```

#### `public.payment_status_type`

Définit les différents statuts possibles pour le paiement d'une commande.

```sql
CREATE TYPE public.payment_status_type AS ENUM (
  'pending',   -- En attente de paiement ou processus de paiement non complété
  'succeeded', -- Paiement réussi
  'failed',    -- Paiement échoué
  'refunded'   -- Paiement remboursé
);
```

## Schéma des Tables Principales

Cette section décrit les tables principales de la base de données.

### Table: `public.profiles`

Stocke des informations supplémentaires sur les utilisateurs, étendant la table `auth.users` de Supabase.

**Colonnes Clés:**

- `id (UUID, PK)`: Référence à `auth.users.id` (clé primaire, relation `ON DELETE CASCADE`).
- `first_name (TEXT)`: Prénom de l'utilisateur.
- `last_name (TEXT)`: Nom de famille de l'utilisateur.
- `email (TEXT)`: Adresse e-mail (peut différer de l'e-mail d'authentification si modification permise).
- `phone (TEXT)`: Numéro de téléphone.
- `avatar_url (TEXT)`: URL de l'avatar de l'utilisateur.
- `billing_address_id (UUID, FK -> public.addresses)`: Adresse de facturation par défaut.
- `shipping_address_id (UUID, FK -> public.addresses)`: Adresse de livraison par défaut.
- `created_at (TIMESTAMPTZ)`: Date de création (valeur par défaut : `now()` en UTC).
- `updated_at (TIMESTAMPTZ)`: Date de dernière modification (valeur par défaut : `now()` en UTC, gérée par trigger).

**Comportements Spécifiques:**

- La colonne `updated_at` est automatiquement mise à jour par un trigger.

**Index:**

- Des index sont présents sur les clés primaires et étrangères (implicites ou définis dans les migrations).

**Politiques RLS (Row Level Security):**

- **Utilisateurs Authentifiés (`authenticated`):** Peuvent `SELECT` et `UPDATE` leur propre profil (basé sur `auth.uid() = id`).
- **Administrateurs (`admin`):** Accès complet (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) à tous les profils (basé sur `public.is_current_user_admin()`).
- RLS est activée pour cette table.

---

### Table: `public.products`

Catalogue des produits disponibles à la vente.

**Colonnes Clés:**

- `id (TEXT, PK)`: Identifiant unique du produit (ex: `prod_cos_003`).
- `name (TEXT, NOT NULL)`: Nom du produit.
- `description_short (TEXT)`: Description courte pour les listes de produits.
- `description_long (TEXT)`: Description détaillée pour la page produit.
- `price (NUMERIC(10,2), NOT NULL, CHECK >= 0)`: Prix de vente du produit.
- `compare_at_price (NUMERIC(10,2))`: Prix de comparaison optionnel (pour affichage des soldes).
- `stock (INTEGER, NOT NULL, DEFAULT 0, CHECK >= 0)`: Quantité en stock.
- `image_url (TEXT)`: URL de l'image principale du produit.
- `slug (TEXT, UNIQUE)`: Identifiant URL-friendly, généralement généré à partir du nom du produit.
- `is_new (BOOLEAN, NOT NULL, DEFAULT FALSE)`: Indicateur de nouveauté du produit.
- `is_on_promotion (BOOLEAN, NOT NULL, DEFAULT FALSE)`: Indicateur si le produit est en promotion.
- `is_active (BOOLEAN, NOT NULL, DEFAULT TRUE)`: Contrôle si le produit est listé et vendable publiquement.
- `created_at (TIMESTAMPTZ)`: Date de création (valeur par défaut : `now()` en UTC).
- `updated_at (TIMESTAMPTZ)`: Date de dernière modification (valeur par défaut : `now()` en UTC, gérée par trigger).

**Comportements Spécifiques:**

- La colonne `updated_at` est automatiquement mise à jour par un trigger.

**Index:**

- Index sur : `name` (recherche textuelle GIN), `is_active`. (Les détails exacts et autres index sont dans les migrations).

**Politiques RLS (Row Level Security):**

- **Accès Public (anonymes et authentifiés) :** Peuvent `SELECT` les produits actifs (`is_active = true`).
- **Administrateurs (`admin`) & Développeurs (`dev`) :** Accès complet (`SELECT` tous, `INSERT`, `UPDATE`, `DELETE`) à tous les produits (basé sur `public.is_current_user_admin()` ou `public.is_current_user_dev()`).
- RLS est activée pour cette table.

---

### Table: `public.product_variants`

Stocke les différentes variantes d'un produit (par exemple, taille, couleur).

**Colonnes Clés:**

- `id (UUID, PK, DEFAULT uuid_generate_v4())`: Identifiant unique de la variante.
- `product_id (UUID, FK -> public.products, NOT NULL, ON DELETE CASCADE)`: Référence au produit parent.
- `sku (TEXT)`: Stock Keeping Unit, identifiant unique pour la variante.
- `option1 (TEXT)`: Première option de variante (ex: Taille).
- `option2 (TEXT)`: Deuxième option de variante (ex: Couleur).
- `option3 (TEXT)`: Troisième option de variante.
- `price (NUMERIC(10,2))`: Prix spécifique de cette variante (peut surcharger le prix du produit).
- `compare_at_price (NUMERIC(10,2))`: Prix de comparaison pour cette variante.
- `inventory_quantity (INTEGER, DEFAULT 0)`: Quantité en stock pour cette variante spécifique.
- `barcode (TEXT)`: Code-barres de la variante.
- `weight (NUMERIC(10,2))`: Poids de la variante.
- `created_at (TIMESTAMPTZ)`: Date de création.
- `updated_at (TIMESTAMPTZ)`: Date de dernière modification (gérée par trigger).

**Comportements Spécifiques:**

- La colonne `updated_at` est automatiquement mise à jour par un trigger.

**Index:**

- Index sur : `product_id`, `sku`. (Détails dans les migrations).

**Politiques RLS (Row Level Security):**

- **Accès Public (anonymes et authentifiés) :** Peuvent `SELECT` les variantes des produits actifs (via la jointure avec `products` et `products.is_active = true`).
- **Administrateurs (`admin`) & Développeurs (`dev`) :** Accès complet.
- RLS est activée pour cette table (généralement en suivant les règles du produit parent).

---

### Table: `public.product_images`

Associe des images aux produits et à leurs variantes.

**Colonnes Clés:**

- `id (UUID, PK, DEFAULT uuid_generate_v4())`: Identifiant unique de l'image.
- `product_id (UUID, FK -> public.products, NOT NULL, ON DELETE CASCADE)`: Référence au produit.
- `variant_id (UUID, FK -> public.product_variants, ON DELETE CASCADE)`: Référence optionnelle à une variante spécifique.
- `src (TEXT, NOT NULL)`: URL de l'image (peut être hébergée sur Supabase Storage ou externe).
- `alt (TEXT)`: Texte alternatif pour l'image (accessibilité).
- `position (INTEGER, DEFAULT 0)`: Ordre d'affichage des images pour un produit/variante.
- `width (INTEGER)`: Largeur de l'image.
- `height (INTEGER)`: Hauteur de l'image.
- `created_at (TIMESTAMPTZ)`: Date de création.
  - _(Note: Pas de `updated_at` typiquement sur cette table car les images sont généralement remplacées plutôt que modifiées)_

**Index:**

- Index sur : `product_id`, `variant_id`.

**Politiques RLS (Row Level Security):**

- **Accès Public (anonymes et authentifiés) :** Peuvent `SELECT` les images des produits/variantes actifs.
- **Administrateurs (`admin`) & Développeurs (`dev`) :** Accès complet.
- RLS est activée.

---

### Table: `public.categories`

Permet de classer les produits en catégories hiérarchiques.

**Colonnes Clés:**

- `id (UUID, PK, DEFAULT uuid_generate_v4())`: Identifiant unique de la catégorie.
- `name (TEXT, NOT NULL)`: Nom de la catégorie.
- `description (TEXT)`: Description optionnelle de la catégorie.
- `parent_id (UUID, FK -> public.categories, ON DELETE SET NULL)`: Référence à une catégorie parente (pour la hiérarchie).
- `image (TEXT)`: URL d'une image illustrative pour la catégorie.
- `is_active (BOOLEAN, DEFAULT TRUE)`: Si la catégorie est visible/utilisable.
- `position (INTEGER, DEFAULT 0)`: Ordre d'affichage des catégories.
- `created_at (TIMESTAMPTZ)`: Date de création.
- `updated_at (TIMESTAMPTZ)`: Date de dernière modification (gérée par trigger).

**Comportements Spécifiques:**

- La colonne `updated_at` est automatiquement mise à jour par un trigger.

**Index:**

- Index sur : `parent_id`, `is_active`.

**Politiques RLS (Row Level Security):**

- **Accès Public (anonymes et authentifiés) :** Peuvent `SELECT` les catégories actives (`is_active = true`).
- **Administrateurs (`admin`) & Développeurs (`dev`) :** Accès complet.
- RLS est activée.

---

### Table: `public.product_categories`

Table de liaison pour associer les produits à plusieurs catégories (relation Many-to-Many).

**Colonnes Clés:**

- `id (UUID, PK, DEFAULT uuid_generate_v4())`: Identifiant unique de l'association.
- `product_id (UUID, FK -> public.products, NOT NULL, ON DELETE CASCADE)`: Référence au produit.
- `category_id (UUID, FK -> public.categories, NOT NULL, ON DELETE CASCADE)`: Référence à la catégorie.
- `created_at (TIMESTAMPTZ)`: Date de création de l'association.
- `UNIQUE(product_id, category_id)`: Assure qu'un produit n'est associé qu'une seule fois à la même catégorie.

**Politiques RLS (Row Level Security):**

- **Accès Public (anonymes et authentifiés) :** Peuvent `SELECT` les associations pour les produits et catégories actifs.
- **Administrateurs (`admin`) & Développeurs (`dev`) :** Accès complet.
- RLS est activée.

---

### Table: `public.orders`

Enregistre les commandes passées par les utilisateurs.

**Colonnes Clés:**

- `id (UUID, PK, DEFAULT uuid_generate_v4())`: Identifiant unique de la commande.
- `user_id (UUID, FK -> auth.users, NOT NULL)`: Référence à l'utilisateur ayant passé la commande.
- `status (public.order_status_type, NOT NULL, DEFAULT 'pending_payment')`: Statut actuel de la commande.
- `payment_status (public.payment_status_type, NOT NULL, DEFAULT 'pending')`: Statut du paiement.
- `total_amount (NUMERIC(10,2), NOT NULL, CHECK >= 0)`: Montant total de la commande.
- `currency (TEXT, NOT NULL, DEFAULT 'EUR')`: Devise de la commande.
- `shipping_address_id (UUID, FK -> public.addresses)`: Adresse de livraison pour cette commande.
- `billing_address_id (UUID, FK -> public.addresses)`: Adresse de facturation pour cette commande.
- `payment_intent_id (TEXT, UNIQUE)`: Identifiant de l'intention de paiement (ex: Stripe).
- `notes (TEXT)`: Notes additionnelles pour la commande (par le client ou l'admin).
- `created_at (TIMESTAMPTZ)`: Date de création.
- `updated_at (TIMESTAMPTZ)`: Date de dernière modification (gérée par trigger).

**Comportements Spécifiques:**

- La colonne `updated_at` est automatiquement mise à jour.

**Index:**

- Index sur : `user_id`, `status`, `payment_intent_id`.

**Politiques RLS (Row Level Security):**

- **Utilisateurs Authentifiés (`authenticated`):** Peuvent `SELECT` leurs propres commandes (`user_id = auth.uid()`). Peuvent potentiellement `UPDATE` certains champs (ex: annulation sous conditions).
- **Administrateurs (`admin`):** Accès complet.
- RLS est activée.

---

### Table: `public.order_items`

Détaille les produits inclus dans chaque commande.

**Colonnes Clés:**

- `id (UUID, PK, DEFAULT uuid_generate_v4())`: Identifiant unique de l'item de commande.
- `order_id (UUID, FK -> public.orders, NOT NULL, ON DELETE CASCADE)`: Référence à la commande parente.
- `product_id (TEXT, FK -> public.products, NOT NULL)`: Référence au produit. _(Note: On pourrait aussi référencer `product_variants.id` si la granularité est par variante)_
- `variant_id (UUID, FK -> public.product_variants)`: Référence optionnelle à la variante spécifique du produit.
- `quantity (INTEGER, NOT NULL, CHECK > 0)`: Quantité commandée de ce produit/variante.
- `unit_price (NUMERIC(10,2), NOT NULL, CHECK >= 0)`: Prix unitaire au moment de la commande (snapshot).
- `total_price (NUMERIC(10,2), NOT NULL, CHECK >= 0)`: Prix total pour cet item (`quantity` \* `unit_price`).
- `created_at (TIMESTAMPTZ)`: Date de création.
- `updated_at (TIMESTAMPTZ)`: Date de dernière modification.

**Comportements Spécifiques:**

- `updated_at` est gérée par trigger.
- Le `unit_price` est un "snapshot" pour garantir que le prix au moment de la commande est conservé, même si le prix du produit change plus tard.

**Index:**

- Index sur : `order_id`, `product_id`, `variant_id`.

**Politiques RLS (Row Level Security):**

- **Utilisateurs Authentifiés (`authenticated`):** Peuvent `SELECT` les items de leurs propres commandes (via jointure avec `orders`).
- **Administrateurs (`admin`):** Accès complet.
- RLS est activée.

---

### Table: `public.cart_items`

Gère les articles dans le panier d'achat des utilisateurs.

**Colonnes Clés:**

- `id (UUID, PK, DEFAULT uuid_generate_v4())`: Identifiant unique de l'article du panier.
- `user_id (UUID, FK -> auth.users, NOT NULL)`: Utilisateur à qui appartient cet article de panier.
- `product_id (TEXT, FK -> public.products, NOT NULL)`: Produit ajouté au panier.
- `variant_id (UUID, FK -> public.product_variants)`: Variante spécifique du produit, si applicable.
- `quantity (INTEGER, NOT NULL, CHECK > 0)`: Quantité du produit/variante dans le panier.
- `created_at (TIMESTAMPTZ)`: Date d'ajout au panier.
- `updated_at (TIMESTAMPTZ)`: Date de dernière modification (ex: changement de quantité).
- `UNIQUE(user_id, product_id, variant_id)`: Assure qu'une combinaison utilisateur/produit/variante n'apparaît qu'une fois (la quantité est ajustée).

**Comportements Spécifiques:**

- `updated_at` est gérée par trigger.
- Les articles sont typiquement supprimés lors de la création d'une commande ou manuellement par l'utilisateur.

**Index:**

- Index sur : `user_id`, `product_id`, `variant_id`.

**Politiques RLS (Row Level Security):**

- **Utilisateurs Authentifiés (`authenticated`):** Accès complet (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) à leurs propres articles de panier (`user_id = auth.uid()`).
- **Administrateurs (`admin`):** Pourraient avoir un accès `SELECT` pour analyse, mais typiquement pas d'accès `INSERT/UPDATE/DELETE` aux paniers des autres. _(À définir plus précisément selon les besoins)_.
- RLS est activée.

---

### Table: `public.addresses`

Stocke les adresses de livraison et de facturation des utilisateurs.

**Colonnes Clés:**

- `id (UUID, PK, DEFAULT uuid_generate_v4())`: Identifiant unique de l'adresse.
- `user_id (UUID, FK -> auth.users, NOT NULL)`: Utilisateur à qui appartient cette adresse.
- `is_default_shipping (BOOLEAN, DEFAULT FALSE)`: Si c'est l'adresse de livraison par défaut.
- `is_default_billing (BOOLEAN, DEFAULT FALSE)`: Si c'est l'adresse de facturation par défaut.
- `address_line1 (TEXT, NOT NULL)`: Première ligne de l'adresse.
- `address_line2 (TEXT)`: Seconde ligne de l'adresse (optionnelle).
- `city (TEXT, NOT NULL)`: Ville.
- `postal_code (TEXT, NOT NULL)`: Code postal.
- `state_province_region (TEXT)`: État / Province / Région.
- `country (TEXT, NOT NULL)`: Pays.
- `phone (TEXT)`: Numéro de téléphone associé à cette adresse.
- `created_at (TIMESTAMPTZ)`: Date de création.
- `updated_at (TIMESTAMPTZ)`: Date de dernière modification.

**Comportements Spécifiques:**

- `updated_at` est gérée par trigger.
- Logique applicative ou triggers additionnels pourraient être nécessaires pour s'assurer qu'un utilisateur n'a qu'une seule adresse de livraison/facturation par défaut à la fois.

**Index:**

- Index sur : `user_id`.

**Politiques RLS (Row Level Security):**

- **Utilisateurs Authentifiés (`authenticated`):** Accès complet (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) à leurs propres adresses (`user_id = auth.uid()`).
- **Administrateurs (`admin`):** Accès `SELECT` pour la gestion des commandes. Accès `UPDATE/DELETE` potentiellement restreint ou loggué.
- RLS est activée.

---

## Politiques de Sécurité au Niveau des Lignes (RLS) - Synthèse

La sécurité des données est primordiale. Toutes les tables contenant des informations sensibles ou spécifiques à un utilisateur sont protégées par des Politiques de Sécurité au Niveau des Lignes (Row Level Security - RLS).

**Principes Clés:**

1.  **Activation par Défaut :** RLS est activée (`enable row level security`) pour toutes les tables sensibles. Par défaut, cela signifie qu'aucun accès n'est permis à moins qu'une politique explicite ne l'autorise.
2.  **Source de Vérité des Rôles :** Le rôle de l'utilisateur connecté est déterminé principalement via la revendication (claim) `app_metadata.role` présente dans son JWT, récupérée en base de données par la fonction `public.get_my_custom_role()`. Des fonctions comme `public.is_current_user_admin()` s'appuient sur ce mécanisme pour simplifier l'écriture des politiques.
3.  **Accès Basé sur le Rôle :** Les politiques sont définies pour différents rôles et actions :
    - **Rôle `anon` (Utilisateurs non authentifiés) :**
      - Peuvent généralement lire (`SELECT`) les données publiques (produits actifs, catégories actives, etc.).
      - N'ont pas d'accès en écriture (`INSERT`, `UPDATE`, `DELETE`).
    - **Rôle `authenticated` (Utilisateurs authentifiés standards) :**
      - Peuvent gérer (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) leurs propres données personnelles (ex: leur profil via `auth.uid() = profiles.id`, leurs propres commandes, paniers, adresses).
      - Peuvent lire les données publiques.
    - **Rôle `admin` (Administrateurs) :**
      - Disposent d'un accès étendu, souvent complet (`SELECT`, `INSERT`, `UPDATE`, `DELETE` sur toutes les lignes) pour les tâches de gestion et de maintenance. Ceci est généralement vérifié via `public.is_current_user_admin()`.
    - **Rôle `service_role` (Utilisé par les fonctions Supabase et les opérations serveur) :**
      - A souvent des permissions étendues, voire un contournement des RLS pour les opérations système (ex: triggers, fonctions `SECURITY DEFINER`). Il est crucial que le code utilisant ce rôle soit sécurisé.
4.  **Politiques `USING` et `WITH CHECK` :**
    - Les politiques `USING (expression)` définissent quelles lignes sont visibles pour une opération donnée (typiquement `SELECT`, `UPDATE`, `DELETE`).
    - Les politiques `WITH CHECK (expression)` s'appliquent aux opérations d'écriture (`INSERT`, `UPDATE`) et garantissent que les nouvelles données ou les données modifiées respectent les conditions spécifiées.
5.  **Défense en Profondeur :** Bien que RLS offre une protection robuste au niveau de la base de données, la validation des permissions doit également être implémentée au niveau applicatif (API, interface utilisateur) comme une couche de défense supplémentaire.
6.  **Référence aux Migrations :** Les définitions SQL exactes et complètes de chaque politique (`CREATE POLICY ...`) se trouvent dans les fichiers de migration Supabase. Ce document fournit une synthèse du comportement attendu.

Cette approche garantit que les utilisateurs ne peuvent accéder et modifier que les données pour lesquelles ils ont explicitement les droits, en fonction de leur rôle et de leur identité.

---

## Fonctions et Triggers Utilitaires Globaux

Plusieurs fonctions et triggers SQL sont utilisés à travers la base de données pour des tâches communes, notamment la gestion des rôles et la mise à jour automatique des timestamps.

### Fonctions de Gestion des Rôles

Ces fonctions aident à déterminer le rôle de l'utilisateur actuel et à simplifier l'écriture des politiques RLS. La source principale d'information pour le rôle est la revendication `app_metadata.role` dans le JWT de l'utilisateur.

- **`public.get_my_custom_role() RETURNS TEXT`**

  - **Objectif :** Récupère le rôle de l'utilisateur actuel.
  - **Logique :**
    1.  Tente d'extraire la valeur de `auth.jwt() -> 'app_metadata' ->> 'role'`.
    2.  Si non trouvé ou vide, retourne `auth.role()` (qui peut être `authenticated`, `anon`, `service_role`).
  - **Utilisation :** Principalement dans les politiques RLS et autres fonctions pour déterminer les permissions.
  - **Contexte de Sécurité :** `STABLE SECURITY DEFINER`. Permet à la fonction de lire les claims JWT même si l'utilisateur appelant n'a pas directement accès à `auth.jwt()`. `SET search_path = public` est utilisé pour la sécurité.

- **`public.is_current_user_admin() RETURNS BOOLEAN`**
  - **Objectif :** Vérifie si l'utilisateur actuel a le rôle 'admin'.
  - **Logique :** Retourne `TRUE` si `public.get_my_custom_role() = 'admin'`, sinon `FALSE`.
  - **Utilisation :** Simplifie les conditions `CHECK` et `USING` dans les politiques RLS pour les accès administrateur.
  - **Contexte de Sécurité :** `STABLE`.

_(D'autres fonctions utilitaires spécifiques à un domaine (ex: `public.is_current_user_dev()`) peuvent exister et suivre des principes similaires. Se référer aux migrations pour une liste exhaustive.)_

### Trigger de Mise à Jour de `updated_at`

Un mécanisme standard est en place pour mettre à jour automatiquement la colonne `updated_at` de nombreuses tables lors de toute modification d'une ligne.

- **Fonction de Trigger : `public.handle_updated_at()`**

  - **Objectif :** Mettre à jour la colonne `updated_at` de la ligne modifiée avec l'heure actuelle (`now()`).
  - **Logique :** `NEW.updated_at = now(); RETURN NEW;`
  - **Type :** Fonction de trigger retournant `TRIGGER`.

- **Application du Trigger :**
  - Un trigger est créé pour chaque table nécessitant ce comportement (ex: `profiles`, `products`, `orders`, etc.).
  - Exemple de création de trigger :
    ```sql
    CREATE TRIGGER on_updated_at
    BEFORE UPDATE ON public.your_table_name
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
    ```
  - Ces triggers s'exécutent `BEFORE UPDATE` sur `FOR EACH ROW`.

Ce système garantit que la colonne `updated_at` reflète toujours la dernière fois qu'une ligne a été modifiée, sans nécessiter de mise à jour manuelle depuis l'application.

---

## Vues (Views)

Les vues SQL sont utilisées pour simplifier les requêtes complexes, encapsuler la logique métier, ou pour des raisons de sécurité en exposant uniquement un sous-ensemble de données ou de colonnes.

**Principes Généraux :**

- **Simplification :** Des vues peuvent être créées pour joindre plusieurs tables fréquemment utilisées ensemble (par exemple, `products` avec `product_variants` et `product_images` pour obtenir une liste complète des détails de produits actifs).
- **Sécurité :** Les vues peuvent limiter l'accès aux colonnes sensibles d'une table ou présenter des données agrégées sans exposer les détails sous-jacents.
- **Performance :** Dans certains cas, des vues matérialisées (non couvertes en détail ici, mais une possibilité PostgreSQL) peuvent être utilisées pour stocker le résultat d'une requête complexe et améliorer les performances des lectures fréquentes. Les vues standard ne stockent pas de données elles-mêmes mais exécutent la requête sous-jacente à chaque appel.
- **RLS sur les Vues :** Les politiques RLS s'appliquent aux tables sous-jacentes accédées par une vue. Si un utilisateur n'a pas accès à certaines lignes des tables de base, il ne les verra pas via la vue, même si la vue elle-même n'a pas de politique RLS distincte (bien que l'on puisse aussi définir des RLS sur les vues si nécessaire).

**Exemples Potentiels (Conceptuels) :**

- `public.view_active_products_with_details`: Pourrait joindre `products`, `product_variants`, `product_images`, `categories` et filtrer sur `products.is_active = true`.
- `public.view_user_order_history`: Pourrait joindre `orders` et `order_items` pour un `user_id` spécifique.

Les définitions SQL exactes de toutes les vues existantes se trouvent dans les fichiers de migration Supabase. Ce document souligne leur utilité et les principes de leur application.

---

## Extensions PostgreSQL

Supabase, étant basé sur PostgreSQL, permet l'utilisation de nombreuses extensions PostgreSQL pour enrichir les fonctionnalités de la base de données.

**Activation et Gestion :**

- Les extensions sont activées et gérées via le dashboard Supabase (section "Database" -> "Extensions") ou directement via des commandes SQL (`CREATE EXTENSION extension_name;`) dans les migrations si elles ne sont pas activées par défaut.
- Il est important de n'activer que les extensions réellement nécessaires pour minimiser la surface d'attaque et la consommation de ressources.

**Extensions Couramment Utilisées ou Pertinentes pour ce Projet :**

- **`uuid-ossp` (souvent activée par défaut) :** Fournit des fonctions pour générer des identifiants uniques universels (UUIDs), comme `uuid_generate_v4()`, largement utilisé pour les clés primaires.
- **`pg_graphql` (activée par défaut par Supabase) :** Permet d'exposer une API GraphQL au-dessus de la base de données PostgreSQL.
- **`pg_net` :** Permet aux fonctions PostgreSQL d'effectuer des requêtes HTTP sortantes (par exemple, pour appeler des webhooks depuis des triggers ou des fonctions). Son utilisation doit être soigneusement contrôlée pour des raisons de sécurité.
- **`pgsodium` (activée par défaut par Supabase) :** Fournit des fonctions de cryptographie, utiles pour le chiffrement de données sensibles au repos si nécessaire (au-delà du chiffrement de disque standard).
- **`plpgsql` (activée par défaut) :** Langage procédural par défaut de PostgreSQL, utilisé pour écrire des fonctions et des triggers.
- **`http` :** Une autre extension pour effectuer des requêtes HTTP (alternative à `pg_net`).
- **`pg_cron` :** Permet de planifier des tâches SQL (jobs cron) directement dans la base de données.
- **Extensions pour la Recherche Full-Text (FTS) :**
  - `fuzzystrmatch`, `pg_trgm` : Peuvent être utilisées pour améliorer la pertinence des recherches textuelles (par exemple, recherche de produits par nom avec tolérance aux fautes de frappe).

La liste exacte des extensions activées pour ce projet peut être consultée dans le dashboard Supabase. Leur utilisation spécifique (si elle va au-delà des fonctions standards comme `uuid_generate_v4()`) serait détaillée dans les fonctions ou la logique applicative qui les emploient.

---

## Bonnes Pratiques et Conventions

Pour assurer la maintenabilité, la sécurité et la performance de la base de données, les conventions et bonnes pratiques suivantes sont à respecter :

1.  **Nommage :**

    - Tables, colonnes, fonctions, triggers, etc. : `snake_case` (minuscules avec underscores).
    - Types ENUM : `snake_case_type`.
    - Clés primaires : `id` par convention.
    - Clés étrangères : `related_table_singular_name_id` (ex: `product_id` dans `order_items`).
    - Noms explicites et concis.

2.  **Migrations Supabase :**

    - Toute modification de schéma (tables, colonnes, types, fonctions, politiques RLS, index, etc.) DOIT être effectuée via un nouveau fichier de migration Supabase.
    - Ne pas modifier directement la structure en production via le dashboard Supabase, sauf pour des explorations temporaires non persistantes. Les migrations sont la source de vérité du schéma.
    - Tester les migrations en local et en staging avant de les appliquer en production.

3.  **Sécurité :**

    - RLS activée sur toutes les tables contenant des données utilisateur ou sensibles.
    - Politiques RLS aussi restrictives que possible, en suivant le principe du moindre privilège.
    - Utiliser les fonctions `public.get_my_custom_role()` et `public.is_current_user_admin()` pour standardiser les vérifications de rôle dans les RLS.
    - Pour les fonctions `SECURITY DEFINER`, toujours spécifier `SET search_path` pour éviter les attaques par manipulation de `search_path`.
    - Valider et nettoyer toutes les entrées utilisateur avant de les utiliser dans des requêtes SQL pour prévenir les injections SQL (bien que l'ORM et les clients Supabase aident, la vigilance reste de mise, surtout pour le SQL dynamique).
    - Gérer les secrets (clés API, etc.) de manière sécurisée, jamais en dur dans le code SQL ou applicatif. Utiliser les secrets managers de Supabase ou de l'environnement.

4.  **Performance :**

    - Ajouter des index judicieusement sur les colonnes fréquemment utilisées dans les clauses `WHERE`, `JOIN`, `ORDER BY`.
    - Analyser les requêtes lentes avec `EXPLAIN ANALYZE`.
    - Éviter les `SELECT *` lorsque seules quelques colonnes sont nécessaires.
    - Utiliser les jointures appropriées et s'assurer que les conditions de jointure utilisent des colonnes indexées.

5.  **Documentation :**

    - Maintenir ce document `DATABASE.md` à jour avec les changements majeurs d'architecture ou de logique.
    - Commenter le code SQL complexe (fonctions, triggers) pour expliquer son objectif et son fonctionnement.

6.  **Types de Données :**

    - Utiliser le type de données le plus approprié et le plus restrictif pour chaque colonne (ex: `BOOLEAN` au lieu de `SMALLINT` pour vrai/faux, `TIMESTAMPTZ` pour les dates/heures).
    - Définir des contraintes `NOT NULL` lorsque la colonne doit toujours avoir une valeur.
    - Utiliser des contraintes `CHECK` pour valider les données au niveau de la base de données (ex: `CHECK (price >= 0)`).

7.  **Développement Local et Environnements :**
    - Utiliser Supabase CLI pour le développement local afin de refléter l'environnement de production.
    - Avoir des environnements distincts (local, dev/staging, production) avec des configurations et des données séparées.

---

## Maintenance et Évolution

La base de données est un composant vivant du système et nécessitera une maintenance et des évolutions continues.

1.  **Sauvegardes (Backups) :**

    - Supabase gère automatiquement les sauvegardes quotidiennes (Point-In-Time Recovery - PITR est disponible sur les plans payants pour une granularité plus fine).
    - Se familiariser avec le processus de restauration de Supabase en cas de besoin.
    - Pour des données critiques, envisager des sauvegardes logiques supplémentaires (ex: `pg_dump`) stockées en externe, si les fonctionnalités de Supabase ne suffisent pas.

2.  **Monitoring :**

    - Utiliser les outils de monitoring de Supabase (disponibles dans le dashboard) pour surveiller l'état de la base de données, l'utilisation des ressources, les requêtes lentes, etc.
    - Configurer des alertes si possible pour les métriques critiques (ex: utilisation élevée du CPU, peu d'espace disque restant).

3.  **Mises à Jour PostgreSQL :**

    - Supabase gère les mises à jour mineures de PostgreSQL. Les mises à jour majeures peuvent nécessiter une planification et une intervention. Se tenir informé des communications de Supabase à ce sujet.

4.  **Gestion de la Taille des Données :**

    - Surveiller la croissance des tables.
    - Archiver ou purger les anciennes données non essentielles si nécessaire, après discussion et validation (par exemple, anciens logs, paniers abandonnés depuis très longtemps).

5.  **Optimisation des Performances :**

    - Revoir périodiquement les performances des requêtes critiques.
    - Utiliser `EXPLAIN ANALYZE` pour identifier les goulots d'étranglement.
    - Mettre à jour les statistiques des tables (`ANALYZE table_name;`) si le planificateur de requêtes semble prendre de mauvaises décisions (bien que PostgreSQL le fasse souvent automatiquement).
    - Envisager le partitionnement de tables très volumineuses si les performances se dégradent.

6.  **Évolution du Schéma :**

    - Lorsque de nouvelles fonctionnalités sont ajoutées à l'application, le schéma de la base de données devra probablement évoluer.
    - Appliquer tous les changements de schéma via des migrations Supabase, en respectant les bonnes pratiques de nommage et de documentation.
    - Considérer l'impact des changements sur les données existantes et prévoir des scripts de migration de données si nécessaire.
    - Pour les changements non rétrocompatibles, planifier soigneusement le déploiement pour minimiser l'impact sur les utilisateurs.

7.  **Revue de Sécurité :**
    - Revoir périodiquement les politiques RLS et les permissions des fonctions pour s'assurer qu'elles sont toujours appropriées et alignées avec les besoins de sécurité.
    - Se tenir informé des vulnérabilités PostgreSQL ou des extensions utilisées et appliquer les correctifs ou mises à jour recommandés par Supabase.

Ce document sert de guide. L'adaptabilité et la proactivité face aux besoins changeants du projet sont clés pour maintenir une base de données saine et performante.

---

**FIN DU DOCUMENT**
