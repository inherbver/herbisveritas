# Database Schema Documentation

## Overview

HerbisVeritas uses PostgreSQL via Supabase, designed for e-commerce operations with integrated magazine functionality. The schema follows domain-driven design principles with comprehensive security through Row Level Security (RLS).

## Architecture

The database is organized around these business domains:

- **User Management**: Authentication, profiles, roles
- **Product Catalog**: Products, translations, categories
- **Commerce**: Carts, orders, payments, shipping
- **Editorial Content**: Magazine articles, tags, categories
- **Geolocation**: Markets, partners, pickup points
- **System**: Audit logs, events, monitoring

## Core Tables

### User Domain

#### profiles

Main user table linked to Supabase Auth.

```sql
id                    UUID PRIMARY KEY REFERENCES auth.users(id)
email                 TEXT
first_name            TEXT
last_name             TEXT
phone_number          TEXT
role                  app_role DEFAULT 'user' -- user|editor|admin|dev
newsletter_subscribed BOOLEAN DEFAULT false
created_at            TIMESTAMPTZ DEFAULT now()
updated_at            TIMESTAMPTZ DEFAULT now()
```

#### addresses

Multiple addresses per user for shipping/billing.

```sql
id            UUID PRIMARY KEY
user_id       UUID REFERENCES profiles(id)
type          TEXT -- 'shipping' | 'billing'
address_line1 TEXT NOT NULL
postal_code   TEXT NOT NULL
city          TEXT NOT NULL
country       TEXT NOT NULL
is_default    BOOLEAN DEFAULT false
```

### Product Domain

#### products

Product catalog with multi-language support.

```sql
id                UUID PRIMARY KEY
name              TEXT NOT NULL
description_short TEXT
description_long  TEXT
price             NUMERIC NOT NULL
currency          TEXT DEFAULT 'EUR'
image_url         TEXT
stock             INTEGER DEFAULT 0
category          TEXT
is_active         BOOLEAN DEFAULT true
slug              TEXT UNIQUE NOT NULL
inci_list         TEXT[] -- Ingredients list
```

#### product_translations

Internationalized product content.

```sql
id                 UUID PRIMARY KEY
product_id         UUID REFERENCES products(id)
locale             TEXT -- 'fr'|'en'|'de'|'es'
name               TEXT NOT NULL
short_description  TEXT
description_long   TEXT
usage_instructions TEXT
UNIQUE(product_id, locale)
```

### Commerce Domain

#### carts

Shopping carts for users and guests.

```sql
id       UUID PRIMARY KEY
user_id  TEXT -- auth.uid() or 'guest_xxx'
guest_id UUID -- Temporary ID for guests
status   TEXT DEFAULT 'active' -- active|abandoned|converted
metadata JSONB
```

#### cart_items

Items in shopping carts.

```sql
id         UUID PRIMARY KEY
cart_id    UUID REFERENCES carts(id)
product_id UUID REFERENCES products(id)
quantity   INTEGER CHECK (quantity > 0)
```

#### orders

Completed orders with payment tracking.

```sql
id                  UUID PRIMARY KEY
user_id             UUID REFERENCES profiles(id)
order_number        TEXT -- Auto-generated HV-YYYY-000001
status              order_status_type DEFAULT 'pending_payment'
total_amount        NUMERIC NOT NULL
shipping_address_id UUID REFERENCES addresses(id)
billing_address_id  UUID REFERENCES addresses(id)
payment_intent_id   TEXT -- Stripe Payment Intent
payment_status      payment_status_type DEFAULT 'pending'
```

**Order Status Types**:

- `pending_payment`: Awaiting payment
- `processing`: Being prepared
- `shipped`: In transit
- `delivered`: Completed
- `cancelled`: Cancelled
- `refunded`: Refunded

#### order_items

Products in orders (snapshot at purchase time).

```sql
id                       UUID PRIMARY KEY
order_id                 UUID REFERENCES orders(id)
product_id               UUID REFERENCES products(id)
quantity                 INTEGER NOT NULL
price_at_purchase        NUMERIC NOT NULL
product_name_at_purchase TEXT -- Snapshot of product details
```

### Magazine Domain

#### articles

Blog/magazine content.

```sql
id               UUID PRIMARY KEY
title            TEXT NOT NULL
slug             TEXT UNIQUE NOT NULL
excerpt          TEXT
content          TEXT
status           TEXT DEFAULT 'draft' -- draft|published|archived
author_id        UUID REFERENCES profiles(id)
featured_image   TEXT
published_at     TIMESTAMPTZ
reading_time     INTEGER -- Minutes
view_count       INTEGER DEFAULT 0
is_featured      BOOLEAN DEFAULT false
```

#### categories

Article categories.

```sql
id          UUID PRIMARY KEY
name        TEXT UNIQUE NOT NULL
slug        TEXT UNIQUE NOT NULL
description TEXT
color       TEXT -- HEX color for UI
sort_order  INTEGER DEFAULT 0
```

#### tags

Article tags for categorization.

```sql
id   UUID PRIMARY KEY
name TEXT UNIQUE NOT NULL
slug TEXT UNIQUE NOT NULL
```

#### article_tags

Many-to-many relation between articles and tags.

```sql
article_id UUID REFERENCES articles(id)
tag_id     UUID REFERENCES tags(id)
PRIMARY KEY (article_id, tag_id)
```

### System Domain

#### audit_logs

Security and compliance logging.

```sql
id            UUID PRIMARY KEY
user_id       UUID REFERENCES profiles(id)
action        TEXT -- CREATE|UPDATE|DELETE|LOGIN
resource_type TEXT -- product|order|user
details       JSONB -- Action details
created_at    TIMESTAMPTZ DEFAULT now()
```

