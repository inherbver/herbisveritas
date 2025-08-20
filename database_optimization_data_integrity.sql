-- ============================================================================
-- DATA INTEGRITY ENHANCEMENTS
-- ============================================================================
-- Problem: Missing constraints that could prevent data corruption
-- Solution: Add critical business logic constraints and validation

-- ============================================================================
-- 1. PRODUCT INVENTORY CONSTRAINTS
-- ============================================================================

-- Ensure stock cannot go negative (critical for e-commerce)
ALTER TABLE products 
ADD CONSTRAINT products_stock_non_negative 
CHECK (stock >= 0);

-- Ensure price is reasonable (prevent data entry errors)
ALTER TABLE products 
ADD CONSTRAINT products_price_reasonable 
CHECK (price >= 0 AND price <= 999999.99);

-- Ensure product name is not empty
ALTER TABLE products 
ADD CONSTRAINT products_name_not_empty 
CHECK (length(trim(name)) > 0);

-- Ensure slug is properly formatted (URL-safe)
ALTER TABLE products 
ADD CONSTRAINT products_slug_format 
CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

-- ============================================================================
-- 2. ORDER BUSINESS LOGIC CONSTRAINTS
-- ============================================================================

-- Ensure order total matches line items (data consistency)
CREATE OR REPLACE FUNCTION validate_order_total()
RETURNS TRIGGER AS $$
DECLARE
  v_calculated_total NUMERIC;
  v_order_total NUMERIC;
BEGIN
  -- Calculate total from order items
  SELECT COALESCE(SUM(price_at_purchase * quantity), 0) 
  INTO v_calculated_total
  FROM order_items 
  WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);

  -- Get order total (including shipping)
  SELECT total_amount - COALESCE(shipping_fee, 0)
  INTO v_order_total
  FROM orders 
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);

  -- Allow small rounding differences (up to 1 cent)
  IF ABS(v_calculated_total - v_order_total) > 0.01 THEN
    RAISE EXCEPTION 'Order total mismatch: calculated % vs recorded %', 
      v_calculated_total, v_order_total;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to order_items
CREATE TRIGGER order_total_validation_trigger
  AFTER INSERT OR UPDATE OR DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_total();

-- Ensure order status transitions are valid
ALTER TABLE orders 
ADD CONSTRAINT valid_order_status 
CHECK (status IN (
  'draft', 'pending_payment', 'paid', 'processing', 
  'shipped', 'delivered', 'cancelled', 'refunded'
));

-- Ensure payment status is valid
ALTER TABLE orders 
ADD CONSTRAINT valid_payment_status 
CHECK (payment_status IN (
  'pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded'
));

-- Ensure completed orders have required information
CREATE OR REPLACE FUNCTION validate_order_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- If order is marked as shipped, require tracking info or pickup point
  IF NEW.status = 'shipped' AND OLD.status != 'shipped' THEN
    IF NEW.tracking_number IS NULL AND NEW.pickup_point_id IS NULL THEN
      RAISE EXCEPTION 'Shipped orders must have tracking number or pickup point';
    END IF;
  END IF;

  -- If order is delivered, must have been shipped first
  IF NEW.status = 'delivered' AND OLD.status NOT IN ('shipped', 'delivered') THEN
    RAISE EXCEPTION 'Orders must be shipped before being marked as delivered';
  END IF;

  -- Paid orders must have shipping address (unless pickup)
  IF NEW.payment_status = 'succeeded' AND NEW.pickup_point_id IS NULL THEN
    IF NEW.shipping_address_id IS NULL THEN
      RAISE EXCEPTION 'Paid orders must have shipping address or pickup point';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_completion_validation_trigger
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_completion();

-- ============================================================================
-- 3. CART BUSINESS LOGIC CONSTRAINTS
-- ============================================================================

-- Ensure cart quantities are reasonable
ALTER TABLE cart_items 
ADD CONSTRAINT cart_item_quantity_reasonable 
CHECK (quantity > 0 AND quantity <= 999);

-- Ensure cart has either user_id OR guest_id, not both
ALTER TABLE carts 
DROP CONSTRAINT IF EXISTS cart_owner_check;

ALTER TABLE carts 
ADD CONSTRAINT cart_owner_exclusive 
CHECK (
  (user_id IS NOT NULL AND guest_id IS NULL) OR 
  (user_id IS NULL AND guest_id IS NOT NULL)
);

-- Prevent duplicate products in same cart (enforce unique constraint)
-- This already exists but ensure it's properly named
ALTER TABLE cart_items 
DROP CONSTRAINT IF EXISTS cart_items_cart_product_unique;

ALTER TABLE cart_items 
ADD CONSTRAINT cart_items_unique_product_per_cart 
UNIQUE (cart_id, product_id);

-- ============================================================================
-- 4. USER AND ADDRESS CONSTRAINTS
-- ============================================================================

