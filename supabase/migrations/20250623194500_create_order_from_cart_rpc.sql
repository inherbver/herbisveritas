-- supabase/migrations/YYYYMMDDHHMMSS_create_order_from_cart_rpc.sql

CREATE OR REPLACE FUNCTION public.create_order_from_cart(
    p_cart_id UUID,
    p_stripe_checkout_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Important: Allows the function to run with the permissions of the user who defined it
AS $$
DECLARE
    v_user_id UUID;
    v_order_id UUID;
    v_total_amount NUMERIC;
BEGIN
    -- 1. Get user_id and calculate total amount from the cart
    SELECT user_id, total_amount INTO v_user_id, v_total_amount
    FROM public.carts
    WHERE id = p_cart_id;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Cart with ID % not found', p_cart_id;
    END IF;

    -- 2. Create a new order
    INSERT INTO public.orders (user_id, total_amount, status, stripe_checkout_id)
    VALUES (v_user_id, v_total_amount, 'processing', p_stripe_checkout_id)
    RETURNING id INTO v_order_id;

    -- 3. Copy cart items to order items
    INSERT INTO public.order_items (order_id, product_id, quantity, price)
    SELECT v_order_id, product_id, quantity, price
    FROM public.cart_items
    WHERE cart_id = p_cart_id;

    -- 4. Update the cart status to 'completed' to prevent reuse
    UPDATE public.carts
    SET status = 'completed'
    WHERE id = p_cart_id;

    -- Optional: Could also delete the cart and items if preferred
    -- DELETE FROM public.cart_items WHERE cart_id = p_cart_id;
    -- DELETE FROM public.carts WHERE id = p_cart_id;

END;
$$;
