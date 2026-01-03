/**
 * Update customer addresses in the database from scraped Pirate Ship data
 *
 * Usage:
 *   npx tsx scripts/update-customer-addresses.ts --dry-run
 *   npx tsx scripts/update-customer-addresses.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

interface ScrapedAddress {
  name: string;
  address1: string;
  address2: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
}

// Supabase configuration
const SUPABASE_URL = 'https://jtqnjvczkywfkobwddbu.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0cW5qdmN6a3l3ZmtvYndkZGJ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjIwNTM4NiwiZXhwIjoyMDgxNzgxMzg2fQ.23QsahVizk_jI1h_bUY0-9duNHH3HmCX7WuZyzMgqak';

function normalizeNameForComparison(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ')        // Normalize spaces
    .trim();
}

async function updateAddresses(dryRun: boolean) {
  console.log(`\n=== Update Customer Addresses ===${dryRun ? ' [DRY RUN]' : ''}\n`);

  // Load scraped addresses
  const addressesPath = path.join(__dirname, '..', 'pirateship-addresses.json');
  if (!fs.existsSync(addressesPath)) {
    console.error('Error: pirateship-addresses.json not found. Run the scraper first.');
    process.exit(1);
  }

  const scrapedAddresses: ScrapedAddress[] = JSON.parse(fs.readFileSync(addressesPath, 'utf-8'));
  console.log(`Loaded ${scrapedAddresses.length} scraped addresses`);

  // Create address lookup map (normalized name -> address)
  const addressMap = new Map<string, ScrapedAddress>();
  for (const addr of scrapedAddresses) {
    const normalizedName = normalizeNameForComparison(addr.name);
    if (!addressMap.has(normalizedName)) {
      addressMap.set(normalizedName, addr);
    }
  }
  console.log(`Created lookup map with ${addressMap.size} unique names\n`);

  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Fetch all customers
  const { data: customers, error: fetchError } = await supabase
    .from('customers')
    .select('id, name, email, address_line1, address_line2, city, state, postal_code, country');

  if (fetchError) {
    console.error('Error fetching customers:', fetchError);
    process.exit(1);
  }

  console.log(`Found ${customers?.length || 0} customers in database\n`);

  // Track statistics
  let matched = 0;
  let updated = 0;
  let alreadyHasAddress = 0;
  let notFound = 0;

  const updates: Array<{ customer: Customer; address: ScrapedAddress }> = [];

  // Match customers to scraped addresses
  for (const customer of (customers || [])) {
    const normalizedName = normalizeNameForComparison(customer.name);
    const scrapedAddr = addressMap.get(normalizedName);

    if (scrapedAddr) {
      matched++;

      // Check if customer already has address data
      if (customer.address_line1 && customer.city) {
        alreadyHasAddress++;
        continue;
      }

      updates.push({ customer, address: scrapedAddr });
    } else {
      notFound++;
    }
  }

  console.log('=== Matching Results ===');
  console.log(`Total customers: ${customers?.length || 0}`);
  console.log(`Matched with scraped data: ${matched}`);
  console.log(`Already have address: ${alreadyHasAddress}`);
  console.log(`No match found: ${notFound}`);
  console.log(`Updates to perform: ${updates.length}\n`);

  if (updates.length === 0) {
    console.log('No updates needed.');
    return;
  }

  // Show sample updates
  console.log('=== Sample Updates ===');
  updates.slice(0, 10).forEach(({ customer, address }) => {
    console.log(`${customer.name}:`);
    console.log(`  -> ${address.address1}, ${address.city}, ${address.state} ${address.zip}`);
  });

  if (updates.length > 10) {
    console.log(`  ... and ${updates.length - 10} more\n`);
  }

  if (dryRun) {
    console.log('\n[DRY RUN] No changes made. Run without --dry-run to apply updates.');
    return;
  }

  // Apply updates
  console.log('\n=== Applying Updates ===');
  for (const { customer, address } of updates) {
    const { error: updateError } = await supabase
      .from('customers')
      .update({
        address_line1: address.address1,
        address_line2: address.address2 || null,
        city: address.city,
        state: address.state,
        postal_code: address.zip,
        country: address.country,
        updated_at: new Date().toISOString()
      })
      .eq('id', customer.id);

    if (updateError) {
      console.log(`  ✗ Error updating ${customer.name}: ${updateError.message}`);
    } else {
      updated++;
      console.log(`  ✓ Updated ${customer.name}`);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Successfully updated: ${updated}/${updates.length} customers`);
}

// Parse command line arguments
const dryRun = process.argv.includes('--dry-run');

updateAddresses(dryRun)
  .then(() => {
    console.log('\nDone!');
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
