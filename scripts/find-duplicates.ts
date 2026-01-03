import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

async function findDuplicates() {
  // Get all releases
  const { data: releases } = await supabase
    .from('new_releases')
    .select('id, title, canonical_name, created_at')
    .is('merged_into_id', null)
    .order('created_at', { ascending: true });

  if (!releases) return;

  // Group by canonical_name
  const groups = new Map<string, typeof releases>();
  for (const r of releases) {
    const key = r.canonical_name || r.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(r);
  }

  // Find duplicates
  let totalDupes = 0;
  const dupesToDelete: string[] = [];

  for (const [key, items] of groups) {
    if (items.length > 1) {
      console.log(`\nDuplicate group (${items.length}): ${key}`);
      // Keep the first (oldest), delete the rest
      const [keep, ...dupes] = items;
      console.log(`  KEEP: ${keep.title}`);
      for (const d of dupes) {
        console.log(`  DELETE: ${d.title}`);
        dupesToDelete.push(d.id);
      }
      totalDupes += dupes.length;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total releases: ${releases.length}`);
  console.log(`Duplicate groups: ${[...groups.values()].filter(g => g.length > 1).length}`);
  console.log(`Duplicates to delete: ${totalDupes}`);

  return dupesToDelete;
}

findDuplicates().then(dupes => {
  console.log('\nDuplicate IDs:', dupes?.length);
});
