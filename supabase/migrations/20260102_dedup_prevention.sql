-- Duplicate Prevention Migration
-- Fixes the duplicate posting problem in new_releases

-- 1. Add title_normalized column for fuzzy matching
-- This is a normalized version of the title for comparison
ALTER TABLE new_releases ADD COLUMN IF NOT EXISTS title_normalized TEXT;

-- Function to normalize a title for comparison
-- Removes common words, punctuation, and normalizes spacing
CREATE OR REPLACE FUNCTION normalize_title(title TEXT)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  result := lower(title);
  -- Remove possessives and contractions
  result := regexp_replace(result, '''s\b', '', 'g');
  result := regexp_replace(result, '''', '', 'g');
  -- Remove punctuation
  result := regexp_replace(result, '[^a-z0-9\s]', '', 'g');
  -- Remove common filler words
  result := regexp_replace(result, '\b(the|a|an|and|or|for|with|by|at|in|on|to|of|new|now|available)\b', '', 'g');
  -- Remove theme park noise words (too aggressive for canonical_name)
  result := regexp_replace(result, '\b(disney|universal|seaworld|orlando|resort|parks?|world|walt)\b', '', 'g');
  -- Collapse multiple spaces to single
  result := regexp_replace(result, '\s+', ' ', 'g');
  -- Trim
  result := trim(result);
  -- Replace spaces with hyphens for storage
  result := regexp_replace(result, '\s', '-', 'g');
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create index on title_normalized
CREATE INDEX IF NOT EXISTS idx_new_releases_title_normalized ON new_releases(title_normalized);

-- Backfill existing records
UPDATE new_releases
SET title_normalized = normalize_title(title)
WHERE title_normalized IS NULL;

-- 2. Create a composite unique constraint based on source article + normalized title
-- This prevents the same product from being extracted multiple times from the same article
-- First, create a hash column for the composite key
ALTER TABLE new_releases ADD COLUMN IF NOT EXISTS source_product_hash TEXT;

-- Generate hash for existing records
UPDATE new_releases
SET source_product_hash = md5(coalesce(source_url, '') || '::' || normalize_title(title))
WHERE source_product_hash IS NULL;

-- Create unique index on the hash (not constraint, so we can handle violations gracefully)
CREATE UNIQUE INDEX IF NOT EXISTS idx_new_releases_source_product_unique
ON new_releases(source_product_hash)
WHERE merged_into_id IS NULL;

-- 3. Create comprehensive duplicate check function
-- Checks: exact URL match, exact image URL match, similar title (70%+ word match)
CREATE OR REPLACE FUNCTION is_duplicate_release(
  p_title TEXT,
  p_source_url TEXT DEFAULT NULL,
  p_image_url TEXT DEFAULT NULL
)
RETURNS TABLE (
  is_duplicate BOOLEAN,
  existing_id UUID,
  match_reason TEXT,
  similarity_score FLOAT
) AS $$
DECLARE
  v_normalized TEXT;
  v_hash TEXT;
  v_existing RECORD;
  v_title_words TEXT[];
  v_match_words TEXT[];
  v_intersection INT;
  v_match_rate FLOAT;
BEGIN
  v_normalized := normalize_title(p_title);
  v_hash := md5(coalesce(p_source_url, '') || '::' || v_normalized);

  -- Check 1: Exact source_product_hash match
  SELECT id INTO v_existing
  FROM new_releases
  WHERE source_product_hash = v_hash
    AND merged_into_id IS NULL
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    RETURN QUERY SELECT true, v_existing.id, 'exact_hash_match'::TEXT, 1.0::FLOAT;
    RETURN;
  END IF;

  -- Check 2: Exact source_url + same normalized title
  IF p_source_url IS NOT NULL THEN
    SELECT id INTO v_existing
    FROM new_releases
    WHERE source_url = p_source_url
      AND title_normalized = v_normalized
      AND merged_into_id IS NULL
    LIMIT 1;

    IF v_existing.id IS NOT NULL THEN
      RETURN QUERY SELECT true, v_existing.id, 'exact_url_title_match'::TEXT, 1.0::FLOAT;
      RETURN;
    END IF;
  END IF;

  -- Check 3: Exact image URL match (non-placeholder)
  IF p_image_url IS NOT NULL AND p_image_url != '' AND p_image_url NOT LIKE '%placeholder%' THEN
    SELECT id INTO v_existing
    FROM new_releases
    WHERE image_url = p_image_url
      AND merged_into_id IS NULL
    LIMIT 1;

    IF v_existing.id IS NOT NULL THEN
      RETURN QUERY SELECT true, v_existing.id, 'exact_image_match'::TEXT, 1.0::FLOAT;
      RETURN;
    END IF;
  END IF;

  -- Check 4: Similar title using trigram similarity (70%+ match)
  -- Use pg_trgm extension
  FOR v_existing IN
    SELECT id, title, similarity(title_normalized, v_normalized) AS sim
    FROM new_releases
    WHERE merged_into_id IS NULL
      AND similarity(title_normalized, v_normalized) >= 0.7
    ORDER BY sim DESC
    LIMIT 1
  LOOP
    RETURN QUERY SELECT true, v_existing.id, 'similar_title'::TEXT, v_existing.sim::FLOAT;
    RETURN;
  END LOOP;

  -- Check 5: Word overlap check (70%+ of words match)
  -- Extract words from normalized title
  v_title_words := regexp_split_to_array(v_normalized, '-');

  FOR v_existing IN
    SELECT id, title, title_normalized
    FROM new_releases
    WHERE merged_into_id IS NULL
      AND title_normalized IS NOT NULL
  LOOP
    v_match_words := regexp_split_to_array(v_existing.title_normalized, '-');

    -- Count matching words
    SELECT count(*) INTO v_intersection
    FROM (
      SELECT unnest(v_title_words) INTERSECT SELECT unnest(v_match_words)
    ) x;

    -- Calculate match rate based on shorter list
    IF array_length(v_title_words, 1) > 0 AND array_length(v_match_words, 1) > 0 THEN
      v_match_rate := v_intersection::FLOAT / LEAST(array_length(v_title_words, 1), array_length(v_match_words, 1));

      IF v_match_rate >= 0.7 THEN
        RETURN QUERY SELECT true, v_existing.id, 'word_overlap'::TEXT, v_match_rate;
        RETURN;
      END IF;
    END IF;
  END LOOP;

  -- No duplicate found
  RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, 0.0::FLOAT;
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- 4. Create processing lock table
CREATE TABLE IF NOT EXISTS feed_processing_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lock_name TEXT NOT NULL UNIQUE,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_by TEXT,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feed_processing_locks_name ON feed_processing_locks(lock_name);
CREATE INDEX IF NOT EXISTS idx_feed_processing_locks_expires ON feed_processing_locks(expires_at);

-- Function to acquire a lock
CREATE OR REPLACE FUNCTION acquire_feed_lock(p_lock_name TEXT, p_timeout_minutes INT DEFAULT 30)
RETURNS BOOLEAN AS $$
DECLARE
  v_locked BOOLEAN := false;
BEGIN
  -- Clean up expired locks first
  DELETE FROM feed_processing_locks WHERE expires_at < NOW();

  -- Try to insert a new lock
  BEGIN
    INSERT INTO feed_processing_locks (lock_name, locked_by, expires_at)
    VALUES (p_lock_name, 'feed_processor', NOW() + (p_timeout_minutes || ' minutes')::INTERVAL);
    v_locked := true;
  EXCEPTION WHEN unique_violation THEN
    v_locked := false;
  END;

  RETURN v_locked;
END;
$$ LANGUAGE plpgsql;

-- Function to release a lock
CREATE OR REPLACE FUNCTION release_feed_lock(p_lock_name TEXT)
RETURNS VOID AS $$
BEGIN
  DELETE FROM feed_processing_locks WHERE lock_name = p_lock_name;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger to auto-populate normalized fields on insert/update
CREATE OR REPLACE FUNCTION set_release_normalized_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Set title_normalized
  NEW.title_normalized := normalize_title(NEW.title);

  -- Set source_product_hash
  NEW.source_product_hash := md5(coalesce(NEW.source_url, '') || '::' || NEW.title_normalized);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_release_normalized ON new_releases;
CREATE TRIGGER trigger_set_release_normalized
  BEFORE INSERT OR UPDATE OF title, source_url ON new_releases
  FOR EACH ROW
  EXECUTE FUNCTION set_release_normalized_fields();

-- 6. Enable RLS on locks table
ALTER TABLE feed_processing_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feed_processing_locks_service" ON feed_processing_locks
  FOR ALL TO service_role USING (true) WITH CHECK (true);
