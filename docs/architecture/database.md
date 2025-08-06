# Base de Données - Structure Réelle

Documentation technique précise de la structure de base de données PostgreSQL via Supabase, basée sur l'analyse des migrations et du code actuel.

## Vue d'Ensemble

### Infrastructure

- **SGBD** : PostgreSQL 15.4 via Supabase
- **Extensions** : `uuid-ossp`, `pgcrypto`
- **Sécurité** : Row Level Security (RLS) activé sur toutes les tables
- **Types** : Types PostgreSQL + enums custom (`app_role`, `order_status`, `address_type`)
- **Architecture** : Database-First avec fonctions RPC pour les opérations complexes
- **Source de vérité** : Migrations Supabase (30+ fichiers) pour le schéma exact

### Schema Global

```mermaid
erDiagram
    profiles {
        uuid id PK
        text first_name
        text last_name
        text email
        app_role role
        boolean billing_address_is_different
        timestamptz created_at
        timestamptz updated_at
    }

    addresses {
        uuid id PK
        uuid user_id FK
        text address_type
        boolean is_default
        text full_name
        text company_name
        text street_number
        text address_line1
        text address_line2
        text postal_code
        text city
        text state_province_region
        text country_code
        text phone_number
        timestamptz created_at
        timestamptz updated_at
    }

    categories {
        uuid id PK
        text name
        text slug UNIQUE
        text description
        text color
        timestamptz created_at
        timestamptz updated_at
    }

    products {
        uuid id PK
        text name
        text slug UNIQUE
        text description
        numeric price
        integer stock_quantity
        text category
        boolean is_active
        text image_url
        text[] labels
        text unit
        boolean is_new
        boolean is_on_promotion
        text[] inci_list
        text status
        text stripe_product_id
        timestamptz created_at
        timestamptz updated_at
    }

    product_translations {
        uuid id PK
        uuid product_id FK
        text language_code
        text name
        text description
        text short_description
        text description_long
        text usage_instructions
        text properties
        text composition_text
        timestamptz created_at
        timestamptz updated_at
    }

    featured_hero_items {
        uuid id PK
        uuid product_id FK UNIQUE
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    carts {
        uuid id PK
        uuid user_id FK
        text status
        numeric total_amount
        timestamptz created_at
        timestamptz updated_at
    }

    cart_items {
        uuid id PK
        uuid cart_id FK
        text product_id
        integer quantity
        timestamptz added_at
        timestamptz created_at
    }

    orders {
        uuid id PK
        uuid user_id FK
        numeric total_amount
        text status
        uuid shipping_address_id FK
        uuid billing_address_id FK
        timestamptz created_at
        timestamptz updated_at
    }

    order_items {
        uuid id PK
        uuid order_id FK
        text product_id
        integer quantity
        numeric price_at_purchase
        timestamptz created_at
    }

    shipping_methods {
        uuid id PK
        text carrier
        text name
        text description
        numeric price
        integer estimated_days_min
        integer estimated_days_max
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    audit_logs {
        bigint id PK
        uuid user_id FK
        text event_type
        jsonb data
        timestamptz created_at
    }

    articles {
        uuid id PK
        text title
        text slug UNIQUE
        text excerpt
        jsonb content
        text content_html
        text featured_image
        text status
        timestamptz published_at
        uuid author_id FK
        uuid category_id FK
        integer view_count
        integer reading_time
        text seo_title
        text seo_description
        timestamptz created_at
        timestamptz updated_at
    }

    tags {
        uuid id PK
        text name
        text slug UNIQUE
        timestamptz created_at
    }

    article_tags {
        uuid article_id FK
        uuid tag_id FK
    }

    profiles ||--o{ addresses : has
    profiles ||--o{ carts : owns
    profiles ||--o{ orders : places
    profiles ||--o{ articles : authors

    products ||--o{ product_translations : has
    products ||--o{ featured_hero_items : featured_in
    products ||--o{ cart_items : in_cart
    products ||--o{ order_items : ordered

    carts ||--o{ cart_items : contains
    orders ||--o{ order_items : contains
    orders ||--o{ addresses : shipping_to
    orders ||--o{ addresses : billing_to

    categories ||--o{ articles : categorizes
    articles ||--o{ article_tags : tagged_with
    tags ||--o{ article_tags : tags
```

