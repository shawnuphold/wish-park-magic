import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

async function main() {
  const { data: sources } = await supabase
    .from('feed_sources')
    .select('*')
    .order('name');

  console.log('=== CURRENT FEED SOURCES ===\n');
  for (const s of sources || []) {
    console.log(`[${s.is_active ? '✓ ACTIVE' : '✗ DISABLED'}] ${s.name}`);
    console.log(`    URL: ${s.url}`);
    console.log(`    Last checked: ${s.last_checked || 'Never'}`);
    console.log('');
  }
}

main();
