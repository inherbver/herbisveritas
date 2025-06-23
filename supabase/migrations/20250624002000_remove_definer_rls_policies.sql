-- This migration removes the explicit RLS policies for the 'postgres' user.
-- The 'postgres' role, as a superuser and table owner, bypasses RLS by default.
-- The explicit policies were likely forcing an evaluation that caused silent failures.
-- Removing them should restore the default correct behavior for the SECURITY DEFINER function.

DROP POLICY IF EXISTS "Allow definer to access carts" ON public.carts;
DROP POLICY IF EXISTS "Allow definer to access cart_items" ON public.cart_items;
DROP POLICY IF EXISTS "Allow definer to access orders" ON public.orders;
DROP POLICY IF EXISTS "Allow definer to access order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow definer to read products" ON public.products;
