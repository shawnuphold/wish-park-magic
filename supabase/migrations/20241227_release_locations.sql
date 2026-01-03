-- Add structured locations column to new_releases
-- Stores array of locations with park, land, store, is_confirmed
-- Example: [{"park": "disney_mk", "land": "Fantasyland", "store": "Emporium", "is_confirmed": true}]

ALTER TABLE new_releases ADD COLUMN IF NOT EXISTS locations JSONB DEFAULT '[]'::jsonb;

-- Create index for querying by location data
CREATE INDEX IF NOT EXISTS idx_new_releases_locations ON new_releases USING GIN (locations);

-- Comment for documentation
COMMENT ON COLUMN new_releases.locations IS 'Array of location objects with park, land, store, and is_confirmed fields';
