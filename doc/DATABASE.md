# Guide de la Base de Données

## Schéma de la Base de Données

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
  id uuid default uuid_generate_v4() primary key,
  sku text unique not null,
  name text not null,
  description text,
  price numeric(10,2) not null,
  compare_at_price numeric(10,2),
  cost_per_item numeric(10,2),
  is_taxable boolean default true,
  is_active boolean default true,
  requires_shipping boolean default true,
  weight numeric(10,2),
  weight_unit text default 'g',
  barcode text,
  inventory_quantity integer default 0,
  allow_backorder boolean default false,
  seo_title text,
  seo_description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
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

Gestion des commandes.

```sql
create table public.orders (
  id uuid default uuid_generate_v4() primary key,
  order_number text unique not null,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  status text not null default 'pending',
  subtotal numeric(10,2) not null,
  total_tax numeric(10,2) not null default 0,
  total_discounts numeric(10,2) not null default 0,
  total_shipping numeric(10,2) not null default 0,
  total_price numeric(10,2) not null,
  currency text not null default 'EUR',
  billing_address_id uuid references addresses(id),
  shipping_address_id uuid references addresses(id),
  payment_status text not null default 'pending',
  fulfillment_status text,
  notes text,
  cancelled_at timestamp with time zone,
  cancelled_reason text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.order_items (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references orders(id) on delete cascade not null,
  product_id uuid references products(id) on delete set null,
  variant_id uuid references product_variants(id) on delete set null,
  title text not null,
  variant_title text,
  sku text,
  quantity integer not null,
  original_price numeric(10,2) not null,
  price numeric(10,2) not null,
  tax_lines jsonb[],
  discount_allocations jsonb[],
  requires_shipping boolean default true,
  taxable boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_order_items_order_id on public.order_items(order_id);
create index idx_order_items_product_id on public.order_items(product_id);
create index idx_order_items_variant_id on public.order_items(variant_id);
```

#### 7. `addresses`

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
