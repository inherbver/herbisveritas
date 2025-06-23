# Guide de la Base de Données HerbisVeritas

## Introduction

Ce document décrit l'architecture, la structure, et les principes de fonctionnement de la base de données PostgreSQL du projet HerbisVeritas, hébergée sur Supabase.
L'objectif est de fournir aux développeurs une compréhension claire des données, de leurs relations, des règles de sécurité et des conventions utilisées.

**Conventions Générales Importantes:**

- **Source de Vérité SQL :** Les définitions SQL exactes des tables, index, triggers, fonctions et politiques RLS se trouvent dans les **fichiers de migration Supabase**. Ce document décrit la structure logique et le comportement attendu.
- **Gestion des Rôles :** L'identification du rôle d'un utilisateur (ex: 'admin', 'dev', 'user') repose sur la revendication `app_metadata.role` dans le JWT. Les fonctions SQL utilisent cette information comme source de vérité.
- **Timestamp `updated_at` :** De nombreuses tables possèdent une colonne `updated_at` automatiquement mise à jour par un trigger.

## Types Énumérés (ENUMs)

#### `public.app_role`

Définit les rôles applicatifs possibles pour un utilisateur.

```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'dev', 'user');
```

#### `public.order_status`

Définit les statuts possibles pour une commande.

```sql
CREATE TYPE public.order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
```

## Schéma des Tables

### Table: `public.profiles`

Étend la table `auth.users` avec des informations spécifiques à l'application.

- **Colonnes Clés:**
  - `id (UUID, PK)`: Référence à `auth.users.id`.
  - `role (app_role, DEFAULT 'user')`: Rôle de l'utilisateur dans l'application.
  - `first_name`, `last_name`, `phone`, `avatar_url` (TEXT).
  - `default_billing_address_id`, `default_shipping_address_id` (UUID, FK -> `public.addresses`).
- **RLS:**
  - Les utilisateurs peuvent lire/mettre à jour leur propre profil.
  - Les admins ont un accès complet.
  - **Logique applicative :** La création du profil est gérée par le trigger `handle_new_user` suite à l'action `signUpAction`. Les mises à jour sont gérées par les actions dans `profileActions.ts`. Voir [la documentation des actions](./ACTIONS.md#4-actions-du-profil-utilisateur-srcactionsprofileactionsts) et le [flux d'authentification](./AUTHFLOW.md).

### Table: `public.products`

Stocke les informations sur les produits.

- **Colonnes Clés:**
  - `id (TEXT, PK)`: Identifiant unique (ex: `prod_cos_003`).
  - `name`, `description_short`, `description_long` (TEXT).
  - `inci_list (TEXT[])`: Liste des ingrédients INCI.
  - `price (NUMERIC)`.
  - `stock_quantity (INTEGER)`.
  - `is_active (BOOLEAN, DEFAULT true)`.
- **RLS:**
  - Accès en lecture public pour les produits actifs.
  - Accès complet pour les admins/devs.

### Table: `public.addresses`

Stocke les adresses des utilisateurs.

- **Colonnes Clés:**
  - `id (UUID, PK)`.
  - `user_id (UUID, FK -> auth.users)`.
  - `address_line1`, `city`, `postal_code`, `country` (TEXT).
