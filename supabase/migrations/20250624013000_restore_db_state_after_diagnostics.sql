-- This migration restores the database to its state before the diagnostic tests.
-- It performs three actions:
-- 1. Revokes the SELECT permission on auth.users from the postgres role.
-- 2. Re-enables the foreign key constraint on orders.user_id.
-- 3. Restores the original, full-featured 'create_order_from_cart' RPC function.

-- Action 1: Revoke permission
REVOKE SELECT ON TABLE auth.users FROM postgres;

-- Action 2: Restore Foreign Key
-- Note: We add this constraint back. It was temporarily disabled for testing.
ALTER TABLE public.orders
ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

-- Action 3: Restore original RPC function
DROP FUNCTION IF EXISTS public.create_order_from_cart(uuid, text);

CREATE OR REPLACE FUNCTION public.create_order_from_cart(
    p_cart_id UUID,
    p_stripe_checkout_id TEXT
)
RETURNS TEXT -- Returns a success message or an error message
LANGUAGE plpgsql
SECURITY DEFINER
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
