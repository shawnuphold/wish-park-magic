-- Add reference_images array column to request_items
-- This allows storing multiple reference images per item (up to 5)

ALTER TABLE request_items ADD COLUMN IF NOT EXISTS reference_images TEXT[] DEFAULT '{}';

-- Migrate existing single images to array format
UPDATE request_items
SET reference_images = ARRAY[reference_image_url]
WHERE reference_image_url IS NOT NULL
  AND (reference_images IS NULL OR reference_images = '{}');

-- Add comment for documentation
COMMENT ON COLUMN request_items.reference_images IS 'Array of reference image URLs (up to 5). Replaces single reference_image_url.';

-- Create index for queries that filter by having images
CREATE INDEX IF NOT EXISTS idx_request_items_has_images ON request_items ((array_length(reference_images, 1) > 0));
