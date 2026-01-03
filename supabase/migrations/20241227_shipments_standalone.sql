-- Migration: Add support for standalone shipments (not linked to requests)
-- Date: December 27, 2025

-- Make request_id nullable (allow standalone shipments)
ALTER TABLE shipments ALTER COLUMN request_id DROP NOT NULL;

-- Add customer_id for standalone shipments
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

-- Add destination address fields
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS to_name TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS to_street1 TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS to_city TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS to_state TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS to_zip TEXT;

-- Create index on customer_id for efficient lookups
CREATE INDEX IF NOT EXISTS idx_shipments_customer_id ON shipments(customer_id);

-- Add check constraint: shipment must have either request_id or customer_id
-- (commented out to allow flexibility - can uncomment if you want to enforce this)
-- ALTER TABLE shipments ADD CONSTRAINT shipments_must_have_reference
--   CHECK (request_id IS NOT NULL OR customer_id IS NOT NULL);

COMMENT ON COLUMN shipments.customer_id IS 'Customer for standalone shipments (when not linked to a request)';
COMMENT ON COLUMN shipments.to_name IS 'Recipient name at destination';
COMMENT ON COLUMN shipments.to_street1 IS 'Destination street address';
COMMENT ON COLUMN shipments.to_city IS 'Destination city';
COMMENT ON COLUMN shipments.to_state IS 'Destination state (2-letter code)';
COMMENT ON COLUMN shipments.to_zip IS 'Destination ZIP code';
