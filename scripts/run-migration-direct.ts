#!/usr/bin/env npx tsx
/**
 * Run migration directly via Supabase SQL endpoint
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

config({ path: resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function executeSql(sql: string, name: string): Promise<boolean> {
  try {
    // Use the Supabase PostgREST exec endpoint (if available)
    // Note: This requires the pg_net extension or a custom function

    // Alternative: Use the query endpoint with a wrapped function
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({})
    });

    // This won't work for raw SQL - we need to use individual statements
    return false;
  } catch (err) {
    return false;
  }
}

async function runMigration() {
  console.log('='.repeat(60));
  console.log('Dedup Prevention Migration');
  console.log('='.repeat(60));
  console.log('');

  // Read migration file
  const migrationPath = resolve(__dirname, '../supabase/migrations/20260102_dedup_prevention.sql');
  const fullSql = readFileSync(migrationPath, 'utf-8');

  console.log('Migration file loaded:', migrationPath);
  console.log('');

  // For Supabase, we need to run this via the SQL Editor
  // The REST API doesn't support arbitrary SQL execution

  console.log('='.repeat(60));
  console.log('INSTRUCTIONS');
  console.log('='.repeat(60));
  console.log('');
  console.log('1. Open Supabase SQL Editor:');
  console.log('   https://supabase.com/dashboard/project/jtqnjvczkywfkobwddbu/sql/new');
  console.log('');
  console.log('2. Copy the SQL below and paste it into the editor');
  console.log('');
  console.log('3. Click "Run" to execute the migration');
  console.log('');
  console.log('='.repeat(60));
  console.log('SQL TO RUN:');
  console.log('='.repeat(60));
  console.log('');
  console.log(fullSql);
}

runMigration();
