#!/usr/bin/env npx tsx
// Feed Processing Cron Script
// Processes RSS feeds and discovers new merchandise releases.
// Run manually: npx tsx scripts/process-feeds.ts

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

import { processAllSources } from '../src/lib/ai/feedFetcher';
import { sendNotifications } from '../src/lib/ai/notifications';

async function main() {
  console.log('='.repeat(60));
  console.log(`Feed Processing Started: ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  try {
    // Process all feed sources
    console.log('\n📡 Processing feed sources...\n');
    const feedResult = await processAllSources();

    console.log(`✅ Sources processed: ${feedResult.sourcesProcessed}`);
    console.log(`📰 Articles processed: ${feedResult.totalArticles}`);
    console.log(`🆕 New releases: ${feedResult.newReleases}`);
    console.log(`🔄 Updated releases: ${feedResult.updatedReleases}`);

    if (feedResult.errors.length > 0) {
      console.log(`\n⚠️ Errors (${feedResult.errors.length}):`);
      feedResult.errors.slice(0, 5).forEach(e => console.log(`   - ${e}`));
      if (feedResult.errors.length > 5) {
        console.log(`   ... and ${feedResult.errors.length - 5} more`);
      }
    }

    // Send notifications for new releases
    if (feedResult.newReleases > 0) {
      console.log('\n📬 Checking for customer notifications...\n');
      const notifyResult = await sendNotifications();

      console.log(`✅ Notifications sent: ${notifyResult.sent}`);
      console.log(`⏭️ Already notified: ${notifyResult.skipped}`);
      if (notifyResult.errors.length > 0) {
        console.log(`⚠️ Notification errors: ${notifyResult.errors.length}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`Feed Processing Complete: ${new Date().toISOString()}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Fatal error during feed processing:', error);
    process.exit(1);
  }
}

main();
