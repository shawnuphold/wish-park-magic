import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://jtqnjvczkywfkobwddbu.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0cW5qdmN6a3l3ZmtvYndkZGJ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjIwNTM4NiwiZXhwIjoyMDgxNzgxMzg2fQ.23QsahVizk_jI1h_bUY0-9duNHH3HmCX7WuZyzMgqak";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigration() {
  console.log('Running invoice migration...');

  // Add columns one by one using direct SQL via REST API
  const columns = [
    'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_number TEXT',
    'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT',
    'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method TEXT',
    'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_reference TEXT',
    'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes TEXT',
    'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ',
    'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ',
  ];

  for (const sql of columns) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({ sql }),
      });

      if (!response.ok) {
        // If exec_sql doesn't exist, we'll need to run via Supabase dashboard
        console.log('Note: exec_sql RPC not available. Please run migration in Supabase SQL Editor.');
        break;
      }
    } catch (error) {
      console.log('Migration needs to be run in Supabase SQL Editor');
      break;
    }
  }

  console.log('Migration script complete. If columns were not added, run in Supabase SQL Editor:');
  console.log(`
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
  `);
}

runMigration();
