-- Migration: Update status and category check constraints
-- Run this in Supabase SQL Editor to allow the new status and category values

-- Drop existing constraints
ALTER TABLE new_releases DROP CONSTRAINT IF EXISTS new_releases_status_check;
ALTER TABLE new_releases DROP CONSTRAINT IF EXISTS new_releases_category_check;

-- Add updated status constraint with all valid values
ALTER TABLE new_releases ADD CONSTRAINT new_releases_status_check
  CHECK (status IN ('rumored', 'announced', 'coming_soon', 'available', 'sold_out', 'new', 'featured', 'popular'));

-- Add updated category constraint with all valid values
ALTER TABLE new_releases ADD CONSTRAINT new_releases_category_check
  CHECK (category IN (
    'loungefly', 'ears', 'spirit_jersey', 'popcorn_bucket', 'pins',
    'plush', 'apparel', 'drinkware', 'collectible', 'home_decor',
    'toys', 'jewelry', 'other'
  ));
