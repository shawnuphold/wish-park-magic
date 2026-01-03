#!/usr/bin/env npx tsx
// Check image status of all releases
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data: releases } = await supabase
    .from('new_releases')
    .select('id, title, image_url')
    .is('merged_into_id', null);

  if (!releases) {
    console.log('No releases found');
    return;
  }

  const withImage = releases.filter(r => r.image_url && r.image_url.length > 0);
  const withoutImage = releases.filter(r => !r.image_url || r.image_url.length === 0);

  console.log('================================');
  console.log(`Total releases: ${releases.length}`);
  console.log(`With images: ${withImage.length}`);
  console.log(`Without images: ${withoutImage.length}`);
  console.log('================================\n');

  if (withoutImage.length > 0) {
    console.log('Releases MISSING images:');
    withoutImage.forEach(r => console.log(`  ❌ ${r.title}`));
    console.log('');
  }

  console.log('Releases WITH images:');
  withImage.forEach(r => console.log(`  ✅ ${r.title.slice(0, 50)}`));
}

main();
