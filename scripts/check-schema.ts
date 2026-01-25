import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('=== Checking shopping_trips constraint ===\n');

  // Query to check the constraint
  const { data, error } = await supabase.rpc('get_constraint_info', {});

  if (error) {
    console.log('RPC not available, trying direct query...');

    // Try a workaround - insert with different status values to see what's valid
    const testStatuses = ['planned', 'planning', 'in_progress', 'active', 'completed', 'cancelled'];

    for (const status of testStatuses) {
      // Just do a select with the status to understand structure
      const { data: trips } = await supabase
        .from('shopping_trips')
        .select('status')
        .eq('status', status)
        .limit(1);

      console.log(`Status '${status}': ${trips?.length || 0} trips found`);
    }
  }
}

main().catch(console.error);
