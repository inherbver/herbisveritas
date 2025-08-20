-- ============================================================================
-- RLS POLICY CONSOLIDATION AND OPTIMIZATION
-- ============================================================================
-- Problem: Multiple overlapping policies causing unnecessary overhead
-- Solution: Consolidate redundant policies and optimize performance-critical ones

-- ============================================================================
-- 1. PRODUCTS TABLE - CONSOLIDATE DUPLICATE POLICIES
-- ============================================================================

-- Current issue: 6 different policies for the same access pattern
-- Remove redundant policies, keep the most performant ones

-- Keep only the essential policies:
DROP POLICY IF EXISTS "Allow admin full CRUD access to products" ON products;
DROP POLICY IF EXISTS "Allow admin full access to products" ON products;
DROP POLICY IF EXISTS "Allow public read access to products" ON products;
DROP POLICY IF EXISTS "Products: Admin DELETE products" ON products;
DROP POLICY IF EXISTS "Products: Admin INSERT products" ON products;
DROP POLICY IF EXISTS "Products: Admin UPDATE products" ON products;
DROP POLICY IF EXISTS "Products: Dev DELETE products" ON products;
DROP POLICY IF EXISTS "Products: Dev INSERT products" ON products;
DROP POLICY IF EXISTS "Products: Dev UPDATE products" ON products;

-- Create optimized consolidated policies
CREATE POLICY "products_admin_dev_all_access"
ON products FOR ALL
TO authenticated
USING (is_current_user_admin() OR is_current_user_dev())
WITH CHECK (is_current_user_admin() OR is_current_user_dev());

-- Keep the public read policy (most used)
-- This one stays: "Products: Public SELECT active products"

-- ============================================================================
-- 2. ADDRESSES TABLE - CONSOLIDATE DUPLICATE POLICIES  
-- ============================================================================

-- Remove overlapping address policies
DROP POLICY IF EXISTS "Addresses: Admins DELETE any address" ON addresses;
DROP POLICY IF EXISTS "Addresses: Admins INSERT any address" ON addresses;
DROP POLICY IF EXISTS "Addresses: Admins SELECT all addresses" ON addresses;
DROP POLICY IF EXISTS "Addresses: Admins UPDATE any address" ON addresses;
DROP POLICY IF EXISTS "Addresses: Users DELETE own addresses" ON addresses;
DROP POLICY IF EXISTS "Addresses: Users INSERT own addresses" ON addresses;
DROP POLICY IF EXISTS "Addresses: Users SELECT own addresses" ON addresses;
DROP POLICY IF EXISTS "Addresses: Users UPDATE own addresses" ON addresses;
DROP POLICY IF EXISTS "Allow admin full CRUD access to all addresses" ON addresses;
DROP POLICY IF EXISTS "Allow admin full access to addresses" ON addresses;

-- Create optimized consolidated policies
CREATE POLICY "addresses_owner_and_admin_access"
ON addresses FOR ALL
TO authenticated
USING (
  auth.uid() = user_id OR 
  is_current_user_admin()
)
WITH CHECK (
  auth.uid() = user_id OR 
  is_current_user_admin()
);

-- ============================================================================
-- 3. PROFILES TABLE - SIMPLIFY OVERLAPPING POLICIES
-- ============================================================================

-- Remove redundant profile policies
DROP POLICY IF EXISTS "Admins can update all profiles." ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles." ON profiles;
DROP POLICY IF EXISTS "Allow admin to read all profiles" ON profiles;
DROP POLICY IF EXISTS "Allow admin to update any profile" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated user to read own profile" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated user to update own profile (simplified chec" ON profiles;
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leur propre profil" ON profiles;
DROP POLICY IF EXISTS "Profiles: Admins DELETE profiles" ON profiles;
DROP POLICY IF EXISTS "Profiles: Admins INSERT profiles" ON profiles;
DROP POLICY IF EXISTS "Profiles: Admins SELECT all profiles" ON profiles;
DROP POLICY IF EXISTS "Profiles: Admins UPDATE any profile" ON profiles;
DROP POLICY IF EXISTS "Profiles: Users SELECT own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles: Users UPDATE own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile." ON profiles;

