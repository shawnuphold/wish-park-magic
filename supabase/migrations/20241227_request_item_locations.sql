-- Add location fields to request_items for better shopping organization
-- Allows grouping items by store/land during shopping trips

ALTER TABLE request_items ADD COLUMN IF NOT EXISTS store_name TEXT;
ALTER TABLE request_items ADD COLUMN IF NOT EXISTS land_name TEXT;

-- Comment for documentation
COMMENT ON COLUMN request_items.store_name IS 'Specific store name (e.g., Emporium, Creations Shop, World of Disney)';
COMMENT ON COLUMN request_items.land_name IS 'Themed land or area (e.g., Fantasyland, Diagon Alley, World Showcase)';

-- Create index for grouping
CREATE INDEX IF NOT EXISTS idx_request_items_store ON request_items(store_name);
CREATE INDEX IF NOT EXISTS idx_request_items_land ON request_items(land_name);
