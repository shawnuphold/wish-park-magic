-- Telegram Bot Screenshot-to-Request Feature
-- Customer aliases and request source tracking

-- 1. Customer aliases table (one customer can have multiple FB names, emails, etc)
CREATE TABLE IF NOT EXISTS customer_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  alias_type TEXT NOT NULL CHECK (alias_type IN ('facebook', 'instagram', 'email', 'phone', 'other')),
  alias_value TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(alias_type, alias_value)
);

CREATE INDEX IF NOT EXISTS idx_customer_aliases_value ON customer_aliases(lower(alias_value));
CREATE INDEX IF NOT EXISTS idx_customer_aliases_customer ON customer_aliases(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_aliases_type_value ON customer_aliases(alias_type, lower(alias_value));

-- 2. Add new columns to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS facebook_name TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS facebook_profile_url TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS telegram_username TEXT;

-- Create index for facebook_name lookups
CREATE INDEX IF NOT EXISTS idx_customers_facebook_name ON customers(lower(facebook_name));
CREATE INDEX IF NOT EXISTS idx_customers_name_lower ON customers(lower(name));

-- 3. Add telegram tracking to requests
ALTER TABLE requests ADD COLUMN IF NOT EXISTS telegram_message_id TEXT;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Add constraint for source values (if column was just added)
DO $$
BEGIN
  -- Only add constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'requests_source_check'
  ) THEN
    ALTER TABLE requests ADD CONSTRAINT requests_source_check
      CHECK (source IN ('manual', 'telegram', 'facebook', 'website', 'email'));
  END IF;
EXCEPTION WHEN others THEN
  -- Constraint may already exist, ignore
  NULL;
END $$;

-- 4. RLS policies for customer_aliases
ALTER TABLE customer_aliases ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "customer_aliases_service" ON customer_aliases
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated users can read
CREATE POLICY "customer_aliases_read" ON customer_aliases
  FOR SELECT TO authenticated USING (true);

-- 5. Function to find customer by any alias
CREATE OR REPLACE FUNCTION find_customer_by_alias(
  p_alias_type TEXT,
  p_alias_value TEXT
)
RETURNS UUID AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  -- Check aliases table first
  SELECT customer_id INTO v_customer_id
  FROM customer_aliases
  WHERE alias_type = p_alias_type
    AND lower(alias_value) = lower(p_alias_value)
  LIMIT 1;

  IF v_customer_id IS NOT NULL THEN
    RETURN v_customer_id;
  END IF;

  -- For facebook type, also check facebook_name column
  IF p_alias_type = 'facebook' THEN
    SELECT id INTO v_customer_id
    FROM customers
    WHERE lower(facebook_name) = lower(p_alias_value)
    LIMIT 1;

    IF v_customer_id IS NOT NULL THEN
      RETURN v_customer_id;
    END IF;

    -- Also check real name (FB name might = real name)
    SELECT id INTO v_customer_id
    FROM customers
    WHERE lower(name) = lower(p_alias_value)
    LIMIT 1;
  END IF;

  RETURN v_customer_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Function to add alias (with duplicate handling)
CREATE OR REPLACE FUNCTION add_customer_alias(
  p_customer_id UUID,
  p_alias_type TEXT,
  p_alias_value TEXT,
  p_is_primary BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO customer_aliases (customer_id, alias_type, alias_value, is_primary)
  VALUES (p_customer_id, p_alias_type, lower(trim(p_alias_value)), p_is_primary)
  ON CONFLICT (alias_type, alias_value) DO NOTHING;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;
