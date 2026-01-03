/**
 * Run Park Stores Migration
 * Creates the park_stores table and seeds it with data
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://jtqnjvczkywfkobwddbu.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0cW5qdmN6a3l3ZmtvYndkZGJ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjIwNTM4NiwiZXhwIjoyMDgxNzgxMzg2fQ.23QsahVizk_jI1h_bUY0-9duNHH3HmCX7WuZyzMgqak";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Note: Since Supabase doesn't expose exec_sql by default,
// print the SQL for manual execution in Supabase SQL Editor

console.log(`
==========================================
PARK STORES MIGRATION
==========================================

Please run the following SQL in your Supabase SQL Editor:
https://supabase.com/dashboard/project/jtqnjvczkywfkobwddbu/sql

-- Park Stores Database
-- Comprehensive list of merchandise stores at Orlando theme parks

CREATE TABLE IF NOT EXISTS park_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  park TEXT NOT NULL,
  land TEXT,
  store_name TEXT NOT NULL,
  store_type TEXT DEFAULT 'gift_shop',
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_park_stores_park ON park_stores(park);
CREATE INDEX IF NOT EXISTS idx_park_stores_land ON park_stores(land);
CREATE INDEX IF NOT EXISTS idx_park_stores_active ON park_stores(is_active);
CREATE INDEX IF NOT EXISTS idx_park_stores_park_land ON park_stores(park, land);

-- Unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_park_stores_unique ON park_stores(park, land, store_name);

-- RLS Policies
ALTER TABLE park_stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "park_stores_select_all" ON park_stores;
CREATE POLICY "park_stores_select_all" ON park_stores FOR SELECT USING (true);

DROP POLICY IF EXISTS "park_stores_insert_auth" ON park_stores;
CREATE POLICY "park_stores_insert_auth" ON park_stores FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "park_stores_update_auth" ON park_stores;
CREATE POLICY "park_stores_update_auth" ON park_stores FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "park_stores_delete_auth" ON park_stores;
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

-- Add Epic Universe setting (for Coming Soon toggle)
INSERT INTO settings (key, value) VALUES
  ('epic_universe_enabled', '"false"')
ON CONFLICT (key) DO NOTHING;

==========================================
After running the SQL above, run:
npx tsx scripts/seed-park-stores.ts
==========================================
`);
