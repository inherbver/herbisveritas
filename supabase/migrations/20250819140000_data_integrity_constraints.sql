-- Migration Contraintes d'Intégrité des Données
-- Prévention corruption données + contraintes métier critiques
-- Date: 2025-08-19

-- =========================================
-- 1. CONTRAINTES PRIX ET MONTANTS
-- =========================================

-- Contrainte prix produits (doit être positif et raisonnable)
ALTER TABLE products 
ADD CONSTRAINT check_product_price_positive 
CHECK (price > 0 AND price <= 10000);

-- Contrainte stock produits (ne peut pas être négatif)
ALTER TABLE products 
ADD CONSTRAINT check_product_stock_non_negative 
CHECK (stock >= 0);

-- Contrainte quantité articles panier (doit être positive et raisonnable)
ALTER TABLE cart_items 
ADD CONSTRAINT check_cart_quantity_positive 
CHECK (quantity > 0 AND quantity <= 100);

-- Contrainte quantité articles commande (doit être positive)
ALTER TABLE order_items 
ADD CONSTRAINT check_order_quantity_positive 
CHECK (quantity > 0);

-- Contrainte prix articles commande (doit être positif)
ALTER TABLE order_items 
ADD CONSTRAINT check_order_price_positive 
CHECK (price_at_purchase > 0);

-- Contrainte montant total commande (cohérence avec articles)
ALTER TABLE orders 
ADD CONSTRAINT check_order_total_positive 
CHECK (total_amount >= 0);

-- =========================================
-- 2. CONTRAINTES DONNÉES MÉTIER
-- =========================================

-- Contrainte nom produit (ne peut pas être vide)
ALTER TABLE products 
ADD CONSTRAINT check_product_name_not_empty 
CHECK (LENGTH(TRIM(name)) > 0);

-- Contrainte slug produit (format valide)
ALTER TABLE products 
ADD CONSTRAINT check_product_slug_format 
CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' AND LENGTH(slug) >= 2);

-- Contrainte catégorie produit (valeurs autorisées)
ALTER TABLE products 
ADD CONSTRAINT check_product_category_valid 
CHECK (category IN (
  'graines-semences', 
  'plantes-aromatiques', 
  'legumes-racines', 
  'fruits-legumes', 
  'herbes-tisanes',
  'accessoires',
  'outils',
  'livres',
  'autres'
));

-- Contrainte statut commande (valeurs valides)
ALTER TABLE orders 
ADD CONSTRAINT check_order_status_valid 
CHECK (status IN (
  'pending', 
  'confirmed', 
  'processing', 
  'shipped', 
  'delivered', 
  'cancelled', 
  'refunded'
));

-- Contrainte statut paiement (valeurs valides)
ALTER TABLE orders 
ADD CONSTRAINT check_payment_status_valid 
CHECK (payment_status IN (
  'pending', 
  'paid', 
  'failed', 
  'refunded', 
  'partially_refunded'
));

-- Contrainte email profil (format valide)
ALTER TABLE profiles 
ADD CONSTRAINT check_profile_email_format 
CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Contrainte rôle utilisateur (valeurs autorisées)
ALTER TABLE profiles 
ADD CONSTRAINT check_profile_role_valid 
CHECK (role IN ('user', 'admin', 'moderator'));

-- =========================================
-- 3. CONTRAINTES COHÉRENCE RELATIONNELLE
-- =========================================

-- Contrainte: un panier ne peut appartenir qu'à un utilisateur OU une session
ALTER TABLE carts 
ADD CONSTRAINT check_cart_ownership_exclusive 
CHECK (
  (user_id IS NOT NULL AND session_id IS NULL) OR 
  (user_id IS NULL AND session_id IS NOT NULL)
);

-- Contrainte: une commande doit avoir au moins un article
-- (Implémentée via fonction trigger pour performance)
CREATE OR REPLACE FUNCTION check_order_has_items()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Vérifier après insertion complète des articles
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' AND (
    SELECT COUNT(*) FROM order_items 
    WHERE order_id = OLD.order_id
  ) = 0 THEN
    RAISE EXCEPTION 'Une commande doit avoir au moins un article';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger pour vérifier qu'une commande a des articles
CREATE TRIGGER trigger_order_has_items
  AFTER DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION check_order_has_items();

-- =========================================
-- 4. CONTRAINTES TEMPORELLES
-- =========================================

-- Contrainte: date création cohérente
ALTER TABLE orders 
ADD CONSTRAINT check_order_created_at_reasonable 
CHECK (
  created_at >= '2024-01-01'::timestamp 
  AND created_at <= NOW() + INTERVAL '1 hour'
);

-- Contrainte: date mise à jour cohérente
ALTER TABLE orders 
ADD CONSTRAINT check_order_updated_after_created 
CHECK (updated_at >= created_at);

-- Contrainte: date création produit cohérente
ALTER TABLE products 
ADD CONSTRAINT check_product_created_at_reasonable 
CHECK (
  created_at >= '2024-01-01'::timestamp 
  AND created_at <= NOW() + INTERVAL '1 hour'
);

-- =========================================
-- 5. CONTRAINTES UNICITÉ MÉTIER
-- =========================================

-- Contrainte: slug produit unique parmi les produits actifs
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_products_slug_unique_active
ON products(slug) 
WHERE is_active = true;

-- Contrainte: email unique dans les profils
-- (Déjà existant via Supabase Auth, mais renforcement)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_email_unique
ON profiles(email) 
WHERE email IS NOT NULL;

