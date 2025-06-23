-- This migration adds the missing stripe_checkout_id column to the orders table.
-- This resolves the schema mismatch that was causing the create_order_from_cart RPC to fail.

ALTER TABLE public.orders
ADD COLUMN stripe_checkout_id TEXT;

COMMENT ON COLUMN public.orders.stripe_checkout_id IS 'The ID of the Stripe Checkout session that created this order.';
