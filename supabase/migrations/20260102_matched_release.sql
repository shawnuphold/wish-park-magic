-- Add matched_release_id column to request_items for linking to new_releases
ALTER TABLE request_items ADD COLUMN IF NOT EXISTS matched_release_id UUID REFERENCES new_releases(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_request_items_matched_release ON request_items(matched_release_id) WHERE matched_release_id IS NOT NULL;
