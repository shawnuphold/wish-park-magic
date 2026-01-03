#!/usr/bin/env npx tsx
/**
 * Supabase Database Connection Test Script
 *
 * Tests all database connections, tables, write permissions,
 * relationships, auth, and schema consistency.
 *
 * Run: npx tsx scripts/test-supabase-connections.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Hardcoded credentials from ENCHANTED.md
const SUPABASE_URL = 'https://jtqnjvczkywfkobwddbu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0cW5qdmN6a3l3ZmtvYndkZGJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyMDUzODYsImV4cCI6MjA4MTc4MTM4Nn0.zI0E8jaHGsE73daed71bBAtoviRjZ7HS9LqsKK8w3A4';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0cW5qdmN6a3l3ZmtvYndkZGJ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjIwNTM4NiwiZXhwIjoyMDgxNzgxMzg2fQ.23QsahVizk_jI1h_bUY0-9duNHH3HmCX7WuZyzMgqak';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60));
}

function logResult(test: string, passed: boolean, details?: string) {
  const status = passed ? `${colors.green}PASS${colors.reset}` : `${colors.red}FAIL${colors.reset}`;
  console.log(`  [${status}] ${test}${details ? ` - ${details}` : ''}`);
}

// All expected tables from database.types.ts and ENCHANTED.md
const EXPECTED_TABLES = [
  'admin_users',
  'customers',
  'shopping_trips',
  'requests',
  'request_items',
  'invoices',
  'shipments',
  'new_releases',
  'unclaimed_inventory',
  'settings',
  'feed_sources',           // Renamed from release_sources
  'processed_articles',
  'customer_interests',
  'release_notifications',
  'notification_templates',
  'notification_settings',
  'notification_log',
  'push_subscriptions',
  'park_stores',
  'release_article_sources',
  'shopdisney_products',
];

// Expected columns for critical tables (subset for validation)
const EXPECTED_COLUMNS: Record<string, string[]> = {
  customers: ['id', 'email', 'name', 'phone', 'address_line1', 'city', 'state', 'postal_code', 'country', 'created_at'],
  requests: ['id', 'customer_id', 'status', 'notes', 'quoted_total', 'shopping_trip_id', 'invoice_id', 'created_at'],
  request_items: ['id', 'request_id', 'name', 'category', 'park', 'quantity', 'estimated_price', 'actual_price', 'status', 'store_name', 'land_name'],
  invoices: ['id', 'invoice_number', 'request_id', 'subtotal', 'tax_amount', 'total', 'status', 'payment_method'],
  shipments: ['id', 'request_id', 'customer_id', 'carrier', 'tracking_number', 'status', 'to_name', 'to_street1'],
  new_releases: ['id', 'title', 'description', 'image_url', 'source_url', 'park', 'category', 'status', 'available_online', 'park_exclusive'],
  park_stores: ['id', 'park', 'land', 'store_name', 'store_type', 'is_active'],
};

interface TestResults {
  passed: number;
  failed: number;
  warnings: number;
  details: string[];
}

const results: TestResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: [],
};

function recordResult(passed: boolean, message: string) {
  if (passed) {
    results.passed++;
  } else {
    results.failed++;
  }
  results.details.push(message);
}

async function testConnection(client: SupabaseClient, name: string): Promise<boolean> {
  try {
    // Simple query to test connection
    const { data, error } = await client.from('settings').select('key').limit(1);
    if (error) throw error;
    logResult(`${name} connection`, true);
    return true;
  } catch (error: any) {
    logResult(`${name} connection`, false, error.message);
    return false;
  }
}

async function testTableExists(client: SupabaseClient, tableName: string): Promise<{ exists: boolean; count: number }> {
  try {
    const { count, error } = await client.from(tableName).select('*', { count: 'exact', head: true });
    if (error) {
      if (error.message.includes('does not exist') || error.code === '42P01') {
        return { exists: false, count: 0 };
      }
      throw error;
    }
    return { exists: true, count: count || 0 };
  } catch (error: any) {
    if (error.message?.includes('does not exist')) {
      return { exists: false, count: 0 };
    }
    // Table exists but might have other issues
    return { exists: true, count: -1 };
  }
}

async function testAllTables(client: SupabaseClient): Promise<void> {
  logSection('2. TABLE STATUS (SELECT)');

  const tableResults: { name: string; exists: boolean; count: number }[] = [];
  const missingTables: string[] = [];

  for (const table of EXPECTED_TABLES) {
    const result = await testTableExists(client, table);
    tableResults.push({ name: table, ...result });

    if (!result.exists) {
      missingTables.push(table);
      logResult(`${table}`, false, 'Table does not exist');
      recordResult(false, `Table ${table} does not exist`);
    } else {
      const countStr = result.count >= 0 ? `${result.count} rows` : 'error reading count';
      logResult(`${table}`, true, countStr);
      recordResult(true, `Table ${table} exists with ${countStr}`);
    }
  }

  // Summary table
  console.log('\n  Table Summary:');
  console.log('  ' + '-'.repeat(50));
  console.log(`  ${'Table'.padEnd(30)} | Count`);
  console.log('  ' + '-'.repeat(50));

  for (const t of tableResults.filter(t => t.exists)) {
    console.log(`  ${t.name.padEnd(30)} | ${t.count >= 0 ? t.count : 'N/A'}`);
  }

  if (missingTables.length > 0) {
    console.log('\n  Missing Tables:');
    for (const t of missingTables) {
      console.log(`    - ${t}`);
    }
  }
}

async function testWritePermissions(client: SupabaseClient): Promise<void> {
  logSection('3. WRITE PERMISSIONS');

  const testCustomerId = crypto.randomUUID();
  const testEmail = `test-${Date.now()}@test.local`;

  // Test INSERT
  try {
    const { error: insertError } = await client.from('customers').insert({
      id: testCustomerId,
      email: testEmail,
      name: 'Test Customer (DELETE ME)',
      country: 'US',
      notification_preferences: { enabled: false, parks: [], categories: [], park_exclusives_only: false },
    });

    if (insertError) throw insertError;
    logResult('INSERT (customers)', true, 'Test row created');
    recordResult(true, 'INSERT to customers table succeeded');

    // Test DELETE
    const { error: deleteError } = await client.from('customers').delete().eq('id', testCustomerId);
    if (deleteError) throw deleteError;
    logResult('DELETE (customers)', true, 'Test row deleted');
    recordResult(true, 'DELETE from customers table succeeded');

  } catch (error: any) {
    logResult('INSERT/DELETE (customers)', false, error.message);
    recordResult(false, `Write permission test failed: ${error.message}`);

    // Try to clean up
    try {
      await client.from('customers').delete().eq('id', testCustomerId);
    } catch {}
  }

  // Test UPDATE on settings
  try {
    // First check if test_key exists
    const { data: existing } = await client.from('settings').select('*').eq('key', 'test_connection_key').single();

    if (existing) {
      // Update existing
      const { error } = await client.from('settings').update({ value: `test-${Date.now()}` }).eq('key', 'test_connection_key');
      if (error) throw error;
      logResult('UPDATE (settings)', true, 'Existing key updated');
    } else {
      // Insert new
      const { error } = await client.from('settings').upsert({ key: 'test_connection_key', value: 'test_value' });
      if (error) throw error;
      logResult('UPSERT (settings)', true, 'Test key created');
    }
    recordResult(true, 'UPDATE/UPSERT to settings table succeeded');

  } catch (error: any) {
    logResult('UPDATE (settings)', false, error.message);
    recordResult(false, `Update settings failed: ${error.message}`);
  }
}

async function testRelationships(client: SupabaseClient): Promise<void> {
  logSection('4. RELATIONSHIPS / FOREIGN KEYS');

  // Test requests with customer join
  try {
    const { data, error } = await client
      .from('requests')
      .select(`
        id,
        status,
        customer:customers!requests_customer_id_fkey (id, name, email)
      `)
      .limit(1);

    if (error) throw error;
    logResult('requests → customers', true, 'FK join works');
    recordResult(true, 'requests → customers join succeeded');
  } catch (error: any) {
    logResult('requests → customers', false, error.message);
    recordResult(false, `requests → customers: ${error.message}`);
  }

  // Test invoices with request join
  try {
    const { data, error } = await client
      .from('invoices')
      .select(`
        id,
        invoice_number,
        request:requests!invoices_request_id_fkey (id, status)
      `)
      .limit(1);

    if (error) throw error;
    logResult('invoices → requests', true, 'FK join works');
    recordResult(true, 'invoices → requests join succeeded');
  } catch (error: any) {
    logResult('invoices → requests', false, error.message);
    recordResult(false, `invoices → requests: ${error.message}`);
  }

  // Test request_items with request join
  try {
    const { data, error } = await client
      .from('request_items')
      .select(`
        id,
        name,
        request:requests!request_items_request_id_fkey (id, status)
      `)
      .limit(1);

    if (error) throw error;
    logResult('request_items → requests', true, 'FK join works');
    recordResult(true, 'request_items → requests join succeeded');
  } catch (error: any) {
    logResult('request_items → requests', false, error.message);
    recordResult(false, `request_items → requests: ${error.message}`);
  }

  // Test shipments with customer join
  try {
    const { data, error } = await client
      .from('shipments')
      .select(`
        id,
        tracking_number,
        customer:customers!shipments_customer_id_fkey (id, name)
      `)
      .limit(1);

    if (error) throw error;
    logResult('shipments → customers', true, 'FK join works');
    recordResult(true, 'shipments → customers join succeeded');
  } catch (error: any) {
    logResult('shipments → customers', false, error.message);
    recordResult(false, `shipments → customers: ${error.message}`);
  }

  // Check for orphaned records
  console.log('\n  Checking for orphaned records...');

  // Requests without customers
  try {
    const { data, error } = await client
      .from('requests')
      .select('id, customer_id')
      .is('customer_id', null);

    if (!error && data && data.length > 0) {
      log(`  Warning: ${data.length} requests have NULL customer_id`, 'yellow');
      results.warnings++;
    } else {
      console.log('  No orphaned requests found');
    }
  } catch {}

  // Invoices without requests
  try {
    const { data, error } = await client
      .from('invoices')
      .select('id, request_id')
      .is('request_id', null);

    if (!error && data && data.length > 0) {
      log(`  Warning: ${data.length} invoices have NULL request_id`, 'yellow');
      results.warnings++;
    } else {
      console.log('  No orphaned invoices found');
    }
  } catch {}
}

async function testAuth(client: SupabaseClient): Promise<void> {
  logSection('5. AUTHENTICATION');

  // Check for admin user
  try {
    const { data, error } = await client
      .from('admin_users')
      .select('id, email, name, role')
      .eq('email', 'tracyu@enchantedparkpickups.com')
      .single();

    if (error) throw error;

    if (data) {
      logResult('Admin user exists', true, `${data.name} (${data.role})`);
      recordResult(true, 'Admin user found in admin_users table');
    } else {
      logResult('Admin user exists', false, 'Not found');
      recordResult(false, 'Admin user not found');
    }
  } catch (error: any) {
    logResult('Admin user lookup', false, error.message);
    recordResult(false, `Admin user lookup failed: ${error.message}`);
  }

  // Test Supabase Auth connection
  try {
    // Use admin API to list users (requires service role)
    const { data, error } = await client.auth.admin.listUsers({ perPage: 1 });

    if (error) throw error;
    logResult('Supabase Auth API', true, 'Connection successful');
    recordResult(true, 'Supabase Auth API accessible');

    // Look for specific admin user
    const { data: userData } = await client.auth.admin.listUsers();
    const adminUser = userData?.users?.find((u: any) => u.email === 'tracyu@enchantedparkpickups.com');

    if (adminUser) {
      logResult('Admin user in Auth', true, `ID: ${adminUser.id.substring(0, 8)}...`);
      recordResult(true, 'Admin user found in Supabase Auth');
    } else {
      logResult('Admin user in Auth', false, 'Not found in Auth users');
      recordResult(false, 'Admin user not found in Supabase Auth');
    }

  } catch (error: any) {
    logResult('Supabase Auth API', false, error.message);
    recordResult(false, `Auth API failed: ${error.message}`);
  }
}

async function testSchemaConsistency(client: SupabaseClient): Promise<void> {
  logSection('6. SCHEMA CONSISTENCY');

  console.log('  Checking expected columns...\n');

  for (const [table, columns] of Object.entries(EXPECTED_COLUMNS)) {
    // Test each column individually for better error reporting
    const missingColumns: string[] = [];
    const presentColumns: string[] = [];

    for (const col of columns) {
      try {
        const { error } = await client
          .from(table)
          .select(col)
          .limit(1);

        if (error && (error.message.includes('does not exist') || error.message.includes('column'))) {
          missingColumns.push(col);
        } else {
          presentColumns.push(col);
        }
      } catch {
        missingColumns.push(col);
      }
    }

    if (missingColumns.length > 0) {
      logResult(`${table}`, false, `Missing columns: ${missingColumns.join(', ')}`);
      recordResult(false, `${table} missing columns: ${missingColumns.join(', ')}`);
    } else {
      logResult(`${table}`, true, `All ${columns.length} expected columns present`);
      recordResult(true, `${table} has all expected columns`);
    }
  }

  // Check for NULL values in required fields
  console.log('\n  Checking for NULL values in required fields...');

  const requiredFieldChecks = [
    { table: 'customers', column: 'email', label: 'Customer emails' },
    { table: 'customers', column: 'name', label: 'Customer names' },
    { table: 'requests', column: 'customer_id', label: 'Request customer IDs' },
    { table: 'request_items', column: 'request_id', label: 'Item request IDs' },
    { table: 'request_items', column: 'name', label: 'Item names' },
    { table: 'invoices', column: 'total', label: 'Invoice totals' },
  ];

  for (const check of requiredFieldChecks) {
    try {
      const { count, error } = await client
        .from(check.table)
        .select('*', { count: 'exact', head: true })
        .is(check.column, null);

      if (error) continue;

      if (count && count > 0) {
        log(`  Warning: ${count} rows in ${check.table} have NULL ${check.column}`, 'yellow');
        results.warnings++;
      }
    } catch {}
  }
}

async function main() {
  console.log('\n');
  log('SUPABASE DATABASE CONNECTION TEST', 'bright');
  log(`Project: ${SUPABASE_URL}`, 'cyan');
  console.log('');

  // Create clients
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // 1. Test basic connections
  logSection('1. BASIC CONNECTION');

  const anonConnected = await testConnection(anonClient, 'Anon Key');
  recordResult(anonConnected, anonConnected ? 'Anon key connection succeeded' : 'Anon key connection failed');

  const serviceConnected = await testConnection(serviceClient, 'Service Role Key');
  recordResult(serviceConnected, serviceConnected ? 'Service role connection succeeded' : 'Service role connection failed');

  if (!serviceConnected) {
    log('\nService role connection failed. Cannot proceed with full tests.', 'red');
    process.exit(1);
  }

  // 2. Test all tables
  await testAllTables(serviceClient);

  // 3. Test write permissions
  await testWritePermissions(serviceClient);

  // 4. Test relationships
  await testRelationships(serviceClient);

  // 5. Test auth
  await testAuth(serviceClient);

  // 6. Schema consistency
  await testSchemaConsistency(serviceClient);

  // Final summary
  logSection('SUMMARY');

  console.log(`
  ${colors.green}Passed:${colors.reset}   ${results.passed}
  ${colors.red}Failed:${colors.reset}   ${results.failed}
  ${colors.yellow}Warnings:${colors.reset} ${results.warnings}
  `);

  if (results.failed === 0) {
    log('All tests passed! Database is healthy.', 'green');
  } else {
    log(`${results.failed} test(s) failed. Review issues above.`, 'red');
  }

  console.log('\n');
  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch(console.error);
