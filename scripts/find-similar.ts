import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

// Simple similarity check - find titles that share most words
function getSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/));
  const wordsB = new Set(b.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/));

  let matches = 0;
  for (const w of wordsA) {
    if (wordsB.has(w) && w.length > 2) matches++;
  }

  return matches / Math.max(wordsA.size, wordsB.size);
}

async function findSimilar() {
  const { data: releases } = await supabase
    .from('new_releases')
    .select('id, title, created_at, image_url')
    .is('merged_into_id', null)
    .order('title');

  if (!releases) return;

  console.log(`Total releases: ${releases.length}\n`);

  // Find similar pairs
  const similar: { a: typeof releases[0], b: typeof releases[0], sim: number }[] = [];

  for (let i = 0; i < releases.length; i++) {
    for (let j = i + 1; j < releases.length; j++) {
      const sim = getSimilarity(releases[i].title, releases[j].title);
      if (sim > 0.6) {
        similar.push({ a: releases[i], b: releases[j], sim });
      }
    }
  }

  // Sort by similarity
  similar.sort((a, b) => b.sim - a.sim);

  console.log(`Found ${similar.length} similar pairs:\n`);
  for (const { a, b, sim } of similar.slice(0, 30)) {
    console.log(`[${(sim * 100).toFixed(0)}%] "${a.title}" vs "${b.title}"`);
  }
}

findSimilar();