#### events

Event sourcing for system events.

```sql
id         UUID PRIMARY KEY
event_type TEXT -- cart.item_added|order.created
payload    JSONB -- Event data
created_at TIMESTAMPTZ DEFAULT now()
```

## Row Level Security (RLS)

### Security Principles

All tables use RLS with policies based on:

- **Authentication**: `auth.uid()` identifies the user
- **Roles**: Helper functions check user roles
- **Ownership**: Users access only their own data

### Helper Functions

```sql
-- Check if user is admin
CREATE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ SECURITY DEFINER;

-- Check if user is editor
CREATE FUNCTION is_current_user_editor()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('editor', 'admin')
  );
$$ SECURITY DEFINER;
```

### Policy Examples

#### User Profiles

```sql
-- Users view own profile
CREATE POLICY "Users view own profile" ON profiles
FOR SELECT USING (id = auth.uid());

-- Users update own profile
CREATE POLICY "Users update own profile" ON profiles
FOR UPDATE USING (id = auth.uid());

-- Admins view all profiles
CREATE POLICY "Admins view all profiles" ON profiles
FOR SELECT USING (is_current_user_admin());
```

#### Products

```sql
-- Public views active products
CREATE POLICY "Public views active products" ON products
FOR SELECT USING (is_active = true);

-- Admins have full access
CREATE POLICY "Admins manage products" ON products
FOR ALL USING (is_current_user_admin());
```

#### Orders

```sql
-- Users view own orders
CREATE POLICY "Users view own orders" ON orders
FOR SELECT USING (user_id = auth.uid());

-- Service role for payment processing
CREATE POLICY "Service role full access" ON orders
FOR ALL TO service_role USING (true);
```

## Indexes

### Performance Optimization

```sql
-- Product search
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_category ON products(category);

-- Cart performance
CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX idx_carts_user_id ON carts(user_id);

-- Order queries
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- Article search
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_slug ON articles(slug);
CREATE INDEX idx_articles_published_at ON articles(published_at DESC);
```

## Triggers

### Automatic Timestamps

```sql
-- Update timestamp function
CREATE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER update_products_timestamp
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Order Number Generation

```sql
-- Generate order number
CREATE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'HV-' ||
    to_char(NEW.created_at, 'YYYY') || '-' ||
    LPAD(nextval('order_number_seq')::text, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION generate_order_number();
```

### Audit Logging

```sql
-- Log sensitive actions
CREATE FUNCTION log_sensitive_action()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, resource_type, details)
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    row_to_json(NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_orders
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION log_sensitive_action();
```

## Maintenance

### Cleanup Functions

```sql
-- Clean abandoned carts
CREATE FUNCTION cleanup_abandoned_carts()
RETURNS INTEGER AS $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  DELETE FROM carts
  WHERE status = 'abandoned'
    AND updated_at < now() - interval '30 days';

  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;
```

### GDPR Compliance

```sql
-- Export user data
CREATE FUNCTION export_user_data(user_uuid UUID)
RETURNS JSON AS $$
  SELECT json_build_object(
    'profile', (SELECT row_to_json(p) FROM profiles p WHERE id = user_uuid),
    'addresses', (SELECT json_agg(a) FROM addresses a WHERE user_id = user_uuid),
    'orders', (SELECT json_agg(o) FROM orders o WHERE user_id = user_uuid)
  );
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Anonymize user data
CREATE FUNCTION anonymize_user_data(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE profiles SET
    first_name = 'ANONYMIZED',
    last_name = 'USER',
    email = 'deleted-' || user_uuid || '@example.com',
    phone_number = NULL
  WHERE id = user_uuid;

  DELETE FROM addresses WHERE user_id = user_uuid;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Common Queries

### Product Search

```sql
-- Search products with filters
SELECT p.*, pt.name as localized_name
FROM products p
LEFT JOIN product_translations pt
  ON p.id = pt.product_id AND pt.locale = 'fr'
WHERE p.is_active = true
  AND p.category = 'soins-visage'
  AND p.price BETWEEN 10 AND 50
ORDER BY p.price ASC;
```

### User Cart

```sql
-- Get cart with products
SELECT ci.*, p.name, p.price, p.image_url
FROM cart_items ci
JOIN carts c ON ci.cart_id = c.id
JOIN products p ON ci.product_id = p.id
WHERE c.user_id = $1 AND c.status = 'active';
```

### Order History

```sql
-- User orders with items
SELECT o.*,
  json_agg(
    json_build_object(
      'product_name', oi.product_name_at_purchase,
      'quantity', oi.quantity,
      'price', oi.price_at_purchase
    )
  ) as items
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
WHERE o.user_id = $1
GROUP BY o.id
ORDER BY o.created_at DESC;
```

## Monitoring

### Performance Metrics

```sql
-- Table sizes
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(tablename::regclass)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename::regclass) DESC;

-- Slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Business Metrics

```sql
-- Monthly revenue
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as orders,
  SUM(total_amount) as revenue
FROM orders
WHERE payment_status = 'succeeded'
GROUP BY month
ORDER BY month DESC;

-- Conversion rate
WITH stats AS (
  SELECT
    COUNT(DISTINCT c.id) as carts,
    COUNT(DISTINCT o.id) as orders
  FROM carts c
  LEFT JOIN orders o ON c.user_id = o.user_id::text
)
SELECT
  carts,
  orders,
  ROUND((orders::DECIMAL / carts) * 100, 2) as conversion_rate
FROM stats;
```
