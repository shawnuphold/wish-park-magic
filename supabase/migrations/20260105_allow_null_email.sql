-- Migration: Allow NULL emails on customers table
-- This fixes duplicate email errors caused by placeholder emails

-- Drop NOT NULL constraint on email column
ALTER TABLE customers ALTER COLUMN email DROP NOT NULL;

-- Update any existing placeholder emails to NULL
UPDATE customers
SET email = NULL
WHERE email LIKE '%@placeholder%'
   OR email LIKE '%placeholder.local'
   OR email LIKE 'noemail@%'
   OR email LIKE 'customer.%@placeholder%'
   OR email LIKE 'fb.%@placeholder%';

-- Add comment explaining the change
COMMENT ON COLUMN customers.email IS 'Customer email address. NULL allowed for customers without email (e.g., Facebook Messenger only).';
