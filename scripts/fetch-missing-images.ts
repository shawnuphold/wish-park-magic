#!/usr/bin/env npx tsx
// Fetch missing images for releases with AI verification
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import { downloadAndStoreImage } from '../src/lib/images/releaseImages';
import { findBestImageForProduct } from '../src/lib/images/verifyImage';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function scrapeImagesFromUrl(url: string): Promise<string[]> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EnchantedParkPickups/1.0)',
      },
    });

    if (!response.ok) return [];

    const html = await response.text();
    const $ = cheerio.load(html);

    const images: string[] = [];

    // Get all images from the article
    $('img').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
      if (src && !src.includes('avatar') && !src.includes('logo') && !src.includes('icon') && !src.includes('author')) {
        try {
          const absoluteUrl = new URL(src, url).href;
          // Filter for actual product images
          if (absoluteUrl.includes('.jpg') || absoluteUrl.includes('.png') || absoluteUrl.includes('.webp')) {
            images.push(absoluteUrl);
          }
        } catch {}
      }
    });

    return images;
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return [];
  }
}

async function main() {
  const forceRefresh = process.argv.includes('--force');

  // Get releases missing images OR all releases if --force
  let query = supabase
    .from('new_releases')
    .select('id, title, category, source_url, image_url')
    .is('merged_into_id', null);

  if (!forceRefresh) {
    query = query.or('image_url.is.null,image_url.eq.""');
  }

  const { data: releases } = await query;

  if (!releases || releases.length === 0) {
    console.log('No releases to process');
    return;
  }

  console.log(`Found ${releases.length} releases to process\n`);

  // Group by source URL to avoid scraping same page multiple times
  const bySource: Record<string, typeof releases> = {};
  releases.forEach(r => {
    const url = r.source_url || '';
    if (!bySource[url]) bySource[url] = [];
    bySource[url].push(r);
  });

  let updated = 0;
  let failed = 0;

  for (const [url, items] of Object.entries(bySource)) {
    if (!url) continue;

    console.log(`\n📄 Scraping: ${url.slice(0, 80)}...`);
    const images = await scrapeImagesFromUrl(url);
    console.log(`   Found ${images.length} images\n`);

    for (const release of items) {
      console.log(`🔍 Finding image for: ${release.title}`);

      // Use AI to find the best matching image
      const bestImage = await findBestImageForProduct(
        images,
        release.title,
        release.category
      );

      if (bestImage) {
        console.log(`   📤 Uploading verified image...`);
        const s3Url = await downloadAndStoreImage(bestImage, release.id, 'blog');

        if (s3Url) {
          await supabase
            .from('new_releases')
            .update({ image_url: s3Url })
            .eq('id', release.id);
          console.log(`   ✅ Saved!\n`);
          updated++;
        } else {
          console.log(`   ❌ Failed to upload\n`);
          failed++;
        }
      } else {
        console.log(`   ⚠️ No matching image found\n`);
        failed++;
      }

      // Rate limit for API calls
      await new Promise(r => setTimeout(r, 500));
    }

    // Rate limit between pages
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n========================================`);
  console.log(`Done! Updated: ${updated}, Failed: ${failed}`);
}

main();
