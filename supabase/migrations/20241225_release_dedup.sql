-- Release Deduplication & Lifecycle Migration
-- Run this in Supabase SQL Editor

-- Enable trigram extension for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add lifecycle status (replaces the old pending/approved/rejected status)
-- First drop the old constraint if it exists
ALTER TABLE new_releases DROP CONSTRAINT IF EXISTS new_releases_status_check;

-- Update existing status values to new schema
UPDATE new_releases SET status = 'announced' WHERE status IN ('pending', 'approved');
UPDATE new_releases SET status = 'announced' WHERE status IS NULL;

-- Add new status constraint
ALTER TABLE new_releases ADD CONSTRAINT new_releases_status_check
  CHECK (status IN ('rumored', 'announced', 'coming_soon', 'available', 'sold_out'));

-- Set default
ALTER TABLE new_releases ALTER COLUMN status SET DEFAULT 'announced';

-- Add lifecycle date fields
ALTER TABLE new_releases ADD COLUMN IF NOT EXISTS projected_release_date DATE;
ALTER TABLE new_releases ADD COLUMN IF NOT EXISTS actual_release_date DATE;
ALTER TABLE new_releases ADD COLUMN IF NOT EXISTS sold_out_date DATE;

-- Add deduplication fields
ALTER TABLE new_releases ADD COLUMN IF NOT EXISTS canonical_name TEXT;
ALTER TABLE new_releases ADD COLUMN IF NOT EXISTS merged_into_id UUID REFERENCES new_releases(id) ON DELETE SET NULL;

-- Create index on canonical_name for exact matching
CREATE INDEX IF NOT EXISTS idx_new_releases_canonical_name ON new_releases(canonical_name);

-- Create trigram index for fuzzy matching on title
CREATE INDEX IF NOT EXISTS idx_new_releases_title_trgm ON new_releases USING gin(title gin_trgm_ops);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_new_releases_status ON new_releases(status);

-- Create index on dates for sorting
CREATE INDEX IF NOT EXISTS idx_new_releases_actual_date ON new_releases(actual_release_date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_new_releases_projected_date ON new_releases(projected_release_date);

-- Rename old release_sources table if it exists (it was for feed sources)
ALTER TABLE IF EXISTS release_sources RENAME TO feed_sources;

-- Create new release_sources table for tracking article sources per product
CREATE TABLE IF NOT EXISTS release_article_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID NOT NULL REFERENCES new_releases(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  source_name TEXT, -- "BlogMickey", "Disney Parks Blog", etc.
  article_title TEXT,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  snippet TEXT, -- relevant excerpt from article
  UNIQUE(release_id, source_url)
);

CREATE INDEX IF NOT EXISTS idx_release_article_sources_release ON release_article_sources(release_id);
CREATE INDEX IF NOT EXISTS idx_release_article_sources_discovered ON release_article_sources(discovered_at DESC);

-- Function to find similar releases using trigram similarity
CREATE OR REPLACE FUNCTION find_similar_release(
  search_title TEXT,
  search_canonical TEXT DEFAULT NULL,
  similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  canonical_name TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    nr.id,
    nr.title,
    nr.canonical_name,
    GREATEST(
      similarity(nr.title, search_title),
      CASE WHEN search_canonical IS NOT NULL AND nr.canonical_name IS NOT NULL
           THEN similarity(nr.canonical_name, search_canonical)
           ELSE 0 END
    ) AS similarity
  FROM new_releases nr
  WHERE nr.merged_into_id IS NULL  -- Don't match against merged records
    AND (
      similarity(nr.title, search_title) >= similarity_threshold
      OR (search_canonical IS NOT NULL AND nr.canonical_name IS NOT NULL
          AND similarity(nr.canonical_name, search_canonical) >= similarity_threshold)
    )
  ORDER BY similarity DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- Function to merge two releases
CREATE OR REPLACE FUNCTION merge_releases(
  source_release_id UUID,
  target_release_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Move all article sources to target
  UPDATE release_article_sources
  SET release_id = target_release_id
  WHERE release_id = source_release_id
    AND source_url NOT IN (
      SELECT source_url FROM release_article_sources WHERE release_id = target_release_id
    );

  -- Delete duplicate sources
  DELETE FROM release_article_sources WHERE release_id = source_release_id;

  -- Mark source as merged
  UPDATE new_releases
  SET merged_into_id = target_release_id
  WHERE id = source_release_id;
END;
$$ LANGUAGE plpgsql;

-- View for active (non-merged) releases with source count
CREATE OR REPLACE VIEW releases_with_sources AS
SELECT
  nr.*,
  COUNT(ras.id) AS source_count,
  MIN(ras.discovered_at) AS first_discovered,
  MAX(ras.discovered_at) AS last_updated
FROM new_releases nr
LEFT JOIN release_article_sources ras ON ras.release_id = nr.id
WHERE nr.merged_into_id IS NULL
GROUP BY nr.id;

-- RLS policies for new table
ALTER TABLE release_article_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "release_article_sources_select_all" ON release_article_sources
  FOR SELECT USING (true);
CREATE POLICY "release_article_sources_insert_auth" ON release_article_sources
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "release_article_sources_update_auth" ON release_article_sources
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "release_article_sources_delete_auth" ON release_article_sources
  FOR DELETE USING (auth.role() = 'authenticated');

-- Backfill canonical names for existing releases
UPDATE new_releases
SET canonical_name = LOWER(REGEXP_REPLACE(
  REGEXP_REPLACE(title, '[^a-zA-Z0-9\s-]', '', 'g'),
  '\s+', '-', 'g'
))
WHERE canonical_name IS NULL;
