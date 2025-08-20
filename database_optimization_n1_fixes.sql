-- ============================================================================
-- N+1 QUERY OPTIMIZATION FIXES
-- ============================================================================
-- Problem: orderActions.ts manually fetches profiles, creating N+1 queries
-- Solution: Optimized queries and views for common patterns

-- ============================================================================
-- 1. OPTIMIZED ORDER LIST VIEW
-- ============================================================================
-- Replace the manual profile fetching in orderActions.ts (lines 133-143)
-- This view pre-joins all necessary data in a single optimized query

CREATE OR REPLACE VIEW orders_with_details AS
SELECT 
  o.*,
  -- Profile information (eliminates N+1 profile queries)
  p.first_name,
  p.last_name,
  p.email,
  p.phone_number,
  -- Shipping address (eliminates separate address lookup)
  sa.full_name as shipping_full_name,
  sa.address_line1 as shipping_address_line1,
  sa.address_line2 as shipping_address_line2,
  sa.city as shipping_city,
  sa.postal_code as shipping_postal_code,
  sa.country_code as shipping_country,
  sa.phone_number as shipping_phone,
  -- Billing address
  ba.full_name as billing_full_name,
  ba.address_line1 as billing_address_line1,
  ba.address_line2 as billing_address_line2,
  ba.city as billing_city,
  ba.postal_code as billing_postal_code,
  ba.country_code as billing_country,
  ba.phone_number as billing_phone,
  -- Order totals (eliminates calculation queries)
  COALESCE(items_summary.total_items, 0) as total_items,
  COALESCE(items_summary.total_quantity, 0) as total_quantity
FROM orders o
LEFT JOIN profiles p ON o.user_id = p.id
LEFT JOIN addresses sa ON o.shipping_address_id = sa.id
LEFT JOIN addresses ba ON o.billing_address_id = ba.id
LEFT JOIN (
  SELECT 
    order_id,
    COUNT(*) as total_items,
    SUM(quantity) as total_quantity
  FROM order_items
  GROUP BY order_id
) items_summary ON o.id = items_summary.order_id;

-- Grant access
GRANT SELECT ON orders_with_details TO authenticated;

-- ============================================================================
-- 2. ORDER ITEMS WITH PRODUCT DETAILS VIEW
-- ============================================================================
-- Eliminates N+1 queries for product information in order items

CREATE OR REPLACE VIEW order_items_with_products AS
SELECT 
  oi.*,
  p.name as product_name,
  p.image_url as product_image,
  p.slug as product_slug,
  p.category as product_category,
  -- Calculate line total
  (oi.price_at_purchase * oi.quantity) as line_total
FROM order_items oi
LEFT JOIN products p ON oi.product_id = p.id;

-- Grant access
GRANT SELECT ON order_items_with_products TO authenticated;

-- ============================================================================
-- 3. COMPLETE ORDER DETAILS VIEW
-- ============================================================================
-- Single view for complete order information (for order detail pages)

CREATE OR REPLACE VIEW complete_order_details AS
SELECT 
  owd.*,
  -- Aggregate order items into JSON for single query
  COALESCE(
    json_agg(
      json_build_object(
        'id', oiwp.id,
        'product_id', oiwp.product_id,
        'product_name', oiwp.product_name,
        'product_image', oiwp.product_image,
        'product_slug', oiwp.product_slug,
        'quantity', oiwp.quantity,
        'price_at_purchase', oiwp.price_at_purchase,
        'line_total', oiwp.line_total
      ) ORDER BY oiwp.product_name
    ) FILTER (WHERE oiwp.id IS NOT NULL),
    '[]'::json
  ) as items
FROM orders_with_details owd
LEFT JOIN order_items_with_products oiwp ON owd.id = oiwp.order_id
GROUP BY 
  owd.id, owd.user_id, owd.order_number, owd.total_amount, owd.status, 
  owd.payment_status, owd.shipping_fee, owd.notes, owd.tracking_number,
  owd.created_at, owd.updated_at, owd.stripe_checkout_session_id,
  owd.shipping_address_id, owd.billing_address_id, owd.pickup_point_id,
  owd.first_name, owd.last_name, owd.email, owd.phone_number,
  owd.shipping_full_name, owd.shipping_address_line1, owd.shipping_address_line2,
  owd.shipping_city, owd.shipping_postal_code, owd.shipping_country, owd.shipping_phone,
  owd.billing_full_name, owd.billing_address_line1, owd.billing_address_line2,
  owd.billing_city, owd.billing_postal_code, owd.billing_country, owd.billing_phone,
  owd.total_items, owd.total_quantity;

-- Grant access
GRANT SELECT ON complete_order_details TO authenticated;

-- ============================================================================
-- 4. CART WITH PRODUCT DETAILS VIEW
-- ============================================================================
-- Eliminates N+1 queries in cart operations

