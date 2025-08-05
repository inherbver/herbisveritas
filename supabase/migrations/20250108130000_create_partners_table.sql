-- Migration: Create partners table for partner shop management
-- Date: 2025-01-08
-- Description: Creates the partners table to store partner shop data with RLS policies and indexes

-- Create partners table
CREATE TABLE partners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  address TEXT NOT NULL,
  image_url TEXT NOT NULL,
  facebook_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance optimization
CREATE INDEX idx_partners_order ON partners(display_order, created_at);
CREATE INDEX idx_partners_active ON partners(is_active) WHERE is_active = true;
CREATE INDEX idx_partners_name ON partners(name);

-- Add comments for documentation
COMMENT ON TABLE partners IS 'Stores partner shop information for public display';
COMMENT ON COLUMN partners.display_order IS 'Order for displaying partners (lower numbers first)';
COMMENT ON COLUMN partners.is_active IS 'Whether the partner should be publicly displayed';
COMMENT ON COLUMN partners.image_url IS 'Partner shop image URL (required)';
COMMENT ON COLUMN partners.facebook_url IS 'Optional Facebook page URL for the partner';

-- Enable RLS
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Public read access (only active partners)
CREATE POLICY "Active partners are viewable by everyone" 
ON partners FOR SELECT 
USING (is_active = true);

-- Admin read access (all partners)
CREATE POLICY "Admins can view all partners" 
ON partners FOR SELECT 
USING (check_admin_role());

-- Admin-only write access
CREATE POLICY "Only admins can insert partners" 
ON partners FOR INSERT 
WITH CHECK (check_admin_role());

CREATE POLICY "Only admins can update partners" 
ON partners FOR UPDATE 
USING (check_admin_role());

CREATE POLICY "Only admins can delete partners" 
ON partners FOR DELETE 
USING (check_admin_role());