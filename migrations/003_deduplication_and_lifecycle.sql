-- Migration: Deduplication and Release Lifecycle
-- Adds columns and functions for product deduplication and lifecycle tracking

-- Enable pg_trgm for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add missing columns to new_releases
ALTER TABLE new_releases ADD COLUMN IF NOT EXISTS canonical_name text;
ALTER TABLE new_releases ADD COLUMN IF NOT EXISTS merged_into_id uuid REFERENCES new_releases(id);
ALTER TABLE new_releases ADD COLUMN IF NOT EXISTS projected_release_date date;
ALTER TABLE new_releases ADD COLUMN IF NOT EXISTS actual_release_date date;
ALTER TABLE new_releases ADD COLUMN IF NOT EXISTS sold_out_date date;

-- Create index for canonical name lookups
CREATE INDEX IF NOT EXISTS idx_new_releases_canonical_name ON new_releases(canonical_name);
CREATE INDEX IF NOT EXISTS idx_new_releases_merged_into ON new_releases(merged_into_id) WHERE merged_into_id IS NOT NULL;

-- Create GIN index for fuzzy title matching
CREATE INDEX IF NOT EXISTS idx_new_releases_title_trgm ON new_releases USING gin (title gin_trgm_ops);

-- Create release_article_sources table for tracking where releases were found
CREATE TABLE IF NOT EXISTS release_article_sources (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  release_id uuid REFERENCES new_releases(id) ON DELETE CASCADE NOT NULL,
  source_url text NOT NULL,
  source_name text,
  article_title text,
  snippet text,
  discovered_at timestamp with time zone DEFAULT now(),
  UNIQUE(release_id, source_url)
);

CREATE INDEX IF NOT EXISTS idx_release_sources_release ON release_article_sources(release_id);

-- Function to find similar releases using fuzzy matching
CREATE OR REPLACE FUNCTION find_similar_release(
  search_title text,
  search_canonical text,
  similarity_threshold float DEFAULT 0.7
)
RETURNS TABLE (
  id uuid,
  title text,
  canonical_name text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    nr.id,
    nr.title,
    nr.canonical_name,
    GREATEST(
      similarity(nr.title, search_title),
      COALESCE(similarity(nr.canonical_name, search_canonical), 0)
    ) as similarity
  FROM new_releases nr
  WHERE nr.merged_into_id IS NULL
    AND (
      similarity(nr.title, search_title) >= similarity_threshold
      OR similarity(nr.canonical_name, search_canonical) >= similarity_threshold
    )
  ORDER BY similarity DESC
  LIMIT 5;
END;
$$;

-- Function to merge two releases
CREATE OR REPLACE FUNCTION merge_releases(
  source_release_id uuid,
  target_release_id uuid
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Move all article sources from source to target
  INSERT INTO release_article_sources (release_id, source_url, source_name, article_title, snippet, discovered_at)
  SELECT target_release_id, source_url, source_name, article_title, snippet, discovered_at
  FROM release_article_sources
  WHERE release_id = source_release_id
  ON CONFLICT (release_id, source_url) DO NOTHING;

  -- Delete old sources
  DELETE FROM release_article_sources WHERE release_id = source_release_id;

  -- Mark source as merged
  UPDATE new_releases
  SET merged_into_id = target_release_id
  WHERE id = source_release_id;

  -- Update any releases that were merged into source to point to target
  UPDATE new_releases
  SET merged_into_id = target_release_id
  WHERE merged_into_id = source_release_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION find_similar_release TO authenticated;
GRANT EXECUTE ON FUNCTION find_similar_release TO service_role;
GRANT EXECUTE ON FUNCTION merge_releases TO authenticated;
GRANT EXECUTE ON FUNCTION merge_releases TO service_role;
GRANT ALL ON release_article_sources TO authenticated;
GRANT ALL ON release_article_sources TO service_role;
