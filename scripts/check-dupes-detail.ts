import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

async function check() {
  // Check for duplicates by source_url
  const { data: bySource } = await supabase.from('new_releases')
    .select('source_url, title, id, created_at')
    .is('merged_into_id', null);

  // Group by source_url
  const sourceGroups: Record<string, {title: string, id: string, created_at: string}[]> = {};
  for (const r of bySource || []) {
    const key = r.source_url || 'no-url';
    if (!sourceGroups[key]) sourceGroups[key] = [];
    sourceGroups[key].push({ title: r.title, id: r.id, created_at: r.created_at });
  }

  console.log('=== DUPLICATES BY SOURCE_URL ===');
  let urlDupes = 0;
  for (const [url, items] of Object.entries(sourceGroups)) {
    if (items.length > 1) {
      console.log(`\n${url.substring(0, 80)}: ${items.length} items`);
      items.forEach(t => console.log(`  - ${t.title} (${t.created_at})`));
      urlDupes += items.length - 1;
    }
  }
  console.log(`\nTotal source URL dupes: ${urlDupes}`);

  // Check for duplicates by image_url
  const { data: byImage } = await supabase.from('new_releases')
    .select('image_url, title, id')
    .is('merged_into_id', null)
    .neq('image_url', '');

  const imageGroups: Record<string, {title: string, id: string}[]> = {};
  for (const r of byImage || []) {
    const key = r.image_url || 'no-image';
    if (!imageGroups[key]) imageGroups[key] = [];
    imageGroups[key].push({ title: r.title, id: r.id });
  }

  console.log('\n=== DUPLICATES BY IMAGE_URL ===');
  let imgDupes = 0;
  for (const [url, items] of Object.entries(imageGroups)) {
    if (items.length > 1) {
      console.log(`\n${url.substring(0, 80)}...: ${items.length} items`);
      items.forEach(t => console.log(`  - ${t.title}`));
      imgDupes += items.length - 1;
    }
  }
  console.log(`\nTotal image URL dupes: ${imgDupes}`);

  // Check for similar titles (word overlap)
  const { data: allReleases } = await supabase.from('new_releases')
    .select('id, title, canonical_name')
    .is('merged_into_id', null);

  console.log('\n=== SIMILAR TITLES (70%+ word match) ===');
  const checked = new Set<string>();
  let similarCount = 0;

  for (const r1 of allReleases || []) {
    for (const r2 of allReleases || []) {
      if (r1.id === r2.id) continue;
      const pairKey = [r1.id, r2.id].sort().join('-');
      if (checked.has(pairKey)) continue;
      checked.add(pairKey);

      const words1 = r1.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
      const words2 = r2.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
      const intersection = words1.filter((w: string) => words2.includes(w));
      const matchRate = intersection.length / Math.min(words1.length, words2.length);

      if (matchRate >= 0.7) {
        console.log(`\nSimilar pair (${Math.round(matchRate * 100)}% match):`);
        console.log(`  1: ${r1.title}`);
        console.log(`  2: ${r2.title}`);
        similarCount++;
      }
    }
  }
  console.log(`\nTotal similar pairs: ${similarCount}`);

  // Check schema
  const { data: sample } = await supabase.from('new_releases')
    .select('*')
    .limit(1);
  console.log('\n=== TABLE COLUMNS ===');
  console.log(Object.keys(sample?.[0] || {}).join(', '));

  // Check if title_normalized column exists
  const columns = Object.keys(sample?.[0] || {});
  console.log('\n=== DEDUP COLUMNS CHECK ===');
  console.log('Has canonical_name:', columns.includes('canonical_name'));
  console.log('Has title_normalized:', columns.includes('title_normalized'));
  console.log('Has merged_into_id:', columns.includes('merged_into_id'));
}

check().catch(console.error);
