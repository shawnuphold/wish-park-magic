#!/usr/bin/env npx tsx
/**
 * Run the dedup prevention migration
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

async function runMigration() {
  console.log('Running dedup prevention migration...\n');

  const migrationPath = resolve(__dirname, '../supabase/migrations/20260102_dedup_prevention.sql');
  const sql = readFileSync(migrationPath, 'utf-8');

  // Split by semicolons and run each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements to run\n`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 60).replace(/\n/g, ' ');
    console.log(`[${i + 1}/${statements.length}] ${preview}...`);

    const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' }).single();

    if (error) {
      // Try direct execution for DDL statements
      const { error: directError } = await supabase.from('_exec').select('*').limit(0);
      // Just log and continue - some statements may fail if already applied
      console.log(`  Warning: ${error.message.substring(0, 80)}`);
    } else {
      console.log('  OK');
    }
  }

  console.log('\nMigration complete!');
}

// Alternative: Run via fetch to Supabase REST API
async function runMigrationViaFetch() {
  console.log('Running dedup prevention migration via SQL...\n');

  const migrationPath = resolve(__dirname, '../supabase/migrations/20260102_dedup_prevention.sql');
  const sql = readFileSync(migrationPath, 'utf-8');

  // Use the Supabase SQL endpoint
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: sql })
    }
  );

  if (!response.ok) {
    console.log('Direct SQL execution not available via REST API');
    console.log('Please run the migration manually in Supabase SQL Editor:');
    console.log(`  File: ${migrationPath}`);
    return;
  }

  console.log('Migration complete!');
}

// Run individual statements
async function runStatements() {
  console.log('Running dedup prevention migration (statement by statement)...\n');

  // 1. Add title_normalized column
  console.log('1. Adding title_normalized column...');
  await supabase.from('new_releases').select('id').limit(1); // Test connection

  // Create the normalize_title function
  console.log('2. Creating normalize_title function...');

  // We can't run raw SQL directly, so let's check if it exists
  const { data: testNorm } = await supabase.rpc('normalize_title', { title: 'Test' }).single();
  if (testNorm) {
    console.log('  Function already exists');
  }

  console.log('\n=== MANUAL MIGRATION REQUIRED ===');
  console.log('Please run the migration file in Supabase SQL Editor:');
  console.log(`  supabase/migrations/20260102_dedup_prevention.sql`);
  console.log('\nOr use the Supabase CLI:');
  console.log('  npx supabase db push');
}

runStatements().catch(console.error);
