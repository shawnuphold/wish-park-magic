-- Add store location fields to new_releases
ALTER TABLE new_releases ADD COLUMN IF NOT EXISTS store_name TEXT;
ALTER TABLE new_releases ADD COLUMN IF NOT EXISTS store_area TEXT;

-- Create index for store searches
CREATE INDEX IF NOT EXISTS idx_new_releases_store_name ON new_releases(store_name) WHERE store_name IS NOT NULL;
