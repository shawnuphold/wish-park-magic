#!/usr/bin/env npx tsx
// Fix Nintendo Plush Headbands image - ISSUE-008

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const releaseId = '68b0748a-3147-4cbe-a368-8a30b6d3ae63';
  const imageUrl = 'https://r2-media.wdwnt.com/2025/12/uor-nintendo-headband-discount-5276.jpg';

  console.log('=== Fixing Nintendo Plush Headbands Image ===\n');
  console.log(`Release ID: ${releaseId}`);
  console.log(`New Image URL: ${imageUrl}\n`);

  const { data, error } = await supabase
    .from('new_releases')
    .update({ image_url: imageUrl })
    .eq('id', releaseId)
    .select('id, title, image_url');

  if (error) {
    console.error('Update error:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('✅ Successfully updated image!');
    console.log(`   Title: ${data[0].title}`);
    console.log(`   Image URL: ${data[0].image_url}`);
  } else {
    console.log('No rows updated - release may not exist.');
  }
}

main().catch(console.error);
