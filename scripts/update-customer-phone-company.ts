/**
 * Update customer phone numbers and company info from Pirate Ship
 *
 * Usage:
 *   npx tsx scripts/update-customer-phone-company.ts --dry-run
 *   npx tsx scripts/update-customer-phone-company.ts
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Cookie } from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

puppeteer.use(StealthPlugin());

const SUPABASE_URL = 'https://jtqnjvczkywfkobwddbu.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0cW5qdmN6a3l3ZmtvYndkZGJ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjIwNTM4NiwiZXhwIjoyMDgxNzgxMzg2fQ.23QsahVizk_jI1h_bUY0-9duNHH3HmCX7WuZyzMgqak';

interface ShipmentData {
  fullName: string;
  phone: string;
  company: string;
}

function normalizeNameForComparison(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

async function scrapePhoneAndCompany(): Promise<Map<string, ShipmentData>> {
  console.log('Scraping phone and company data from Pirate Ship...\n');

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  const cookiesPath = path.join(__dirname, '..', 'pirateship-cookies.json');
  const cookiesData = JSON.parse(fs.readFileSync(cookiesPath, 'utf-8'));
  const cookies: Cookie[] = cookiesData.map((c: any) => ({
    name: c.name, value: c.value, domain: c.domain, path: c.path,
    secure: c.secure, httpOnly: c.httpOnly,
    sameSite: c.sameSite === 'strict' ? 'Strict' : c.sameSite === 'lax' ? 'Lax' : 'None',
    expires: c.expirationDate || -1
  }));
  await page.setCookie(...cookies);

  await page.goto('https://ship.pirateship.com/ship', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  const dataMap = new Map<string, ShipmentData>();
  let pageIndex = 0;
  let hasMore = true;

  while (hasMore && pageIndex < 50) {
    const result = await page.evaluate(async (pIdx: number) => {
      const r = await fetch('https://ship.pirateship.com/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `query { latestBatches(pageIndex: ${pIdx}) { batches { shipments { fullName phone company } } } }`
        })
      });
      return await r.json();
    }, pageIndex);

    const batches = result.data?.latestBatches?.batches || [];
    if (batches.length === 0) {
      hasMore = false;
      break;
    }

    for (const batch of batches) {
      for (const shipment of (batch.shipments || [])) {
        if (shipment.fullName && (shipment.phone || shipment.company)) {
          const normalizedName = normalizeNameForComparison(shipment.fullName);
          // Keep the first occurrence (most recent shipment)
          if (!dataMap.has(normalizedName)) {
            dataMap.set(normalizedName, {
              fullName: shipment.fullName,
              phone: shipment.phone || '',
              company: shipment.company || ''
            });
          }
        }
      }
    }

    pageIndex++;
    await new Promise(r => setTimeout(r, 300));
  }

  await browser.close();
  return dataMap;
}

async function updateCustomers(dryRun: boolean) {
  console.log(`=== Update Customer Phone & Company ===${dryRun ? ' [DRY RUN]' : ''}\n`);

  const dataMap = await scrapePhoneAndCompany();
  console.log(`Found ${dataMap.size} customers with phone/company data\n`);

  // Count how many have actual phone/company data
  let withPhone = 0;
  let withCompany = 0;
  dataMap.forEach(d => {
    if (d.phone) withPhone++;
    if (d.company) withCompany++;
  });
  console.log(`  - With phone: ${withPhone}`);
  console.log(`  - With company: ${withCompany}\n`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Fetch customers
  const { data: customers, error } = await supabase
    .from('customers')
    .select('id, name, phone, notes');

  if (error) {
    console.error('Error fetching customers:', error);
    return;
  }

  console.log(`Found ${customers?.length || 0} customers in database\n`);

  const updates: Array<{ customer: any; phone?: string; company?: string }> = [];

  for (const customer of (customers || [])) {
    const normalizedName = normalizeNameForComparison(customer.name);
    const shipmentData = dataMap.get(normalizedName);

    if (shipmentData) {
      const needsPhoneUpdate = shipmentData.phone && !customer.phone;
      const needsCompanyUpdate = shipmentData.company && !customer.notes?.includes(shipmentData.company);

      if (needsPhoneUpdate || needsCompanyUpdate) {
        updates.push({
          customer,
          phone: needsPhoneUpdate ? shipmentData.phone : undefined,
          company: needsCompanyUpdate ? shipmentData.company : undefined
        });
      }
    }
  }

  console.log(`Updates to perform: ${updates.length}\n`);

  if (updates.length === 0) {
    console.log('No updates needed.');
    return;
  }

  // Show samples
  console.log('=== Sample Updates ===');
  updates.slice(0, 10).forEach(({ customer, phone, company }) => {
    console.log(`${customer.name}:`);
    if (phone) console.log(`  Phone: ${phone}`);
    if (company) console.log(`  Company: ${company}`);
  });
  if (updates.length > 10) console.log(`  ... and ${updates.length - 10} more\n`);

  if (dryRun) {
    console.log('\n[DRY RUN] No changes made.');
    return;
  }

  // Apply updates
  console.log('\n=== Applying Updates ===');
  let updated = 0;

  for (const { customer, phone, company } of updates) {
    const updateData: any = { updated_at: new Date().toISOString() };

    if (phone) {
      updateData.phone = phone;
    }

    if (company) {
      const existingNotes = customer.notes || '';
      updateData.notes = existingNotes
        ? `${existingNotes}\nCompany: ${company}`
        : `Company: ${company}`;
    }

    const { error: updateError } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', customer.id);

    if (updateError) {
      console.log(`  ✗ Error: ${customer.name}`);
    } else {
      updated++;
      console.log(`  ✓ ${customer.name}`);
    }
  }

  console.log(`\nSuccessfully updated: ${updated}/${updates.length}`);
}

const dryRun = process.argv.includes('--dry-run');
updateCustomers(dryRun).catch(console.error);
