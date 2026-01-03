/**
 * Scrape customer addresses from Pirate Ship using GraphQL API
 * Uses exported cookies to authenticate
 *
 * Usage:
 *   npx tsx scripts/scrape-pirateship-addresses.ts
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

// ZIP code to state mapping for US
const zipToState: Record<string, string> = {
  // This is a simplified lookup - we'll use the first 3 digits
};

function getStateFromZip(zip: string): string {
  // Basic ZIP prefix to state mapping
  const prefix = zip.substring(0, 3);
  const prefixNum = parseInt(prefix, 10);

  // Approximate mapping based on ZIP ranges
  if (prefixNum >= 995 && prefixNum <= 999) return 'AK';
  if (prefixNum >= 35 && prefixNum <= 36) return 'AL';
  if (prefixNum >= 716 && prefixNum <= 729) return 'AR';
  if (prefixNum >= 850 && prefixNum <= 865) return 'AZ';
  if (prefixNum >= 900 && prefixNum <= 961) return 'CA';
  if (prefixNum >= 800 && prefixNum <= 816) return 'CO';
  if (prefixNum >= 60 && prefixNum <= 69) return 'CT';
  if (prefixNum >= 200 && prefixNum <= 205) return 'DC';
  if (prefixNum >= 197 && prefixNum <= 199) return 'DE';
  if (prefixNum >= 320 && prefixNum <= 349) return 'FL';
  if (prefixNum >= 300 && prefixNum <= 319) return 'GA';
  if (prefixNum >= 967 && prefixNum <= 968) return 'HI';
  if (prefixNum >= 500 && prefixNum <= 528) return 'IA';
  if (prefixNum >= 832 && prefixNum <= 838) return 'ID';
  if (prefixNum >= 600 && prefixNum <= 629) return 'IL';
  if (prefixNum >= 460 && prefixNum <= 479) return 'IN';
  if (prefixNum >= 660 && prefixNum <= 679) return 'KS';
  if (prefixNum >= 400 && prefixNum <= 427) return 'KY';
  if (prefixNum >= 700 && prefixNum <= 714) return 'LA';
  if (prefixNum >= 10 && prefixNum <= 27) return 'MA';
  if (prefixNum >= 206 && prefixNum <= 219) return 'MD';
  if (prefixNum >= 39 && prefixNum <= 49) return 'ME';
  if (prefixNum >= 480 && prefixNum <= 499) return 'MI';
  if (prefixNum >= 550 && prefixNum <= 567) return 'MN';
  if (prefixNum >= 630 && prefixNum <= 658) return 'MO';
  if (prefixNum >= 386 && prefixNum <= 397) return 'MS';
  if (prefixNum >= 590 && prefixNum <= 599) return 'MT';
  if (prefixNum >= 270 && prefixNum <= 289) return 'NC';
  if (prefixNum >= 580 && prefixNum <= 588) return 'ND';
  if (prefixNum >= 680 && prefixNum <= 693) return 'NE';
  if (prefixNum >= 30 && prefixNum <= 38) return 'NH';
  if (prefixNum >= 70 && prefixNum <= 89) return 'NJ';
  if (prefixNum >= 870 && prefixNum <= 884) return 'NM';
  if (prefixNum >= 889 && prefixNum <= 898) return 'NV';
  if (prefixNum >= 100 && prefixNum <= 149) return 'NY';
  if (prefixNum >= 430 && prefixNum <= 459) return 'OH';
  if (prefixNum >= 730 && prefixNum <= 749) return 'OK';
  if (prefixNum >= 970 && prefixNum <= 979) return 'OR';
  if (prefixNum >= 150 && prefixNum <= 196) return 'PA';
  if (prefixNum >= 28 && prefixNum <= 29) return 'RI';
  if (prefixNum >= 290 && prefixNum <= 299) return 'SC';
  if (prefixNum >= 570 && prefixNum <= 577) return 'SD';
  if (prefixNum >= 370 && prefixNum <= 385) return 'TN';
  if (prefixNum >= 750 && prefixNum <= 799) return 'TX';
  if (prefixNum >= 840 && prefixNum <= 847) return 'UT';
  if (prefixNum >= 220 && prefixNum <= 246) return 'VA';
  if (prefixNum >= 50 && prefixNum <= 59) return 'VT';
  if (prefixNum >= 980 && prefixNum <= 994) return 'WA';
  if (prefixNum >= 530 && prefixNum <= 549) return 'WI';
  if (prefixNum >= 247 && prefixNum <= 268) return 'WV';
  if (prefixNum >= 820 && prefixNum <= 831) return 'WY';

  return ''; // Unknown
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeAddresses(): Promise<CustomerAddress[]> {
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
    console.log(`Loaded ${cookies.length} cookies`);

    // Go to dashboard first to establish session
    console.log('Establishing session...');
    await page.goto('https://ship.pirateship.com/ship', { waitUntil: 'networkidle2', timeout: 60000 });
    await delay(3000);

    const bodyText = await page.evaluate(() => document.body.innerText);
    if (bodyText.includes('Are you a robot')) {
      console.log('\n*** CAPTCHA DETECTED ***');
      console.log('Please re-export fresh cookies from your browser.');
      await browser.close();
      return [];
    }

    console.log('Session established. Querying GraphQL API...\n');

    // Query GraphQL API for all batches
    let pageIndex = 0;
    let hasMore = true;
    let totalShipments = 0;

    while (hasMore && pageIndex < 100) {
      console.log(`Querying page ${pageIndex}...`);

      const result = await page.evaluate(async (pIdx: number) => {
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
                      fullName
                      address1
                      address2
                      city
                      postcode
                      countryCode
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

      if (result.error || result.errors) {
        console.log('Error:', result.error || result.errors);
        break;
      }

      const batches = result.data?.latestBatches?.batches || [];
      console.log(`  Found ${batches.length} batches`);

      if (batches.length === 0) {
        hasMore = false;
        break;
      }

      for (const batch of batches) {
        for (const shipment of (batch.shipments || [])) {
          totalShipments++;
          const name = shipment.fullName?.trim();
          if (!name) continue;

          const nameLower = name.toLowerCase();
          if (seenNames.has(nameLower)) continue;

          seenNames.add(nameLower);
          const zip = shipment.postcode || '';
          const country = shipment.countryCode || 'US';

          // Try to derive state from ZIP for US addresses
          let state = '';
          if (country === 'US' && zip) {
            state = getStateFromZip(zip);
          }

          addresses.push({
            name,
            address1: shipment.address1 || '',
            address2: shipment.address2 || null,
            city: shipment.city || '',
            state,
            zip,
            country
          });

          console.log(`  ✓ ${name} - ${shipment.city || ''}, ${state} ${zip}`);
        }
      }

      // Save incrementally
      if (addresses.length > 0 && addresses.length % 20 === 0) {
        fs.writeFileSync(outputPath, JSON.stringify(addresses, null, 2));
        console.log(`  [Saved ${addresses.length} addresses]`);
      }

      pageIndex++;
      await delay(500); // Small delay between API calls
    }

    console.log(`\nProcessed ${totalShipments} total shipments`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }

  // Final save
  fs.writeFileSync(outputPath, JSON.stringify(addresses, null, 2));
  return addresses;
}

// Run
scrapeAddresses()
  .then(addresses => {
    console.log(`\n========================================`);
    console.log(`Extracted ${addresses.length} unique addresses`);
    console.log(`========================================`);

    const outputPath = path.join(__dirname, '..', 'pirateship-addresses.json');
    console.log(`Saved to: ${outputPath}`);

    if (addresses.length > 0) {
      console.log('\nSample addresses:');
      addresses.slice(0, 10).forEach((a, i) => {
        console.log(`${i + 1}. ${a.name}`);
        console.log(`   ${a.address1}`);
        console.log(`   ${a.city}, ${a.state} ${a.zip} ${a.country}`);
      });
    }
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
