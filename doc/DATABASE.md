# Guide de la Base de Données

## Schéma de la Base de Données

### Types Énumérés (ENUMs)

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

### Tables Principales

#### 1. `profiles`

Extension de la table `auth.users` de Supabase pour stocker des informations supplémentaires sur les utilisateurs.

```sql
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  first_name text,
  last_name text,
  email text,
  phone text,
  avatar_url text,
  billing_address_id uuid references addresses(id),
  shipping_address_id uuid references addresses(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

#### 2. `products`

Catalogue des produits disponibles à la vente.

```sql
create table public.products (
  id text primary key, -- Unique product identifier (e.g., prod_cos_003)
  name text not null,
  description_short text, -- Short description for product listings
  description_long text, -- Detailed description for the product page
  price numeric(10,2) not null check (price >= 0),
  compare_at_price numeric(10,2), -- Optional: for sales display
  stock integer default 0 not null check (stock >= 0),
  image_url text, -- Main image URL for the product
  slug text unique, -- URL-friendly identifier for the product
  is_new boolean default false not null,
  is_on_promotion boolean default false not null,
  is_active boolean default true not null, -- Whether the product is publicly visible/available
  -- Other potential fields like sku, cost_per_item, is_taxable, etc. can be added based on full schema.
  -- The fields above are based on confirmed MCP output for 'products'.
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

COMMENT ON TABLE public.products IS 'Catalogue des produits disponibles à la vente.';
COMMENT ON COLUMN public.products.id IS 'Unique product identifier (e.g., prod_cos_003, must be text).';
COMMENT ON COLUMN public.products.description_short IS 'Short description for product listings.';
COMMENT ON COLUMN public.products.description_long IS 'Detailed description for the product page.';
COMMENT ON COLUMN public.products.image_url IS 'Main image URL for the product, can be hosted on Supabase Storage or external.';
COMMENT ON COLUMN public.products.slug IS 'URL-friendly identifier, typically generated from the product name. Should be unique.';
COMMENT ON COLUMN public.products.is_new IS 'Flag to indicate if the product is new.';
COMMENT ON COLUMN public.products.is_on_promotion IS 'Flag to indicate if the product is currently on promotion.';
COMMENT ON COLUMN public.products.is_active IS 'Controls whether the product is listed and sellable.';
```

#### 3. `product_variants`

Variantes de produits (taille, couleur, etc.).

```sql
create table public.product_variants (
  id uuid default uuid_generate_v4() primary key,
  product_id uuid references products(id) on delete cascade not null,
  sku text,
  option1 text,
  option2 text,
  option3 text,
  price numeric(10,2),
  compare_at_price numeric(10,2),
  inventory_quantity integer default 0,
  barcode text,
  weight numeric(10,2),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

#### 4. `product_images`

Images associées aux produits.

```sql
create table public.product_images (
  id uuid default uuid_generate_v4() primary key,
  product_id uuid references products(id) on delete cascade not null,
  variant_id uuid references product_variants(id) on delete cascade,
  src text not null,
  alt text,
  position integer default 0,
  width integer,
  height integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_product_images_product_id on public.product_images(product_id);
create index idx_product_images_variant_id on public.product_images(variant_id);
```

#### 5. `categories` et `product_categories`

Catégorisation des produits.

```sql
create table public.categories (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  parent_id uuid references categories(id) on delete set null,
  image text,
  is_active boolean default true,
  position integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.product_categories (
  id uuid default uuid_generate_v4() primary key,
  product_id uuid references products(id) on delete cascade not null,
  category_id uuid references categories(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(product_id, category_id)
);
```

#### 6. `orders` et `order_items`

Gestion des commandes des clients.

##### `public.orders`

Stocke les informations générales sur une commande.

```sql
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL, -- Garde la commande si l'utilisateur est supprimé
    order_number TEXT UNIQUE, -- Numéro de commande unique, lisible par l'homme (ex: ORD-23-000001)
    status public.order_status_type NOT NULL DEFAULT 'pending_payment',
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0), -- Montant total de la commande
    currency CHAR(3) NOT NULL DEFAULT 'EUR', -- Devise de la commande

    shipping_address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL, -- Adresse de livraison
    billing_address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL, -- Adresse de facturation

    shipping_fee NUMERIC(10, 2) DEFAULT 0.00 CHECK (shipping_fee >= 0), -- Frais de port
    notes TEXT, -- Notes du client ou notes internes

    payment_method TEXT, -- Méthode de paiement (ex: 'stripe', 'paypal')
    payment_intent_id TEXT, -- ID de l'intention de paiement du fournisseur (ex: pi_xxx de Stripe)
    payment_status public.payment_status_type NOT NULL DEFAULT 'pending', -- Statut du paiement

    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.orders IS 'Stocke les informations générales sur une commande.';
COMMENT ON COLUMN public.orders.user_id IS 'Référence à l''utilisateur ayant passé la commande. ON DELETE SET NULL pour conserver l''historique des commandes.';
COMMENT ON COLUMN public.orders.order_number IS 'Numéro de commande unique et lisible par l''homme, potentiellement généré par l''application.';
COMMENT ON COLUMN public.orders.status IS 'Statut actuel de la commande (cf. order_status_type).';
COMMENT ON COLUMN public.orders.total_amount IS 'Montant total payé pour la commande, incluant taxes et frais de port, après réductions.';
COMMENT ON COLUMN public.orders.shipping_address_id IS 'Référence à l''adresse de livraison.';
COMMENT ON COLUMN public.orders.billing_address_id IS 'Référence à l''adresse de facturation.';
COMMENT ON COLUMN public.orders.payment_intent_id IS 'Identifiant de la transaction ou de l''intention de paiement auprès du fournisseur de services de paiement.';
COMMENT ON COLUMN public.orders.payment_status IS 'Statut du paiement de la commande (cf. payment_status_type).';

-- Index pour optimiser les requêtes courantes
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX idx_orders_order_number ON public.orders(order_number); -- Utile si recherché par numéro

-- Déclencheur pour mettre à jour 'updated_at' automatiquement
CREATE TRIGGER handle_updated_at_orders
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column(); -- Assure que la fonction public.update_updated_at_column() existe
```

##### `public.order_items`

Détaille les produits inclus dans chaque commande.

```sql
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE, -- Si la commande est supprimée, ses items le sont aussi
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT, -- Empêche la suppression d'un produit s'il est dans une commande

    quantity INTEGER NOT NULL CHECK (quantity > 0), -- Quantité du produit commandé
    price_at_purchase NUMERIC(10, 2) NOT NULL CHECK (price_at_purchase >= 0), -- Prix unitaire du produit au moment de l'achat

    -- Informations dénormalisées du produit au moment de l'achat pour l'historique
    product_sku_at_purchase TEXT,
    product_name_at_purchase TEXT,
    product_image_url_at_purchase TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.order_items IS 'Détaille les produits inclus dans chaque commande.';
COMMENT ON COLUMN public.order_items.order_id IS 'Référence à la commande parente. ON DELETE CASCADE supprime les items si la commande est supprimée.';
COMMENT ON COLUMN public.order_items.product_id IS 'Référence au produit commandé. ON DELETE RESTRICT empêche la suppression du produit si commandé.';
COMMENT ON COLUMN public.order_items.price_at_purchase IS 'Prix unitaire du produit au moment de la commande, pour l''historique des prix.';
COMMENT ON COLUMN public.order_items.product_name_at_purchase IS 'Nom du produit au moment de la commande (dénormalisé).';

-- Index pour optimiser les requêtes sur les items de commande
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_product_id ON public.order_items(product_id);

-- Déclencheur pour mettre à jour 'updated_at' automatiquement
CREATE TRIGGER handle_updated_at_order_items
BEFORE UPDATE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column(); -- Assure que la fonction public.update_updated_at_column() existe
```

#### 7. `featured_hero_items`

Stores products featured in the hero section, with custom subtitles.

```sql
create table public.featured_hero_items (
    id uuid default uuid_generate_v4() primary key,
    product_id text not null references public.products(id) on delete cascade,
    custom_subtitle text not null,
    is_active boolean default false not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

COMMENT ON TABLE public.featured_hero_items IS 'Stores products featured in the hero section, with custom subtitles.';
COMMENT ON COLUMN public.featured_hero_items.product_id IS 'FK to the product being featured (references products.id which is TEXT).';
COMMENT ON COLUMN public.featured_hero_items.custom_subtitle IS 'Custom subtitle text for the hero section, written by admin.';
COMMENT ON COLUMN public.featured_hero_items.is_active IS 'Whether this item is currently the active one for the hero section.';
```

#### 8. `addresses`

Adresses des utilisateurs.

```sql
create table public.addresses (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  company text,
  address1 text not null,
  address2 text,
  city text not null,
  province text,
  postal_code text not null,
  country text not null,
  phone text,
  is_default boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

#### 9. `carts` et `cart_items`

Gestion des paniers d'achats des utilisateurs.

##### `public.carts`

Stocke les paniers d'achats des utilisateurs connectés et des invités.

```sql
CREATE TABLE public.carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Si l'utilisateur est supprimé, son panier l'est aussi
    guest_id UUID, -- Identifiant pour les paniers des invités

    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    metadata JSONB, -- Pour des informations supplémentaires (ex: coupon appliqué)

    CONSTRAINT unique_user_cart UNIQUE (user_id),
    CONSTRAINT unique_guest_cart UNIQUE (guest_id),
    CONSTRAINT cart_owner_check CHECK (
        (user_id IS NOT NULL AND guest_id IS NULL) OR
        (user_id IS NULL AND guest_id IS NOT NULL)
    )
);

COMMENT ON TABLE public.carts IS 'Stocke les paniers d''achats des utilisateurs connectés et des invités.';
COMMENT ON COLUMN public.carts.user_id IS 'Référence à l''utilisateur propriétaire du panier (si connecté).';
COMMENT ON COLUMN public.carts.guest_id IS 'Identifiant unique pour le panier d''un utilisateur invité (non connecté).';
COMMENT ON COLUMN public.carts.metadata IS 'Champ JSONB flexible pour stocker des métadonnées relatives au panier.';

-- Déclencheur pour mettre à jour 'updated_at' automatiquement
CREATE TRIGGER handle_updated_at_carts
BEFORE UPDATE ON public.carts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column(); -- Assure que la fonction public.update_updated_at_column() existe
```

##### `public.cart_items`

Détaille les produits et leurs quantités dans un panier.

```sql
CREATE TABLE public.cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE, -- Si le panier est supprimé, ses items le sont aussi
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE, -- Si le produit est supprimé, le retirer du panier
    -- variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE, -- Optionnel, si variantes utilisées

    quantity INTEGER NOT NULL CHECK (quantity > 0),

    added_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT unique_product_in_cart UNIQUE (cart_id, product_id) -- Ajoutez variant_id ici si les variantes sont utilisées
);

