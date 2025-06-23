-- This migration provides the definitive fix for the order creation failure.
-- 1. It drops the 'price' column that was added by mistake in a previous migration.
-- 2. It updates the 'create_order_from_cart' RPC to insert into the correct column, 'price_at_purchase',
--    resolving the 'violates not-null constraint' error.

-- Step 1: Clean up the schema by dropping the incorrect column.
ALTER TABLE public.order_items DROP COLUMN IF EXISTS price;

-- Step 2: Recreate the function with the correct column name in the INSERT statement.
CREATE OR REPLACE FUNCTION public.create_order_from_cart(
    p_cart_id UUID,
    p_stripe_checkout_id TEXT
)
RETURNS TEXT
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
    BEGIN
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
        VALUES (v_user_id, v_total_amount, 'processing', p_stripe_checkout_id)
        RETURNING id INTO v_order_id;

        -- DEFINITIVE FIX: Target the correct 'price_at_purchase' column.
        INSERT INTO public.order_items (order_id, product_id, quantity, price_at_purchase)
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
