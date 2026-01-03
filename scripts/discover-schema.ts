/**
 * Discover Pirate Ship GraphQL schema by testing field names
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Cookie } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

puppeteer.use(StealthPlugin());

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

async function discover() {
  console.log('Launching browser...');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  try {
    // Load cookies
    const cookiesPath = path.join(__dirname, '..', 'pirateship-cookies.json');
    const cookiesData: CookieFile[] = JSON.parse(fs.readFileSync(cookiesPath, 'utf-8'));
    const cookies: Cookie[] = cookiesData.map(c => ({
      name: c.name, value: c.value, domain: c.domain, path: c.path,
      secure: c.secure, httpOnly: c.httpOnly,
      sameSite: c.sameSite === 'strict' ? 'Strict' : c.sameSite === 'lax' ? 'Lax' : 'None',
      expires: c.expirationDate || -1
    } as Cookie));
    await page.setCookie(...cookies);

    await page.goto('https://ship.pirateship.com/ship', { waitUntil: 'networkidle2', timeout: 60000 });
    await delay(3000);

    // Test various field combinations for Shipment
    const fieldTests = [
      ['id'],
      ['id', 'address1'],
      ['id', 'address1', 'address2'],
      ['id', 'address1', 'address2', 'city'],
      ['id', 'address1', 'address2', 'city', 'postcode'],
      ['id', 'address1', 'address2', 'city', 'postcode', 'countryCode'],
      ['id', 'toName'],
      ['id', 'recipientName'],
      ['id', 'recipient'],
      ['id', 'to'],
      ['id', 'destinationName'],
      ['id', 'contact'],
      ['id', 'company'],
    ];

    for (const fields of fieldTests) {
      const query = `query { latestBatches(pageIndex: 0) { batches { id shipments { ${fields.join(' ')} } } } }`;

      const result = await page.evaluate(async (q) => {
        try {
          const r = await fetch('https://ship.pirateship.com/api/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ query: q })
          });
          return await r.json();
        } catch (e) {
          return { error: String(e) };
        }
      }, query);

      if (result.errors) {
        console.log(`\nFields [${fields.join(', ')}]: ERROR`);
        result.errors.forEach((e: any) => console.log(`  - ${e.message}`));
      } else if (result.data) {
        console.log(`\nFields [${fields.join(', ')}]: SUCCESS`);
        const batches = result.data.latestBatches?.batches;
        if (batches?.length > 0 && batches[0].shipments?.length > 0) {
          console.log('Sample shipment:', JSON.stringify(batches[0].shipments[0], null, 2));
        }
      }

      await delay(500);
    }

    // Now test the full query that worked
    console.log('\n=== Testing full address fields ===');
    const fullResult = await page.evaluate(async () => {
      const r = await fetch('https://ship.pirateship.com/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `query {
            latestBatches(pageIndex: 0) {
              batches {
                id
                shipments {
                  id
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
      return await r.json();
    });

    console.log('Full result:', JSON.stringify(fullResult, null, 2).substring(0, 2000));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

discover();
