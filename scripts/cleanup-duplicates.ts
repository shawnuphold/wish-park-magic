#!/usr/bin/env npx tsx
/**
 * Cleanup Duplicates Script
 *
 * This script identifies and removes duplicate new_releases entries.
 * It keeps the oldest entry and removes newer duplicates.
 *
 * Run after applying the 20260102_dedup_prevention.sql migration.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

interface Release {
  id: string;
  title: string;
  source_url: string | null;
  image_url: string | null;
  created_at: string;
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/'s\b/g, '')
    .replace(/'/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\b(the|a|an|and|or|for|with|by|at|in|on|to|of|new|now|available)\b/g, '')
    .replace(/\b(disney|universal|seaworld|orlando|resort|parks?|world|walt)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s/g, '-');
}

function wordOverlap(title1: string, title2: string): number {
  const words1 = title1.split('-').filter(w => w.length > 0);
  const words2 = title2.split('-').filter(w => w.length > 0);

  if (words1.length === 0 || words2.length === 0) return 0;

  const intersection = words1.filter(w => words2.includes(w));
  return intersection.length / Math.min(words1.length, words2.length);
}

async function cleanupDuplicates(dryRun: boolean = true) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Duplicate Cleanup - ${dryRun ? 'DRY RUN' : 'LIVE MODE'}`);
  console.log(`${'='.repeat(60)}\n`);

  // Fetch all non-merged releases
  // Note: title_normalized column may not exist yet, so we fetch title and normalize locally
  const { data: releases, error } = await supabase
    .from('new_releases')
    .select('id, title, source_url, image_url, created_at')
    .is('merged_into_id', null)
    .order('created_at', { ascending: true });

  if (error || !releases) {
    console.error('Error fetching releases:', error);
    return;
  }

  console.log(`Total releases to check: ${releases.length}`);

  // Track which releases to delete
  const toDelete: string[] = [];
  const seen = new Map<string, Release>(); // normalized title -> first release

  // Group 1: Same source_url + similar title
  const sourceGroups = new Map<string, Release[]>();
  for (const r of releases) {
    if (!r.source_url) continue;
    const key = r.source_url;
    if (!sourceGroups.has(key)) sourceGroups.set(key, []);
    sourceGroups.get(key)!.push(r);
  }

  console.log('\n--- Duplicates by Source URL ---');
  for (const [url, items] of sourceGroups) {
    if (items.length > 1) {
      // Within same source URL, group by normalized title similarity
      const titleGroups: Release[][] = [];

      for (const item of items) {
        const normalized = normalizeTitle(item.title);
        let foundGroup = false;

        for (const group of titleGroups) {
          const firstNormalized = normalizeTitle(group[0].title);
          const overlap = wordOverlap(normalized, firstNormalized);

          if (overlap >= 0.7) {
            group.push(item);
            foundGroup = true;
            break;
          }
        }

        if (!foundGroup) {
          titleGroups.push([item]);
        }
      }

      // For each title group with duplicates, keep oldest
      for (const group of titleGroups) {
        if (group.length > 1) {
          // Sort by created_at ascending
          group.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          const [keep, ...dupes] = group;

          console.log(`\n  Source: ${url.substring(0, 70)}...`);
          console.log(`  KEEP: ${keep.title} (${keep.created_at})`);

          for (const dupe of dupes) {
            console.log(`  DELETE: ${dupe.title} (${dupe.created_at})`);
            toDelete.push(dupe.id);
          }
        }
      }
    }
  }

  // Group 2: Global similar titles (cross-source duplicates)
  console.log('\n--- Cross-Source Similar Titles (70%+ match) ---');
  const globalTitleGroups: Release[][] = [];

  for (const r of releases) {
    // Skip if already marked for deletion
    if (toDelete.includes(r.id)) continue;

    const normalized = normalizeTitle(r.title);
    let foundGroup = false;

    for (const group of globalTitleGroups) {
      const firstNormalized = normalizeTitle(group[0].title);
      const overlap = wordOverlap(normalized, firstNormalized);

      if (overlap >= 0.85) { // Higher threshold for cross-source
        group.push(r);
        foundGroup = true;
        break;
      }
    }

    if (!foundGroup) {
      globalTitleGroups.push([r]);
    }
  }

  for (const group of globalTitleGroups) {
    if (group.length > 1) {
      // Sort by created_at ascending
      group.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const [keep, ...dupes] = group;

      // Filter out already-deleted items
      const newDupes = dupes.filter(d => !toDelete.includes(d.id));
      if (newDupes.length === 0) continue;

      console.log(`\n  KEEP: ${keep.title}`);
      for (const dupe of newDupes) {
        console.log(`  DELETE: ${dupe.title}`);
        toDelete.push(dupe.id);
      }
    }
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Summary:`);
  console.log(`  Total releases: ${releases.length}`);
  console.log(`  Duplicates found: ${toDelete.length}`);
  console.log(`  Will remain: ${releases.length - toDelete.length}`);

  if (toDelete.length === 0) {
    console.log('\nNo duplicates to clean up!');
    return;
  }

  if (dryRun) {
    console.log(`\nDRY RUN - No changes made.`);
    console.log(`Run with --live to actually delete duplicates.`);
    return;
  }

  // Actually delete
  console.log(`\nDeleting ${toDelete.length} duplicates...`);

  // Delete in batches of 50
  for (let i = 0; i < toDelete.length; i += 50) {
    const batch = toDelete.slice(i, i + 50);
    const { error: deleteError } = await supabase
      .from('new_releases')
      .delete()
      .in('id', batch);

    if (deleteError) {
      console.error(`Error deleting batch ${i / 50 + 1}:`, deleteError);
    } else {
      console.log(`  Deleted batch ${i / 50 + 1} (${batch.length} items)`);
    }
  }

  console.log(`\nCleanup complete!`);
}

// Check for --live flag
const isLive = process.argv.includes('--live');
cleanupDuplicates(!isLive).catch(console.error);
