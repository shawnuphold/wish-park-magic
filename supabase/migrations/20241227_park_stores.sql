-- Park Stores Database
-- Comprehensive list of merchandise stores at Orlando theme parks
-- Used for location dropdowns in request and release forms

CREATE TABLE IF NOT EXISTS park_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  park TEXT NOT NULL,           -- "Magic Kingdom", "EPCOT", etc.
  land TEXT,                    -- "Fantasyland", "World Showcase - Japan", etc.
  store_name TEXT NOT NULL,     -- "Emporium", "Mitsukoshi", etc.
  store_type TEXT DEFAULT 'gift_shop', -- "gift_shop", "cart", "kiosk", "boutique", "resort"
  notes TEXT,                   -- "Near castle", "Exit of ride", etc.
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add Epic Universe flag to settings for "Coming Soon" toggle
-- This will be managed in the admin settings

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_park_stores_park ON park_stores(park);
CREATE INDEX IF NOT EXISTS idx_park_stores_land ON park_stores(land);
CREATE INDEX IF NOT EXISTS idx_park_stores_active ON park_stores(is_active);
CREATE INDEX IF NOT EXISTS idx_park_stores_park_land ON park_stores(park, land);

-- Unique constraint to prevent duplicate stores
CREATE UNIQUE INDEX IF NOT EXISTS idx_park_stores_unique ON park_stores(park, land, store_name);

-- RLS Policies
ALTER TABLE park_stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "park_stores_select_all" ON park_stores FOR SELECT USING (true);
CREATE POLICY "park_stores_insert_auth" ON park_stores FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "park_stores_update_auth" ON park_stores FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "park_stores_delete_auth" ON park_stores FOR DELETE USING (auth.role() = 'authenticated');

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_park_stores_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_park_stores_timestamp ON park_stores;
CREATE TRIGGER update_park_stores_timestamp
  BEFORE UPDATE ON park_stores
  FOR EACH ROW
  EXECUTE FUNCTION update_park_stores_timestamp();

-- Add Epic Universe setting
INSERT INTO settings (key, value) VALUES
  ('epic_universe_enabled', '"false"')
ON CONFLICT (key) DO NOTHING;
