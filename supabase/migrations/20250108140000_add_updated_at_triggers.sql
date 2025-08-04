-- Migration: Add updated_at triggers for markets and partners tables
-- Date: 2025-01-08
-- Description: Creates trigger function and applies it to markets and partners tables

-- Create or replace the trigger function (idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add comment for documentation
COMMENT ON FUNCTION update_updated_at_column() IS 'Automatically updates the updated_at column to current timestamp on row updates';

-- Create triggers for markets table
DROP TRIGGER IF EXISTS update_markets_updated_at ON markets;
CREATE TRIGGER update_markets_updated_at 
  BEFORE UPDATE ON markets
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Create triggers for partners table  
DROP TRIGGER IF EXISTS update_partners_updated_at ON partners;
CREATE TRIGGER update_partners_updated_at 
  BEFORE UPDATE ON partners
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for the triggers
COMMENT ON TRIGGER update_markets_updated_at ON markets IS 'Automatically updates updated_at when market record is modified';
COMMENT ON TRIGGER update_partners_updated_at ON partners IS 'Automatically updates updated_at when partner record is modified';