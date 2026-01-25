#!/usr/bin/env npx tsx
// Query for Nintendo Plush Headbands release to diagnose ISSUE-008

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('=== Querying for Nintendo Plush Headbands ===\n');

  // Search for Nintendo Plush Headbands
  const { data, error } = await supabase
    .from('new_releases')
    .select('id, title, image_url, source_url, created_at, status')
    .or('title.ilike.%nintendo%plush%headband%,title.ilike.%plush headband%nintendo%')
    .limit(10);

  if (error) {
    console.error('Query error:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('No results found for "Nintendo Plush Headbands"');

    // Try broader search
    console.log('\nTrying broader search for "headband"...\n');
    const { data: broader, error: broaderError } = await supabase
      .from('new_releases')
      .select('id, title, image_url, source_url, created_at')
      .ilike('title', '%headband%')
      .limit(10);

    if (broaderError) {
      console.error('Broader query error:', broaderError);
      return;
    }

    if (broader && broader.length > 0) {
      console.log(`Found ${broader.length} headband releases:\n`);
      broader.forEach((r, i) => {
        console.log(`${i + 1}. ${r.title}`);
        console.log(`   ID: ${r.id}`);
        console.log(`   Image URL: ${r.image_url || '(EMPTY)'}`);
        console.log(`   Source: ${r.source_url}`);
        console.log(`   Created: ${r.created_at}\n`);
      });
    } else {
      console.log('No headband releases found at all.');
    }
    return;
  }

  console.log(`Found ${data.length} matching release(s):\n`);
  data.forEach((release, i) => {
    console.log(`${i + 1}. ${release.title}`);
    console.log(`   ID: ${release.id}`);
    console.log(`   Status: ${release.status}`);
    console.log(`   Image URL: ${release.image_url || '(EMPTY - THIS IS THE PROBLEM)'}`);
    console.log(`   Source: ${release.source_url}`);
    console.log(`   Created: ${release.created_at}`);

    if (!release.image_url) {
      console.log('\n   ⚠️  IMAGE URL IS MISSING - Need to manually add image');
    } else if (!release.image_url.startsWith('http')) {
      console.log('\n   ⚠️  IMAGE URL IS INVALID - Doesn\'t start with http');
    }
    console.log('');
  });
}

main().catch(console.error);
