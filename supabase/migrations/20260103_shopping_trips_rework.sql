-- Shopping Trips Rework: Mobile-first shopper app support
-- Adds granular park codes, item-level trip assignment, and priority

-- Modify shopping_trips table
ALTER TABLE shopping_trips ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE shopping_trips ADD COLUMN IF NOT EXISTS trip_date DATE;
ALTER TABLE shopping_trips ADD COLUMN IF NOT EXISTS park TEXT;
ALTER TABLE shopping_trips ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE shopping_trips ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Backfill name from date
UPDATE shopping_trips SET name = 'Trip - ' || date WHERE name IS NULL;
UPDATE shopping_trips SET trip_date = date::date WHERE trip_date IS NULL;

-- Add item-level trip fields to request_items
ALTER TABLE request_items ADD COLUMN IF NOT EXISTS shopping_trip_id UUID REFERENCES shopping_trips(id);
ALTER TABLE request_items ADD COLUMN IF NOT EXISTS trip_status TEXT DEFAULT 'pending';
ALTER TABLE request_items ADD COLUMN IF NOT EXISTS trip_notes TEXT;
ALTER TABLE request_items ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 5;

-- Add constraint for trip_status
ALTER TABLE request_items DROP CONSTRAINT IF EXISTS request_items_trip_status_check;
ALTER TABLE request_items ADD CONSTRAINT request_items_trip_status_check
  CHECK (trip_status IS NULL OR trip_status IN ('pending', 'assigned', 'shopping', 'found', 'not_found', 'out_of_stock'));

-- Index for trip item queries
CREATE INDEX IF NOT EXISTS idx_request_items_shopping_trip ON request_items(shopping_trip_id) WHERE shopping_trip_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_request_items_trip_status ON request_items(trip_status) WHERE trip_status IS NOT NULL;

-- Index for shopping trips queries
CREATE INDEX IF NOT EXISTS idx_shopping_trips_trip_date ON shopping_trips(trip_date);
CREATE INDEX IF NOT EXISTS idx_shopping_trips_status ON shopping_trips(status);
CREATE INDEX IF NOT EXISTS idx_shopping_trips_park ON shopping_trips(park) WHERE park IS NOT NULL;
