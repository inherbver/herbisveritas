-- ============================================================================
-- MISSING RPC FUNCTIONS - CRITICAL FOR CART FUNCTIONALITY
-- ============================================================================
-- Problem: Cart actions reference RPC functions that don't exist in migrations
-- Impact: Cart operations may fail or have degraded performance

-- ============================================================================
-- 1. ADD_OR_UPDATE_CART_ITEM FUNCTION
-- ============================================================================
-- Used in: cartActions.ts line 132
-- Purpose: Atomic cart item addition with quantity merging

CREATE OR REPLACE FUNCTION add_or_update_cart_item(
  p_cart_id UUID,
  p_product_id TEXT,
  p_quantity_to_add INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_existing_quantity INTEGER := 0;
  v_new_quantity INTEGER;
  v_product_exists BOOLEAN;
BEGIN
  -- Validate inputs
  IF p_cart_id IS NULL OR p_product_id IS NULL OR p_quantity_to_add <= 0 THEN
    RAISE EXCEPTION 'Invalid input parameters';
  END IF;

  -- Verify product exists and is active
  SELECT EXISTS(
    SELECT 1 FROM public.products 
    WHERE id = p_product_id AND is_active = true
  ) INTO v_product_exists;
  
  IF NOT v_product_exists THEN
    RAISE EXCEPTION 'Product not found or inactive: %', p_product_id;
  END IF;

  -- Check if item already exists in cart
  SELECT quantity INTO v_existing_quantity
  FROM public.cart_items
  WHERE cart_id = p_cart_id AND product_id = p_product_id;

  IF FOUND THEN
    -- Update existing item
    v_new_quantity := v_existing_quantity + p_quantity_to_add;
    
    UPDATE public.cart_items 
    SET 
      quantity = v_new_quantity,
      updated_at = NOW()
    WHERE cart_id = p_cart_id AND product_id = p_product_id;
  ELSE
    -- Insert new item
    INSERT INTO public.cart_items (cart_id, product_id, quantity)
    VALUES (p_cart_id, p_product_id, p_quantity_to_add);
  END IF;

  -- Update cart timestamp
  UPDATE public.carts 
  SET updated_at = NOW() 
  WHERE id = p_cart_id;

  -- Log the operation for audit
  INSERT INTO public.audit_logs (
    event_type,
    data,
    severity
  ) VALUES (
    'CART_ITEM_ADDED',
    jsonb_build_object(
      'cart_id', p_cart_id,
      'product_id', p_product_id,
      'quantity_added', p_quantity_to_add,
      'new_total_quantity', COALESCE(v_new_quantity, p_quantity_to_add)
    ),
    'INFO'
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log error for debugging
    INSERT INTO public.audit_logs (
      event_type,
      data,
      severity
    ) VALUES (
      'CART_ITEM_ADD_ERROR',
      jsonb_build_object(
        'cart_id', p_cart_id,
        'product_id', p_product_id,
        'quantity_to_add', p_quantity_to_add,
        'error_message', SQLERRM
      ),
      'ERROR'
    );
    RAISE;
END;
$$;

-- ============================================================================
-- 2. MERGE_CARTS FUNCTION
-- ============================================================================
-- Used in: cartActions.ts line 432
-- Purpose: Merge guest cart into authenticated user cart

CREATE OR REPLACE FUNCTION merge_carts(
  p_guest_cart_id UUID,
  p_auth_cart_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_guest_item RECORD;
  v_auth_quantity INTEGER;
  v_merged_count INTEGER := 0;
BEGIN
  -- Validate inputs
  IF p_guest_cart_id IS NULL OR p_auth_cart_id IS NULL THEN
    RAISE EXCEPTION 'Invalid cart IDs provided';
  END IF;

  -- Ensure carts exist
  IF NOT EXISTS(SELECT 1 FROM public.carts WHERE id = p_guest_cart_id) THEN
    RAISE EXCEPTION 'Guest cart not found: %', p_guest_cart_id;
  END IF;

  IF NOT EXISTS(SELECT 1 FROM public.carts WHERE id = p_auth_cart_id) THEN
    RAISE EXCEPTION 'Authenticated cart not found: %', p_auth_cart_id;
  END IF;

  -- Process each item in guest cart
  FOR v_guest_item IN 
    SELECT product_id, quantity 
    FROM public.cart_items 
    WHERE cart_id = p_guest_cart_id
  LOOP
    -- Check if product already exists in auth cart
    SELECT quantity INTO v_auth_quantity
    FROM public.cart_items
    WHERE cart_id = p_auth_cart_id AND product_id = v_guest_item.product_id;

    IF FOUND THEN
      -- Update existing item (merge quantities)
      UPDATE public.cart_items 
      SET 
        quantity = quantity + v_guest_item.quantity,
        updated_at = NOW()
      WHERE cart_id = p_auth_cart_id AND product_id = v_guest_item.product_id;
    ELSE
      -- Insert new item from guest cart
      INSERT INTO public.cart_items (cart_id, product_id, quantity)
      VALUES (p_auth_cart_id, v_guest_item.product_id, v_guest_item.quantity);
    END IF;

    v_merged_count := v_merged_count + 1;
  END LOOP;

  -- Delete guest cart items
  DELETE FROM public.cart_items WHERE cart_id = p_guest_cart_id;

  -- Delete guest cart
  DELETE FROM public.carts WHERE id = p_guest_cart_id;

  -- Update auth cart timestamp
  UPDATE public.carts 
  SET updated_at = NOW() 
  WHERE id = p_auth_cart_id;

  -- Log the merge operation
  INSERT INTO public.audit_logs (
    event_type,
    data,
    severity
  ) VALUES (
    'CART_MERGE_COMPLETED',
    jsonb_build_object(
      'guest_cart_id', p_guest_cart_id,
      'auth_cart_id', p_auth_cart_id,
      'items_merged', v_merged_count
    ),
    'INFO'
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log error and re-raise
    INSERT INTO public.audit_logs (
      event_type,
      data,
      severity
    ) VALUES (
      'CART_MERGE_ERROR',
      jsonb_build_object(
        'guest_cart_id', p_guest_cart_id,
        'auth_cart_id', p_auth_cart_id,
        'error_message', SQLERRM
      ),
      'ERROR'
    );
    RAISE;
END;
$$;

-- ============================================================================
-- 3. ENHANCED CART CLEANUP FUNCTION
-- ============================================================================
-- Optimize the existing cleanup function for better performance

CREATE OR REPLACE FUNCTION cleanup_expired_guest_carts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deleted_count INTEGER := 0;
  v_cutoff_date TIMESTAMPTZ;
BEGIN
  -- Delete guest carts older than 30 days
  v_cutoff_date := NOW() - INTERVAL '30 days';

  -- Delete cart items first (foreign key constraint)
  DELETE FROM public.cart_items 
  WHERE cart_id IN (
    SELECT id FROM public.carts 
    WHERE user_id IS NULL 
    AND guest_id IS NOT NULL 
    AND updated_at < v_cutoff_date
  );

  -- Delete expired guest carts
  DELETE FROM public.carts 
  WHERE user_id IS NULL 
  AND guest_id IS NOT NULL 
  AND updated_at < v_cutoff_date;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Log cleanup operation
  INSERT INTO public.audit_logs (
    event_type,
    data,
    severity
  ) VALUES (
    'GUEST_CART_CLEANUP',
    jsonb_build_object(
      'deleted_count', v_deleted_count,
      'cutoff_date', v_cutoff_date
    ),
    'INFO'
  );

  RETURN v_deleted_count;
END;
$$;

-- ============================================================================
-- 4. CART STATISTICS FUNCTION (BONUS)
-- ============================================================================
-- Useful for monitoring cart performance and usage

CREATE OR REPLACE FUNCTION get_cart_statistics()
RETURNS TABLE (
  metric_name TEXT,
  metric_value BIGINT,
  description TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'total_active_carts'::TEXT,
    COUNT(*)::BIGINT,
    'Total number of active carts'::TEXT
  FROM public.carts 
  WHERE status = 'active'
  
  UNION ALL
  
  SELECT 
    'guest_carts'::TEXT,
    COUNT(*)::BIGINT,
    'Number of guest carts'::TEXT
  FROM public.carts 
  WHERE user_id IS NULL AND guest_id IS NOT NULL
  
  UNION ALL
  
  SELECT 
    'user_carts'::TEXT,
    COUNT(*)::BIGINT,
    'Number of user carts'::TEXT
  FROM public.carts 
  WHERE user_id IS NOT NULL
  
  UNION ALL
  
  SELECT 
    'total_cart_items'::TEXT,
    COUNT(*)::BIGINT,
    'Total number of items in all carts'::TEXT
  FROM public.cart_items
  
  UNION ALL
  
  SELECT 
    'avg_items_per_cart'::TEXT,
    COALESCE(AVG(item_count)::BIGINT, 0),
    'Average number of items per cart'::TEXT
  FROM (
    SELECT COUNT(*) as item_count
    FROM public.cart_items
    GROUP BY cart_id
  ) AS cart_stats;
END;
$$;

-- ============================================================================
-- VALIDATION AND TESTING
-- ============================================================================

-- Test the functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'add_or_update_cart_item',
  'merge_carts', 
  'cleanup_expired_guest_carts',
  'get_cart_statistics'
)
ORDER BY routine_name;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION add_or_update_cart_item(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION merge_carts(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_guest_carts() TO authenticated;
GRANT EXECUTE ON FUNCTION get_cart_statistics() TO authenticated;