## Tables Détaillées

### 1. Gestion Utilisateurs

#### `profiles`

Table principale des profils utilisateurs avec système de rôles basé sur JWT claims.

```sql
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY NOT NULL,
    first_name TEXT CHECK (char_length(first_name) < 256),
    last_name TEXT CHECK (char_length(last_name) < 256),
    email TEXT UNIQUE,
    phone TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'editor', 'admin', 'dev')),
    permissions JSONB DEFAULT '[]',
    billing_address_is_different BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enum pour les rôles (utilisé par le système mais pas en contrainte)
CREATE TYPE public.app_role AS ENUM ('user', 'editor', 'admin', 'dev');
```

**Architecture de permissions** :

- **Source de vérité** : `app_metadata.role` dans le JWT Supabase (pas la colonne `role`)
- **Fonctions helper** : `is_admin()`, `has_permission()`, `get_my_custom_role()`
- **Système modulaire** : Permissions JSONB avec wildcard `["*"]` pour les admins

**Rôles et permissions** :

- `user` : Utilisateur standard (achats, profil)
- `editor` : Gestion de contenu (articles, produits)
- `admin` : Administration complète + accès audit_logs
- `dev` : Accès développeur + diagnostics

**Automatismes** :

- Création automatique via trigger `handle_new_user` sur `auth.users`
- Hook JWT `custom_access_token_hook` pour injecter le rôle dans le token

#### `addresses`

Adresses de livraison et facturation des utilisateurs.

```sql
CREATE TABLE public.addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    address_type address_type NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    company_name TEXT,
    street_number TEXT,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    postal_code TEXT NOT NULL,
    city TEXT NOT NULL,
    state_province_region TEXT,
    country_code TEXT NOT NULL DEFAULT 'FR',
    phone_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Types d'adresses
CREATE TYPE address_type AS ENUM ('shipping', 'billing');
```

#### `audit_logs`

Journalisation des événements de sécurité et actions admin.

```sql
CREATE TABLE public.audit_logs (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    data JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT
);
```

### 2. Catalogue Produits

#### `categories`

Catégories de produits pour l'organisation.

```sql
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT, -- Code couleur hex pour l'interface
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `products`

Table principale des produits avec attributs e-commerce.

```sql
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    price NUMERIC NOT NULL CHECK (price >= 0),
    stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    category TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    image_url TEXT,
    labels TEXT[] DEFAULT '{}', -- Tags pour filtrage
    unit TEXT NOT NULL DEFAULT 'pièce',
    is_new BOOLEAN DEFAULT false,
    is_on_promotion BOOLEAN DEFAULT false,
    inci_list TEXT[], -- Liste INCI pour cosmétiques
    status TEXT DEFAULT 'draft',
    stripe_product_id TEXT, -- Liaison Stripe
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `product_translations`

Traductions multilingues des produits.

```sql
CREATE TABLE public.product_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    language_code TEXT NOT NULL, -- 'fr', 'en', 'de', 'es'
    name TEXT NOT NULL,
    description TEXT,
    short_description TEXT,
    description_long TEXT,
    usage_instructions TEXT,
    properties TEXT,
    composition_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, language_code)
);
```

#### `featured_hero_items`

Produits mis en avant sur la page d'accueil.

```sql
CREATE TABLE public.featured_hero_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id)
);
```

### 3. Commerce et Commandes

#### `carts`

Paniers utilisateurs avec support unifié invités/authentifiés.

```sql
CREATE TABLE public.carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    total_amount NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
```

**Architecture unifiée** :

- **Jamais NULL** : `user_id` toujours renseigné grâce aux sessions anonymes Supabase
- **Migration automatique** : Fonction `merge_carts()` lors de la connexion utilisateur
- **RLS unifié** : Politique unique basée sur `auth.uid()` (pas de distinction invité/authentifié)
- **Contrainte unique** : Un seul panier actif par utilisateur (`idx_unique_active_cart`)

