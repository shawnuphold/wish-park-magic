-- =============================================
-- ADD SPECIFIC PARK COLUMN TO REQUEST_ITEMS
-- Fixes ISSUE-037: Location missing specific park name
--
-- Problem: request_items.park contains generic values like 'disney'
-- but doesn't specify which Disney park (Magic Kingdom, EPCOT, etc.)
--
-- Solution: Add specific_park column to store the actual park name
-- Created: January 26, 2026
-- =============================================

-- Add specific_park column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'request_items' AND column_name = 'specific_park'
  ) THEN
    ALTER TABLE public.request_items ADD COLUMN specific_park text;
  END IF;
END $$;

-- Backfill existing records by looking up from park_stores
-- Match on store_name + land (land_name in request_items = land in park_stores)
UPDATE public.request_items ri
SET specific_park = ps.park
FROM public.park_stores ps
WHERE ri.store_name = ps.store_name
  AND (ri.land_name = ps.land OR ri.land_name IS NULL)
  AND ri.specific_park IS NULL;

-- For Disney items without a store match, try to infer from land_name
UPDATE public.request_items
SET specific_park = CASE
  -- Magic Kingdom lands
  WHEN land_name IN ('Main Street U.S.A.', 'Adventureland', 'Frontierland', 'Liberty Square', 'Fantasyland', 'Tomorrowland') THEN 'Magic Kingdom'
  -- EPCOT lands
  WHEN land_name LIKE 'World Showcase%' OR land_name IN ('Future World', 'World Celebration', 'World Discovery', 'World Nature') THEN 'EPCOT'
  -- Hollywood Studios lands
  WHEN land_name IN ('Hollywood Boulevard', 'Echo Lake', 'Grand Avenue', 'Animation Courtyard', 'Toy Story Land', 'Star Wars: Galaxy''s Edge', 'Sunset Boulevard') THEN 'Hollywood Studios'
  -- Animal Kingdom lands
  WHEN land_name IN ('Oasis', 'Discovery Island', 'Africa', 'Rafiki''s Planet Watch', 'Asia', 'DinoLand U.S.A.', 'Pandora - The World of Avatar') THEN 'Animal Kingdom'
  ELSE NULL
END
WHERE park = 'disney' AND specific_park IS NULL AND land_name IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.request_items.specific_park IS 'The specific theme park name (e.g., Magic Kingdom, EPCOT, Islands of Adventure)';
