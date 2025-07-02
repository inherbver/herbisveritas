-- Comprehensive migration to change products.id and all referencing columns to UUID

BEGIN;

-- Step 1: Drop all existing foreign key constraints pointing to products.id
ALTER TABLE public.cart_items DROP CONSTRAINT IF EXISTS cart_items_product_id_fkey;
ALTER TABLE public.featured_hero_items DROP CONSTRAINT IF EXISTS featured_hero_items_product_id_fkey;
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;
ALTER TABLE public.product_translations DROP CONSTRAINT IF EXISTS product_translations_product_id_fkey;

-- Step 2: Alter the primary key of the products table to UUID
-- All data is already in UUID format, so a simple cast is sufficient.
ALTER TABLE public.products
  ALTER COLUMN id TYPE UUID USING (id::uuid);

-- Step 3: Alter the foreign key columns in referencing tables to UUID
ALTER TABLE public.cart_items
  ALTER COLUMN product_id TYPE UUID USING (product_id::uuid);

ALTER TABLE public.featured_hero_items
  ALTER COLUMN product_id TYPE UUID USING (product_id::uuid);

ALTER TABLE public.order_items
  ALTER COLUMN product_id TYPE UUID USING (product_id::uuid);

ALTER TABLE public.product_translations
  ALTER COLUMN product_id TYPE UUID USING (product_id::uuid);

-- Step 4: Re-add the foreign key constraints with proper ON DELETE behavior
ALTER TABLE public.cart_items
  ADD CONSTRAINT cart_items_product_id_fkey
  FOREIGN KEY (product_id)
  REFERENCES public.products(id)
  ON DELETE CASCADE;

ALTER TABLE public.featured_hero_items
  ADD CONSTRAINT featured_hero_items_product_id_fkey
  FOREIGN KEY (product_id)
  REFERENCES public.products(id)
  ON DELETE CASCADE;

-- For order_items, we use ON DELETE SET NULL to preserve order history
ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_product_id_fkey
  FOREIGN KEY (product_id)
  REFERENCES public.products(id)
  ON DELETE SET NULL;

ALTER TABLE public.product_translations
  ADD CONSTRAINT product_translations_product_id_fkey
  FOREIGN KEY (product_id)
  REFERENCES public.products(id)
  ON DELETE CASCADE;

COMMIT;
