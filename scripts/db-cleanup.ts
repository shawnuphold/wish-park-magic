import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load .env.local
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Check .env.local');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'set' : 'missing');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'set' : 'missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('=== Shopping Trips Status Cleanup ===\n');

  // First, check current status values
  const { data: beforeData, error: beforeError } = await supabase
    .from('shopping_trips')
    .select('id, status, date')
    .order('date', { ascending: false });

  if (beforeError) {
    console.error('Error fetching trips:', beforeError);
    return;
  }

  console.log('Current trips:');
  beforeData?.forEach(trip => {
    console.log(`  ID: ${trip.id.slice(0, 8)}... | Status: ${trip.status} | Date: ${trip.date}`);
  });
  console.log(`\nTotal trips: ${beforeData?.length || 0}`);

  // Check for trips with old status values
  const plannedTrips = beforeData?.filter(t => t.status === 'planned') || [];
  const inProgressTrips = beforeData?.filter(t => t.status === 'in_progress') || [];

  console.log(`\nTrips with 'planned' status: ${plannedTrips.length}`);
  console.log(`Trips with 'in_progress' status: ${inProgressTrips.length}`);

  if (plannedTrips.length === 0 && inProgressTrips.length === 0) {
    console.log('\n✓ No trips need status updates. Database is clean.');
    return;
  }

  // Update 'planned' to 'planning'
  if (plannedTrips.length > 0) {
    const { error: updateError1 } = await supabase
      .from('shopping_trips')
      .update({ status: 'planning' })
      .eq('status', 'planned');

    if (updateError1) {
      console.error('Error updating planned trips:', updateError1);
    } else {
      console.log(`\n✓ Updated ${plannedTrips.length} trips from 'planned' to 'planning'`);
    }
  }

  // Update 'in_progress' to 'active'
  if (inProgressTrips.length > 0) {
    const { error: updateError2 } = await supabase
      .from('shopping_trips')
      .update({ status: 'active' })
      .eq('status', 'in_progress');

    if (updateError2) {
      console.error('Error updating in_progress trips:', updateError2);
    } else {
      console.log(`✓ Updated ${inProgressTrips.length} trips from 'in_progress' to 'active'`);
    }
  }

  // Verify the updates
  const { data: afterData } = await supabase
    .from('shopping_trips')
    .select('id, status, date')
    .order('date', { ascending: false });

  console.log('\n=== After Cleanup ===');
  afterData?.forEach(trip => {
    console.log(`  ID: ${trip.id.slice(0, 8)}... | Status: ${trip.status} | Date: ${trip.date}`);
  });

  console.log('\n✓ Database cleanup complete!');
}

main().catch(console.error);
