/**
 * Scrape customer addresses from Pirate Ship using GraphQL API
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Cookie } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

puppeteer.use(StealthPlugin());

interface CustomerAddress {
  name: string;
  address1: string;
  address2: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface CookieFile {
  domain: string;
  name: string;
  value: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite?: string;
  expirationDate?: number;
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeWithGraphQL() {
  console.log('Launching browser with stealth mode...');

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1920,1080'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const addresses: CustomerAddress[] = [];
  const seenNames = new Set<string>();
  const outputPath = path.join(__dirname, '..', 'pirateship-addresses.json');

  try {
    // Load cookies
    console.log('Loading cookies...');
    const cookiesPath = path.join(__dirname, '..', 'pirateship-cookies.json');
    const cookiesData: CookieFile[] = JSON.parse(fs.readFileSync(cookiesPath, 'utf-8'));

    const cookies: Cookie[] = cookiesData.map(c => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path,
      secure: c.secure,
      httpOnly: c.httpOnly,
      sameSite: c.sameSite === 'strict' ? 'Strict' : c.sameSite === 'lax' ? 'Lax' : 'None',
      expires: c.expirationDate || -1
    } as Cookie));

    await page.setCookie(...cookies);

    // Go to dashboard first to establish session
    console.log('Establishing session...');
    await page.goto('https://ship.pirateship.com/ship', { waitUntil: 'networkidle2', timeout: 60000 });
    await delay(3000);

    const bodyText = await page.evaluate(() => document.body.innerText);
    if (bodyText.includes('Are you a robot')) {
      console.log('CAPTCHA detected! Session not valid.');
      await browser.close();
      return [];
    }

    console.log('Session established. Querying GraphQL API...');

    // First, let's introspect the Shipment type to see all available fields
    console.log('\n=== Introspecting Shipment type ===');
    const introspectResult = await page.evaluate(async () => {
      try {
        const response = await fetch('https://ship.pirateship.com/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            query: `{
              __type(name: "Shipment") {
                name
                fields {
                  name
                  type {
                    name
                    kind
                    ofType { name kind }
                  }
                }
              }
            }`
          })
        });
        return await response.json();
      } catch (e) {
        return { error: String(e) };
      }
    });

    console.log('Shipment fields:', JSON.stringify(introspectResult, null, 2).substring(0, 3000));

    // Also introspect PaginatedBatches
    console.log('\n=== Introspecting PaginatedBatches type ===');
    const paginatedResult = await page.evaluate(async () => {
      try {
        const response = await fetch('https://ship.pirateship.com/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            query: `{
              __type(name: "PaginatedBatches") {
                name
                fields {
                  name
                  type { name kind }
                }
              }
            }`
          })
        });
        return await response.json();
      } catch (e) {
        return { error: String(e) };
      }
    });

    console.log('PaginatedBatches fields:', JSON.stringify(paginatedResult, null, 2));

    // Try to get batches with correct field names
    let pageIndex = 0;
    let hasMore = true;
    let totalBatches = 0;

    while (hasMore && pageIndex < 50) {
      console.log(`\nQuerying page ${pageIndex}...`);

      // Based on introspection, build the query with correct fields
      const result = await page.evaluate(async (pIdx) => {
        try {
          const response = await fetch('https://ship.pirateship.com/api/graphql?opname=LatestBatchesQuery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              operationName: 'LatestBatchesQuery',
              variables: { pageIndex: pIdx },
              query: `query LatestBatchesQuery($pageIndex: Int!) {
                latestBatches(pageIndex: $pageIndex) {
                  batches {
                    id
                    shipments {
                      id
                      name
                      address1
                      address2
                      city
                      state
                      postalCode
                      country
                    }
                  }
                  hasMore
                }
              }`
            })
          });
          return await response.json();
        } catch (e) {
          return { error: String(e) };
        }
      }, pageIndex);

      if (result.errors) {
        console.log('GraphQL Errors:', JSON.stringify(result.errors, null, 2));

        // Try simpler query with just ID and name
        const simpleResult = await page.evaluate(async (pIdx) => {
          try {
            const response = await fetch('https://ship.pirateship.com/api/graphql?opname=LatestBatchesQuery', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                operationName: 'LatestBatchesQuery',
                variables: { pageIndex: pIdx },
                query: `query LatestBatchesQuery($pageIndex: Int!) {
                  latestBatches(pageIndex: $pageIndex) {
                    batches {
                      id
                      shipments {
                        id
                        name
                      }
                    }
                  }
                }`
              })
            });
            return await response.json();
          } catch (e) {
            return { error: String(e) };
          }
        }, pageIndex);

        console.log('Simple query result:', JSON.stringify(simpleResult, null, 2).substring(0, 2000));

        if (simpleResult.data?.latestBatches?.batches) {
          const batches = simpleResult.data.latestBatches.batches;
          console.log(`Found ${batches.length} batches`);
          totalBatches += batches.length;

          for (const batch of batches) {
            for (const shipment of (batch.shipments || [])) {
              if (shipment.name) {
                const nameLower = shipment.name.toLowerCase();
                if (!seenNames.has(nameLower)) {
                  seenNames.add(nameLower);
                  // We only got name, need to get full address
                  console.log(`  Found: ${shipment.name} (ID: ${shipment.id})`);
                }
              }
            }
          }

          hasMore = batches.length > 0;
        } else {
          hasMore = false;
        }
      } else if (result.data?.latestBatches?.batches) {
        const batches = result.data.latestBatches.batches;
        hasMore = result.data.latestBatches.hasMore || false;
        console.log(`Found ${batches.length} batches (hasMore: ${hasMore})`);
        totalBatches += batches.length;

        for (const batch of batches) {
          for (const shipment of (batch.shipments || [])) {
            if (shipment.name) {
              const nameLower = shipment.name.toLowerCase();
              if (!seenNames.has(nameLower)) {
                seenNames.add(nameLower);
                addresses.push({
                  name: shipment.name,
                  address1: shipment.address1 || '',
                  address2: shipment.address2 || null,
                  city: shipment.city || '',
                  state: shipment.state || '',
                  zip: shipment.postalCode || shipment.zip || '',
                  country: shipment.country || 'US'
                });
                console.log(`  ✓ ${shipment.name} - ${shipment.city}, ${shipment.state} ${shipment.postalCode || shipment.zip || ''}`);
              }
            }
          }
        }

        // Save incrementally
        if (addresses.length > 0) {
          fs.writeFileSync(outputPath, JSON.stringify(addresses, null, 2));
        }
      } else {
        console.log('Unexpected result:', JSON.stringify(result, null, 2).substring(0, 500));
        hasMore = false;
      }

      pageIndex++;
      await delay(1000);
    }

    console.log(`\nTotal batches processed: ${totalBatches}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }

  fs.writeFileSync(outputPath, JSON.stringify(addresses, null, 2));
  return addresses;
}

scrapeWithGraphQL()
  .then(addresses => {
    console.log(`\n========================================`);
    console.log(`Extracted ${addresses.length} unique addresses`);
    console.log(`========================================`);

    if (addresses.length > 0) {
      console.log('\nSample addresses:');
      addresses.slice(0, 5).forEach((a, i) => {
        console.log(`${i + 1}. ${a.name}`);
        console.log(`   ${a.address1}`);
        console.log(`   ${a.city}, ${a.state} ${a.zip}`);
      });
    }
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