- **RLS:**
  - Les utilisateurs peuvent gérer leurs propres adresses.
  - Accès complet pour les admins/devs.
  - **Logique applicative :** La gestion CRUD est implémentée dans `addressActions.ts`. Voir [la documentation des actions](./ACTIONS.md#5-actions-des-adresses-srcactionsaddressactionsts).

### Table: `public.carts`

Représente les paniers d'achat.

- **Colonnes Clés:**
  - `id (UUID, PK)`.
  - `user_id (UUID, FK -> auth.users)`: **NULLABLE** pour les paniers invités.
  - `metadata (JSONB)`: Pour stocker des informations additionnelles.
- **RLS:**
  - Les utilisateurs authentifiés peuvent gérer leur propre panier.
  - Les admins/devs ont un accès complet.
  - La gestion des paniers invités se fait via des Server Actions avec `service_role`.
  - **Logique applicative :** L'ensemble de la logique du panier est géré par `cartActions.ts`. Voir [la documentation des actions](./ACTIONS.md#3-actions-du-panier-srcactionscartactionsts).

### Table: `public.cart_items`

Détaille le contenu des paniers.

- **Colonnes Clés:**
  - `id (UUID, PK)`.
  - `cart_id (UUID, FK -> public.carts)`.
  - `product_id (TEXT, FK -> public.products)`.
  - `quantity (INTEGER)`.
- **RLS:**
  - Les utilisateurs peuvent gérer les articles de leur propre panier (via une jointure sur `carts`).
  - Accès complet pour les admins/devs.
  - **Logique applicative :** La logique est gérée par `cartActions.ts`. Voir [la documentation des actions](./ACTIONS.md#3-actions-du-panier-srcactionscartactionsts).

### Table: `public.orders`

Stocke les informations sur les commandes passées par les utilisateurs.

- **Colonnes Clés:**
  - `id (UUID, PK)`: Identifiant unique de la commande.
  - `user_id (UUID, FK -> auth.users)`: L'utilisateur qui a passé la commande.
  - `status (order_status, DEFAULT 'pending')`: Le statut actuel de la commande (voir ENUMs).
  - `total_amount (NUMERIC)`: Le montant total de la commande.
  - `stripe_payment_intent_id (TEXT, UNIQUE)`: L'identifiant du Payment Intent Stripe, pour la réconciliation et la prévention des doublons.
  - `shipping_address_id (UUID, FK -> public.addresses)`: L'adresse de livraison.
  - `billing_address_id (UUID, FK -> public.addresses)`: L'adresse de facturation.
- **RLS:**
  - Les utilisateurs peuvent uniquement lire (`SELECT`) leurs propres commandes.
  - Les admins/devs ont un accès complet.
  - **Logique applicative :** La création des commandes est gérée exclusivement par le **webhook Stripe** (`/api/stripe-webhook/route.ts`). Ce webhook s'exécute avec des privilèges élevés (`service_role`) pour pouvoir insérer des données au nom de l'utilisateur après un paiement réussi. Voir [la documentation des actions](./ACTIONS.md#6-gestion-des-paiements-stripe) pour plus de détails.

### Table: `public.order_items`

Détaille les produits inclus dans chaque commande.

- **Colonnes Clés:**
  - `id (UUID, PK)`.
  - `order_id (UUID, FK -> public.orders)`: La commande à laquelle cet article appartient.
  - `product_id (TEXT, FK -> public.products)`: Le produit commandé.
  - `quantity (INTEGER)`: La quantité commandée.
  - `price_at_purchase (NUMERIC)`: Le prix du produit au moment de l'achat, pour garantir l'exactitude historique même si le prix du produit change plus tard.
- **RLS:**
  - Les utilisateurs peuvent lire les articles des commandes qui leur appartiennent (via une jointure sur `orders`).
  - Les admins/devs ont un accès complet.
  - **Logique applicative :** La création est également gérée par le webhook Stripe en même temps que la commande.

### Table: `public.order_items`

Détaille le contenu des commandes.

- **Colonnes Clés:**
  - `id (UUID, PK)`.
  - `order_id (UUID, FK -> public.orders)`.
  - `product_id (TEXT, FK -> public.products)`.
  - `quantity (INTEGER)`, `price (NUMERIC)`.
- **RLS:**
  - Les utilisateurs peuvent lire les articles de leurs propres commandes.
  - Accès complet pour les admins/devs.

### Table: `public.featured_hero_items`

Contenu pour le composant Hero de la page d'accueil.

- **Colonnes Clés:**
  - `id (UUID, PK)`.
  - `title`, `description`, `cta_text`, `cta_link` (TEXT).
  - `image_url`, `image_alt` (TEXT).
  - `roles (app_role[])`: Cible les rôles qui peuvent voir cet item.
- **RLS:**
  - Les utilisateurs peuvent lire les items correspondant à leur rôle.
  - Accès complet pour les admins/devs.

## Fonctions RPC (Remote Procedure Call)

Fonctions SQL exposées via l'API Supabase.

- `get_my_custom_role()`: Retourne le rôle de l'utilisateur courant (base de la plupart des RLS).
- `is_current_user_admin()`, `is_current_user_dev()`: Fonctions booléennes pour simplifier les vérifications de rôle.
- `add_or_update_cart_item(p_cart_id, p_product_id, p_quantity_to_add)`: Ajoute un produit au panier ou met à jour sa quantité. Retourne l'article de panier mis à jour.
- `merge_carts(p_guest_cart_id, p_auth_cart_id)`: Fusionne un panier invité dans un panier authentifié.
- `custom_access_token_hook(event)`: Ajoute des claims personnalisés (`role`, `guest_id`) au JWT lors de l'authentification.

## Triggers

- `handle_new_user`: Crée une entrée dans `public.profiles` après l'inscription d'un utilisateur dans `auth.users`. Ce trigger est appelé suite à l'action `signUpAction`. Voir le [flux d'inscription](./AUTHFLOW.md#flux-dinscription-sign-up).
- `handle_new_user_role`: Assigne le rôle par défaut à un nouveau profil.
- `update_updated_at_column`: Met à jour automatiquement le champ `updated_at` sur les tables concernées lors d'une modification.

---

## Bonnes Pratiques et Maintenance

(Cette section reste conceptuellement similaire à la version précédente, axée sur les conventions de nommage, l'utilisation d'UUID, la gestion des migrations, les sauvegardes, le monitoring et la sécurité.)

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
