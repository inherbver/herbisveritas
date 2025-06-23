-- Add a status column to the carts table to track their state (e.g., active, completed).

ALTER TABLE public.carts
ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

COMMENT ON COLUMN public.carts.status IS 'The status of the cart, e.g., ''active'', ''completed'', ''abandoned''.';
