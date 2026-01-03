/**
 * Explore what additional data is available from Pirate Ship
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Cookie } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

puppeteer.use(StealthPlugin());

async function explore() {
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

  console.log('=== Exploring Available Shipment Fields ===\n');

  // Test various potentially useful fields
  const fieldsToTest = [
    // Order/Transaction info
    'orderId', 'orderNumber', 'orderRef', 'reference', 'referenceNumber',
    // Dates
    'createdAt', 'shippedAt', 'shipDate', 'labelDate', 'purchasedAt',
    // Tracking
    'trackingNr', 'trackingLink', 'trackingUrl',
    // Shipping details
    'carrier', 'carrierName', 'service', 'serviceName', 'serviceType',
    'weight', 'weightOz', 'weightLbs',
    'length', 'width', 'height',
    // Cost
    'cost', 'price', 'amount', 'rate', 'totalCost', 'labelCost',
    // Status
    'status', 'deliveryStatus', 'delivered',
    // Phone/Contact
    'phone', 'phoneNumber', 'email', 'contactEmail',
    // Company
    'company', 'companyName',
    // Notes
    'notes', 'memo', 'comments', 'customsDescription',
    // Package type
    'packageType', 'mailClass',
  ];

  const workingFields: string[] = [];

  for (const field of fieldsToTest) {
    const result = await page.evaluate(async (f: string) => {
      try {
        const r = await fetch('https://ship.pirateship.com/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            query: `{ latestBatches(pageIndex: 0) { batches { shipments { id ${f} } } } }`
          })
        });
        return await r.json();
      } catch (e) {
        return { error: String(e) };
      }
    }, field);

    if (!result.errors) {
      workingFields.push(field);
      const sample = result.data?.latestBatches?.batches?.[0]?.shipments?.[0];
      console.log(`✓ ${field}: ${JSON.stringify(sample?.[field])}`);
    }
  }

  console.log('\n=== Working Fields ===');
  console.log(workingFields.join(', '));

  // Now fetch a complete sample with all working fields
  if (workingFields.length > 0) {
    console.log('\n=== Sample Complete Record ===');
    const fullQuery = `{ latestBatches(pageIndex: 0) { batches { id createdAt shipments { id ${workingFields.join(' ')} fullName address1 city postcode countryCode } } } }`;

    const fullResult = await page.evaluate(async (q: string) => {
      const r = await fetch('https://ship.pirateship.com/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query: q })
      });
      return await r.json();
    }, fullQuery);

    if (fullResult.data?.latestBatches?.batches?.[0]) {
      const batch = fullResult.data.latestBatches.batches[0];
      console.log('\nBatch:', JSON.stringify(batch, null, 2));
    }
  }

  // Also check batch-level fields
  console.log('\n=== Exploring Batch Fields ===');
  const batchFields = ['id', 'createdAt', 'purchasedAt', 'totalCost', 'carrier', 'service'];

  for (const field of batchFields) {
    const result = await page.evaluate(async (f: string) => {
      try {
        const r = await fetch('https://ship.pirateship.com/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            query: `{ latestBatches(pageIndex: 0) { batches { ${f} } } }`
          })
        });
        return await r.json();
      } catch (e) {
        return { error: String(e) };
      }
    }, field);

    if (!result.errors) {
      const sample = result.data?.latestBatches?.batches?.[0];
      console.log(`✓ Batch.${field}: ${JSON.stringify(sample?.[field])}`);
    }
  }

  await browser.close();
}

explore().catch(console.error);
