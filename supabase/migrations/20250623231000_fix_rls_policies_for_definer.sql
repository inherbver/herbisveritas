-- This migration fixes the RLS policies for the webhook.
-- SECURITY DEFINER functions run as the 'postgres' user (the owner), not 'service_role'.
-- These policies grant the necessary permissions to the 'postgres' user within a service context.

-- Drop the old policies that were incorrectly targeted at 'service_role'
DROP POLICY IF EXISTS "Allow service role to insert orders" ON public.orders;
DROP POLICY IF EXISTS "Allow service role to insert order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow service role to read carts" ON public.carts;
DROP POLICY IF EXISTS "Allow service role to update carts" ON public.carts;
DROP POLICY IF EXISTS "Allow service role to read cart_items" ON public.cart_items;

-- Recreate policies for the 'postgres' user, which is the owner of SECURITY DEFINER functions.
-- We keep the check to ensure this only applies in a non-user context.

CREATE POLICY "Allow definer to insert orders" ON public.orders
FOR INSERT TO postgres
WITH CHECK (public.is_service_context());

CREATE POLICY "Allow definer to insert order_items" ON public.order_items
FOR INSERT TO postgres
WITH CHECK (public.is_service_context());

CREATE POLICY "Allow definer to read carts" ON public.carts
FOR SELECT TO postgres
USING (public.is_service_context());

CREATE POLICY "Allow definer to update carts" ON public.carts
FOR UPDATE TO postgres
USING (public.is_service_context())
WITH CHECK (public.is_service_context());

CREATE POLICY "Allow definer to read cart_items" ON public.cart_items
FOR SELECT TO postgres
USING (public.is_service_context());
