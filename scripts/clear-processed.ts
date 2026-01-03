#!/usr/bin/env npx tsx
// Clear processed articles to allow re-processing
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

async function clearProcessed() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('Clearing processed_articles...');
  const { error } = await supabase
    .from('processed_articles')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Match all rows

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('✅ Processed articles cleared');
  }

  // Also show current releases
  const { data: releases, error: relError } = await supabase
    .from('new_releases')
    .select('id, title, image_url')
    .is('merged_into_id', null)
    .limit(10);

  if (releases) {
    console.log(`\nCurrent releases (${releases.length}):`);
    releases.forEach(r => {
      const hasImage = r.image_url ? '✅' : '❌';
      console.log(`  ${hasImage} ${r.title.slice(0, 50)}`);
    });
  }
}

clearProcessed();
