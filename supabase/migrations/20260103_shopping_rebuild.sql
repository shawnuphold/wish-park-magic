-- Shopping Trips Rebuild Migration
-- Adds missing columns to request_items for the simplified mobile shopping flow

-- Add missing columns to request_items
ALTER TABLE request_items ADD COLUMN IF NOT EXISTS size TEXT;
ALTER TABLE request_items ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE request_items ADD COLUMN IF NOT EXISTS variant TEXT;
ALTER TABLE request_items ADD COLUMN IF NOT EXISTS customer_notes TEXT;
ALTER TABLE request_items ADD COLUMN IF NOT EXISTS not_found_reason TEXT;
ALTER TABLE request_items ADD COLUMN IF NOT EXISTS quantity_found INTEGER DEFAULT 0;

-- Create index for faster shopping queries
CREATE INDEX IF NOT EXISTS idx_request_items_status_park ON request_items(status, park);

-- Note: The park column already supports values like 'disney', 'universal', 'seaworld'
-- These generic values will show items in ALL parks of that type (multi-park support)
-- Specific park values (disney_mk, disney_epcot, etc.) can also be used for targeted items
