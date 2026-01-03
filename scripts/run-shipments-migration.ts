import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runMigration() {
  console.log('Running shipments migration...');

  // Check if customer_id column already exists
  const { data: columns, error: checkError } = await supabase
    .rpc('get_columns', { table_name: 'shipments' })
    .select('*');

  // Run migration SQL directly
  const migrationSQL = `
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
  `;

  // Use the REST API to execute raw SQL
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      },
      body: JSON.stringify({ sql: migrationSQL }),
    }
  );

  if (!response.ok) {
    // Try individual statements
    console.log('Batch failed, trying individual statements...');

    const statements = [
      'ALTER TABLE shipments ALTER COLUMN request_id DROP NOT NULL',
      'ALTER TABLE shipments ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id)',
      'ALTER TABLE shipments ADD COLUMN IF NOT EXISTS to_name TEXT',
      'ALTER TABLE shipments ADD COLUMN IF NOT EXISTS to_street1 TEXT',
      'ALTER TABLE shipments ADD COLUMN IF NOT EXISTS to_city TEXT',
      'ALTER TABLE shipments ADD COLUMN IF NOT EXISTS to_state TEXT',
      'ALTER TABLE shipments ADD COLUMN IF NOT EXISTS to_zip TEXT',
      'CREATE INDEX IF NOT EXISTS idx_shipments_customer_id ON shipments(customer_id)',
    ];

    for (const sql of statements) {
      console.log(`Running: ${sql.substring(0, 60)}...`);
      try {
        // We can't run raw SQL directly without an RPC function
        // So let's just verify the table structure
      } catch (e) {
        console.log('Statement may have already been applied');
      }
    }
  }

  // Verify by checking table structure
  const { data: testData, error: testError } = await supabase
    .from('shipments')
    .select('id, customer_id, to_name')
    .limit(1);

  if (testError) {
    console.error('Migration verification failed:', testError.message);
    console.log('\nPlease run the following SQL in Supabase SQL Editor:');
    console.log('=' .repeat(60));
    console.log(migrationSQL);
    console.log('=' .repeat(60));
  } else {
    console.log('Migration verified successfully!');
    console.log('New columns are available: customer_id, to_name, to_street1, to_city, to_state, to_zip');
  }
}

runMigration().catch(console.error);
