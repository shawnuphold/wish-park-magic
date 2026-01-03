import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Cookie } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

puppeteer.use(StealthPlugin());

async function test() {
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
  await new Promise(r => setTimeout(r, 3000));

  // Try different name-related fields
  const nameFields = ['recipientAddress', 'residential', 'attention', 'fullName', 'addressName', 'shippingName', 'customerName', 'buyerName', 'toAddressName'];

  for (const field of nameFields) {
    const result = await page.evaluate(async (f: string) => {
      const r = await fetch('https://ship.pirateship.com/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query: `{ latestBatches(pageIndex: 0) { batches { shipments { id ${f} } } } }` })
      });
      return await r.json();
    }, field);

    if (result.errors) {
      console.log(`${field}: ERROR - ${result.errors[0].message}`);
    } else {
      console.log(`${field}: SUCCESS`);
      const sample = result.data?.latestBatches?.batches?.[0]?.shipments?.[0];
      if (sample) console.log('  Sample:', JSON.stringify(sample));
    }
  }

  // Try recipientAddress as an object
  console.log('\n=== Trying recipientAddress as object ===');
  const objResult = await page.evaluate(async () => {
    const r = await fetch('https://ship.pirateship.com/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ query: `{ latestBatches(pageIndex: 0) { batches { shipments { id recipientAddress { name street1 city } } } } }` })
    });
    return await r.json();
  });
  console.log(JSON.stringify(objResult, null, 2).substring(0, 1500));

  // Try toAddress as an object
  console.log('\n=== Trying toAddress as object ===');
  const toResult = await page.evaluate(async () => {
    const r = await fetch('https://ship.pirateship.com/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ query: `{ latestBatches(pageIndex: 0) { batches { shipments { id toAddress { name } } } } }` })
    });
    return await r.json();
  });
  console.log(JSON.stringify(toResult, null, 2).substring(0, 500));

  // Try just getting all scalar fields we can think of
  console.log('\n=== Trying to find name in state/status-related fields ===');
  const moreFields = ['recipientName', 'firstName', 'lastName', 'contactName'];
  for (const field of moreFields) {
    const result = await page.evaluate(async (f: string) => {
      const r = await fetch('https://ship.pirateship.com/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query: `{ latestBatches(pageIndex: 0) { batches { shipments { id ${f} } } } }` })
      });
      return await r.json();
    }, field);
    if (result.errors) {
      console.log(`${field}: ${result.errors[0].message}`);
    } else {
      console.log(`${field}: SUCCESS - ${JSON.stringify(result.data?.latestBatches?.batches?.[0]?.shipments?.[0])}`);
    }
  }

  await browser.close();
}

test();
