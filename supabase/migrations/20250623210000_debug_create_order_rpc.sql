-- This migration updates the create_order_from_cart function to add detailed logging and a proper return value for better debugging.

CREATE OR REPLACE FUNCTION public.create_order_from_cart(
    p_cart_id UUID,
    p_stripe_checkout_id TEXT
)
RETURNS TEXT -- Return a status message for clear feedback
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_order_id UUID;
    v_total_amount NUMERIC;
    v_cart_status TEXT;
BEGIN
    RAISE NOTICE '[RPC] Executing create_order_from_cart for cart_id: %', p_cart_id;

    -- 1. Check cart existence and status
    SELECT user_id, total_amount, status INTO v_user_id, v_total_amount, v_cart_status
    FROM public.carts
    WHERE id = p_cart_id;

    IF v_user_id IS NULL THEN
        RAISE WARNING '[RPC] Cart with ID % not found.', p_cart_id;
        RETURN 'ERROR: Cart not found';
    END IF;

    IF v_cart_status = 'completed' THEN
        RAISE WARNING '[RPC] Cart with ID % has already been processed.', p_cart_id;
        RETURN 'ERROR: Cart already processed';
    END IF;

    RAISE NOTICE '[RPC] Found cart for user_id: %. Total amount: %', v_user_id, v_total_amount;

    -- 2. Create a new order
    RAISE NOTICE '[RPC] Inserting into orders table...';
    INSERT INTO public.orders (user_id, total_amount, status, stripe_checkout_id)
    VALUES (v_user_id, v_total_amount, 'processing', p_stripe_checkout_id)
    RETURNING id INTO v_order_id;
    RAISE NOTICE '[RPC] New order created with ID: %', v_order_id;

    -- 3. Copy cart items to order items
    RAISE NOTICE '[RPC] Copying items from cart_items to order_items...';
    INSERT INTO public.order_items (order_id, product_id, quantity, price)
    SELECT v_order_id, product_id, quantity, price
    FROM public.cart_items
    WHERE cart_id = p_cart_id;
    RAISE NOTICE '[RPC] Items copied successfully.';

    -- 4. Update the cart status to 'completed'
    RAISE NOTICE '[RPC] Updating cart status to completed...';
    UPDATE public.carts
    SET status = 'completed'
    WHERE id = p_cart_id;
    RAISE NOTICE '[RPC] Cart status updated.';

    RETURN 'SUCCESS: Order ' || v_order_id || ' created.';

EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '[RPC] An unexpected error occurred in create_order_from_cart: %', SQLERRM;
        RETURN 'ERROR: ' || SQLERRM;
END;
$$;
