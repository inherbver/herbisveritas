-- This migration refactors the create_order_from_cart function to add robust error handling.
-- It introduces a BEGIN...EXCEPTION block to catch any SQL error during the transaction,
-- logs the specific error message, and returns it as a string.
-- This will make silent failures visible to the Edge Function and finally allow for precise debugging.

DROP FUNCTION IF EXISTS public.create_order_from_cart(uuid, text);

CREATE OR REPLACE FUNCTION public.create_order_from_cart(
    p_cart_id UUID,
    p_stripe_checkout_id TEXT
)
RETURNS TEXT -- Return a status message or an error message
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_order_id UUID;
    v_total_amount NUMERIC;
    v_cart_status TEXT;
    v_error_message TEXT;
    v_error_context TEXT;
BEGIN
    -- The entire logic is now wrapped in a single transaction block
    BEGIN
        RAISE NOTICE '[RPC] Executing create_order_from_cart for cart_id: %', p_cart_id;

        -- 1. Get cart owner and status
        SELECT user_id, status INTO v_user_id, v_cart_status
        FROM public.carts
        WHERE id = p_cart_id;

        IF v_user_id IS NULL THEN
            RETURN 'ERROR: Cart not found';
        END IF;

        IF v_cart_status = 'completed' THEN
            RETURN 'ERROR: Cart already processed';
        END IF;

        -- 2. Calculate total amount
        SELECT SUM(ci.quantity * p.price) INTO v_total_amount
        FROM public.cart_items ci
        JOIN public.products p ON ci.product_id = p.id
        WHERE ci.cart_id = p_cart_id;

        IF v_total_amount IS NULL OR v_total_amount <= 0 THEN
            RETURN 'ERROR: Cart is empty or total is zero';
        END IF;

        -- 3. Create a new order
        INSERT INTO public.orders (user_id, total_amount, status, stripe_checkout_id)
        VALUES (v_user_id, v_total_amount, 'processing', p_stripe_checkout_id)
        RETURNING id INTO v_order_id;

        -- 4. Copy cart items to order items
        INSERT INTO public.order_items (order_id, product_id, quantity, price)
        SELECT v_order_id, ci.product_id, ci.quantity, p.price
        FROM public.cart_items ci
        JOIN public.products p ON ci.product_id = p.id
        WHERE ci.cart_id = p_cart_id;

        -- 5. Update the cart status to 'completed'
        UPDATE public.carts
        SET status = 'completed'
        WHERE id = p_cart_id;

    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT,
                                  v_error_context = PG_EXCEPTION_CONTEXT;
            RAISE WARNING '[RPC] EXCEPTION CAUGHT: % | CONTEXT: %', v_error_message, v_error_context;
            RETURN 'ERROR: ' || v_error_message;
    END;

    RETURN 'SUCCESS: Order ' || v_order_id || ' created successfully.';
END;
$$;
