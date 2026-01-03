import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

async function list() {
  const { data: releases } = await supabase
    .from('new_releases')
    .select('id, title, status')
    .eq('status', 'coming_soon');
  console.log('Coming soon items:');
  releases?.forEach(r => console.log(`  ${r.id}: ${r.title}`));
}
list();
