-- This migration creates the initial schema for the product catalog based on the production schema.

-- Create categories table
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT
);

-- Create products table
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL CHECK (price >= 0),
    stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    image_urls TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    is_featured BOOLEAN DEFAULT false,
    slug TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'draft',
    stripe_product_id TEXT
);

-- Create product_categories junction table
CREATE TABLE public.product_categories (
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, category_id)
);

-- Create product_translations table
CREATE TABLE public.product_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    language_code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    UNIQUE (product_id, language_code)
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- RLS Policy for products: Allow public read access
CREATE POLICY "Allow public read access to products" ON public.products
FOR SELECT USING (true);

-- Create featured_hero_items table
CREATE TABLE public.featured_hero_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(product_id)
);

-- Enable RLS
ALTER TABLE public.featured_hero_items ENABLE ROW LEVEL SECURITY;

-- RLS Policy for featured_hero_items: Allow public read access
CREATE POLICY "Allow public read access to featured items" ON public.featured_hero_items
FOR SELECT USING (true);

