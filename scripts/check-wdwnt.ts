import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

async function check() {
  const { data: recent } = await supabase
    .from('processed_articles')
    .select('url, title, items_found, created_at')
    .ilike('url', '%wdwnt%')
    .order('created_at', { ascending: false })
    .limit(20);
  console.log('Recent WDWNT articles:');
  recent?.forEach(a => console.log('  -', a.items_found, 'items:', a.title?.slice(0,55) || a.url.slice(-50)));
}
check();
