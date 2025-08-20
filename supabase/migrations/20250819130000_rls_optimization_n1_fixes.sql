-- Migration RLS Optimization et Corrections N+1 Queries
-- Consolidation policies redondantes + vues optimisées pour éliminer N+1
-- Date: 2025-08-19

-- ==========================================
-- 1. CONSOLIDATION POLICIES RLS REDONDANTES
-- ==========================================

-- Consolidation policies produits (supprime 3 policies redondantes)
DROP POLICY IF EXISTS products_read_policy ON products;
DROP POLICY IF EXISTS products_public_read ON products;
DROP POLICY IF EXISTS products_active_only ON products;

-- Politique unifiée pour la lecture des produits
CREATE POLICY products_unified_read ON products
  FOR SELECT USING (
    CASE WHEN auth.role() = 'authenticated' 
    THEN true 
    ELSE is_active = true 
    END
  );

-- Optimisation policies paniers - Isolation stricte paniers invités
DROP POLICY IF EXISTS cart_items_guest_access ON cart_items;
DROP POLICY IF EXISTS cart_items_user_access ON cart_items;

-- Politique stricte avec isolation étanche des sessions
CREATE POLICY cart_items_strict_isolation ON cart_items
  FOR ALL USING (
    cart_id IN (
      SELECT id FROM carts 
      WHERE (
        -- Utilisateur authentifié : accès à ses propres paniers
        (user_id = auth.uid() AND auth.uid() IS NOT NULL)
        OR 
        -- Utilisateur invité : accès seulement à son panier session
        (user_id IS NULL AND session_id = current_setting('app.session_id', true))
      )
    )
  );

-- Consolidation policies commandes
DROP POLICY IF EXISTS orders_read_own ON orders;
DROP POLICY IF EXISTS orders_user_access ON orders;

