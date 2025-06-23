-- This migration replaces the canary RPC with an ultra-minimalist version.
-- It attempts to insert a row with a NULL user_id to completely isolate
-- the INSERT statement from any interaction with the auth.users table.
-- This is the final test to see if the INSERT operation itself is the problem.

DROP FUNCTION IF EXISTS public.create_order_from_cart(uuid, text);

CREATE OR REPLACE FUNCTION public.create_order_from_cart(
    p_cart_id UUID,
    p_stripe_checkout_id TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_error_message TEXT;
BEGIN
    BEGIN
        -- Attempt the most basic insert possible, without touching any other table.
        -- user_id is NULL since we removed the FK constraint for testing.
        INSERT INTO public.orders (user_id, total_amount, status, stripe_checkout_id)
        VALUES (NULL, 99.99, 'ultra_canary_test', p_stripe_checkout_id);

    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
            RAISE WARNING '[RPC] Ultra Canary test EXCEPTION: %', v_error_message;
            RETURN 'ERROR: Ultra Canary insert failed: ' || v_error_message;
    END;

    RETURN 'SUCCESS: Ultra Canary test insert was successful.';
END;
$$;
