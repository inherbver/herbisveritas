BEGIN;

-- Disable triggers on child tables to prevent FK checks temporarily
ALTER TABLE public.cart_items DISABLE TRIGGER ALL;
ALTER TABLE public.order_items DISABLE TRIGGER ALL;
ALTER TABLE public.featured_hero_items DISABLE TRIGGER ALL;

-- Create a temporary mapping of old IDs to new UUIDs
CREATE TEMP TABLE product_id_map AS
SELECT id AS old_id, gen_random_uuid()::text AS new_id
FROM public.products;

-- Update the parent table first
UPDATE public.products
SET id = map.new_id
FROM product_id_map map
WHERE public.products.id = map.old_id;

-- Now update the child tables
UPDATE public.cart_items
SET product_id = map.new_id
FROM product_id_map map
WHERE public.cart_items.product_id = map.old_id;

UPDATE public.order_items
SET product_id = map.new_id
FROM product_id_map map
WHERE public.order_items.product_id = map.old_id;

UPDATE public.featured_hero_items
SET product_id = map.new_id
FROM product_id_map map
WHERE public.featured_hero_items.product_id = map.old_id;

-- Drop the temporary table
DROP TABLE product_id_map;

-- Re-enable triggers
ALTER TABLE public.cart_items ENABLE TRIGGER ALL;
ALTER TABLE public.order_items ENABLE TRIGGER ALL;
ALTER TABLE public.featured_hero_items ENABLE TRIGGER ALL;

COMMIT;
