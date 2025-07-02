BEGIN;

-- 1. Create a temporary mapping of old IDs to new UUIDs
CREATE TEMP TABLE product_id_map AS
SELECT id AS old_id, gen_random_uuid()::text AS new_id
FROM public.products;

-- 2. Update foreign key references in related tables

-- Update cart_items
UPDATE public.cart_items
SET product_id = map.new_id
FROM product_id_map map
WHERE public.cart_items.product_id = map.old_id;

-- Update order_items
UPDATE public.order_items
SET product_id = map.new_id
FROM product_id_map map
WHERE public.order_items.product_id = map.old_id;

-- Update featured_hero_items
UPDATE public.featured_hero_items
SET product_id = map.new_id
FROM product_id_map map
WHERE public.featured_hero_items.product_id = map.old_id;

-- 3. Finally, update the primary keys in the products table
UPDATE public.products
SET id = map.new_id
FROM product_id_map map
WHERE public.products.id = map.old_id;

-- 4. Drop the temporary table
DROP TABLE product_id_map;

COMMIT;
