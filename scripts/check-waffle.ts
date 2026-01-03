import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

async function check() {
  const { data: releases } = await supabase
    .from('new_releases')
    .select('title, created_at')
    .ilike('title', '%waffle%');
  console.log('Waffle releases:', releases);
  
  const { data: processed } = await supabase
    .from('processed_articles')
    .select('title, items_found')
    .ilike('title', '%waffle%');
  console.log('Waffle processed articles:', processed);
}
check();