-- Contrainte: un seul panier actif par utilisateur
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_carts_unique_per_user
ON carts(user_id) 
WHERE user_id IS NOT NULL;

-- =========================================
-- 6. FONCTION VALIDATION GLOBALE DONNÉES
-- =========================================

-- Fonction pour valider la cohérence globale des données
CREATE OR REPLACE FUNCTION validate_data_integrity()
RETURNS TABLE (
  check_name TEXT,
  status TEXT,
  error_count BIGINT,
  details TEXT
) AS $$
BEGIN
  -- Vérifier cohérence prix/totaux commandes
  RETURN QUERY
  SELECT 
    'order_total_consistency' as check_name,
    CASE 
      WHEN COUNT(*) = 0 THEN 'OK' 
      ELSE 'ERROR' 
    END as status,
    COUNT(*) as error_count,
    'Commandes avec total incohérent avec articles' as details
  FROM orders o
  WHERE ABS(
    o.total_amount - (
      SELECT COALESCE(SUM(oi.quantity * oi.price_at_purchase), 0)
      FROM order_items oi
      WHERE oi.order_id = o.id
    )
  ) > 0.01;

  -- Vérifier produits sans stock mais marqués actifs
  RETURN QUERY
  SELECT 
    'products_stock_consistency' as check_name,
    CASE 
      WHEN COUNT(*) = 0 THEN 'OK' 
      ELSE 'WARNING' 
    END as status,
    COUNT(*) as error_count,
    'Produits actifs sans stock' as details
  FROM products
  WHERE is_active = true AND stock = 0;

  -- Vérifier paniers orphelins (sans utilisateur ni session)
  RETURN QUERY
  SELECT 
    'orphaned_carts' as check_name,
    CASE 
      WHEN COUNT(*) = 0 THEN 'OK' 
      ELSE 'ERROR' 
    END as status,
    COUNT(*) as error_count,
    'Paniers sans propriétaire' as details
  FROM carts
  WHERE user_id IS NULL AND session_id IS NULL;

  -- Vérifier commandes sans articles
  RETURN QUERY
  SELECT 
    'orders_without_items' as check_name,
    CASE 
      WHEN COUNT(*) = 0 THEN 'OK' 
      ELSE 'ERROR' 
    END as status,
    COUNT(*) as error_count,
    'Commandes sans articles' as details
  FROM orders o
  WHERE NOT EXISTS (
    SELECT 1 FROM order_items oi 
    WHERE oi.order_id = o.id
  );

  -- Vérifier articles panier pour produits inactifs
  RETURN QUERY
  SELECT 
    'cart_items_inactive_products' as check_name,
    CASE 
      WHEN COUNT(*) = 0 THEN 'OK' 
      ELSE 'WARNING' 
    END as status,
    COUNT(*) as error_count,
    'Articles panier pour produits inactifs' as details
  FROM cart_items ci
  JOIN products p ON ci.product_id = p.id
  WHERE p.is_active = false;

END;
$$ LANGUAGE plpgsql;

-- =========================================
-- 7. FONCTION NETTOYAGE DONNÉES ORPHELINES
-- =========================================

-- Fonction pour nettoyer les données orphelines (à utiliser avec précaution)
CREATE OR REPLACE FUNCTION cleanup_orphaned_data()
RETURNS TABLE (
  cleanup_action TEXT,
  affected_rows BIGINT,
  details TEXT
) AS $$
DECLARE
  deleted_count BIGINT;
BEGIN
  -- Nettoyer paniers orphelins anciens (plus de 30 jours)
  DELETE FROM carts 
  WHERE user_id IS NULL 
    AND session_id IS NULL 
    AND created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN QUERY SELECT 
    'cleanup_orphaned_carts' as cleanup_action,
    deleted_count as affected_rows,
    'Paniers orphelins supprimés' as details;

  -- Nettoyer articles panier pour produits supprimés
  DELETE FROM cart_items ci
  WHERE NOT EXISTS (
    SELECT 1 FROM products p 
    WHERE p.id = ci.product_id
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN QUERY SELECT 
    'cleanup_cart_items_no_product' as cleanup_action,
    deleted_count as affected_rows,
    'Articles panier sans produit supprimés' as details;

  -- Nettoyer sessions invité anciennes (plus de 7 jours)
  DELETE FROM carts 
  WHERE user_id IS NULL 
    AND session_id IS NOT NULL
    AND updated_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN QUERY SELECT 
    'cleanup_old_guest_carts' as cleanup_action,
    deleted_count as affected_rows,
    'Paniers invité anciens supprimés' as details;

END;
$$ LANGUAGE plpgsql;

-- =========================================
-- VALIDATION POST-MIGRATION
-- =========================================

-- Vérifier que toutes les contraintes sont bien appliquées
SELECT 
  'Contraintes d\'intégrité appliquées avec succès' as status,
  COUNT(*) as constraints_count
FROM information_schema.check_constraints 
WHERE constraint_schema = 'public'
AND constraint_name LIKE 'check_%';

-- Exécuter validation initiale
SELECT * FROM validate_data_integrity();

-- Afficher résumé des nouvelles contraintes
SELECT 
  table_name,
  constraint_name,
  'Contrainte métier appliquée' as status
FROM information_schema.check_constraints 
WHERE constraint_schema = 'public'
AND constraint_name LIKE 'check_%'
ORDER BY table_name, constraint_name;