-- Online Availability Tracking (Internal Intel)
-- shopDisney data is for admin use only, never exposed to customers

-- Add online availability columns to new_releases
ALTER TABLE new_releases ADD COLUMN IF NOT EXISTS available_online BOOLEAN DEFAULT false;
ALTER TABLE new_releases ADD COLUMN IF NOT EXISTS online_price DECIMAL(10,2);
ALTER TABLE new_releases ADD COLUMN IF NOT EXISTS online_url TEXT;
ALTER TABLE new_releases ADD COLUMN IF NOT EXISTS online_checked_at TIMESTAMPTZ;
ALTER TABLE new_releases ADD COLUMN IF NOT EXISTS online_sku TEXT;

-- Park exclusive is computed: true if NOT available online
-- Note: PostgreSQL doesn't support GENERATED ALWAYS AS with STORED for boolean expressions
-- We'll use a trigger instead
ALTER TABLE new_releases ADD COLUMN IF NOT EXISTS park_exclusive BOOLEAN DEFAULT true;

-- Trigger to auto-update park_exclusive based on available_online
CREATE OR REPLACE FUNCTION update_park_exclusive()
RETURNS TRIGGER AS $$
BEGIN
  NEW.park_exclusive := NOT COALESCE(NEW.available_online, false);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_park_exclusive ON new_releases;
CREATE TRIGGER trigger_update_park_exclusive
  BEFORE INSERT OR UPDATE OF available_online ON new_releases
  FOR EACH ROW
  EXECUTE FUNCTION update_park_exclusive();

-- Image Priority System
-- Images stored with source attribution for filtering
-- Sources: 'manual' (Tracy's photos), 'blog' (article images), 'shopdisney' (admin only)
ALTER TABLE new_releases ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]';
-- Format: [{"url": "s3://...", "source": "manual|blog|shopdisney", "caption": "", "uploaded_at": "..."}]

-- Customer Notification Preferences
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notification_preferences JSONB
  DEFAULT '{"enabled": false, "parks": [], "categories": [], "park_exclusives_only": true}';

-- Release Notifications tracking (if not exists from previous migration)
CREATE TABLE IF NOT EXISTS release_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID REFERENCES new_releases(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  email_subject TEXT,
  clicked_at TIMESTAMPTZ,
  converted_to_request_id UUID REFERENCES requests(id),
  UNIQUE(release_id, customer_id)
);

-- Index for faster notification lookups
CREATE INDEX IF NOT EXISTS idx_release_notifications_release ON release_notifications(release_id);
CREATE INDEX IF NOT EXISTS idx_release_notifications_customer ON release_notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_release_notifications_sent ON release_notifications(sent_at);

-- Index for online availability checks
CREATE INDEX IF NOT EXISTS idx_new_releases_online_checked ON new_releases(online_checked_at);
CREATE INDEX IF NOT EXISTS idx_new_releases_park_exclusive ON new_releases(park_exclusive);
CREATE INDEX IF NOT EXISTS idx_new_releases_available_online ON new_releases(available_online);

-- shopDisney products cache table (internal tracking only)
CREATE TABLE IF NOT EXISTS shopdisney_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  price DECIMAL(10,2),
  url TEXT NOT NULL,
  image_url TEXT,
  availability_status TEXT, -- 'in_stock', 'out_of_stock', 'pre_order'
  matched_release_id UUID REFERENCES new_releases(id),
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_checked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shopdisney_canonical ON shopdisney_products(canonical_name);
CREATE INDEX IF NOT EXISTS idx_shopdisney_matched ON shopdisney_products(matched_release_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_shopdisney_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_shopdisney_updated_at ON shopdisney_products;
CREATE TRIGGER trigger_shopdisney_updated_at
  BEFORE UPDATE ON shopdisney_products
  FOR EACH ROW
  EXECUTE FUNCTION update_shopdisney_updated_at();