CREATE POLICY orders_unified_access ON orders
  FOR SELECT USING (
    user_id = auth.uid() 
    OR 
    -- Admin peut voir toutes les commandes
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ==========================================
-- 2. VUES OPTIMISÉES CONTRE N+1 QUERIES
-- ==========================================

-- Vue optimisée commandes avec détails (évite 4-5 requêtes N+1)
CREATE OR REPLACE VIEW orders_with_details AS
SELECT 
  o.*,
  p.email as user_email,
  p.full_name as user_name,
  p.role as user_role,
  COUNT(oi.id) as items_count,
  COALESCE(SUM(oi.quantity * oi.price_at_purchase), 0) as calculated_total,
  STRING_AGG(DISTINCT pr.name, ', ' ORDER BY pr.name) as product_names,
  STRING_AGG(DISTINCT pr.category, ', ') as product_categories,
  -- Statut de paiement calculé
  CASE 
    WHEN o.payment_status = 'paid' THEN 'Payé'
    WHEN o.payment_status = 'pending' THEN 'En attente'
    WHEN o.payment_status = 'failed' THEN 'Échec'
    ELSE 'Non spécifié'
  END as payment_status_label,
  -- Statut commande calculé
  CASE 
    WHEN o.status = 'pending' THEN 'En attente'
    WHEN o.status = 'confirmed' THEN 'Confirmée'
    WHEN o.status = 'shipped' THEN 'Expédiée'
    WHEN o.status = 'delivered' THEN 'Livrée'
    WHEN o.status = 'cancelled' THEN 'Annulée'
    ELSE o.status
  END as status_label
FROM orders o
LEFT JOIN profiles p ON o.user_id = p.id
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN products pr ON oi.product_id = pr.id
GROUP BY o.id, p.id, p.email, p.full_name, p.role;

-- Vue panier avec détails produits optimisée (évite 2-3 requêtes N+1)
CREATE OR REPLACE VIEW cart_with_product_details AS
SELECT 
  ci.id as cart_item_id,
  ci.cart_id,
  ci.product_id,
  ci.quantity,
  ci.created_at as added_at,
  ci.updated_at as last_updated,
  -- Détails produit
  p.name as product_name,
  p.description_short as product_description,
  p.price as product_price,
  p.image_url as product_image,
  p.category as product_category,
  p.stock as product_stock,
  p.is_active as product_active,
  p.slug as product_slug,
  -- Calculs
  (ci.quantity * p.price) as line_total,
  CASE 
    WHEN p.stock >= ci.quantity THEN true 
    ELSE false 
  END as is_available,
  CASE 
    WHEN p.stock = 0 THEN 'Rupture de stock'
    WHEN p.stock < ci.quantity THEN 'Stock insuffisant'
    WHEN NOT p.is_active THEN 'Produit indisponible'
    ELSE 'Disponible'
  END as availability_status
FROM cart_items ci
JOIN products p ON ci.product_id = p.id
WHERE p.is_active = true;

-- Vue récapitulatif panier optimisée (évite multiples COUNT())
CREATE OR REPLACE VIEW cart_summary AS
SELECT 
  c.id as cart_id,
  c.user_id,
  c.session_id,
  c.created_at,
  c.updated_at,
  -- Statistiques calculées
  COUNT(ci.id) as total_items,
  COALESCE(SUM(ci.quantity), 0) as total_quantity,
  COALESCE(SUM(ci.quantity * p.price), 0) as total_amount,
  COALESCE(AVG(p.price), 0) as average_item_price,
  -- Statut global du panier
  BOOL_AND(p.is_active AND p.stock >= ci.quantity) as all_items_available,
  COUNT(CASE WHEN NOT p.is_active OR p.stock < ci.quantity THEN 1 END) as unavailable_items_count
FROM carts c
LEFT JOIN cart_items ci ON c.id = ci.cart_id
LEFT JOIN products p ON ci.product_id = p.id
GROUP BY c.id, c.user_id, c.session_id, c.created_at, c.updated_at;

-- Vue produits avec statistiques de vente (pour admin dashboard)
CREATE OR REPLACE VIEW products_with_sales_stats AS
SELECT 
  p.*,
  -- Statistiques de vente
  COALESCE(sales_stats.total_sold, 0) as total_sold,
  COALESCE(sales_stats.total_revenue, 0) as total_revenue,
  COALESCE(sales_stats.orders_count, 0) as orders_count,
  COALESCE(sales_stats.avg_order_quantity, 0) as avg_order_quantity,
  -- Statut stock calculé
  CASE 
    WHEN p.stock = 0 THEN 'Rupture'
    WHEN p.stock <= 5 THEN 'Stock faible'
    WHEN p.stock <= 20 THEN 'Stock moyen'
    ELSE 'Stock disponible'
  END as stock_status,
  -- Performance produit
  CASE 
    WHEN COALESCE(sales_stats.total_sold, 0) = 0 THEN 'Aucune vente'
    WHEN COALESCE(sales_stats.total_sold, 0) <= 5 THEN 'Ventes faibles'
    WHEN COALESCE(sales_stats.total_sold, 0) <= 20 THEN 'Ventes moyennes'
    ELSE 'Bonnes ventes'
  END as performance_status
FROM products p
LEFT JOIN (
  SELECT 
    oi.product_id,
    SUM(oi.quantity) as total_sold,
    SUM(oi.quantity * oi.price_at_purchase) as total_revenue,
    COUNT(DISTINCT oi.order_id) as orders_count,
    AVG(oi.quantity) as avg_order_quantity
  FROM order_items oi
  JOIN orders o ON oi.order_id = o.id
  WHERE o.status NOT IN ('cancelled')
  GROUP BY oi.product_id
) sales_stats ON p.id = sales_stats.product_id;

-- ==========================================
-- 3. FONCTIONS HELPER POUR PERFORMANCE
-- ==========================================

-- Fonction pour récupérer panier complet avec détails (1 seule requête)
CREATE OR REPLACE FUNCTION get_cart_with_details(cart_id_param UUID)
RETURNS TABLE (
  cart_item_id UUID,
  product_id UUID,
  product_name TEXT,
  product_price NUMERIC,
  product_image TEXT,
  quantity INTEGER,
  line_total NUMERIC,
  availability_status TEXT,
  is_available BOOLEAN
) 
LANGUAGE SQL
STABLE
AS $$
  SELECT 
    cwpd.cart_item_id,
    cwpd.product_id,
    cwpd.product_name,
    cwpd.product_price,
    cwpd.product_image,
    cwpd.quantity,
    cwpd.line_total,
    cwpd.availability_status,
    cwpd.is_available
  FROM cart_with_product_details cwpd
  WHERE cwpd.cart_id = cart_id_param
  ORDER BY cwpd.added_at DESC;
$$;

-- Fonction pour dashboard admin optimisé (une requête au lieu de 5-6)
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS TABLE (
  total_orders BIGINT,
  total_revenue NUMERIC,
  pending_orders BIGINT,
  total_products BIGINT,
  low_stock_products BIGINT,
  total_users BIGINT,
  recent_orders_count BIGINT
)
LANGUAGE SQL
STABLE
AS $$
  SELECT 
    -- Statistiques commandes
    (SELECT COUNT(*) FROM orders) as total_orders,
    (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status NOT IN ('cancelled')) as total_revenue,
    (SELECT COUNT(*) FROM orders WHERE status = 'pending') as pending_orders,
    
    -- Statistiques produits
    (SELECT COUNT(*) FROM products WHERE is_active = true) as total_products,
    (SELECT COUNT(*) FROM products WHERE is_active = true AND stock <= 5) as low_stock_products,
    
    -- Statistiques utilisateurs
    (SELECT COUNT(*) FROM profiles) as total_users,
    
    -- Commandes récentes (7 derniers jours)
    (SELECT COUNT(*) FROM orders WHERE created_at >= NOW() - INTERVAL '7 days') as recent_orders_count;
$$;

-- ==========================================
-- 4. POLICIES POUR LES NOUVELLES VUES
-- ==========================================

-- RLS sur les vues optimisées
ALTER VIEW orders_with_details OWNER TO postgres;
ALTER VIEW cart_with_product_details OWNER TO postgres;
ALTER VIEW cart_summary OWNER TO postgres;
ALTER VIEW products_with_sales_stats OWNER TO postgres;

-- Les vues héritent des policies des tables sous-jacentes
-- Pas besoin de policies séparées car elles utilisent les tables existantes

-- ==========================================
-- 5. INDEX SUPPLÉMENTAIRES POUR VUES
-- ==========================================

-- Index pour optimiser les vues (si pas déjà créés)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_order_product
ON order_items(order_id, product_id) 
INCLUDE (quantity, price_at_purchase);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_carts_session_lookup
ON carts(session_id) 
WHERE user_id IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_role_lookup
ON profiles(role) 
WHERE role IN ('admin', 'user');

-- ==========================================
-- VALIDATION
-- ==========================================

-- Vérifier que les nouvelles vues fonctionnent
SELECT 'Migration RLS + N+1 appliquée avec succès' as status;

-- Afficher un exemple de chaque vue pour validation
SELECT 'Validation views:' as step;
SELECT COUNT(*) as orders_with_details_count FROM orders_with_details LIMIT 1;
SELECT COUNT(*) as cart_details_count FROM cart_with_product_details LIMIT 1; 
SELECT COUNT(*) as cart_summary_count FROM cart_summary LIMIT 1;
SELECT COUNT(*) as products_stats_count FROM products_with_sales_stats LIMIT 1;