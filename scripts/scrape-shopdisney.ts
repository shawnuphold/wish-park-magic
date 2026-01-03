#!/usr/bin/env npx tsx
// shopDisney Scraper - INTERNAL USE ONLY
// Scrapes shopDisney.com for new arrivals. Never expose images to customers.
// Run manually: npx tsx scripts/scrape-shopdisney.ts

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

import { runFullShopDisneyScrape } from '../src/lib/scrapers/shopDisneyTracker';

async function main() {
  console.log('='.repeat(60));
  console.log(`shopDisney Scrape Started: ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  try {
    console.log('\n🏰 Scraping shopDisney new arrivals...\n');
    const result = await runFullShopDisneyScrape();

    console.log(`✅ Products scraped: ${result.productsScraped}`);
    console.log(`💾 Products saved: ${result.productsSaved}`);
    console.log(`🔗 Releases matched: ${result.releasesMatched}`);
    console.log(`🆕 Releases created: ${result.releasesCreated}`);

    if (result.errors.length > 0) {
      console.log(`\n⚠️ Errors (${result.errors.length}):`);
      result.errors.slice(0, 5).forEach(e => console.log(`   - ${e}`));
      if (result.errors.length > 5) {
        console.log(`   ... and ${result.errors.length - 5} more`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`shopDisney Scrape Complete: ${new Date().toISOString()}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Fatal error during shopDisney scrape:', error);
    process.exit(1);
  }
}

main();
