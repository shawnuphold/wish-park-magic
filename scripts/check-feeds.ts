import { createClient } from '@supabase/supabase-js';

const client = createClient(
  'https://jtqnjvczkywfkobwddbu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0cW5qdmN6a3l3ZmtvYndkZGJ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjIwNTM4NiwiZXhwIjoyMDgxNzgxMzg2fQ.23QsahVizk_jI1h_bUY0-9duNHH3HmCX7WuZyzMgqak'
);

async function main() {
  // Check feed sources
  const { data: sources } = await client.from('feed_sources').select('*').eq('is_active', true);
  console.log('Active Feed Sources:');
  sources?.forEach(s => {
    console.log(`  - ${s.name}: last checked ${s.last_checked || 'never'}`);
    if (s.last_error) console.log(`    Error: ${s.last_error}`);
  });

  // Check latest processed articles
  const { data: articles } = await client.from('processed_articles').select('*').order('processed_at', { ascending: false }).limit(5);
  console.log('\nLast 5 Processed Articles:');
  if (articles?.length) {
    articles.forEach(a => {
      console.log(`  - ${a.title?.substring(0,50)}... (${a.processed_at})`);
    });
  } else {
    console.log('  No processed articles found');
  }

  // Check latest releases
  const { data: releases } = await client.from('new_releases').select('title, created_at, source').order('created_at', { ascending: false }).limit(10);
  console.log('\nLast 10 Releases:');
  releases?.forEach(r => {
    console.log(`  - ${r.title?.substring(0,55)}... (${new Date(r.created_at).toLocaleString()})`);
  });

  // Total count
  const { count } = await client.from('new_releases').select('*', { count: 'exact', head: true });
  console.log(`\nTotal releases in database: ${count}`);
}

main();
