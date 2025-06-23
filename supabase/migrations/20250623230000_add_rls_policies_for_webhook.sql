-- This migration adds RLS policies to allow the Stripe webhook to create orders.
-- It creates a helper function to detect a service role context (where auth.uid() is NULL)
-- and adds specific policies for the service_role to perform the necessary operations.

-- Step 1: Create a helper function to identify the service context.
CREATE OR REPLACE FUNCTION public.is_service_context()
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  -- This checks if the current session is not a regular user session.
  -- In the context of a webhook call using the service_role key, auth.uid() is NULL.
  RETURN auth.uid() IS NULL;
END;
$$;

-- Step 2: Add RLS policies for the webhook context.

-- Policy for inserting orders
CREATE POLICY "Allow service role to insert orders" ON public.orders
FOR INSERT TO service_role
WITH CHECK (public.is_service_context());

-- Policy for inserting order_items
CREATE POLICY "Allow service role to insert order_items" ON public.order_items
FOR INSERT TO service_role
WITH CHECK (public.is_service_context());

-- Policy for reading carts
CREATE POLICY "Allow service role to read carts" ON public.carts
FOR SELECT TO service_role
USING (public.is_service_context());

-- Policy for updating carts
CREATE POLICY "Allow service role to update carts" ON public.carts
FOR UPDATE TO service_role
USING (public.is_service_context())
WITH CHECK (public.is_service_context());

-- Policy for reading cart_items
CREATE POLICY "Allow service role to read cart_items" ON public.cart_items
FOR SELECT TO service_role
USING (public.is_service_context());
