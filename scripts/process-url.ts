#!/usr/bin/env npx tsx
// Process a specific article URL for merchandise
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { scrapeArticle, processArticle } from '../src/lib/ai/feedFetcher';

const url = process.argv[2];
if (!url) {
  console.log('Usage: npx tsx scripts/process-url.ts <article-url>');
  process.exit(1);
}

async function main() {
  console.log(`Processing: ${url}\n`);

  try {
    const { content, images } = await scrapeArticle(url);
    console.log(`Found ${images.length} images`);
    console.log(`Content length: ${content.length} chars\n`);

    // Create a mock source
    const source = {
      id: 'manual',
      name: 'Manual Import',
      url: '',
      type: 'rss',
      park: 'all' as const,
      is_active: true,
      check_frequency_hours: 24,
      last_checked: null,
    };

    const result = await processArticle(
      source,
      url,
      'Manual Import',
      content,
      images
    );

    console.log('\nResult:');
    console.log(`  New releases: ${result.newReleases}`);
    console.log(`  Updated releases: ${result.updatedReleases}`);
    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