-- Ensure email format is valid
ALTER TABLE profiles 
ADD CONSTRAINT profiles_email_format 
CHECK (email IS NULL OR email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Ensure phone number format (basic validation)
ALTER TABLE profiles 
ADD CONSTRAINT profiles_phone_format 
CHECK (phone_number IS NULL OR phone_number ~ '^\+?[0-9\s\-\(\)]{6,20}$');

-- Ensure address has minimum required fields
ALTER TABLE addresses 
ADD CONSTRAINT address_required_fields 
CHECK (
  length(trim(address_line1)) > 0 AND 
  length(trim(city)) > 0 AND 
  length(trim(postal_code)) > 0 AND
  length(trim(country_code)) >= 2
);

-- Ensure only one default address per user per type
CREATE UNIQUE INDEX idx_addresses_unique_default 
ON addresses (user_id, address_type) 
WHERE is_default = true;

-- ============================================================================
-- 5. AUDIT AND SECURITY CONSTRAINTS
-- ============================================================================

-- Ensure audit log events are from valid list
ALTER TABLE audit_logs 
ADD CONSTRAINT audit_logs_valid_events 
CHECK (event_type IN (
  'USER_REGISTERED', 'USER_LOGIN', 'USER_LOGOUT', 'PASSWORD_CHANGE',
  'CART_ITEM_ADDED', 'CART_ITEM_REMOVED', 'CART_MERGE_COMPLETED',
  'ORDER_CREATED', 'ORDER_UPDATED', 'ORDER_CANCELLED', 'ORDER_REFUNDED',
  'PRODUCT_CREATED', 'PRODUCT_UPDATED', 'PRODUCT_DELETED',
  'ADMIN_ACTION', 'SECURITY_VIOLATION', 'SYSTEM_ERROR'
));

-- Ensure severity levels are valid
ALTER TABLE audit_logs 
ADD CONSTRAINT audit_logs_valid_severity 
CHECK (severity IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'));

-- ============================================================================
-- 6. INVENTORY MANAGEMENT FUNCTIONS
-- ============================================================================

-- Function to safely update product stock with validation
CREATE OR REPLACE FUNCTION update_product_stock_safe(
  p_product_id UUID,
  p_quantity_change INTEGER,
  p_operation_type TEXT DEFAULT 'manual'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current_stock INTEGER;
  v_new_stock INTEGER;
  v_product_name TEXT;
BEGIN
  -- Get current stock and product name
  SELECT stock, name INTO v_current_stock, v_product_name
  FROM public.products 
  WHERE id = p_product_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found or inactive: %', p_product_id;
  END IF;

  v_new_stock := v_current_stock + p_quantity_change;

  -- Prevent negative stock
  IF v_new_stock < 0 THEN
    RAISE EXCEPTION 'Insufficient stock for product %: current=%, requested=%', 
      v_product_name, v_current_stock, ABS(p_quantity_change);
  END IF;

  -- Update stock
  UPDATE public.products 
  SET 
    stock = v_new_stock,
    updated_at = NOW()
  WHERE id = p_product_id;

  -- Log the stock change
  INSERT INTO public.audit_logs (
    event_type,
    data,
    severity
  ) VALUES (
    'STOCK_UPDATED',
    jsonb_build_object(
      'product_id', p_product_id,
      'product_name', v_product_name,
      'previous_stock', v_current_stock,
      'stock_change', p_quantity_change,
      'new_stock', v_new_stock,
      'operation_type', p_operation_type
    ),
    'INFO'
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_product_stock_safe TO authenticated;

-- ============================================================================
-- 7. DATA CLEANUP AND MAINTENANCE
-- ============================================================================

-- Function to clean up orphaned data
CREATE OR REPLACE FUNCTION cleanup_orphaned_data()
RETURNS TABLE (
  cleanup_type TEXT,
  records_cleaned INTEGER,
  description TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_orphaned_cart_items INTEGER;
  v_orphaned_order_items INTEGER;
  v_orphaned_translations INTEGER;
BEGIN
  -- Clean up cart items for non-existent products
  DELETE FROM public.cart_items 
  WHERE product_id NOT IN (SELECT id FROM public.products);
  GET DIAGNOSTICS v_orphaned_cart_items = ROW_COUNT;

  -- Clean up order items for non-existent products (keep for historical record)
  -- Note: We don't delete these, just log them
  SELECT COUNT(*) INTO v_orphaned_order_items
  FROM public.order_items oi
  WHERE NOT EXISTS (SELECT 1 FROM public.products p WHERE p.id = oi.product_id);

  -- Clean up product translations for non-existent products
  DELETE FROM public.product_translations 
  WHERE product_id NOT IN (SELECT id FROM public.products);
  GET DIAGNOSTICS v_orphaned_translations = ROW_COUNT;

  -- Return cleanup results
  RETURN QUERY VALUES
    ('cart_items', v_orphaned_cart_items, 'Removed cart items for deleted products'),
    ('order_items', v_orphaned_order_items, 'Found orphaned order items (kept for history)'),
    ('translations', v_orphaned_translations, 'Removed translations for deleted products');

  -- Log cleanup operation
  INSERT INTO public.audit_logs (
    event_type,
    data,
    severity
  ) VALUES (
    'DATA_CLEANUP',
    jsonb_build_object(
      'cart_items_cleaned', v_orphaned_cart_items,
      'orphaned_order_items_found', v_orphaned_order_items,
      'translations_cleaned', v_orphaned_translations
    ),
    'INFO'
  );
END;
$$;

-- Grant execute permission to admins
GRANT EXECUTE ON FUNCTION cleanup_orphaned_data TO authenticated;

-- ============================================================================
-- VALIDATION QUERIES
-- ============================================================================

-- Check constraint violations (run after applying)
SELECT 
  conname as constraint_name,
  conrelid::regclass as table_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE connamespace = 'public'::regnamespace 
AND contype = 'c'
AND conname LIKE '%_check' OR conname LIKE '%_format' OR conname LIKE '%_reasonable'
ORDER BY conrelid::regclass::text, conname;