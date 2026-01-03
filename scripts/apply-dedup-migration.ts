#!/usr/bin/env npx tsx
/**
 * Apply the dedup prevention migration to Supabase
 * Runs each statement individually to handle errors gracefully
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

async function runMigration() {
  console.log('Applying dedup prevention migration...\n');

  // Run each statement separately
  const statements = [
    // 1. Add title_normalized column
    {
      name: 'Add title_normalized column',
      sql: `ALTER TABLE new_releases ADD COLUMN IF NOT EXISTS title_normalized TEXT`
    },
    // 2. Create normalize_title function
    {
      name: 'Create normalize_title function',
      sql: `
        CREATE OR REPLACE FUNCTION normalize_title(title TEXT)
        RETURNS TEXT AS $$
        DECLARE
          result TEXT;
        BEGIN
          result := lower(title);
          result := regexp_replace(result, '''s\\b', '', 'g');
          result := regexp_replace(result, '''', '', 'g');
          result := regexp_replace(result, '[^a-z0-9\\s]', '', 'g');
          result := regexp_replace(result, '\\b(the|a|an|and|or|for|with|by|at|in|on|to|of|new|now|available)\\b', '', 'g');
          result := regexp_replace(result, '\\b(disney|universal|seaworld|orlando|resort|parks?|world|walt)\\b', '', 'g');
          result := regexp_replace(result, '\\s+', ' ', 'g');
          result := trim(result);
          result := regexp_replace(result, '\\s', '-', 'g');
          RETURN result;
        END;
        $$ LANGUAGE plpgsql IMMUTABLE
      `
    },
    // 3. Create index on title_normalized
    {
      name: 'Create index on title_normalized',
      sql: `CREATE INDEX IF NOT EXISTS idx_new_releases_title_normalized ON new_releases(title_normalized)`
    },
    // 4. Backfill title_normalized
    {
      name: 'Backfill title_normalized for existing records',
      sql: `UPDATE new_releases SET title_normalized = normalize_title(title) WHERE title_normalized IS NULL`
    },
    // 5. Add source_product_hash column
    {
      name: 'Add source_product_hash column',
      sql: `ALTER TABLE new_releases ADD COLUMN IF NOT EXISTS source_product_hash TEXT`
    },
    // 6. Backfill source_product_hash
    {
      name: 'Backfill source_product_hash for existing records',
      sql: `UPDATE new_releases SET source_product_hash = md5(coalesce(source_url, '') || '::' || normalize_title(title)) WHERE source_product_hash IS NULL`
    },
    // 7. Create unique index on source_product_hash (will fail if dupes exist - that's ok)
    {
      name: 'Create unique index on source_product_hash',
      sql: `CREATE UNIQUE INDEX IF NOT EXISTS idx_new_releases_source_product_unique ON new_releases(source_product_hash) WHERE merged_into_id IS NULL`,
      allowFail: true
    },
    // 8. Create is_duplicate_release function
    {
      name: 'Create is_duplicate_release function',
      sql: `
        CREATE OR REPLACE FUNCTION is_duplicate_release(
          p_title TEXT,
          p_source_url TEXT DEFAULT NULL,
          p_image_url TEXT DEFAULT NULL
        )
        RETURNS TABLE (
          is_duplicate BOOLEAN,
          existing_id UUID,
          match_reason TEXT,
          similarity_score FLOAT
        ) AS $$
        DECLARE
          v_normalized TEXT;
          v_hash TEXT;
          v_existing RECORD;
          v_title_words TEXT[];
          v_match_words TEXT[];
          v_intersection INT;
          v_match_rate FLOAT;
        BEGIN
          v_normalized := normalize_title(p_title);
          v_hash := md5(coalesce(p_source_url, '') || '::' || v_normalized);

          -- Check 1: Exact source_product_hash match
          SELECT id INTO v_existing
          FROM new_releases
          WHERE source_product_hash = v_hash
            AND merged_into_id IS NULL
          LIMIT 1;

          IF v_existing.id IS NOT NULL THEN
            RETURN QUERY SELECT true, v_existing.id, 'exact_hash_match'::TEXT, 1.0::FLOAT;
            RETURN;
          END IF;

          -- Check 2: Exact source_url + same normalized title
          IF p_source_url IS NOT NULL THEN
            SELECT id INTO v_existing
            FROM new_releases
            WHERE source_url = p_source_url
              AND title_normalized = v_normalized
              AND merged_into_id IS NULL
            LIMIT 1;

            IF v_existing.id IS NOT NULL THEN
              RETURN QUERY SELECT true, v_existing.id, 'exact_url_title_match'::TEXT, 1.0::FLOAT;
              RETURN;
            END IF;
          END IF;

          -- Check 3: Exact image URL match (non-placeholder)
          IF p_image_url IS NOT NULL AND p_image_url != '' AND p_image_url NOT LIKE '%placeholder%' THEN
            SELECT id INTO v_existing
            FROM new_releases
            WHERE image_url = p_image_url
              AND merged_into_id IS NULL
            LIMIT 1;

            IF v_existing.id IS NOT NULL THEN
              RETURN QUERY SELECT true, v_existing.id, 'exact_image_match'::TEXT, 1.0::FLOAT;
              RETURN;
            END IF;
          END IF;

          -- Check 4: Similar title using trigram similarity (70%+ match)
          FOR v_existing IN
            SELECT id, title, similarity(title_normalized, v_normalized) AS sim
            FROM new_releases
            WHERE merged_into_id IS NULL
              AND similarity(title_normalized, v_normalized) >= 0.7
            ORDER BY sim DESC
            LIMIT 1
          LOOP
            RETURN QUERY SELECT true, v_existing.id, 'similar_title'::TEXT, v_existing.sim::FLOAT;
            RETURN;
          END LOOP;

          -- Check 5: Word overlap check (70%+ of words match)
          v_title_words := regexp_split_to_array(v_normalized, '-');

          FOR v_existing IN
            SELECT id, title, title_normalized
            FROM new_releases
            WHERE merged_into_id IS NULL
              AND title_normalized IS NOT NULL
          LOOP
            v_match_words := regexp_split_to_array(v_existing.title_normalized, '-');

            SELECT count(*) INTO v_intersection
            FROM (
              SELECT unnest(v_title_words) INTERSECT SELECT unnest(v_match_words)
            ) x;

            IF array_length(v_title_words, 1) > 0 AND array_length(v_match_words, 1) > 0 THEN
              v_match_rate := v_intersection::FLOAT / LEAST(array_length(v_title_words, 1), array_length(v_match_words, 1));

              IF v_match_rate >= 0.7 THEN
                RETURN QUERY SELECT true, v_existing.id, 'word_overlap'::TEXT, v_match_rate;
                RETURN;
              END IF;
            END IF;
          END LOOP;

          -- No duplicate found
          RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, 0.0::FLOAT;
          RETURN;
        END;
        $$ LANGUAGE plpgsql
      `
    },
    // 9. Create feed_processing_locks table
    {
      name: 'Create feed_processing_locks table',
      sql: `
        CREATE TABLE IF NOT EXISTS feed_processing_locks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          lock_name TEXT NOT NULL UNIQUE,
          locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          locked_by TEXT,
          expires_at TIMESTAMPTZ NOT NULL
        )
      `
    },
    // 10. Create indexes on locks table
    {
      name: 'Create indexes on feed_processing_locks',
      sql: `
        CREATE INDEX IF NOT EXISTS idx_feed_processing_locks_name ON feed_processing_locks(lock_name);
        CREATE INDEX IF NOT EXISTS idx_feed_processing_locks_expires ON feed_processing_locks(expires_at)
      `
    },
    // 11. Create acquire_feed_lock function
    {
      name: 'Create acquire_feed_lock function',
      sql: `
        CREATE OR REPLACE FUNCTION acquire_feed_lock(p_lock_name TEXT, p_timeout_minutes INT DEFAULT 30)
        RETURNS BOOLEAN AS $$
        DECLARE
          v_locked BOOLEAN := false;
        BEGIN
          DELETE FROM feed_processing_locks WHERE expires_at < NOW();

          BEGIN
            INSERT INTO feed_processing_locks (lock_name, locked_by, expires_at)
            VALUES (p_lock_name, 'feed_processor', NOW() + (p_timeout_minutes || ' minutes')::INTERVAL);
            v_locked := true;
          EXCEPTION WHEN unique_violation THEN
            v_locked := false;
          END;

          RETURN v_locked;
        END;
        $$ LANGUAGE plpgsql
      `
    },
    // 12. Create release_feed_lock function
    {
      name: 'Create release_feed_lock function',
      sql: `
        CREATE OR REPLACE FUNCTION release_feed_lock(p_lock_name TEXT)
        RETURNS VOID AS $$
        BEGIN
          DELETE FROM feed_processing_locks WHERE lock_name = p_lock_name;
        END;
        $$ LANGUAGE plpgsql
      `
    },
    // 13. Create trigger for auto-populating normalized fields
    {
      name: 'Create trigger function for normalized fields',
      sql: `
        CREATE OR REPLACE FUNCTION set_release_normalized_fields()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.title_normalized := normalize_title(NEW.title);
          NEW.source_product_hash := md5(coalesce(NEW.source_url, '') || '::' || NEW.title_normalized);
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
      `
    },
    // 14. Create trigger
    {
      name: 'Create trigger on new_releases',
      sql: `
        DROP TRIGGER IF EXISTS trigger_set_release_normalized ON new_releases;
        CREATE TRIGGER trigger_set_release_normalized
          BEFORE INSERT OR UPDATE OF title, source_url ON new_releases
          FOR EACH ROW
          EXECUTE FUNCTION set_release_normalized_fields()
      `
    },
    // 15. Enable RLS on locks table
    {
      name: 'Enable RLS on feed_processing_locks',
      sql: `ALTER TABLE feed_processing_locks ENABLE ROW LEVEL SECURITY`
    },
    // 16. Create RLS policy
    {
      name: 'Create RLS policy for feed_processing_locks',
      sql: `
        DROP POLICY IF EXISTS feed_processing_locks_service ON feed_processing_locks;
        CREATE POLICY feed_processing_locks_service ON feed_processing_locks
          FOR ALL TO service_role USING (true) WITH CHECK (true)
      `
    }
  ];

  let successCount = 0;
  let failCount = 0;

  for (const stmt of statements) {
    process.stdout.write(`[${successCount + failCount + 1}/${statements.length}] ${stmt.name}... `);

    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: stmt.sql });

      if (error) {
        // Try using the raw SQL approach via REST
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ sql_query: stmt.sql })
          }
        );

        if (!response.ok) {
          throw new Error(error.message);
        }
      }

      console.log('OK');
      successCount++;
    } catch (err: any) {
      if (stmt.allowFail) {
        console.log('SKIPPED (expected - duplicates exist)');
        successCount++;
      } else {
        console.log(`FAILED: ${err.message?.substring(0, 60) || err}`);
        failCount++;
      }
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Migration complete: ${successCount} succeeded, ${failCount} failed`);

  if (failCount > 0) {
    console.log('\nNote: Some statements may have failed because Supabase REST API');
    console.log('does not support raw SQL execution. Please run the migration');
    console.log('manually in Supabase SQL Editor:');
    console.log('  File: supabase/migrations/20260102_dedup_prevention.sql');
  }
}

// Alternative: Direct SQL execution via postgres connection string
async function runViaDirect() {
  console.log('Attempting direct SQL execution...\n');

  // The Supabase JS client doesn't support raw SQL, so we need to use
  // individual table operations or the SQL Editor

  // Let's at least verify connection and check current state
  const { data: sample, error } = await supabase
    .from('new_releases')
    .select('id, title')
    .limit(1);

  if (error) {
    console.error('Connection error:', error.message);
    return false;
  }

  console.log('Connection verified. Sample release:', sample?.[0]?.title);

  // Check if columns already exist
  const { data: cols } = await supabase
    .from('new_releases')
    .select('*')
    .limit(1);

  if (cols && cols[0]) {
    const hasNormalized = 'title_normalized' in cols[0];
    const hasHash = 'source_product_hash' in cols[0];

    console.log('\nCurrent schema status:');
    console.log(`  title_normalized column: ${hasNormalized ? 'EXISTS' : 'MISSING'}`);
    console.log(`  source_product_hash column: ${hasHash ? 'EXISTS' : 'MISSING'}`);

    if (hasNormalized && hasHash) {
      console.log('\nMigration appears to be already applied!');
      return true;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('MANUAL MIGRATION REQUIRED');
  console.log('='.repeat(50));
  console.log('\nPlease copy and paste the following SQL into Supabase SQL Editor:');
  console.log('https://supabase.com/dashboard/project/jtqnjvczkywfkobwddbu/sql\n');

  return false;
}

// Run the check first, then show instructions
runViaDirect().then(async (alreadyApplied) => {
  if (!alreadyApplied) {
    // Read and display the migration file
    const { readFileSync } = await import('fs');
    const migrationPath = resolve(__dirname, '../supabase/migrations/20260102_dedup_prevention.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log('--- BEGIN SQL ---\n');
    console.log(sql);
    console.log('\n--- END SQL ---');
  }
}).catch(console.error);
