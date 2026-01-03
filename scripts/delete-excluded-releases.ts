import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

// Patterns to match excluded sources
const excludedPatterns = {
  // California parks
  californiaParks: ['disneyland_ca', 'dca_ca', 'universal_hollywood'],

  // Third-party retailers (in title or source)
  retailers: [
    'aldi', 'five below', 'target', 'walmart', 'costco', 'amazon',
    'boxlunch', 'hot topic', 'kohls', 'jcpenney', 'macy',
    'dollar tree', 'dollar general', 'walgreens', 'cvs',
    'publix', 'kroger', 'trader joe',
  ],

  // Online-only
  onlineOnly: ['shopdisney.com', 'shopdisney exclusive', 'online exclusive'],

  // Non-Orlando keywords in title
  nonOrlando: ['disneyland', 'california adventure', 'anaheim', 'universal hollywood', 'hollywood studios hollywood'],
};

async function findAndDeleteExcluded() {
  console.log('=== Finding Excluded Releases ===\n');

  // Get all releases
  const { data: releases, error } = await supabase
    .from('new_releases')
    .select('id, title, park, source_url, source, article_url')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching releases:', error);
    return;
  }

  console.log(`Total releases: ${releases?.length || 0}\n`);

  const toDelete: { id: string; title: string; reason: string }[] = [];

  for (const release of releases || []) {
    const lowerTitle = (release.title || '').toLowerCase();
    const lowerSource = (release.source || '').toLowerCase();
    const lowerUrl = (release.source_url || release.article_url || '').toLowerCase();

    // Check California parks
    if (excludedPatterns.californiaParks.includes(release.park)) {
      toDelete.push({ id: release.id, title: release.title, reason: `California park: ${release.park}` });
      continue;
    }

    // Check retailers in title
    for (const retailer of excludedPatterns.retailers) {
      if (lowerTitle.includes(retailer) || lowerSource.includes(retailer)) {
        toDelete.push({ id: release.id, title: release.title, reason: `Retailer: ${retailer}` });
        break;
      }
    }

    // Check non-Orlando keywords
    for (const keyword of excludedPatterns.nonOrlando) {
      if (lowerTitle.includes(keyword)) {
        toDelete.push({ id: release.id, title: release.title, reason: `Non-Orlando: ${keyword}` });
        break;
      }
    }

    // Check online-only
    for (const keyword of excludedPatterns.onlineOnly) {
      if (lowerTitle.includes(keyword) || lowerUrl.includes(keyword)) {
        toDelete.push({ id: release.id, title: release.title, reason: `Online-only: ${keyword}` });
        break;
      }
    }
  }

  // Remove duplicates (same ID)
  const uniqueToDelete = [...new Map(toDelete.map(r => [r.id, r])).values()];

  console.log(`Found ${uniqueToDelete.length} releases to delete:\n`);

  for (const item of uniqueToDelete) {
    console.log(`  ❌ ${item.title}`);
    console.log(`     Reason: ${item.reason}\n`);
  }

  if (uniqueToDelete.length === 0) {
    console.log('✅ No excluded releases found!');
    return;
  }

  // Delete them
  console.log('\n=== Deleting... ===\n');

  const ids = uniqueToDelete.map(r => r.id);

  // First delete related records (notifications, images references, etc.)
  const { error: notifError } = await supabase
    .from('release_notifications')
    .delete()
    .in('release_id', ids);

  if (notifError) {
    console.log('Note: Error deleting notifications (may not exist):', notifError.message);
  }

  // Delete the releases
  const { error: deleteError, count } = await supabase
    .from('new_releases')
    .delete()
    .in('id', ids);

  if (deleteError) {
    console.error('Error deleting releases:', deleteError);
  } else {
    console.log(`✅ Deleted ${uniqueToDelete.length} excluded releases`);
  }
}

findAndDeleteExcluded();
