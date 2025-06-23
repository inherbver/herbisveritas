-- This migration temporarily disables the foreign key constraint on user_id in the orders table.
-- This is a diagnostic step to test the hypothesis that the SECURITY DEFINER function
-- lacks permission to validate the key against the auth.users table, causing a silent failure.

ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
