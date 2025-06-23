-- This migration replaces the main RPC with a simple "canary" function.
-- Its only purpose is to test the most basic INSERT operation on the 'orders' table
-- in isolation, to confirm if the core insert capability is working within a SECURITY DEFINER context.

DROP FUNCTION IF EXISTS public.create_order_from_cart(uuid, text);

CREATE OR REPLACE FUNCTION public.create_order_from_cart(
    p_cart_id UUID,
    p_stripe_checkout_id TEXT
)
RETURNS TEXT -- Returns a simple success or failure message
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_test_user_id UUID;
    v_error_message TEXT;
BEGIN
    BEGIN
        -- To satisfy the foreign key constraint, we need a real user ID.
        -- We'll just grab the first one we can find.
        SELECT id INTO v_test_user_id FROM auth.users LIMIT 1;

        IF v_test_user_id IS NULL THEN
            RETURN 'ERROR: No users found in auth.users to perform canary test.';
        END IF;

        -- Attempt the most basic insert possible.
        INSERT INTO public.orders (user_id, total_amount, status, stripe_checkout_id)
        VALUES (v_test_user_id, 99.99, 'canary_test', p_stripe_checkout_id);

    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
            RAISE WARNING '[RPC] Canary test EXCEPTION: %', v_error_message;
            RETURN 'ERROR: Canary insert failed: ' || v_error_message;
    END;

    RETURN 'SUCCESS: Canary test insert was successful.';
END;
$$;
