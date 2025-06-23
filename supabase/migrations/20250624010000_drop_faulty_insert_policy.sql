-- This migration removes the faulty RLS policy on the orders table.
-- The policy's 'WITH CHECK' clause using 'is_service_context()' was the root cause
-- of the silent transaction failures.
-- As a superuser, the 'postgres' role (used by SECURITY DEFINER) bypasses RLS by default,
-- making this policy unnecessary and harmful.

DROP POLICY IF EXISTS "Allow definer to insert orders" ON public.orders;