COMMENT ON TABLE public.cart_items IS 'Détaille les produits et leurs quantités dans un panier.';
COMMENT ON COLUMN public.cart_items.cart_id IS 'Référence au panier parent.';
COMMENT ON COLUMN public.cart_items.product_id IS 'Référence au produit ajouté au panier.';
COMMENT ON COLUMN public.cart_items.quantity IS 'Quantité du produit dans le panier.';
```

## Sécurité (RLS - Row Level Security)

### Politiques de Sécurité

#### 1. `profiles`

```sql
-- Les utilisateurs peuvent voir leur propre profil
create policy "Users can view their own profile"
on profiles for select
using (auth.uid() = id);

-- Les utilisateurs peuvent mettre à jour leur propre profil
create policy "Users can update their own profile"
on profiles for update
using (auth.uid() = id);
```

#### 2. `orders`

```sql
-- Les utilisateurs peuvent voir leurs propres commandes
create policy "Users can view their own orders"
on orders for select
using (auth.uid() = user_id);

-- Les utilisateurs peuvent créer des commandes
create policy "Users can create orders"
on orders for insert
with check (auth.uid() = user_id);
```

#### 3. `carts` et `cart_items`

##### `public.carts`

```sql
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs authentifiés peuvent gérer leur propre panier
CREATE POLICY "Allow user to manage own cart"
ON public.carts
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Les administrateurs peuvent VOIR tous les paniers
CREATE POLICY "Allow admin to select all carts"
ON public.carts
FOR SELECT
TO authenticated
USING (public.get_my_custom_role() = 'admin');

