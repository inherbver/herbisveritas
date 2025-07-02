BEGIN;

-- Temporarily bypass FK constraints for this session by changing the role
SET session_replication_role = 'replica';

-- Create a temporary mapping of old IDs to new UUIDs
CREATE TEMP TABLE product_id_map AS
SELECT id AS old_id, gen_random_uuid()::text AS new_id
FROM public.products;

-- Update parent and child tables
UPDATE public.products
SET id = map.new_id
FROM product_id_map map
WHERE public.products.id = map.old_id;

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

-- Restore normal session behavior
SET session_replication_role = 'origin';

COMMIT;
