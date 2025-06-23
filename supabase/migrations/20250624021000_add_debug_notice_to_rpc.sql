-- This migration adds a RAISE NOTICE to the create_order_from_cart function
-- to log the execution context (session_user, current_user, search_path).
-- This is a debugging step to verify the roles and settings during execution.

CREATE OR REPLACE FUNCTION public.create_order_from_cart(
    p_cart_id UUID,
    p_stripe_checkout_id TEXT
)
RETURNS TEXT -- Returns a success message or an error message
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_order_id UUID;
    v_total_amount NUMERIC;
    v_cart_status TEXT;
    v_error_message TEXT;
BEGIN
    -- Debugging line to check the execution context
    RAISE NOTICE '[RPC DEBUG] session_user=% current_user=% search_path=%',
      session_user, current_user, current_setting('search_path');

    BEGIN
        -- All table references are explicitly schema-qualified (e.g., public.carts)
        SELECT user_id, status INTO v_user_id, v_cart_status
        FROM public.carts
        WHERE id = p_cart_id;

        IF v_cart_status = 'processed' THEN
            RETURN 'ERROR: Cart is already processed.';
        END IF;

        SELECT SUM(ci.quantity * p.price) INTO v_total_amount
        FROM public.cart_items ci
        JOIN public.products p ON ci.product_id = p.id
        WHERE ci.cart_id = p_cart_id;

        INSERT INTO public.orders (user_id, total_amount, status, stripe_checkout_id)
        VALUES (v_user_id, v_total_amount, 'pending', p_stripe_checkout_id)
        RETURNING id INTO v_order_id;

        INSERT INTO public.order_items (order_id, product_id, quantity, price)
        SELECT v_order_id, ci.product_id, ci.quantity, p.price
        FROM public.cart_items ci
        JOIN public.products p ON ci.product_id = p.id
        WHERE ci.cart_id = p_cart_id;

        UPDATE public.carts
        SET status = 'processed'
        WHERE id = p_cart_id;

    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
            RAISE WARNING '[RPC create_order_from_cart] EXCEPTION: %', v_error_message;
            RETURN 'ERROR: ' || v_error_message;
    END;

    RETURN 'SUCCESS: Order ' || v_order_id || ' created successfully.';
END;
$$;