CREATE OR REPLACE VIEW cart_with_product_details AS
SELECT 
  c.*,
  -- Aggregate cart items with product details
  COALESCE(
    json_agg(
      json_build_object(
        'id', ci.id,
        'product_id', ci.product_id,
        'quantity', ci.quantity,
        'product_name', p.name,
        'product_price', p.price,
        'product_image', p.image_url,
        'product_slug', p.slug,
        'product_stock', p.stock,
        'line_total', (p.price * ci.quantity)
      ) ORDER BY ci.created_at
    ) FILTER (WHERE ci.id IS NOT NULL),
    '[]'::json
  ) as items,
  -- Calculate cart totals
  COALESCE(SUM(p.price * ci.quantity), 0) as cart_total,
  COALESCE(COUNT(ci.id), 0) as total_items,
  COALESCE(SUM(ci.quantity), 0) as total_quantity
FROM carts c
LEFT JOIN cart_items ci ON c.id = ci.cart_id
LEFT JOIN products p ON ci.product_id = p.id AND p.is_active = true
GROUP BY c.id, c.user_id, c.guest_id, c.status, c.created_at, c.updated_at;

-- Grant access
GRANT SELECT ON cart_with_product_details TO authenticated;

-- ============================================================================
-- 5. OPTIMIZED FUNCTIONS FOR COMMON QUERIES
-- ============================================================================

-- Fast order list for admin dashboard (replaces orderActions.ts getOrdersListAction)
CREATE OR REPLACE FUNCTION get_orders_optimized(
  p_limit INTEGER DEFAULT 25,
  p_offset INTEGER DEFAULT 0,
  p_status TEXT[] DEFAULT NULL,
  p_payment_status TEXT[] DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  order_data json,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_query_filter TEXT := '';
  v_total_count BIGINT;
BEGIN
  -- Build dynamic WHERE clause
  IF p_status IS NOT NULL THEN
    v_query_filter := v_query_filter || ' AND status = ANY($1)';
  END IF;
  
  IF p_payment_status IS NOT NULL THEN
    v_query_filter := v_query_filter || ' AND payment_status = ANY($2)';
  END IF;
  
  IF p_search IS NOT NULL THEN
    v_query_filter := v_query_filter || ' AND (order_number ILIKE $3 OR id::text ILIKE $3)';
  END IF;
  
  IF p_date_from IS NOT NULL THEN
    v_query_filter := v_query_filter || ' AND created_at >= $4';
  END IF;
  
  IF p_date_to IS NOT NULL THEN
    v_query_filter := v_query_filter || ' AND created_at <= $5';
  END IF;

  -- Get total count (for pagination)
  EXECUTE 'SELECT COUNT(*) FROM orders_with_details WHERE 1=1' || v_query_filter
  INTO v_total_count
  USING p_status, p_payment_status, '%' || p_search || '%', p_date_from, p_date_to;

  -- Return paginated results
  RETURN QUERY
  SELECT 
    to_json(owd) as order_data,
    v_total_count as total_count
  FROM orders_with_details owd
  WHERE 1=1
    AND (p_status IS NULL OR status = ANY(p_status))
    AND (p_payment_status IS NULL OR payment_status = ANY(p_payment_status))
    AND (p_search IS NULL OR order_number ILIKE '%' || p_search || '%' OR id::text ILIKE '%' || p_search || '%')
    AND (p_date_from IS NULL OR created_at >= p_date_from)
    AND (p_date_to IS NULL OR created_at <= p_date_to)
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_orders_optimized TO authenticated;

-- ============================================================================
-- 6. PERFORMANCE MONITORING QUERIES
-- ============================================================================

-- View to identify slow queries and N+1 patterns
CREATE OR REPLACE VIEW query_performance_monitor AS
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows,
  CASE 
    WHEN calls > 100 AND mean_time > 50 THEN 'HIGH_IMPACT'
    WHEN calls > 50 AND mean_time > 20 THEN 'MEDIUM_IMPACT'
    ELSE 'LOW_IMPACT'
  END as impact_level
FROM pg_stat_statements
WHERE query LIKE '%orders%' 
   OR query LIKE '%cart%' 
   OR query LIKE '%products%'
ORDER BY total_time DESC;

-- Grant access to admins only
GRANT SELECT ON query_performance_monitor TO authenticated;

-- ============================================================================
-- USAGE EXAMPLES AND MIGRATION NOTES
-- ============================================================================

/*
-- Replace this pattern in orderActions.ts:
-- const userIds = orders.map((order) => order.user_id).filter(Boolean);
-- const { data: profiles } = await supabase
--   .from("profiles")
--   .select("id, first_name, last_name, email, phone_number")
--   .in("id", userIds);

-- With this single query:
SELECT * FROM orders_with_details 
WHERE status = 'pending' 
ORDER BY created_at DESC 
LIMIT 25;

-- For order details page, replace multiple queries with:
SELECT * FROM complete_order_details 
WHERE id = $1;

-- For cart operations, replace cartReader.ts complex logic with:
SELECT * FROM cart_with_product_details 
WHERE user_id = $1 OR (user_id IS NULL AND guest_id = $2);
*/