-- Migration: Create markets table for recurring market management
-- Date: 2025-01-08
-- Description: Creates the markets table to store recurring market data with RLS policies and indexes

-- Create markets table
CREATE TABLE markets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  description TEXT,
  gps_link TEXT,
  hero_image TEXT,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance optimization
CREATE INDEX idx_markets_dates ON markets(start_date, end_date);
CREATE INDEX idx_markets_day_of_week ON markets(day_of_week);
CREATE INDEX idx_markets_city ON markets(city);

-- Add comments for documentation
COMMENT ON TABLE markets IS 'Stores recurring market information for calendar generation';
COMMENT ON COLUMN markets.day_of_week IS 'Day of week: 0=Sunday, 1=Monday, ..., 6=Saturday';
COMMENT ON COLUMN markets.start_date IS 'First date when this recurring market starts';
COMMENT ON COLUMN markets.end_date IS 'Last date when this recurring market ends';
COMMENT ON COLUMN markets.start_time IS 'Market opening time (HH:MM format)';
COMMENT ON COLUMN markets.end_time IS 'Market closing time (HH:MM format)';
COMMENT ON COLUMN markets.gps_link IS 'GPS/Google Maps link for location';
COMMENT ON COLUMN markets.hero_image IS 'Large hero image URL for market display';
COMMENT ON COLUMN markets.image IS 'Standard image URL for market display';

-- Enable RLS
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Public read access
CREATE POLICY "Markets are viewable by everyone" 
ON markets FOR SELECT 
USING (true);

-- Admin-only write access
CREATE POLICY "Only admins can insert markets" 
ON markets FOR INSERT 
WITH CHECK (check_admin_role());

CREATE POLICY "Only admins can update markets" 
ON markets FOR UPDATE 
USING (check_admin_role());

CREATE POLICY "Only admins can delete markets" 
ON markets FOR DELETE 
USING (check_admin_role());