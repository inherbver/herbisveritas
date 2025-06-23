-- This migration fixes a critical schema mismatch identified during direct SQL testing.
-- The RPC 'create_order_from_cart' was attempting to insert into a non-existent 'price' column
-- in the 'order_items' table. This was the root cause of the silent failures.
-- This migration adds the required 'price' column to 'order_items' to store the price at the time of purchase.

ALTER TABLE public.order_items
ADD COLUMN price NUMERIC NOT NULL;