-- Les administrateurs peuvent METTRE À JOUR tous les paniers
CREATE POLICY "Allow admin to update all carts"
ON public.carts
FOR UPDATE
TO authenticated
USING (public.get_my_custom_role() = 'admin')
WITH CHECK (public.get_my_custom_role() = 'admin');
```

##### `public.cart_items`

```sql
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs authentifiés peuvent gérer les articles de leur propre panier
CREATE POLICY "Allow user to manage items in own cart"
ON public.cart_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.carts c
    WHERE c.id = cart_id AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.carts c
    WHERE c.id = cart_id AND c.user_id = auth.uid()
  )
);

-- Les administrateurs peuvent VOIR tous les articles de panier
CREATE POLICY "Allow admin to select all cart_items"
ON public.cart_items
FOR SELECT
TO authenticated
USING (public.get_my_custom_role() = 'admin');

-- Les administrateurs peuvent METTRE À JOUR tous les articles de panier
CREATE POLICY "Allow admin to update all cart_items"
ON public.cart_items
FOR UPDATE
TO authenticated
USING (public.get_my_custom_role() = 'admin')
WITH CHECK (public.get_my_custom_role() = 'admin');
```

## Index

### Index Recommandés

```sql
-- Index pour les recherches de produits
create index idx_products_name on public.products using gin (to_tsvector('french', name));
create index idx_products_sku on public.products(sku);
create index idx_products_is_active on public.products(is_active);

