/**
 * Migration script to add original_image_url column to new_releases table
 *
 * Run this SQL in Supabase SQL Editor:
 *
 * ALTER TABLE new_releases
 * ADD COLUMN IF NOT EXISTS original_image_url TEXT;
 *
 * COMMENT ON COLUMN new_releases.original_image_url IS
 *   'Full-size original image before AI cropping, for manual re-crop';
 *
 * This column stores the URL to the original uncropped image when the AI
 * performs automatic cropping of composite images. If the AI crop fails or
 * is incorrect, users can manually re-crop from this original image.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

async function checkColumnExists() {
  console.log('Checking if original_image_url column exists...\n');

  // Try to select the column - if it doesn't exist, we'll get an error
  const { data, error } = await supabase
    .from('new_releases')
    .select('id, original_image_url')
    .limit(1);

  if (error && error.message.includes('original_image_url')) {
    console.log('❌ Column "original_image_url" does NOT exist yet.\n');
    console.log('Please run this SQL in your Supabase SQL Editor:\n');
    console.log('----------------------------------------');
    console.log(`
ALTER TABLE new_releases
ADD COLUMN IF NOT EXISTS original_image_url TEXT;

COMMENT ON COLUMN new_releases.original_image_url IS
  'Full-size original image before AI cropping, for manual re-crop';
`);
    console.log('----------------------------------------\n');
  } else if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('✅ Column "original_image_url" exists!');
    console.log('Sample data:', data);

    // Count releases with original images
    const { count } = await supabase
      .from('new_releases')
      .select('id', { count: 'exact', head: true })
      .not('original_image_url', 'is', null);

    console.log(`\n📊 ${count || 0} releases have original images stored.`);
  }
}

checkColumnExists();
