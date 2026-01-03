#!/usr/bin/env npx tsx
/**
 * Fix releases that have composite images - crop individual products
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';
import { processCompositeImage } from '../src/lib/images/smartCropper';
import { uploadBufferToS3 } from '../src/lib/images/releaseImages';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Find releases that might have composite images (same image_url for multiple releases)
  const { data: releases } = await supabase
    .from('new_releases')
    .select('id, title, image_url')
    .is('merged_into_id', null)
    .not('image_url', 'is', null)
    .order('created_at', { ascending: false });

  if (!releases) {
    console.log('No releases found');
    return;
  }

  // Group by image_url to find potential composites
  const imageGroups = new Map<string, typeof releases>();
  for (const release of releases) {
    if (!release.image_url) continue;
    const group = imageGroups.get(release.image_url) || [];
    group.push(release);
    imageGroups.set(release.image_url, group);
  }

  // Find groups with multiple releases using same image
  const composites = Array.from(imageGroups.entries()).filter(([_, group]) => group.length > 1);

  if (composites.length === 0) {
    console.log('No composite images found (no shared images between releases)');
    return;
  }

  console.log(`Found ${composites.length} potential composite image(s):\n`);

  for (const [imageUrl, group] of composites) {
    console.log(`\n📷 Image used by ${group.length} releases:`);
    const productNames = group.map(r => r.title);
    for (const name of productNames) {
      console.log(`   - ${name}`);
    }

    console.log(`\n  Attempting smart crop...`);
    try {
      const cropped = await processCompositeImage(imageUrl, productNames);

      if (cropped.size === 0) {
        console.log(`  ⚠️ Could not identify individual products in image`);
        continue;
      }

      console.log(`  ✂️ Cropped ${cropped.size} products`);

      for (const [productName, buffer] of Array.from(cropped.entries())) {
        // Find matching release
        const release = group.find(r => r.title === productName);
        if (!release) {
          console.log(`  ⚠️ No release found for: ${productName}`);
          continue;
        }

        // Upload cropped image
        const s3Url = await uploadBufferToS3(buffer, release.id, 'image/jpeg');
        if (s3Url) {
          await supabase
            .from('new_releases')
            .update({ image_url: s3Url })
            .eq('id', release.id);
          console.log(`  ✅ Updated: ${productName}`);
        } else {
          console.log(`  ❌ Failed to upload: ${productName}`);
        }
      }
    } catch (error) {
      console.error(`  Error processing composite:`, error);
    }
  }

  console.log('\nDone!');
}

main();
