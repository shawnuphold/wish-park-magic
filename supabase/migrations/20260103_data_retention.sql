-- Data Retention: Auto-expire releases after 18 months
-- Add expiration to new_releases
ALTER TABLE new_releases ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Backfill: 18 months from creation
UPDATE new_releases SET expires_at = created_at + INTERVAL '18 months' WHERE expires_at IS NULL;

-- Auto-set on new inserts
CREATE OR REPLACE FUNCTION set_release_expiration()
RETURNS TRIGGER AS $$
BEGIN
  NEW.expires_at := COALESCE(NEW.expires_at, NOW() + INTERVAL '18 months');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_release_expiration ON new_releases;
CREATE TRIGGER trigger_set_release_expiration
  BEFORE INSERT ON new_releases
  FOR EACH ROW
  EXECUTE FUNCTION set_release_expiration();

-- Cleanup function (run monthly via cron: SELECT cleanup_expired_releases();)
CREATE OR REPLACE FUNCTION cleanup_expired_releases() RETURNS INTEGER AS $$
DECLARE deleted_count INTEGER;
BEGIN
  DELETE FROM new_releases WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