#### `cart_items`

Articles dans les paniers.

```sql
CREATE TABLE public.cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL, -- Référence UUID vers products
    quantity INT NOT NULL CHECK (quantity > 0),
    added_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(cart_id, product_id)
);
```

#### `orders`

Commandes validées.

```sql
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    total_amount NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    shipping_address_id UUID,
    billing_address_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `order_items`

Articles dans les commandes.

```sql
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL, -- Snapshot du produit au moment de l'achat
    quantity INT NOT NULL CHECK (quantity > 0),
    price_at_purchase NUMERIC NOT NULL, -- Prix figé au moment de l'achat
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `shipping_methods`

Méthodes de livraison disponibles.

```sql
CREATE TABLE public.shipping_methods (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    carrier TEXT NOT NULL CHECK (carrier <> ''),
    name TEXT NOT NULL CHECK (name <> ''),
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    estimated_days_min INTEGER CHECK (estimated_days_min >= 0),
    estimated_days_max INTEGER CHECK (estimated_days_max >= estimated_days_min),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. Contenu Editorial

#### `articles`

Articles de blog/magazine.

```sql
CREATE TABLE public.articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    excerpt TEXT,
    content JSONB, -- Contenu TipTap
    content_html TEXT, -- Version HTML générée
    featured_image TEXT,
    status TEXT DEFAULT 'draft',
    published_at TIMESTAMPTZ,
    author_id UUID REFERENCES auth.users(id),
    category_id UUID REFERENCES public.categories(id),
    view_count INTEGER DEFAULT 0,
    reading_time INTEGER, -- En minutes
    seo_title TEXT,
    seo_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `tags`

Tags pour l'organisation du contenu.

```sql
CREATE TABLE public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `article_tags`

Liaison many-to-many entre articles et tags.

```sql
CREATE TABLE public.article_tags (
    article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, tag_id)
);
```

## Politiques de Sécurité (RLS)

### Stratégie Globale

Row Level Security activé sur toutes les tables avec politiques spécifiques par table et action.

### Politiques Principales

#### Profiles

```sql
-- Lecture : utilisateur peut voir son propre profil
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Modification : utilisateur peut modifier son propre profil
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Admin : accès complet pour admin/dev
CREATE POLICY "Admins can manage all profiles" ON profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'dev')
        )
    );
```

#### Carts & Cart Items

```sql
-- Panier : accès basé sur user_id
CREATE POLICY "Users can manage their own carts" ON carts
    FOR ALL USING (user_id = auth.uid());

-- Articles panier : accès via le panier parent
CREATE POLICY "Users can manage their cart items" ON cart_items
    FOR ALL USING (
        cart_id IN (
            SELECT id FROM carts WHERE user_id = auth.uid()
        )
    );
```

#### Products (Lecture publique)

```sql
-- Lecture : accès public aux produits actifs
CREATE POLICY "Allow public read access to products" ON products
    FOR SELECT USING (is_active = true);

-- Gestion : réservée aux editors/admin/dev
CREATE POLICY "Editors can manage products" ON products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('editor', 'admin', 'dev')
        )
    );
```

#### Audit Logs (Admin seulement)

```sql
-- Seuls les admin/dev peuvent consulter les logs
CREATE POLICY "Admins can view audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'dev')
        )
    );
```

## Index et Performance

### Index Critiques

```sql
-- Performance panier
CREATE INDEX idx_carts_user_id ON carts(user_id);
CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);
CREATE UNIQUE INDEX idx_cart_items_unique ON cart_items(cart_id, product_id);

-- Performance catalogue
CREATE INDEX idx_products_active ON products(is_active) WHERE is_active = true;
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_slug ON products(slug);

-- Performance recherche
CREATE INDEX idx_product_translations_product_id ON product_translations(product_id);
CREATE INDEX idx_product_translations_locale ON product_translations(language_code);

-- Performance commandes
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
```

### Contraintes Métier

```sql
-- Stock non négatif
ALTER TABLE products ADD CONSTRAINT chk_positive_stock
    CHECK (stock_quantity >= 0);