-- Index pour les commandes
create index idx_orders_user_id on public.orders(user_id);
create index idx_orders_order_number on public.orders(order_number);
create index idx_orders_created_at on public.orders(created_at);

-- Index pour les adresses
create index idx_addresses_user_id on public.addresses(user_id);
```

## Fonctions Utiles

### Mise à jour des Horodatages

```sql
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql security definer;

-- Appliquer le déclencheur aux tables nécessaires
create trigger handle_products_updated_at
before update on public.products
for each row execute function public.handle_updated_at();

create trigger handle_orders_updated_at
before update on public.orders
for each row execute function public.handle_updated_at();
```

### Calcul du Stock Disponible

```sql
create or replace function public.get_available_inventory(product_id uuid)
returns integer as $$
declare
  total_ordered integer;
  total_inventory integer;
begin
  -- Calculer le nombre total d'unités commandées mais pas encore expédiées
  select coalesce(sum(oi.quantity), 0) into total_ordered
  from order_items oi
  join orders o on oi.order_id = o.id
  where oi.product_id = $1
  and o.fulfillment_status is null
  and o.cancelled_at is null;

  -- Obtenir le stock total disponible
  select inventory_quantity into total_inventory
  from products
  where id = $1;

  -- Retourner le stock disponible (stock total - commandes en attente)
  return greatest(0, total_inventory - total_ordered);
end;
$$ language plpgsql stable security definer;
```

### Gestion des Rôles Utilisateurs

#### `public.get_my_custom_role()`

Récupère le rôle de l'utilisateur actuellement authentifié à partir de la table `public.profiles`.
Cette fonction est cruciale pour les politiques de sécurité au niveau des lignes (RLS) basées sur les rôles.
Elle est définie avec `SECURITY DEFINER` pour permettre un accès sécurisé aux informations de rôle et `SET search_path = public` pour prévenir les attaques par détournement de `search_path`.

```sql
CREATE OR REPLACE FUNCTION public.get_my_custom_role()
RETURNS text -- Ou le type ENUM approprié si vous en avez un pour les rôles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public -- Assure que les références sont résolues correctement et de manière sécurisée
AS $function$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid() -- 'id' dans profiles est la FK vers auth.users.id
  LIMIT 1; -- Assure un seul retour, même si id est une clé primaire
$function$
```

## Migration et Maintenance

### Script de Migration

```bash
# Créer une nouvelle migration
supabase migration new create_initial_schema

# Appliquer les migrations
supabase db push

# Réinitialiser la base de données (développement uniquement)
supabase db reset
```

### Sauvegarde et Restauration

```bash
# Sauvegarder la base de données
pg_dump -h db.xxx.supabase.co -U postgres -d postgres -F c -f backup.dump

# Restaurer la base de données
pg_restore -h db.xxx.supabase.co -U postgres -d postgres backup.dump
```

## Bonnes Pratiques

### Conception de la Base de Données

- Utiliser des clés étrangères pour maintenir l'intégrité référentielle
- Définir des contraintes NOT NULL lorsque c'est approprié
- Utiliser des types de données appropriés (par exemple, NUMERIC pour les montants monétaires)
- Documenter les tables et les colonnes avec des commentaires

### Performances

- Créer des index sur les colonnes fréquemment utilisées dans les conditions WHERE et les jointures
- Éviter les opérations coûteuses dans les boucles
- Utiliser EXPLAIN ANALYZE pour identifier les goulots d'étranglement

### Sécurité

- Toujours utiliser RLS pour restreindre l'accès aux données
- Valider toutes les entrées utilisateur
- Utiliser des requêtes paramétrées pour éviter les injections SQL
- Limiter les privilèges des utilisateurs de la base de données
