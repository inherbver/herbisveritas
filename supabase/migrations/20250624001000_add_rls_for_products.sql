-- This migration adds the missing RLS policy for the products table.
-- This allows the SECURITY DEFINER function (running as 'postgres') to read product prices
-- when creating an order, which was the final cause of the silent transaction failure.

CREATE POLICY "Allow definer to read products" ON public.products
FOR SELECT TO postgres
USING (public.is_service_context());
