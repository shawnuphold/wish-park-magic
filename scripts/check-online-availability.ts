#!/usr/bin/env npx tsx
// Online Availability Checker
// Checks if releases are available on shopDisney to determine park exclusive status.
// Run manually: npx tsx scripts/check-online-availability.ts

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

import { checkAllStaleReleases } from '../src/lib/scrapers/checkOnlineAvailability';

async function main() {
  console.log('='.repeat(60));
  console.log(`Online Availability Check Started: ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  try {
    console.log('\n🔍 Checking online availability for releases...\n');
    const result = await checkAllStaleReleases();

    console.log(`✅ Releases checked: ${result.checked}`);
    console.log(`🌐 Available online: ${result.availableOnline}`);
    console.log(`🎢 Park exclusive: ${result.parkExclusive}`);

    if (result.errors.length > 0) {
      console.log(`\n⚠️ Errors (${result.errors.length}):`);
      result.errors.slice(0, 5).forEach(e => console.log(`   - ${e}`));
      if (result.errors.length > 5) {
        console.log(`   ... and ${result.errors.length - 5} more`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`Online Availability Check Complete: ${new Date().toISOString()}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Fatal error during availability check:', error);
    process.exit(1);
  }
}

main();