-- Prix positif
ALTER TABLE products ADD CONSTRAINT chk_positive_price
    CHECK (price >= 0);

-- Quantité panier positive
ALTER TABLE cart_items ADD CONSTRAINT chk_positive_quantity
    CHECK (quantity > 0);

-- Un seul panier actif par utilisateur
CREATE UNIQUE INDEX idx_unique_active_cart
    ON carts(user_id) WHERE status = 'active';
```

## Fonctions RPC (Remote Procedure Call)

### Architecture Database-First

Les fonctions RPC encapsulent la logique métier côté base de données pour garantir performances, intégrité et sécurité.

### Cart Management

```sql
-- Ajouter/mettre à jour article panier atomiquement
CREATE OR REPLACE FUNCTION add_or_update_cart_item(
    p_cart_id UUID,
    p_product_id UUID,
    p_quantity_to_add INTEGER
) RETURNS UUID AS $$
DECLARE
    v_item_id UUID;
BEGIN
    INSERT INTO cart_items (cart_id, product_id, quantity)
    VALUES (p_cart_id, p_product_id, p_quantity_to_add)
    ON CONFLICT (cart_id, product_id)
    DO UPDATE SET
        quantity = cart_items.quantity + p_quantity_to_add,
        added_at = NOW()
    RETURNING id INTO v_item_id;

    RETURN v_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fusionner deux paniers lors de la connexion
CREATE OR REPLACE FUNCTION merge_carts(
    anonymous_user_id UUID,
    authenticated_user_id UUID
) RETURNS void AS $$
BEGIN
    -- Logique complexe de fusion des paniers
    -- Utilisée par migrateAndGetCart dans les Server Actions
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Product Management

```sql
-- Créer produit avec traductions atomiquement
CREATE OR REPLACE FUNCTION create_product_with_translations_v2(
    product_data JSONB,
    translations JSONB[]
) RETURNS TABLE(...) AS $$
BEGIN
    -- Transaction atomique produit + traductions
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mettre à jour produit avec traductions
CREATE OR REPLACE FUNCTION update_product_with_translations(
    product_id UUID,
    product_data JSONB,
    translations JSONB[]
) RETURNS void AS $$
BEGIN
    -- Mise à jour atomique
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Order Management

```sql
-- Créer commande à partir d'un panier
CREATE OR REPLACE FUNCTION create_order_from_cart_rpc(
    p_cart_id UUID,
    p_shipping_address JSONB,
    p_billing_address JSONB,
    p_payment_intent_id TEXT
) RETURNS TABLE(order_id UUID, ...) AS $$
BEGIN
    -- Transaction complexe panier -> commande
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### User Management & Security

```sql
-- Récupérer le rôle de l'utilisateur courant depuis JWT
CREATE OR REPLACE FUNCTION get_my_custom_role()
RETURNS TEXT AS $$
BEGIN
    RETURN (current_setting('request.jwt.claims', true)::json->>'role');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vérifications booléennes pour RLS
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_my_custom_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_current_user_dev()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_my_custom_role() IN ('admin', 'dev');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper pour RLS et Server Actions
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vérifier permissions spécifiques
CREATE OR REPLACE FUNCTION has_permission(
    permission_name TEXT,
    user_id UUID DEFAULT auth.uid()
) RETURNS BOOLEAN AS $$
DECLARE
    user_permissions JSONB;
    user_role TEXT;
BEGIN
    SELECT role, permissions INTO user_role, user_permissions
    FROM profiles WHERE id = user_id;

    -- Admins avec wildcard ont toutes les permissions
    IF user_role = 'admin' AND user_permissions ? '*' THEN
        RETURN TRUE;
    END IF;

    -- Vérifier permission spécifique
    RETURN user_permissions ? permission_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vérifier existence email (pour inscription)
CREATE OR REPLACE FUNCTION check_email_exists(email_to_check TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM auth.users WHERE email = email_to_check);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Auth Hooks

```sql
-- Hook pour injecter le rôle dans le JWT
CREATE OR REPLACE FUNCTION custom_access_token_hook(event jsonb)
RETURNS jsonb AS $$
DECLARE
    claims jsonb;
    user_role text;
