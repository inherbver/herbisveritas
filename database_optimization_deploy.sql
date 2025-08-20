-- ============================================================================
-- COMPREHENSIVE DATABASE OPTIMIZATION DEPLOYMENT SCRIPT
-- ============================================================================
-- This script applies all optimizations in the correct order
-- Run this against your Supabase database to implement all improvements

-- Performance monitoring setup
\timing on

BEGIN;

-- ============================================================================
-- PHASE 1: CRITICAL PERFORMANCE INDEXES (IMMEDIATE IMPACT)
-- ============================================================================

\echo 'Phase 1: Applying critical performance indexes...'

-- 1. Shop page performance (Most Critical)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_shop_performance 
ON products (is_active, category, created_at DESC)
WHERE is_active = true;

-- 2. Product detail pages
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_products_slug_active
ON products (slug)
WHERE is_active = true;

-- 3. Cart operations (Checkout Critical Path)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cart_items_cart_product 
ON cart_items (cart_id, product_id);

-- 4. User profile lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_user_role
ON profiles (id, role);

-- 5. Admin dashboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_admin_overview 
ON orders (created_at DESC, status, user_id);

-- 6. Additional critical indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_addresses_user_default
ON addresses (user_id, is_default);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_translations_product_locale
ON product_translations (product_id, locale);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_event_time
ON audit_logs (user_id, event_type, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_carts_user_updated
ON carts (user_id, updated_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_order_calculation
ON order_items (order_id, price_at_purchase, quantity);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_name_search
ON products (name)
WHERE is_active = true;

\echo 'Phase 1 complete: Critical indexes applied'

-- ============================================================================
-- PHASE 2: DATA INTEGRITY CONSTRAINTS
-- ============================================================================

\echo 'Phase 2: Adding data integrity constraints...'

-- Product constraints
ALTER TABLE products 
ADD CONSTRAINT IF NOT EXISTS products_stock_non_negative 
CHECK (stock >= 0);

ALTER TABLE products 
ADD CONSTRAINT IF NOT EXISTS products_price_reasonable 
CHECK (price >= 0 AND price <= 999999.99);

ALTER TABLE products 
ADD CONSTRAINT IF NOT EXISTS products_name_not_empty 
CHECK (length(trim(name)) > 0);

-- Order constraints
ALTER TABLE orders 
ADD CONSTRAINT IF NOT EXISTS valid_order_status 
CHECK (status IN (
  'draft', 'pending_payment', 'paid', 'processing', 
  'shipped', 'delivered', 'cancelled', 'refunded'
));

ALTER TABLE orders 
ADD CONSTRAINT IF NOT EXISTS valid_payment_status 
CHECK (payment_status IN (
  'pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded'
));

-- Cart constraints
ALTER TABLE cart_items 
ADD CONSTRAINT IF NOT EXISTS cart_item_quantity_reasonable 
CHECK (quantity > 0 AND quantity <= 999);

-- Address constraints
ALTER TABLE addresses 
ADD CONSTRAINT IF NOT EXISTS address_required_fields 
CHECK (
  length(trim(address_line1)) > 0 AND 
  length(trim(city)) > 0 AND 
  length(trim(postal_code)) > 0 AND
  length(trim(country_code)) >= 2
);

-- Profile constraints
ALTER TABLE profiles 
ADD CONSTRAINT IF NOT EXISTS profiles_email_format 
CHECK (email IS NULL OR email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Audit constraints
ALTER TABLE audit_logs 
ADD CONSTRAINT IF NOT EXISTS audit_logs_valid_severity 
CHECK (severity IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'));

\echo 'Phase 2 complete: Data integrity constraints added'

-- ============================================================================
-- PHASE 3: MISSING RPC FUNCTIONS
-- ============================================================================

\echo 'Phase 3: Creating missing RPC functions...'

-- add_or_update_cart_item function
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
END;
$$;

-- merge_carts function
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
BEGIN
  -- Validate inputs
  IF p_guest_cart_id IS NULL OR p_auth_cart_id IS NULL THEN
    RAISE EXCEPTION 'Invalid cart IDs provided';
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
  END LOOP;

  -- Delete guest cart items and cart
  DELETE FROM public.cart_items WHERE cart_id = p_guest_cart_id;
  DELETE FROM public.carts WHERE id = p_guest_cart_id;

  -- Update auth cart timestamp
  UPDATE public.carts 
  SET updated_at = NOW() 
  WHERE id = p_auth_cart_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION add_or_update_cart_item(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION merge_carts(UUID, UUID) TO authenticated;

\echo 'Phase 3 complete: Missing RPC functions created'

-- ============================================================================
-- PHASE 4: OPTIMIZED VIEWS FOR N+1 QUERY ELIMINATION
-- ============================================================================

\echo 'Phase 4: Creating optimized views...'

-- Orders with complete details (eliminates N+1 queries)
CREATE OR REPLACE VIEW orders_with_details AS
SELECT 
  o.*,
  p.first_name,
  p.last_name,
  p.email,
  p.phone_number,
  sa.full_name as shipping_full_name,
  sa.address_line1 as shipping_address_line1,
  sa.city as shipping_city,
  sa.postal_code as shipping_postal_code,
  sa.country_code as shipping_country,
  ba.full_name as billing_full_name,
  ba.address_line1 as billing_address_line1,
  ba.city as billing_city,
  ba.postal_code as billing_postal_code,
  ba.country_code as billing_country
FROM orders o
LEFT JOIN profiles p ON o.user_id = p.id
LEFT JOIN addresses sa ON o.shipping_address_id = sa.id
LEFT JOIN addresses ba ON o.billing_address_id = ba.id;

-- Cart with product details
CREATE OR REPLACE VIEW cart_with_product_details AS
SELECT 
  c.*,
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
        'line_total', (p.price * ci.quantity)
      ) ORDER BY ci.created_at
    ) FILTER (WHERE ci.id IS NOT NULL),
    '[]'::json
  ) as items,
  COALESCE(SUM(p.price * ci.quantity), 0) as cart_total,
  COALESCE(COUNT(ci.id), 0) as total_items
FROM carts c
LEFT JOIN cart_items ci ON c.id = ci.cart_id
LEFT JOIN products p ON ci.product_id = p.id AND p.is_active = true
GROUP BY c.id, c.user_id, c.guest_id, c.status, c.created_at, c.updated_at;

-- Grant permissions
GRANT SELECT ON orders_with_details TO authenticated;
GRANT SELECT ON cart_with_product_details TO authenticated;

\echo 'Phase 4 complete: Optimized views created'

-- ============================================================================
-- PHASE 5: RLS POLICY CLEANUP (CAREFUL - TEST IN STAGING FIRST)
-- ============================================================================

\echo 'Phase 5: RLS policy consolidation (review carefully)...'

-- Note: This phase should be tested in staging first
-- Uncomment only after thorough testing

/*
-- Products table policy consolidation
DROP POLICY IF EXISTS "Allow admin full CRUD access to products" ON products;
DROP POLICY IF EXISTS "Allow admin full access to products" ON products;
DROP POLICY IF EXISTS "Products: Admin DELETE products" ON products;
DROP POLICY IF EXISTS "Products: Admin INSERT products" ON products;
DROP POLICY IF EXISTS "Products: Admin UPDATE products" ON products;

CREATE POLICY "products_admin_dev_all_access"
ON products FOR ALL
TO authenticated
USING (is_current_user_admin() OR is_current_user_dev())
WITH CHECK (is_current_user_admin() OR is_current_user_dev());
*/

\echo 'Phase 5 skipped: RLS cleanup requires staging test first'

-- ============================================================================
-- PHASE 6: MONITORING AND VALIDATION
-- ============================================================================

\echo 'Phase 6: Setting up monitoring...'

-- Performance monitoring view
CREATE OR REPLACE VIEW critical_index_usage AS
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  CASE 
    WHEN idx_scan = 0 THEN 'UNUSED'
    WHEN idx_scan < 100 THEN 'LOW_USAGE'
    WHEN idx_scan < 1000 THEN 'MODERATE_USAGE'
    ELSE 'HIGH_USAGE'
  END as usage_category
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY idx_scan DESC;

GRANT SELECT ON critical_index_usage TO authenticated;

\echo 'Phase 6 complete: Monitoring views created'

COMMIT;

-- ============================================================================
-- FINAL VALIDATION QUERIES
-- ============================================================================

\echo 'Running final validation...'

-- Verify critical indexes exist
SELECT 
  'CRITICAL INDEXES' as check_type,
  COUNT(*) as found_count,
  5 as expected_count,
  CASE 
    WHEN COUNT(*) = 5 THEN 'PASS' 
    ELSE 'FAIL - Missing indexes'
  END as status
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname IN (
    'idx_products_shop_performance',
    'idx_products_slug_active', 
    'idx_cart_items_cart_product',
    'idx_profiles_user_role',
    'idx_orders_admin_overview'
  )

UNION ALL

-- Verify RPC functions exist
SELECT 
  'RPC FUNCTIONS' as check_type,
  COUNT(*) as found_count,
  2 as expected_count,
  CASE 
    WHEN COUNT(*) = 2 THEN 'PASS' 
    ELSE 'FAIL - Missing functions'
  END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('add_or_update_cart_item', 'merge_carts')

UNION ALL

-- Verify views exist
SELECT 
  'OPTIMIZED VIEWS' as check_type,
  COUNT(*) as found_count,
  2 as expected_count,
  CASE 
    WHEN COUNT(*) = 2 THEN 'PASS' 
    ELSE 'FAIL - Missing views'
  END as status
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name IN ('orders_with_details', 'cart_with_product_details');

-- Performance test query
\echo 'Testing performance improvements...'

EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM products 
WHERE is_active = true 
ORDER BY created_at DESC 
LIMIT 10;

\echo 'Deployment complete! Review validation results above.'
\echo 'Next steps:'
\echo '1. Monitor index usage with: SELECT * FROM critical_index_usage;'
\echo '2. Test cart operations thoroughly'
\echo '3. Update application code to use new views'
\echo '4. Schedule the RLS cleanup for staging environment'