-- Create optimized policies
CREATE POLICY "profiles_read_access"
ON profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = id OR 
  is_current_user_admin()
);

CREATE POLICY "profiles_update_access"
ON profiles FOR UPDATE
TO authenticated
USING (
  auth.uid() = id OR 
  is_current_user_admin()
)
WITH CHECK (
  auth.uid() = id OR 
  is_current_user_admin()
);

-- Keep the insert policy for registration
-- This one stays: "System can insert profiles during registration"

-- ============================================================================
-- 4. FEATURED_HERO_ITEMS - CONSOLIDATE ADMIN POLICIES
-- ============================================================================

-- Remove overlapping hero item policies
DROP POLICY IF EXISTS "Allow admin full CRUD access to hero items" ON featured_hero_items;
DROP POLICY IF EXISTS "Allow admin full access to hero items" ON featured_hero_items;
DROP POLICY IF EXISTS "FeaturedHero: Admins DELETE items" ON featured_hero_items;
DROP POLICY IF EXISTS "FeaturedHero: Admins INSERT items" ON featured_hero_items;
DROP POLICY IF EXISTS "FeaturedHero: Admins SELECT all items" ON featured_hero_items;
DROP POLICY IF EXISTS "FeaturedHero: Admins UPDATE items" ON featured_hero_items;
DROP POLICY IF EXISTS "FeaturedHero: Devs DELETE items" ON featured_hero_items;
DROP POLICY IF EXISTS "FeaturedHero: Devs INSERT items" ON featured_hero_items;
DROP POLICY IF EXISTS "FeaturedHero: Devs SELECT all items" ON featured_hero_items;
DROP POLICY IF EXISTS "FeaturedHero: Devs UPDATE items" ON featured_hero_items;

-- Create consolidated policy
CREATE POLICY "featured_hero_admin_dev_access"
ON featured_hero_items FOR ALL
TO authenticated
USING (is_current_user_admin() OR is_current_user_dev())
WITH CHECK (is_current_user_admin() OR is_current_user_dev());

-- Keep the public read policy
-- This one stays: "FeaturedHero: Public SELECT active items"

-- ============================================================================
-- 5. OPTIMIZE CART POLICIES FOR PERFORMANCE
-- ============================================================================

-- Current cart policies are actually well-designed, but we can optimize the guest cart access
-- The current policy uses complex subqueries - optimize with simpler logic

-- Update the cart items policy to be more performant
DROP POLICY IF EXISTS "Secure cart items access" ON cart_items;

CREATE POLICY "cart_items_optimized_access"
ON cart_items FOR ALL
TO public
USING (
  is_current_user_admin() OR 
  is_current_user_dev() OR
  EXISTS (
    SELECT 1 FROM carts 
    WHERE carts.id = cart_items.cart_id 
    AND (
      carts.user_id = auth.uid()::text OR 
      (carts.user_id IS NULL AND carts.guest_id IS NOT NULL)
    )
  )
)
WITH CHECK (
  is_current_user_admin() OR 
  is_current_user_dev() OR
  EXISTS (
    SELECT 1 FROM carts 
    WHERE carts.id = cart_items.cart_id 
    AND (
      carts.user_id = auth.uid()::text OR 
      (carts.user_id IS NULL AND carts.guest_id IS NOT NULL)
    )
  )
);

-- ============================================================================
-- VALIDATION AND MONITORING
-- ============================================================================

-- View to monitor policy performance impact
CREATE OR REPLACE VIEW rls_policy_analysis AS
SELECT 
  schemaname,
  tablename,
  COUNT(*) as policy_count,
  STRING_AGG(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY policy_count DESC;

-- Grant access to monitoring view
GRANT SELECT ON rls_policy_analysis TO authenticated;

-- Check policy consolidation results
SELECT 
  tablename,
  policy_count,
  CASE 
    WHEN policy_count > 5 THEN 'HIGH - Review needed'
    WHEN policy_count > 3 THEN 'MEDIUM - Monitor'
    ELSE 'OPTIMIZED'
  END as policy_status
FROM rls_policy_analysis
WHERE tablename IN ('products', 'addresses', 'profiles', 'featured_hero_items', 'cart_items')
ORDER BY policy_count DESC;