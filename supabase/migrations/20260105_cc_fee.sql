-- Add CC Processing Fee columns to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cc_fee_enabled BOOLEAN DEFAULT false;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cc_fee_percentage DECIMAL(5,2) DEFAULT 3.00;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cc_fee_manual_amount DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cc_fee_amount DECIMAL(10,2) DEFAULT 0;
