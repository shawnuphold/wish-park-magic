import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/api-auth';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

// Admin-only migration endpoint
export async function POST() {
  // Require admin authentication
  const auth = await requireAdminAuth(['admin']); // Only admin role
  if (!auth.success) return auth.response;

  try {
    const supabase = createSupabaseAdminClient();

    // Check which columns already exist by querying the invoices table
    const { data: existingData } = await supabase
      .from('invoices')
      .select('*')
      .limit(1);

    // Get column names from the first row
    const existingColumns = existingData && existingData[0]
      ? Object.keys(existingData[0])
      : [];

    const columnsToAdd = [
      { name: 'invoice_number', type: 'TEXT' },
      { name: 'stripe_invoice_id', type: 'TEXT' },
      { name: 'payment_method', type: 'TEXT' },
      { name: 'payment_reference', type: 'TEXT' },
      { name: 'notes', type: 'TEXT' },
      { name: 'due_date', type: 'TIMESTAMPTZ' },
      { name: 'sent_at', type: 'TIMESTAMPTZ' },
    ];

    const missingColumns = columnsToAdd.filter(
      col => !existingColumns.includes(col.name)
    );

    if (missingColumns.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All columns already exist. Migration complete.',
        existingColumns,
      });
    }

    // Return info about what needs to be added via Supabase SQL Editor
    return NextResponse.json({
      success: true,
      message: 'The following columns need to be added via Supabase SQL Editor:',
      existingColumns,
      missingColumns,
      sql: `
-- Run this in Supabase SQL Editor:
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('paypal', 'stripe', 'manual'));
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

-- Create invoice number sequence
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1001;

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := 'INV-' || LPAD(nextval('invoice_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate invoice number
DROP TRIGGER IF EXISTS set_invoice_number ON invoices;
CREATE TRIGGER set_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION generate_invoice_number();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
      `,
    });
  } catch (error) {
    console.error('Migration check error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Migration check failed' },
      { status: 500 }
    );
  }
}