BEGIN
    -- Récupérer le rôle depuis profiles
    SELECT role INTO user_role FROM profiles WHERE id = (event->>'user_id')::uuid;

    -- Injecter dans les claims
    claims := coalesce(event->'claims', '{}'::jsonb);
    claims := jsonb_set(claims, '{role}', to_jsonb(coalesce(user_role, 'user')));

    event := jsonb_set(event, '{claims}', claims);
    RETURN event;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Maintenance & Cleanup

```sql
-- Nettoyage utilisateurs anonymes expirés
CREATE OR REPLACE FUNCTION cleanup_old_anonymous_users()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Logique de nettoyage des sessions expirées
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Routine de nettoyage hebdomadaire
CREATE OR REPLACE FUNCTION run_weekly_anonymous_cleanup()
RETURNS void AS $$
BEGIN
    PERFORM cleanup_old_anonymous_users();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Migrations et Versioning

### Ordre des Migrations

1. `20250119120000_add_role_based_admin_system.sql` - Système de rôles et audit
2. `20250623170000_initial_profiles_schema.sql` - Profils utilisateurs
3. `20250623180000_initial_product_catalog_schema.sql` - Catalogue produits
4. `20250623190000_initial_cart_schema.sql` - Système de panier
5. `20250623191500_initial_order_schema.sql` - Gestion commandes
6. `20250704101800_create_audit_logs_table.sql` - Logs d'audit
7. `20250708102000_create_addresses_table.sql` - Adresses utilisateurs
8. `20250710110201_add_shipping_tables.sql` - Méthodes de livraison

### Backup et Restore

```sql
-- Backup complet
pg_dump -h localhost -U postgres -d herbis_veritas > backup_$(date +%Y%m%d).sql

-- Restore
psql -h localhost -U postgres -d herbis_veritas < backup_20250803.sql
```

## Monitoring et Métriques

### Requêtes Critiques à Surveiller

- Temps de réponse ajout au panier (< 200ms)
- Performance recherche produits (< 500ms)
- Authentification utilisateur (< 100ms)
- Chargement profil complet (< 300ms)

### Alertes

- Stock produit < 5 unités
- Échec authentification > 10/minute
- Temps de réponse > seuil critique
- Erreurs RLS (tentatives d'accès non autorisé)

---

## Triggers & Automatismes

### Triggers Principaux

```sql
-- Création automatique de profil lors de l'inscription
CREATE TRIGGER handle_new_user
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Mise à jour automatique des timestamps
CREATE TRIGGER trigger_set_timestamp
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();
```

### Hooks Supabase

- **auth.users** : Hook JWT pour injecter le rôle dans les claims
- **Inscription** : Création automatique du profil dans `public.profiles`
- **Connexion** : Fusion automatique des paniers invité → authentifié

## Principes Architecturaux

### Database-First Design

- **Logique métier** encapsulée dans les fonctions RPC PostgreSQL
- **Contraintes** définies au niveau base de données (pas seulement applicatif)
- **Performance** optimisée par les index et requêtes natives
- **Intégrité** garantie par les transactions atomiques

### Security by Design

- **RLS systématique** sur toutes les tables sensibles
- **JWT claims** comme source de vérité pour les permissions
- **Principe du moindre privilège** : politiques restrictives par défaut
- **Audit trail** immutable dans `audit_logs`

### Conventions & Best Practices

- **Nommage** : `snake_case` pour tous les objets DB
- **Migrations** : Fichiers Supabase comme unique source de vérité
- **Sécurité** : `SECURITY DEFINER` avec `SET search_path` explicite
- **Performance** : Index sur FK et colonnes fréquemment interrogées
- **Immutabilité** : Logs d'audit non modifiables/supprimables

---

**Dernière mise à jour** : 4 Août 2025  
**Version DB** : PostgreSQL 15.4 via Supabase  
**Statut** : Production - 15 tables principales + 30+ migrations actives  
**Architecture** : Database-First avec RPC + RLS complet
