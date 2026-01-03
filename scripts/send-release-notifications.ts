#!/usr/bin/env npx tsx
// Release Notification Sender
// Sends email notifications to customers about new releases matching their preferences.
// Run manually: npx tsx scripts/send-release-notifications.ts

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

import { sendNotifications } from '../src/lib/ai/notifications';

async function main() {
  console.log('='.repeat(60));
  console.log(`Notification Sender Started: ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  try {
    console.log('\n📬 Sending release notifications...\n');
    const result = await sendNotifications(24); // Last 24 hours

    console.log(`✅ Emails sent: ${result.sent}`);
    console.log(`⏭️ Already notified: ${result.skipped}`);

    if (result.errors.length > 0) {
      console.log(`\n⚠️ Errors (${result.errors.length}):`);
      result.errors.slice(0, 5).forEach(e => console.log(`   - ${e}`));
      if (result.errors.length > 5) {
        console.log(`   ... and ${result.errors.length - 5} more`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`Notification Sender Complete: ${new Date().toISOString()}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
