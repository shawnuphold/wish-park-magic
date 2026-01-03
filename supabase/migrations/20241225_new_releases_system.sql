-- New Releases AI System Migration
-- Run this in Supabase SQL Editor

-- Track data sources (RSS feeds, blogs, etc.)
CREATE TABLE IF NOT EXISTS release_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('rss', 'scrape', 'api', 'manual')),
  park TEXT NOT NULL CHECK (park IN ('disney', 'universal', 'seaworld', 'all')),
  last_checked TIMESTAMPTZ,
  last_error TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  check_frequency_hours INTEGER DEFAULT 4,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track processed articles to avoid duplicates
CREATE TABLE IF NOT EXISTS processed_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID REFERENCES release_sources(id) ON DELETE CASCADE,
  url TEXT UNIQUE NOT NULL,
  title TEXT,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  items_found INTEGER DEFAULT 0,
  error TEXT
);

-- Customer interests for matching
CREATE TABLE IF NOT EXISTS customer_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  category TEXT,  -- loungefly, ears, spirit_jersey, etc.
  park TEXT CHECK (park IN ('disney', 'universal', 'seaworld', 'all')),
  keywords TEXT[], -- ['haunted mansion', 'villain', 'figment']
  notify_new_releases BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track notifications sent
CREATE TABLE IF NOT EXISTS release_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  release_id UUID REFERENCES new_releases(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  clicked BOOLEAN DEFAULT FALSE,
  clicked_at TIMESTAMPTZ,
  converted_to_request BOOLEAN DEFAULT FALSE,
  request_id UUID REFERENCES requests(id) ON DELETE SET NULL,
  UNIQUE(release_id, customer_id)
);

-- Add AI fields to new_releases table
ALTER TABLE new_releases ADD COLUMN IF NOT EXISTS ai_description TEXT;
ALTER TABLE new_releases ADD COLUMN IF NOT EXISTS ai_tags TEXT[];
ALTER TABLE new_releases ADD COLUMN IF NOT EXISTS ai_demand_score INTEGER CHECK (ai_demand_score >= 1 AND ai_demand_score <= 10);
ALTER TABLE new_releases ADD COLUMN IF NOT EXISTS ai_similar_to UUID[];
ALTER TABLE new_releases ADD COLUMN IF NOT EXISTS raw_content TEXT;
ALTER TABLE new_releases ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'archived'));
ALTER TABLE new_releases ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES release_sources(id) ON DELETE SET NULL;
ALTER TABLE new_releases ADD COLUMN IF NOT EXISTS article_url TEXT;
ALTER TABLE new_releases ADD COLUMN IF NOT EXISTS location TEXT;  -- specific location in park

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_new_releases_status ON new_releases(status);
CREATE INDEX IF NOT EXISTS idx_new_releases_park ON new_releases(park);
CREATE INDEX IF NOT EXISTS idx_new_releases_category ON new_releases(category);
CREATE INDEX IF NOT EXISTS idx_new_releases_release_date ON new_releases(release_date DESC);
CREATE INDEX IF NOT EXISTS idx_new_releases_demand_score ON new_releases(ai_demand_score DESC);
CREATE INDEX IF NOT EXISTS idx_processed_articles_url ON processed_articles(url);
CREATE INDEX IF NOT EXISTS idx_customer_interests_customer ON customer_interests(customer_id);
CREATE INDEX IF NOT EXISTS idx_release_notifications_customer ON release_notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_release_notifications_release ON release_notifications(release_id);

-- Seed initial RSS sources
INSERT INTO release_sources (name, url, type, park) VALUES
  ('BlogMickey', 'https://blogmickey.com/feed/', 'rss', 'disney'),
  ('WDWNT', 'https://wdwnt.com/feed/', 'rss', 'disney'),
  ('Disney Food Blog', 'https://www.disneyfoodblog.com/feed/', 'rss', 'disney'),
  ('AllEars', 'https://allears.net/feed/', 'rss', 'disney'),
  ('Laughing Place', 'https://www.laughingplace.com/w/feed/', 'rss', 'disney'),
  ('Orlando Informer', 'https://orlandoinformer.com/feed/', 'rss', 'all'),
  ('Inside Universal', 'https://insideuniversal.net/feed/', 'rss', 'universal')
ON CONFLICT DO NOTHING;

-- Enable RLS policies
ALTER TABLE release_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE release_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for release_sources (admin only)
CREATE POLICY "release_sources_select_all" ON release_sources FOR SELECT USING (true);
CREATE POLICY "release_sources_insert_auth" ON release_sources FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "release_sources_update_auth" ON release_sources FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "release_sources_delete_auth" ON release_sources FOR DELETE USING (auth.role() = 'authenticated');

-- RLS policies for processed_articles
CREATE POLICY "processed_articles_select_all" ON processed_articles FOR SELECT USING (true);
CREATE POLICY "processed_articles_insert_auth" ON processed_articles FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- RLS policies for customer_interests
CREATE POLICY "customer_interests_select_all" ON customer_interests FOR SELECT USING (true);
CREATE POLICY "customer_interests_insert_auth" ON customer_interests FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "customer_interests_update_auth" ON customer_interests FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "customer_interests_delete_auth" ON customer_interests FOR DELETE USING (auth.role() = 'authenticated');

-- RLS policies for release_notifications
CREATE POLICY "release_notifications_select_all" ON release_notifications FOR SELECT USING (true);
CREATE POLICY "release_notifications_insert_auth" ON release_notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "release_notifications_update_auth" ON release_notifications FOR UPDATE USING (auth.role() = 'authenticated');

-- Update trigger for timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_release_sources_updated_at ON release_sources;
CREATE TRIGGER update_release_sources_updated_at
  BEFORE UPDATE ON release_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_customer_interests_updated_at ON customer_interests;
CREATE TRIGGER update_customer_interests_updated_at
  BEFORE UPDATE ON customer_interests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
